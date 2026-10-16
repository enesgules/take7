import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { handle, readiness, signature } from "../src/server/engine";
import { initialSettings } from "../src/lib/studio";

test("studio engine with actual SDK against local mock HTTP", async (t) => {
  const saved = { ...process.env };
  const dir = await mkdtemp(join(tmpdir(), "take7-engine-"));
  const id = crypto.randomUUID(),
    assetId = crypto.randomUUID();
  let status = "queued",
    submissions = 0,
    downloads = 0,
    unavailable = false;
  const server = createServer(async (req, res) => {
    if (unavailable) {
      res.writeHead(503).end();
      return;
    }
    const job = () => ({
      id,
      status,
      outputs:
        status === "succeeded"
          ? [
              {
                id: assetId,
                node_id: "9",
                name: "take.png",
                type: "image",
                size_bytes: 10,
                content_type: "image/png",
              },
            ]
          : [],
      urls: { cancel: `/api/v2/jobs/${id}/cancel` },
    });
    res.setHeader("Content-Type", "application/json");
    if (req.url === "/api/v2/jobs" && req.method === "POST") {
      submissions++;
      let input = "";
      for await (const chunk of req) input += chunk;
      assert.ok(JSON.parse(input).workflow);
      assert.ok(req.headers["idempotency-key"]);
      res.statusCode = 201;
      res.end(JSON.stringify(job()));
      return;
    }
    if (req.url === `/api/v2/jobs/${id}/cancel`) {
      status = "canceled";
      res.end(JSON.stringify(job()));
      return;
    }
    if (req.url === `/api/v2/jobs/${id}`) {
      res.end(JSON.stringify(job()));
      return;
    }
    if (req.url === `/api/v2/assets/${assetId}/content`) {
      downloads++;
      res.setHeader("Content-Type", "image/png");
      res.end("0123456789");
      return;
    }
    res.writeHead(404).end(JSON.stringify({ error: "Unknown fixture route" }));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  process.env.TAKE7_DATA_DIR = dir;
  process.env.TAKE7_ACCESS_TOKEN = "test-studio-token-24-characters";
  delete process.env.COMFY_API_KEY;
  delete process.env.TAKE7_ENABLE_LTX;
  delete process.env.TAKE7_PUBLIC_ORIGIN;
  process.env.COMFY_BASE_URL = `http://127.0.0.1:${address.port}`;
  const call = (
    query = "",
    method = "GET",
    body?: unknown,
    headers: Record<string, string> = {},
  ) =>
    handle(
      new Request(`http://studio.local/api/studio${query}`, {
        method,
        headers: {
          authorization: `Bearer ${process.env.TAKE7_ACCESS_TOKEN}`,
          ...headers,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      }),
    );
  try {
    await t.test("readiness, authentication and origin", async () => {
      assert.equal(readiness().ready, true);
      assert.equal(readiness().video, false);
      assert.equal(
        (await call("?check", "GET", undefined, { authorization: "wrong" }))
          .status,
        401,
      );
      assert.equal(
        (await call("", "POST", {}, { origin: "http://other.local" })).status,
        403,
      );
      delete process.env.COMFY_BASE_URL;
      assert.equal(readiness().ready, false);
      assert.equal((await call("", "POST", {})).status, 503);
      process.env.COMFY_BASE_URL = `http://127.0.0.1:${address.port}`;
    });
    await t.test(
      "reject invalid and oversized bodies and disabled video",
      async () => {
        assert.equal(
          (await call("", "POST", { requestId: "invalid" })).status,
          400,
        );
        assert.equal(
          (await call("", "POST", { padding: "x".repeat(17000) })).status,
          400,
        );
        assert.equal(
          (
            await call("", "POST", {
              requestId: crypto.randomUUID(),
              settings: { ...initialSettings, kind: "video" },
            })
          ).status,
          409,
        );
      },
    );
    const requestId = crypto.randomUUID();
    await t.test("submit through SDK and durably deduplicate", async () => {
      const response = await call("", "POST", {
        requestId,
        settings: initialSettings,
      });
      assert.equal(response.status, 201);
      assert.deepEqual(await response.json(), { id, status: "queued" });
      const duplicate = await call("", "POST", {
        requestId,
        settings: initialSettings,
      });
      assert.equal(duplicate.status, 200);
      assert.deepEqual(await duplicate.json(), { id, status: "queued" });
      assert.equal(submissions, 1);
      assert.equal(
        (
          await call("", "POST", {
            requestId,
            settings: { ...initialSettings, seed: 1 },
          })
        ).status,
        409,
      );
      const pending = crypto.randomUUID();
      await writeFile(
        join(dir, `submit-${pending}.json`),
        JSON.stringify({ pending: true, settings: initialSettings }),
      );
      assert.equal(
        (
          await call("", "POST", {
            requestId: pending,
            settings: initialSettings,
          })
        ).status,
        409,
      );
      const corrupt = crypto.randomUUID();
      await writeFile(join(dir, `submit-${corrupt}.json`), "{");
      assert.equal(
        (
          await call("", "POST", {
            requestId: corrupt,
            settings: initialSettings,
          })
        ).status,
        502,
      );
      assert.equal(submissions, 1);
    });
    await t.test(
      "poll, signed media, suffix and bounded ranges, durable cache",
      async () => {
        status = "succeeded";
        const poll = await (await call(`?job=${id}`)).json();
        assert.equal(poll.status, "succeeded");
        assert.equal(poll.output.type, "image");
        assert.equal((await call(`?media=${id}&ticket=bad`)).status, 401);
        const query = `?media=${id}&ticket=${signature(id)}`;
        const media = await call(query);
        assert.equal(media.status, 200);
        assert.equal(await media.text(), "0123456789");
        assert.equal(downloads, 1);
        unavailable = true;
        const range = await call(query, "GET", undefined, {
          range: "bytes=2-4",
        });
        assert.equal(range.status, 206);
        assert.equal(range.headers.get("content-range"), "bytes 2-4/10");
        assert.equal(await range.text(), "234");
        assert.equal(
          await (
            await call(query, "GET", undefined, { range: "bytes=-3" })
          ).text(),
          "789",
        );
        assert.equal(
          (await call(query, "GET", undefined, { range: "bytes=99-" })).status,
          416,
        );
        assert.equal(downloads, 1);
        unavailable = false;
      },
    );
    await t.test("cancel through SDK", async () => {
      status = "running";
      const response = await call("", "DELETE", { jobId: id });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { status: "canceled" });
    });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    await rm(dir, { recursive: true, force: true });
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
});
