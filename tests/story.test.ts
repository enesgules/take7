import { test } from "node:test";
import assert from "node:assert/strict";
import { buildStoryArc, storyArcs } from "../src/lib/story";
import {
  newProject,
  newTake,
  initialSettings,
  projectSchema,
} from "../src/lib/studio";

test("three authored arcs each contain seven distinct, valid video beats", () => {
  assert.deepEqual(
    storyArcs.map((arc) => arc.id),
    ["threshold", "heist", "homecoming"],
  );
  for (const arc of storyArcs) {
    assert.equal(arc.beats.length, 7);
    assert.equal(new Set(arc.beats.map((beat) => beat.instruction)).size, 7);
    const project = newProject();
    project.sequence = [project.takes[0].id, project.takes[0].id];
    const source = project.takes[0];
    source.settings.ratio = "9:16";
    source.output = {
      url: "https://example.test/old.png",
      type: "image",
      name: "old.png",
    };
    source.status = "succeeded";
    source.favorite = true;
    source.jobId = crypto.randomUUID();
    const before = structuredClone(project);
    const result = buildStoryArc(project, source, arc.id);
    const added = result.takes.slice(1);
    assert.deepEqual(project, before, "source project stays unchanged");
    assert.equal(result.takes[0], source);
    assert.equal(result.selectedId, added[0].id);
    assert.deepEqual(result.sequence, [
      ...project.sequence,
      ...added.map((take) => take.id),
    ]);
    assert.equal(new Set(result.takes.map((take) => take.id)).size, 8);
    added.forEach((take, index) => {
      assert.equal(take.parentId, source.id);
      assert.equal(take.title, arc.beats[index].title);
      assert.equal(take.settings.kind, "video");
      assert.equal(take.settings.seed, source.settings.seed);
      assert.equal(take.settings.ratio, "9:16");
      assert.ok(take.settings.prompt.startsWith(source.settings.prompt));
      assert.ok(take.settings.prompt.includes(arc.beats[index].instruction));
      assert.match(take.settings.prompt, /not a guarantee/);
      assert.ok(take.settings.prompt.length <= 2000);
      assert.equal(take.status, "draft");
      assert.equal(take.output, undefined);
      assert.equal(take.jobId, undefined);
      assert.equal(take.favorite, false);
      assert.notEqual(take.settings, source.settings);
    });
    assert.doesNotThrow(() => projectSchema.parse(result));
  }
});

test("limits are checked atomically, with exactly seven available slots accepted", () => {
  const project = newProject();
  const source = project.takes[0];
  project.takes.push(
    ...Array.from({ length: 92 }, () => newTake(initialSettings)),
  );
  project.sequence = Array.from({ length: 93 }, () => source.id);
  const full = buildStoryArc(project, source, "threshold");
  assert.equal(full.takes.length, 100);
  assert.equal(full.sequence.length, 100);
  project.takes.push(newTake(initialSettings));
  assert.throws(() => buildStoryArc(project, source, "threshold"), /100 takes/);
  project.takes.pop();
  project.sequence.push(source.id);
  assert.throws(() => buildStoryArc(project, source, "threshold"), /100-shot/);
  assert.equal(project.takes.length, 93);
  assert.equal(project.sequence.length, 94);
});

test("rejects unknown arcs, foreign sources, blank scenes and oversized composed prompts", () => {
  const project = newProject();
  const source = project.takes[0];
  assert.throws(() => buildStoryArc(project, source, "missing"), /known story/);
  assert.throws(
    () => buildStoryArc(project, newTake(initialSettings), "heist"),
    /belong/,
  );
  source.settings.prompt = "  ";
  assert.throws(() => buildStoryArc(project, source, "heist"), /Describe/);
  source.settings.prompt = "x".repeat(2000);
  assert.throws(() => buildStoryArc(project, source, "homecoming"), /2,000/);
  assert.equal(source.settings.prompt.length, 2000);
  assert.equal(project.takes.length, 1);
  assert.deepEqual(project.sequence, []);
});
