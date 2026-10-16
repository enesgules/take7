import { z } from "zod";
export const directions = [
  {
    id: "wonder",
    name: "Wonder",
    subtitle: "Make the ordinary impossible.",
    color: "#e8b17b",
    lens: "24mm",
    camera: "Slow push in",
    light: "Golden hour",
    treatment:
      "Wide cinematic composition, a sense of awe and discovery, warm golden-hour backlight, soft atmospheric haze.",
  },
  {
    id: "noir",
    name: "After hours",
    subtitle: "Let the shadows speak.",
    color: "#7d9dbe",
    lens: "50mm",
    camera: "Locked off",
    light: "Low key",
    treatment:
      "Neo-noir composition, deep blue shadows, a single practical light source, high contrast, wet reflective surfaces.",
  },
  {
    id: "dream",
    name: "Fever dream",
    subtitle: "A little less reality.",
    color: "#bfa4cf",
    lens: "35mm",
    camera: "Orbit",
    light: "Diffused",
    treatment:
      "Surreal dreamlike atmosphere, lavender and rose palette, unusual scale, ethereal diffused light.",
  },
  {
    id: "wild",
    name: "Wild card",
    subtitle: "Break the composition.",
    color: "#cbb96e",
    lens: "18mm",
    camera: "Handheld",
    light: "Hard sun",
    treatment:
      "Bold experimental framing, extreme low angle, saturated acid yellow highlights, hard sunlight.",
  },
  {
    id: "quiet",
    name: "Quiet tension",
    subtitle: "Hold your breath.",
    color: "#88aa91",
    lens: "85mm",
    camera: "Slow pull back",
    light: "Overcast",
    treatment:
      "Minimalist restrained cinema, long shadows, muted sage and charcoal palette, negative space, overcast light, quiet suspense.",
  },
  {
    id: "memory",
    name: "Yesterday",
    subtitle: "Something you almost remember.",
    color: "#d7a19b",
    lens: "50mm",
    camera: "Gentle pan",
    light: "Late afternoon",
    treatment:
      "Nostalgic analog cinema, warm faded colors, subtle 35mm film grain, halation, late afternoon light.",
  },
  {
    id: "future",
    name: "Another world",
    subtitle: "Somewhere beyond here.",
    color: "#86baba",
    lens: "28mm",
    camera: "Crane up",
    light: "Blue hour",
    treatment:
      "Otherworldly science fiction, monumental architectural scale, teal and amber color contrast, blue-hour atmosphere.",
  },
] as const;
export type DirectionId = (typeof directions)[number]["id"];
export const settingsSchema = z.object({
  prompt: z.string().trim().min(3).max(2000),
  direction: z.enum([
    "wonder",
    "noir",
    "dream",
    "wild",
    "quiet",
    "memory",
    "future",
  ]),
  seed: z.number().int().min(0).max(2147483647),
  lens: z.enum(["18mm", "24mm", "28mm", "35mm", "50mm", "85mm"]),
  camera: z.enum([
    "Slow push in",
    "Locked off",
    "Orbit",
    "Handheld",
    "Slow pull back",
    "Gentle pan",
    "Crane up",
  ]),
  ratio: z.enum(["16:9", "9:16", "1:1"]),
  kind: z.enum(["image", "video"]),
});
export type Settings = z.infer<typeof settingsSchema>;
export const outputSchema = z.object({
  url: z
    .string()
    .refine((v) => v.startsWith("/api/studio?") || /^https:\/\//.test(v)),
  type: z.enum(["image", "video"]),
  name: z.string().max(200),
});
export const takeSchema = z.object({
  id: z.string().uuid(),
  parentId: z.string().uuid().optional(),
  title: z.string().max(100),
  settings: settingsSchema.extend({ prompt: z.string().max(2000) }),
  createdAt: z.string(),
  favorite: z.boolean(),
  output: outputSchema.optional(),
  jobId: z.string().uuid().optional(),
  status: z.enum([
    "draft",
    "queued",
    "running",
    "succeeded",
    "failed",
    "canceled",
    "expired",
    "canceling",
  ]),
  error: z.string().max(500).optional(),
});
export type Take = z.infer<typeof takeSchema>;
export const projectSchema = z
  .object({
    version: z.literal(1),
    name: z.string().trim().min(1).max(100),
    takes: z.array(takeSchema).min(1).max(100),
    selectedId: z.string().uuid(),
    sequence: z.array(z.string().uuid()).max(100),
  })
  .refine(
    (p) =>
      new Set(p.takes.map((t) => t.id)).size === p.takes.length &&
      p.takes.some((t) => t.id === p.selectedId) &&
      p.sequence.every((id) => p.takes.some((t) => t.id === id)) &&
      p.takes.every(
        (t, index) =>
          !t.parentId ||
          p.takes.slice(0, index).some((parent) => parent.id === t.parentId),
      ),
    "Invalid take references",
  );
export type Project = z.infer<typeof projectSchema>;
export const initialSettings: Settings = {
  prompt:
    "A lone traveler discovers a monumental doorway in an endless desert. Wind carries sand across the threshold. Something is waiting on the other side.",
  direction: "wonder",
  seed: 700042,
  lens: "24mm",
  camera: "Slow push in",
  ratio: "16:9",
  kind: "image",
};
export function newTake(settings: Settings, parentId?: string): Take {
  return {
    id: crypto.randomUUID(),
    parentId,
    title: directions.find((d) => d.id === settings.direction)!.name,
    settings: { ...settings },
    favorite: false,
    status: "draft",
    createdAt: new Date().toISOString(),
  };
}
export function newProject(): Project {
  const take = newTake(initialSettings);
  return {
    version: 1,
    name: "The other side",
    takes: [take],
    selectedId: take.id,
    sequence: [],
  };
}
export function buildPrompt(s: Settings) {
  const d = directions.find((d) => d.id === s.direction)!;
  return `${s.prompt}\n\nDirection: ${d.treatment}\nCamera: ${s.camera}. Lens: ${s.lens}. Cinematic composition, consistent subject, no text, no watermark.`;
}
export function branchSeven(p: Project, source: Take): Project {
  if (p.takes.length > 93)
    throw new Error(
      "This project has room for 100 takes. Start a new project to explore more.",
    );
  const takes = directions.map((d) =>
    newTake(
      { ...source.settings, direction: d.id, lens: d.lens, camera: d.camera },
      source.id,
    ),
  );
  return { ...p, takes: [...p.takes, ...takes], selectedId: takes[0].id };
}
export function portableProject(p: Project): Project {
  return {
    ...p,
    takes: p.takes.map(({ jobId, output, error, ...t }) => ({
      ...t,
      status: "draft" as const,
    })),
  };
}
export function encodeShare(p: Project) {
  const portable = portableProject(p);
  const text = JSON.stringify(portable);
  if (new TextEncoder().encode(text).length > 20000)
    throw new Error(
      "This project is too large for a link. Export the project file instead.",
    );
  return btoa(
    Array.from(new TextEncoder().encode(text), (c) =>
      String.fromCharCode(c),
    ).join(""),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}
export function decodeShare(value: string): Project {
  if (value.length > 30000) throw new Error("Share link is too large.");
  const base = value.replaceAll("-", "+").replaceAll("_", "/");
  const text = new TextDecoder().decode(
    Uint8Array.from(atob(base), (c) => c.charCodeAt(0)),
  );
  return portableProject(projectSchema.parse(JSON.parse(text)));
}
