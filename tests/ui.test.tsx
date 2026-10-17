import test from "node:test";
import assert from "node:assert/strict";
import { Window } from "happy-dom";
import type { ComponentType } from "react";
import {
  branchSeven,
  decodeShare,
  encodeShare,
  newProject,
  newTake,
  type Project,
} from "../src/lib/studio";

import { storyArcs } from "../src/lib/story";

// DOM interaction coverage; these tests do not replace real browser layout QA.
const dom = new Window({ url: "http://localhost:3000/" });
for (const key of [
  "window",
  "document",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "HTMLElement",
  "Element",
  "Node",
  "Document",
  "DocumentFragment",
  "HTMLInputElement",
  "HTMLTextAreaElement",
  "HTMLButtonElement",
  "HTMLFormElement",
  "MutationObserver",
  "ResizeObserver",
  "Event",
  "MouseEvent",
  "KeyboardEvent",
  "PointerEvent",
  "FocusEvent",
  "CustomEvent",
  "ShadowRoot",
  "SVGElement",
  "getComputedStyle",
] as const) {
  const value =
    key === "window" ? dom : (dom as unknown as Record<string, unknown>)[key];
  Object.defineProperty(globalThis, key, {
    configurable: true,
    writable: true,
    value:
      typeof value === "function" && key === "getComputedStyle"
        ? value.bind(dom)
        : value,
  });
}
Object.assign(globalThis, {
  requestAnimationFrame: dom.requestAnimationFrame.bind(dom),
  cancelAnimationFrame: dom.cancelAnimationFrame.bind(dom),
  IS_REACT_ACT_ENVIRONMENT: true,
  fetch: async () =>
    new Response(
      JSON.stringify({
        ready: false,
        image: false,
        video: false,
        message: "Test engine offline",
      }),
      { headers: { "Content-Type": "application/json" } },
    ),
});
const { render, screen, fireEvent, waitFor, cleanup, within } =
  await import("@testing-library/react");
const { Route } = await import("../src/routes/index");
const Studio = Route.options.component as ComponentType;
const storageKey = "take7.project.v1";
function saved(): Project {
  return JSON.parse(localStorage.getItem(storageKey)!);
}
async function mount(project?: Project) {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  dom.location.hash = "";
  if (project) localStorage.setItem(storageKey, JSON.stringify(project));
  render(<Studio />);
  await screen.findByRole("button", { name: /Branch all seven/i });
  await waitFor(() => assert.ok(localStorage.getItem(storageKey)));
}

test("studio persists prompt edits and restores them after remount", async () => {
  await mount();
  const prompt = screen.getByPlaceholderText(
    "A place, a character, an impossible moment…",
  );
  fireEvent.change(prompt, {
    target: { value: "A glass whale floats above İstanbul at sunrise." },
  });
  await waitFor(() =>
    assert.equal(
      saved().takes[0].settings.prompt,
      "A glass whale floats above İstanbul at sunrise.",
    ),
  );
  cleanup();
  render(<Studio />);
  await waitFor(() =>
    assert.equal(
      (
        screen.getByPlaceholderText(
          "A place, a character, an impossible moment…",
        ) as HTMLTextAreaElement
      ).value,
      "A glass whale floats above İstanbul at sunrise.",
    ),
  );
  cleanup();
});
test("branch all seven, favorite, and add selected take to reel persist correctly", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: /Branch all seven/i }));
  await waitFor(() => assert.equal(saved().takes.length, 8));
  const selectedId = saved().selectedId;
  fireEvent.click(screen.getByRole("button", { name: "Save to selects" }));
  await waitFor(() =>
    assert.equal(
      saved().takes.find((t) => t.id === selectedId)?.favorite,
      true,
    ),
  );
  assert.ok(screen.getByRole("button", { name: "Remove from selects" }));
  fireEvent.click(screen.getByRole("button", { name: "Add to reel" }));
  await waitFor(() => assert.deepEqual(saved().sequence, [selectedId]));
  fireEvent.click(screen.getByRole("button", { name: "Add to reel" }));
  assert.deepEqual(
    saved().sequence,
    [selectedId],
    "adding twice must not duplicate the shot",
  );
  cleanup();
});
test("share dialog produces a remix link without job credentials or signed media", async () => {
  const project = newProject();
  project.takes[0].output = {
    type: "image",
    name: "private frame",
    url: "https://example.com/frame.png?token=secret-token",
  };
  project.takes[0].jobId = crypto.randomUUID();
  project.takes[0].status = "succeeded";
  await mount(project);
  sessionStorage.setItem("take7.token", "studio-secret");
  fireEvent.click(screen.getByRole("button", { name: "Share & remix" }));
  const input = (await screen.findByLabelText(
    "REMIX LINK",
  )) as HTMLInputElement;
  const remix = decodeShare(
    new URLSearchParams(new URL(input.value).hash.slice(1)).get("remix")!,
  );
  assert.equal(remix.takes[0].output, undefined);
  assert.equal(remix.takes[0].jobId, undefined);
  assert.ok(!JSON.stringify(remix).includes("secret"));
  cleanup();
});
test("keyboard directions and favorites work outside editors but ignore typed input", async () => {
  await mount();
  fireEvent.keyDown(document.body, { key: "2" });
  await waitFor(() =>
    assert.equal(
      saved().takes.find((t) => t.id === saved().selectedId)?.settings
        .direction,
      "noir",
    ),
  );
  fireEvent.keyDown(document.body, { key: "f" });
  await waitFor(() =>
    assert.equal(
      saved().takes.find((t) => t.id === saved().selectedId)?.favorite,
      true,
    ),
  );
  const prompt = screen.getByPlaceholderText(
    "A place, a character, an impossible moment…",
  );
  fireEvent.keyDown(prompt, { key: "3" });
  fireEvent.keyDown(prompt, { key: "f" });
  assert.equal(
    saved().takes.find((t) => t.id === saved().selectedId)?.settings.direction,
    "noir",
  );
  assert.equal(
    saved().takes.find((t) => t.id === saved().selectedId)?.favorite,
    true,
  );
  cleanup();
});

test("studio themes switch without changing the project and persist on reload", async () => {
  await mount();
  const id = saved().selectedId;
  fireEvent.change(screen.getByRole("combobox", { name: "Visual theme" }), {
    target: { value: "afterlight" },
  });
  await waitFor(() =>
    assert.equal(document.documentElement.dataset.theme, "afterlight"),
  );
  assert.equal(localStorage.getItem("take7.theme"), "afterlight");
  assert.equal(saved().selectedId, id);
  cleanup();
  render(<Studio />);
  await waitFor(() =>
    assert.equal(
      (
        screen.getByRole("combobox", {
          name: "Visual theme",
        }) as HTMLSelectElement
      ).value,
      "afterlight",
    ),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Visual theme" }), {
    target: { value: "soft" },
  });
  await waitFor(() =>
    assert.equal(document.documentElement.dataset.theme, "soft"),
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Visual theme" }), {
    target: { value: "signal" },
  });
  await waitFor(() =>
    assert.equal(document.documentElement.dataset.theme, "signal"),
  );
  cleanup();
});

test("malformed remix preserves the valid saved project and existing recovery", async () => {
  await mount();
  const existing = saved();
  existing.name = "My irreplaceable local board";
  const raw = JSON.stringify(existing);
  cleanup();
  localStorage.setItem(storageKey, raw);
  localStorage.setItem("take7.recovery", "older recovery");
  dom.location.hash = "remix=not-valid-json";
  render(<Studio />);
  await screen.findByRole("button", { name: /Branch all seven/i });
  await waitFor(() => assert.equal(saved().name, existing.name));
  assert.equal(saved().selectedId, existing.selectedId);
  assert.equal(localStorage.getItem("take7.recovery"), "older recovery");
  assert.ok(
    screen.getByText(
      "The remix could not be loaded. Your saved project is still here.",
    ),
  );
  cleanup();
});

test("successful remix backs up the local board before replacing it", async () => {
  await mount();
  const previous = saved();
  const previousRaw = localStorage.getItem(storageKey);
  const remix = newProject();
  remix.name = "A shared new direction";
  cleanup();
  dom.location.hash = `remix=${encodeShare(remix)}`;
  render(<Studio />);
  await screen.findByRole("button", { name: /Branch all seven/i });
  await waitFor(() => assert.equal(saved().name, remix.name));
  assert.equal(saved().selectedId, remix.selectedId);
  assert.equal(localStorage.getItem("take7.recovery"), previousRaw);
  assert.equal(
    JSON.parse(localStorage.getItem("take7.recovery")!).selectedId,
    previous.selectedId,
  );
  assert.equal(dom.location.hash, "");
  cleanup();
});

test("comparison explains changed decisions, constant seeds, and illustration limits", async () => {
  await mount();
  fireEvent.click(screen.getByRole("button", { name: /Branch all seven/i }));
  await waitFor(() => assert.equal(saved().takes.length, 8));
  const noir = saved().takes.find((t) => t.settings.direction === "noir")!;
  fireEvent.click(screen.getByRole("button", { name: "Compare takes" }));
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Choose comparison take" }),
    { target: { value: noir.id } },
  );
  const region = await screen.findByRole("region", {
    name: "Creative decision differences",
  });
  assert.ok(within(region).getByText("3 changed settings"));
  assert.ok(within(region).getByText(/The seed is held constant/));
  assert.ok(within(region).getByText(/Illustrations show the mood only/));
  assert.equal(region.querySelectorAll('tr[data-changed="true"]').length, 3);
  const project = saved();
  project.takes.find((t) => t.id === noir.id)!.settings.seed += 1;
  await mount(project);
  fireEvent.click(screen.getByRole("button", { name: "Compare takes" }));
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Choose comparison take" }),
    { target: { value: noir.id } },
  );
  const changed = await screen.findByRole("region", {
    name: "Creative decision differences",
  });
  assert.ok(within(changed).getByText("4 changed settings"));
  assert.ok(within(changed).getByText(/These takes use different seeds/));
  cleanup();
});

test("Help downloads the original recovery JSON and reports missing recovery", async () => {
  await mount();
  fireEvent.keyDown(document.body, { key: "?" });
  fireEvent.click(
    await screen.findByRole("button", { name: "Download recovery file" }),
  );
  assert.ok(
    screen.getByText("No recovery backup is stored on this device yet."),
  );
  const originalCreate = URL.createObjectURL;
  const originalClick = dom.HTMLAnchorElement.prototype.click;
  let downloaded: Blob | undefined;
  let filename = "";
  URL.createObjectURL = (blob) => {
    downloaded = blob as Blob;
    return "blob:recovery-test";
  };
  dom.HTMLAnchorElement.prototype.click = function () {
    filename = this.download;
  };
  try {
    const raw = JSON.stringify({ original: "Unmodified recovery content 七" });
    localStorage.setItem("take7.recovery", raw);
    fireEvent.click(
      screen.getByRole("button", { name: "Download recovery file" }),
    );
    assert.equal(filename, "take7-recovery.json");
    assert.equal(await downloaded!.text(), raw);
    assert.ok(screen.getByText(/Recovery backup downloaded/));
  } finally {
    URL.createObjectURL = originalCreate;
    dom.HTMLAnchorElement.prototype.click = originalClick;
    cleanup();
  }
});

test("rename project trims and persists a title submitted with Enter", async () => {
  await mount();
  const previous = saved();
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  const input = await screen.findByLabelText("PROJECT NAME");
  fireEvent.change(input, { target: { value: "  Seventh heaven 七  " } });
  // Submitting the form exercises the same handler used by Enter in its input.
  fireEvent.submit(input.closest("form")!);
  await waitFor(() => assert.equal(saved().name, "Seventh heaven 七"));
  assert.deepEqual(saved().takes, previous.takes);
  assert.equal(screen.queryByRole("dialog"), null);
  cleanup();
  render(<Studio />);
  await waitFor(() =>
    assert.equal(
      screen.getByRole("button", { name: "Rename project" }).textContent,
      "Seventh heaven 七",
    ),
  );
  cleanup();
});

test("rename cancel and invalid names leave the saved title unchanged", async () => {
  await mount();
  const previous = saved().name;
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  let input = await screen.findByLabelText("PROJECT NAME");
  fireEvent.change(input, { target: { value: "Discard this title" } });
  fireEvent.click(screen.getByRole("button", { name: "Cancel rename" }));
  assert.equal(saved().name, previous);
  fireEvent.click(screen.getByRole("button", { name: "Rename project" }));
  input = await screen.findByLabelText("PROJECT NAME");
  assert.equal((input as HTMLInputElement).value, previous);
  for (const invalid of ["   ", "x".repeat(101)]) {
    fireEvent.change(input, { target: { value: invalid } });
    assert.equal(
      (
        screen.getByRole("button", {
          name: "Save project name",
        }) as HTMLButtonElement
      ).disabled,
      true,
    );
    assert.equal(input.getAttribute("aria-invalid"), "true");
    fireEvent.submit(input.closest("form")!);
    assert.equal(saved().name, previous);
    assert.ok(screen.getByRole("dialog"));
  }
  cleanup();
});

test("reel stepping, jumping and reorder preserve the previewed take; leaving stops playback", async () => {
  const source = newProject();
  const project = branchSeven(source, source.takes[0]);
  project.sequence = project.takes.slice(1, 4).map((t) => t.id);
  await mount(project);
  const nav = within(screen.getByRole("navigation", { name: "Workspace" }));
  fireEvent.click(nav.getByRole("button", { name: /Decision reel/ }));
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Previous reel take",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  assert.equal(
    screen
      .getByRole("button", { name: "Jump to reel take 1" })
      .getAttribute("aria-current"),
    "step",
  );
  fireEvent.click(screen.getByRole("button", { name: "Next reel take" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Jump to reel take 2" })
      .getAttribute("aria-current"),
    "step",
  );
  assert.ok(screen.getByRole("heading", { name: "After hours" }));
  fireEvent.click(screen.getByRole("button", { name: "Previous reel take" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Jump to reel take 1" })
      .getAttribute("aria-current"),
    "step",
  );
  fireEvent.click(screen.getByRole("button", { name: "Jump to reel take 3" }));
  assert.ok(screen.getByRole("heading", { name: "Fever dream" }));
  assert.equal(
    (
      screen.getByRole("button", {
        name: "Next reel take",
      }) as HTMLButtonElement
    ).disabled,
    true,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Move Fever dream earlier" }),
  );
  assert.ok(screen.getByRole("heading", { name: "Fever dream" }));
  assert.equal(
    screen
      .getByRole("button", { name: "Jump to reel take 2" })
      .getAttribute("aria-current"),
    "step",
  );
  assert.equal(saved().sequence[1], project.sequence[2]);
  fireEvent.click(screen.getByRole("button", { name: "Play storyboard" }));
  assert.ok(screen.getByRole("button", { name: "Pause" }));
  fireEvent.click(nav.getByRole("button", { name: /Studio/ }));
  fireEvent.click(nav.getByRole("button", { name: /Decision reel/ }));
  assert.ok(screen.getByRole("button", { name: "Play storyboard" }));
  assert.equal(screen.queryByRole("button", { name: "Pause" }), null);
  cleanup();
});

test("story arc previews are local and build seven reproducible video drafts into the reel", async () => {
  const project = newProject();
  project.sequence = [project.selectedId];
  project.takes[0].settings.seed = 777;
  project.takes[0].settings.ratio = "9:16";
  const source = project.takes[0];
  await mount(project);
  const initial = JSON.stringify(saved());
  const originalFetch = globalThis.fetch;
  const requests: unknown[] = [];
  globalThis.fetch = async (...args) => {
    requests.push(args);
    return originalFetch(...args);
  };
  try {
    fireEvent.click(screen.getByRole("button", { name: "Build a story arc" }));
    const dialog = await screen.findByRole("dialog");
    assert.ok(within(dialog).getByText(/Direct the emotional journey/));
    for (const arc of storyArcs) {
      fireEvent.click(
        within(dialog).getByRole("button", { name: new RegExp(arc.name) }),
      );
      assert.equal(
        within(dialog)
          .getByRole("button", { name: new RegExp(arc.name) })
          .getAttribute("aria-pressed"),
        "true",
      );
      assert.ok(within(dialog).getByText(arc.beats[0].title));
      assert.equal(
        JSON.stringify(saved()),
        initial,
        "previewing must not modify the project",
      );
    }
    fireEvent.click(
      within(dialog).getByRole("button", { name: "Create seven-shot story" }),
    );
    await waitFor(() => assert.equal(saved().takes.length, 8));
    const result = saved();
    assert.deepEqual(result.takes[0], JSON.parse(JSON.stringify(source)));
    assert.deepEqual(result.sequence, [
      source.id,
      ...result.takes.slice(1).map((t) => t.id),
    ]);
    for (const take of result.takes.slice(1)) {
      assert.equal(take.settings.kind, "video");
      assert.equal(take.status, "draft");
      assert.equal(take.settings.seed, source.settings.seed);
      assert.equal(take.settings.ratio, source.settings.ratio);
      assert.ok(take.settings.prompt.startsWith(source.settings.prompt));
      assert.equal(take.parentId, source.id);
      assert.equal(take.jobId, undefined);
      assert.equal(take.output, undefined);
    }
    assert.ok(screen.getByRole("button", { name: "Play storyboard" }));
    assert.equal(
      screen
        .getByRole("button", { name: "Jump to reel take 2" })
        .getAttribute("aria-current"),
      "step",
    );
    assert.equal(
      requests.length,
      0,
      "authoring drafts must not request generation or incur provider usage",
    );
  } finally {
    globalThis.fetch = originalFetch;
    cleanup();
  }
});

test("story arc build is disabled when the board cannot fit seven more drafts", async () => {
  const project = newProject();
  project.takes.push(
    ...Array.from({ length: 93 }, () => newTake(project.takes[0].settings)),
  );
  await mount(project);
  fireEvent.click(screen.getByRole("button", { name: "Build a story arc" }));
  const build = await screen.findByRole("button", {
    name: "Create seven-shot story",
  });
  assert.equal((build as HTMLButtonElement).disabled, true);
  assert.ok(screen.getByText(/This board needs room for seven more takes/));
  fireEvent.click(build);
  assert.equal(saved().takes.length, 94);
  assert.equal(saved().sequence.length, 0);
  cleanup();
});
