import { Comfy } from "@comfyorg/sdk";
import { createHmac, timingSafeEqual } from "node:crypto";
import {
  mkdir,
  readFile,
  writeFile,
  stat,
  rename,
  unlink,
} from "node:fs/promises";
import { createReadStream } from "node:fs";
import { Readable } from "node:stream";
import { join } from "node:path";
import { z } from "zod";
import { settingsSchema } from "../lib/studio";
import { imageWorkflow, videoWorkflow } from "../lib/workflow";
const uuid = z.string().uuid();
const locks = new Set<string>();
const submits: number[] = [];
const directory = () =>
  process.env.TAKE7_DATA_DIR || join(process.cwd(), ".data");
function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}
export function equal(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function authorized(request: Request) {
  const token = process.env.TAKE7_ACCESS_TOKEN;
  return (
    !!token &&
    token.length >= 24 &&
    equal(request.headers.get("authorization") || "", `Bearer ${token}`)
  );
}
export function readiness() {
  const base = process.env.COMFY_BASE_URL;
  const local =
    base?.startsWith("http://127.0.0.1:") ||
    base?.startsWith("http://localhost:");
  const credentials = !!process.env.COMFY_API_KEY || local;
  const access = (process.env.TAKE7_ACCESS_TOKEN?.length || 0) >= 24;
  const ready = !!credentials && access;
  return {
    ready,
    image: ready,
    video: ready && process.env.TAKE7_ENABLE_LTX === "true",
    message: ready
      ? "Server configured. A real render will verify model availability."
      : "Configure a Comfy environment and a studio access token on the server to enable rendering.",
  };
}
export function signature(jobId: string) {
  return createHmac("sha256", process.env.TAKE7_ACCESS_TOKEN || "unconfigured")
    .update(`take7-output:${jobId}`)
    .digest("hex");
}
async function body(request: Request) {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("invalid_body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 16000) {
        await reader.cancel();
        throw new Error("invalid_body");
      }
      chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    throw new Error("invalid_body");
  }
}
function client() {
  return new Comfy({
    apiKey: process.env.COMFY_API_KEY,
    timeoutMs: 30000,
    clientInfo: "take7/0.1.0",
  });
}
async function persist(name: string, value: unknown) {
  await mkdir(directory(), { recursive: true });
  const file = join(directory(), name);
  const temp = `${file}.${crypto.randomUUID()}.tmp`;
  await writeFile(temp, JSON.stringify(value), { mode: 0o600 });
  await rename(temp, file);
}
async function load(name: string) {
  try {
    return JSON.parse(await readFile(join(directory(), name), "utf8"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
async function outputResponse(jobId: string, request: Request) {
  let output = await load(`output-${jobId}.json`);
  const path = join(directory(), `${jobId}.media`);
  if (!output) {
    const job = await client().jobs.get(jobId);
    const asset = job.outputs.find(
      (o) => o.type === "video" || o.type === "image",
    );
    if (!asset)
      return json(
        { error: "No finished image or video output is available." },
        404,
      );
    if (asset.sizeBytes > 200 * 1024 * 1024)
      return json(
        {
          error:
            "Output exceeds the 200 MB download limit. Download it from your Comfy workspace.",
        },
        413,
      );
    await mkdir(directory(), { recursive: true });
    const temp = `${path}.${crypto.randomUUID()}.tmp`;
    try {
      await asset.toFile(temp, { timeoutMs: 120000 });
      if ((await stat(temp)).size > 200 * 1024 * 1024)
        return json(
          { error: "Output exceeds the 200 MB download limit." },
          413,
        );
      await rename(temp, path);
      output = { contentType: asset.contentType, type: asset.type };
      await persist(`output-${jobId}.json`, output);
    } finally {
      await unlink(temp).catch(() => {});
    }
  }
  const info = await stat(path);
  if (!info.size) return json({ error: "The rendered output is empty." }, 502);
  const range = request.headers.get("range");
  let start = 0,
    end = info.size - 1,
    status = 200;
  if (range) {
    const m = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!m || (!m[1] && !m[2]))
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${info.size}` },
      });
    start = m[1] ? Number(m[1]) : Math.max(0, info.size - Number(m[2]));
    end = m[1] && m[2] ? Math.min(Number(m[2]), end) : end;
    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start > end ||
      start >= info.size
    )
      return new Response(null, {
        status: 416,
        headers: { "Content-Range": `bytes */${info.size}` },
      });
    status = 206;
  }
  const headers: Record<string, string> = {
    "Content-Type": output.contentType.startsWith("video/")
      ? output.contentType
      : output.contentType.startsWith("image/")
        ? output.contentType
        : "application/octet-stream",
    "Content-Length": String(end - start + 1),
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, max-age=3600",
    "X-Content-Type-Options": "nosniff",
  };
  if (status === 206)
    headers["Content-Range"] = `bytes ${start}-${end}/${info.size}`;
  if (new URL(request.url).searchParams.has("download"))
    headers["Content-Disposition"] =
      `attachment; filename="take7-${jobId}.${output.type === "video" ? "mp4" : "png"}"`;
  return new Response(
    Readable.toWeb(createReadStream(path, { start, end })) as ReadableStream,
    { status, headers },
  );
}
export async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "GET" && !url.searchParams.size)
    return json(readiness());
  try {
    if (request.method === "GET" && url.searchParams.has("media")) {
      const jobId = uuid.parse(url.searchParams.get("media"));
      if (
        (process.env.TAKE7_ACCESS_TOKEN?.length || 0) < 24 ||
        !equal(url.searchParams.get("ticket") || "", signature(jobId))
      )
        return json({ error: "This output link is no longer valid." }, 401);
      return await outputResponse(jobId, request);
    }
    if (!authorized(request))
      return json(
        {
          error:
            "Studio is locked. Enter the configured TAKE7_ACCESS_TOKEN, not your Comfy API key.",
        },
        401,
      );
    if (request.method === "GET" && url.searchParams.has("check"))
      return json(readiness());
    if (!readiness().ready)
      return json({ error: "No Comfy engine is configured." }, 503);
    if (request.method !== "GET") {
      const origin = request.headers.get("origin");
      const expected = process.env.TAKE7_PUBLIC_ORIGIN || url.origin;
      if (origin && origin !== expected)
        return json(
          { error: "Request origin does not match this studio." },
          403,
        );
    }
    if (request.method === "POST") {
      const { settings, requestId } = z
        .object({ settings: settingsSchema, requestId: uuid })
        .parse(await body(request));
      if (settings.kind === "video" && !readiness().video)
        return json(
          {
            error:
              "LTX is not enabled. Install the documented model files and enable TAKE7_ENABLE_LTX.",
          },
          409,
        );
      if (locks.has(requestId))
        return json({ error: "This take is already being submitted." }, 409);
      locks.add(requestId);
      try {
        const previous = await load(`submit-${requestId}.json`);
        if (
          previous?.settings &&
          JSON.stringify(previous.settings) !== JSON.stringify(settings)
        )
          return json(
            {
              error:
                "This request ID belongs to different scene settings. Create a new take.",
            },
            409,
          );
        if (previous?.id)
          return json({ id: previous.id, status: previous.status });
        if (previous)
          return json(
            {
              error:
                "A previous submit has an unknown outcome. Check your Comfy job history before starting a new take.",
            },
            409,
          );
        const now = Date.now();
        while (submits.length && submits[0] < now - 60000) submits.shift();
        if (submits.length >= 10)
          return json(
            {
              error:
                "Ten render requests per minute maximum. Please wait before submitting another take.",
            },
            429,
          );
        submits.push(now);
        const graph =
          settings.kind === "video"
            ? videoWorkflow(settings)
            : imageWorkflow(
                settings,
                process.env.COMFY_SDXL_CHECKPOINT || undefined,
              );
        await mkdir(directory(), { recursive: true });
        try {
          await writeFile(
            join(directory(), `submit-${requestId}.json`),
            JSON.stringify({
              pending: true,
              at: new Date().toISOString(),
              settings,
              graph,
            }),
            { mode: 0o600, flag: "wx" },
          );
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "EEXIST")
            return json(
              {
                error:
                  "This take is already recorded. Check its status before retrying.",
              },
              409,
            );
          throw error;
        }
        const c = client();
        const job = await c.submit(c.workflows.fromJson(graph), {
          idempotencyKey: requestId,
          signal: AbortSignal.timeout(60000),
        });
        const result = { id: job.id, status: job.status };
        await persist(`submit-${requestId}.json`, {
          ...result,
          settings,
          graph,
        });
        await persist(`job-${job.id}.json`, { settings, graph });
        return json(result, 201);
      } finally {
        locks.delete(requestId);
      }
    }
    if (request.method === "GET") {
      const jobId = uuid.parse(url.searchParams.get("job"));
      const job = await client().jobs.get(jobId);
      const output = job.outputs.find(
        (o) => o.type === "video" || o.type === "image",
      );
      return json({
        id: job.id,
        status: job.status,
        error:
          job.status === "failed"
            ? "Comfy could not complete this take. Check the model files and workflow in your Comfy job history."
            : undefined,
        output: output
          ? {
              url: `/api/studio?media=${jobId}&ticket=${signature(jobId)}`,
              type: output.type,
              name: output.name,
            }
          : undefined,
      });
    }
    if (request.method === "DELETE") {
      const { jobId } = z.object({ jobId: uuid }).parse(await body(request));
      const job = await client().jobs.get(jobId);
      await job.cancel();
      return json({ status: job.status });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    if (
      error instanceof z.ZodError ||
      (error instanceof Error && error.message === "invalid_body")
    )
      return json(
        { error: "Invalid request. Check the scene settings and try again." },
        400,
      );
    return json(
      {
        error:
          "Comfy request failed or timed out. Check your deployment, model files, credits, and job history before retrying; a submitted job may still be running.",
      },
      502,
    );
  }
}
