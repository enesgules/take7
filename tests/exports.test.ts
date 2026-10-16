import test from "node:test";
import assert from "node:assert/strict";
import { exportWorkflow, safeFilename, shotListCsv } from "../src/lib/exports";
import { newProject, branchSeven, initialSettings } from "../src/lib/studio";
import { validateGraph } from "../src/lib/workflow";

test("shot list follows editorial order and preserves repeated shots", () => {
  const p = newProject();
  const branched = branchSeven(p, p.takes[0]);
  branched.sequence = [
    branched.takes[3].id,
    branched.takes[1].id,
    branched.takes[3].id,
  ];
  const rows = shotListCsv(branched).split("\r\n");
  assert.equal(rows.length, 4);
  assert.ok(rows[1].includes(branched.takes[3].id));
  assert.ok(rows[2].includes(branched.takes[1].id));
  assert.ok(rows[3].includes(branched.takes[3].id));
});
test("CSV quotes multiline values and neutralizes spreadsheet formulas", () => {
  const p = newProject();
  p.takes[0].title = '=HYPERLINK("bad")';
  p.takes[0].settings.prompt = '  @SUM(1,2)\n"hello"';
  const csv = shotListCsv(p);
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(csv.includes('"\'  @SUM(1,2)\n""hello"""'));
  assert.ok(!csv.includes("/api/studio"));
});
test("safe filenames cannot traverse paths and have a useful fallback", () => {
  assert.equal(safeFilename("../../hello world?.png"), "hello-world-png");
  assert.equal(safeFilename("🥳"), "take7");
  assert.equal(safeFilename("x".repeat(200)).length, 80);
});
test("workflow export keeps deterministic settings and valid graph references", () => {
  const image = validateGraph(exportWorkflow(initialSettings));
  assert.equal(image["5"].inputs.seed, initialSettings.seed);
  const video = validateGraph(
    exportWorkflow({ ...initialSettings, kind: "video" }),
  );
  assert.equal(video["11"].inputs.noise_seed, initialSettings.seed);
  assert.ok(Object.values(video).some((n) => n.class_type === "SaveVideo"));
});
