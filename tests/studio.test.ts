import test from "node:test";
import assert from "node:assert/strict";
import {
  branchSeven,
  decodeShare,
  directions,
  encodeShare,
  newProject,
  newTake,
  portableProject,
  projectSchema,
  settingsSchema,
} from "../src/lib/studio";

test("seven branches share the source seed and prompt but have distinct direction and parent identity", () => {
  const p = newProject(),
    source = p.takes[0],
    branched = branchSeven(p, source);
  assert.equal(p.takes.length, 1);
  assert.equal(branched.takes.length, 8);
  assert.deepEqual(
    branched.takes.slice(1).map((t) => t.settings.direction),
    directions.map((d) => d.id),
  );
  assert.equal(new Set(branched.takes.map((t) => t.id)).size, 8);
  for (const t of branched.takes.slice(1)) {
    assert.equal(t.parentId, source.id);
    assert.equal(t.settings.seed, source.settings.seed);
    assert.equal(t.settings.prompt, source.settings.prompt);
  }
  assert.equal(branched.selectedId, branched.takes[1].id);
});
test("share links round trip Unicode and preserve sequence choices", () => {
  const p = newProject();
  p.name = "七つの夢 — İstanbul 🎬";
  p.takes[0].settings.prompt = "夜の東京、夢の中。 ✨";
  p.sequence = [p.selectedId, p.selectedId];
  const encoded = encodeShare(p);
  assert.match(encoded, /^[a-zA-Z0-9_-]+$/);
  assert.deepEqual(
    decodeShare(encoded),
    JSON.parse(JSON.stringify(portableProject(p))),
  );
});
test("portable projects remove job identifiers and authenticated or signed outputs", () => {
  for (const url of [
    "/api/studio?action=output&job=secret",
    "https://example.com/output.png?token=private",
  ]) {
    const p = newProject();
    p.takes[0].jobId = crypto.randomUUID();
    p.takes[0].status = "running";
    p.takes[0].output = { url, name: "frame", type: "image" };
    const portable = portableProject(p);
    assert.equal(portable.takes[0].jobId, undefined);
    assert.equal(portable.takes[0].output, undefined);
    assert.equal(portable.takes[0].status, "draft");
    assert.ok(p.takes[0].jobId, "export must not mutate the source project");
  }
});
test("project and share limits reject broken references and oversized inputs", () => {
  const p = newProject();
  assert.equal(
    projectSchema.safeParse({ ...p, selectedId: crypto.randomUUID() }).success,
    false,
  );
  assert.equal(
    projectSchema.safeParse({ ...p, sequence: [crypto.randomUUID()] }).success,
    false,
  );
  assert.equal(
    projectSchema.safeParse({ ...p, takes: [p.takes[0], p.takes[0]] }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({ ...p.takes[0].settings, seed: -1 }).success,
    false,
  );
  assert.equal(
    settingsSchema.safeParse({
      ...p.takes[0].settings,
      prompt: "x".repeat(2001),
    }).success,
    false,
  );
  assert.throws(() => decodeShare("a".repeat(30001)), /too large/);
  assert.throws(() => decodeShare("not-valid-json"));
  p.takes = Array.from({ length: 94 }, () => newTake(p.takes[0].settings));
  assert.throws(() => branchSeven(p, p.takes[0]), /100 takes/);
  assert.throws(() => encodeShare(p), /too large/);
});

test("empty draft prompts survive storage but cannot be submitted", () => {
  const p = newProject();
  p.takes[0].settings.prompt = "";
  assert.equal(projectSchema.safeParse(p).success, true);
  assert.equal(settingsSchema.safeParse(p.takes[0].settings).success, false);
});
test("share limits account for Unicode bytes and invalid ancestry is rejected", () => {
  const p = newProject();
  const parent = p.takes[0];
  p.takes = Array.from({ length: 6 }, () =>
    newTake({ ...parent.settings, prompt: "夢".repeat(1900) }),
  );
  p.selectedId = p.takes[0].id;
  assert.throws(() => encodeShare(p), /too large/);
  p.takes[0].parentId = p.takes[0].id;
  assert.equal(projectSchema.safeParse(p).success, false);
});
