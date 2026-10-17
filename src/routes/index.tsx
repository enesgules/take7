import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Tabs } from "@base-ui/react/tabs";
import { Switch } from "@base-ui/react/switch";
import { Button } from "@base-ui/react/button";
import { Icon } from "../components/Icon";
import { Scene } from "../components/Scene";
import { DecisionComparison } from "../components/DecisionComparison";
import { StoryComposer } from "../components/StoryComposer";
import { buildStoryArc } from "../lib/story";
import { ThemePicker } from "../components/ThemePicker";
import {
  downloadContactSheet,
  downloadShotList,
  exportWorkflow,
} from "../lib/exports";
import {
  branchSeven,
  buildPrompt,
  decodeShare,
  directions,
  encodeShare,
  initialSettings,
  newProject,
  newTake,
  portableProject,
  projectSchema,
  type Project,
  type Settings,
  type Take,
} from "../lib/studio";
export const Route = createFileRoute("/")({ component: Studio });
type Modal =
  | "connect"
  | "share"
  | "compare"
  | "preview"
  | "help"
  | "new"
  | "rename"
  | "story"
  | null;
type Connection = {
  ready: boolean;
  image: boolean;
  video: boolean;
  message: string;
};
const storageKey = "take7.project.v1";
function download(name: string, data: string, type = "application/json") {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function Media({ take, small = false }: { take: Take; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [take.output?.url]);
  if (!take.output)
    return <Scene direction={take.settings.direction} small={small} />;
  if (failed)
    return (
      <div className="media-unavailable" role="status">
        <Icon name="film" size={small ? 18 : 30} />
        <strong>Output unavailable</strong>
        {!small && (
          <p>
            The source may have expired. Check your Comfy workspace or render a
            new branch.
          </p>
        )}
      </div>
    );
  return take.output.type === "video" ? (
    <video
      src={take.output.url}
      controls={!small}
      muted={small}
      playsInline
      onError={() => setFailed(true)}
    />
  ) : (
    <img
      src={take.output.url}
      alt={`${take.title} generated take`}
      onError={() => setFailed(true)}
    />
  );
}
function Studio() {
  const [project, setProject] = useState<Project | null>(null),
    [modal, setModal] = useState<Modal>(null),
    [view, setView] = useState("studio"),
    [tab, setTab] = useState("directions"),
    [notice, setNotice] = useState(""),
    [connection, setConnection] = useState<Connection>({
      ready: false,
      image: false,
      video: false,
      message: "Checking your render engine…",
    }),
    [busy, setBusy] = useState(false),
    [token, setToken] = useState(""),
    [seedLock, setSeedLock] = useState(true),
    [compareId, setCompareId] = useState(""),
    [playing, setPlaying] = useState(false),
    [playIndex, setPlayIndex] = useState(0),
    [shareUrl, setShareUrl] = useState(""),
    [newName, setNewName] = useState(""),
    [renameName, setRenameName] = useState(""),
    [query, setQuery] = useState(""),
    [saveStatus, setSaveStatus] = useState("Saved on this device");
  const fileInput = useRef<HTMLInputElement>(null),
    submitLock = useRef(false);
  const notify = (message: string) => setNotice(message);
  useEffect(() => {
    let localProject: Project | null = null;
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(storageKey);
      if (raw) localProject = projectSchema.parse(JSON.parse(raw));
    } catch {
      try {
        if (raw) localStorage.setItem("take7.recovery", raw);
      } catch {
        /* Storage can be unavailable in private mode. */
      }
      notify(
        "The saved project could not be read. Your original stored file was not imported.",
      );
    }
    const shared = new URLSearchParams(location.hash.slice(1)).get("remix");
    let nextProject = localProject ?? newProject();
    if (shared !== null) {
      try {
        const remix = portableProject(decodeShare(shared));
        // Preserve the current board before the persistence effect replaces it.
        // If storage rejects the backup, retain the local board instead.
        if (localProject && raw) localStorage.setItem("take7.recovery", raw);
        nextProject = remix;
        notify(
          localProject
            ? "Remix loaded. Your previous board is preserved in device recovery."
            : "Remix loaded. A new direction starts with you.",
        );
        try {
          window.history.replaceState(
            null,
            "",
            location.pathname + location.search,
          );
        } catch {
          /* History may be restricted in embedded browsing contexts. */
        }
      } catch {
        notify(
          localProject
            ? "The remix could not be loaded. Your saved project is still here."
            : "The remix could not be loaded. A new project is ready to explore.",
        );
      }
    }
    setProject(nextProject);
    try {
      setToken(sessionStorage.getItem("take7.token") || "");
    } catch {
      notify("Private browsing may not preserve your studio unlock.");
    }
    void fetch("/api/studio")
      .then((r) => r.json())
      .then(setConnection)
      .catch(() =>
        setConnection({
          ready: false,
          image: false,
          video: false,
          message:
            "Render service unavailable. You can still edit and export projects.",
        }),
      );
  }, []);
  useEffect(() => {
    if (!project) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(project));
      setSaveStatus("Saved on this device");
    } catch {
      setSaveStatus("Not saved — export your project");
      notify(
        "Device storage is full or unavailable. Export your project to keep your work.",
      );
    }
  }, [project]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 6000);
    return () => clearTimeout(timer);
  }, [notice]);
  const selected =
    project?.takes.find((t) => t.id === project.selectedId) ??
    project?.takes[0];
  const d =
    directions.find((d) => d.id === selected?.settings.direction) ??
    directions[0];
  const pending =
    project?.takes.filter(
      (t) => t.jobId && ["queued", "running", "canceling"].includes(t.status),
    ) ?? [];
  const jobKey = pending.map((t) => t.jobId).join(",");
  useEffect(() => {
    if (!jobKey || !token) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      for (const jobId of jobKey.split(",")) {
        try {
          const res = await fetch(`/api/studio?job=${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const result = await res.json();
          if (!res.ok) throw new Error(result.error || "Cannot check render");
          if (stopped) return;
          setProject((p) =>
            p
              ? {
                  ...p,
                  takes: p.takes.map((t) =>
                    t.jobId === jobId
                      ? {
                          ...t,
                          status: result.status,
                          output: result.output ?? t.output,
                          error: result.error,
                        }
                      : t,
                  ),
                }
              : p,
          );
        } catch (err) {
          if (!stopped)
            setNotice(
              err instanceof Error ? err.message : "Could not check render",
            );
        }
      }
      if (!stopped) timer = setTimeout(poll, 3000);
    }
    void poll();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [jobKey, token]);
  useEffect(() => {
    if (!playing || view !== "sequence" || !project?.sequence.length) return;
    const timer = setInterval(
      () => setPlayIndex((i) => (i + 1) % project.sequence.length),
      4000,
    );
    return () => clearInterval(timer);
  }, [playing, view, project?.sequence.length]);
  useEffect(() => {
    setPlaying(false);
  }, [view]);
  useEffect(() => {
    setPlaying(false);
    setPlayIndex(0);
  }, [project?.takes[0]?.id]);
  function updateTake(patch: Partial<Take>) {
    if (!selected) return;
    setProject((p) =>
      p
        ? {
            ...p,
            takes: p.takes.map((t) =>
              t.id === selected.id ? { ...t, ...patch } : t,
            ),
          }
        : p,
    );
  }
  function settings(patch: Partial<Settings>) {
    if (!selected || !project) return;
    const next = { ...selected.settings, ...patch };
    if (selected.status !== "draft") {
      if (project.takes.length >= 100)
        return notify("Project limit reached. Export and start a new project.");
      const t = newTake(next, selected.id);
      setProject({
        ...project,
        takes: [...project.takes, t],
        selectedId: t.id,
      });
    } else
      updateTake({
        settings: next,
        title: patch.direction
          ? directions.find((d) => d.id === next.direction)!.name
          : selected.title,
      });
  }
  function selectDirection(id: Settings["direction"]) {
    const next = directions.find((d) => d.id === id)!;
    settings({ direction: id, lens: next.lens, camera: next.camera });
  }
  function explore() {
    if (!project || !selected) return;
    try {
      setProject(branchSeven(project, selected));
      setTab("takes");
      notify("Seven directions, one shared seed. Choose a take to render.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function branch() {
    if (!project || !selected) return;
    if (project.takes.length >= 100) return notify("Project limit reached.");
    const t = newTake(selected.settings, selected.id);
    setProject({ ...project, takes: [...project.takes, t], selectedId: t.id });
    notify("New branch created. Change one decision and see where it goes.");
  }
  async function generate() {
    if (!project || !selected || submitLock.current) return;
    if (
      !connection.ready ||
      !token ||
      !(selected.settings.kind === "video"
        ? connection.video
        : connection.image)
    ) {
      setModal("connect");
      return;
    }
    submitLock.current = true;
    setBusy(true);
    let target = selected;
    let nextSettings = {
      ...selected.settings,
      seed: seedLock
        ? selected.settings.seed
        : Math.floor(Math.random() * 2147483647),
    };
    if (selected.status !== "draft") {
      if (project.takes.length >= 100) {
        submitLock.current = false;
        setBusy(false);
        return notify("Project limit reached.");
      }
      target = { ...newTake(nextSettings, selected.id), status: "queued" };
      setProject((p) =>
        p ? { ...p, takes: [...p.takes, target], selectedId: target.id } : p,
      );
    } else
      setProject((p) =>
        p
          ? {
              ...p,
              takes: p.takes.map((t) =>
                t.id === target.id
                  ? {
                      ...t,
                      settings: nextSettings,
                      status: "queued",
                      error: undefined,
                    }
                  : t,
              ),
            }
          : p,
      );
    try {
      const response = await fetch("/api/studio", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ settings: nextSettings, requestId: target.id }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Render could not start");
      setProject((p) =>
        p
          ? {
              ...p,
              takes: p.takes.map((t) =>
                t.id === target.id
                  ? {
                      ...t,
                      jobId: result.id,
                      status: result.status,
                      error: undefined,
                    }
                  : t,
              ),
            }
          : p,
      );
      notify("Take sent to Comfy. You can keep exploring while it renders.");
    } catch (error) {
      setProject((p) =>
        p
          ? {
              ...p,
              takes: p.takes.map((t) =>
                t.id === target.id
                  ? { ...t, status: "failed", error: (error as Error).message }
                  : t,
              ),
            }
          : p,
      );
      notify((error as Error).message);
    } finally {
      setBusy(false);
      submitLock.current = false;
    }
  }
  async function cancel() {
    if (!selected?.jobId) return;
    try {
      const r = await fetch("/api/studio", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ jobId: selected.jobId }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error);
      updateTake({ status: data.status });
      notify("Cancellation requested.");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function addSequence() {
    if (!project || !selected) return;
    if (project.sequence.includes(selected.id))
      return notify("This take is already in your sequence.");
    setProject({ ...project, sequence: [...project.sequence, selected.id] });
    notify("Added to your decision reel.");
  }
  function exportProject() {
    if (project)
      download(
        "take7-project.json",
        JSON.stringify(portableProject(project), null, 2),
      );
  }
  async function importFile(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2_000_000)
        throw new Error("Project files must be smaller than 2 MB.");
      const p = projectSchema.parse(JSON.parse(await file.text()));
      if (project)
        download(
          "take7-backup.json",
          JSON.stringify(portableProject(project), null, 2),
        );
      setProject(portableProject(p));
      notify(
        "Project imported. A backup of your previous project was downloaded.",
      );
    } catch {
      notify(
        "That file is not a valid TAKE7 project. Your current project is unchanged.",
      );
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  function openShare() {
    if (!project) return;
    try {
      setShareUrl(`${location.origin}/#remix=${encodeShare(project)}`);
      setModal("share");
    } catch (e) {
      notify((e as Error).message);
    }
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify("Copied to clipboard.");
    } catch {
      notify("Clipboard unavailable. Select and copy the text manually.");
    }
  }
  function moveSequence(i: number, delta: number) {
    if (!project) return;
    const destination = i + delta;
    if (
      i < 0 ||
      destination < 0 ||
      i >= project.sequence.length ||
      destination >= project.sequence.length
    )
      return;
    const currentId = project.sequence[playIndex];
    const seq = [...project.sequence];
    [seq[i], seq[destination]] = [seq[destination], seq[i]];
    setPlayIndex(Math.max(0, seq.indexOf(currentId)));
    setProject({ ...project, sequence: seq });
  }
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      const element = event.target as HTMLElement;
      if (
        modal ||
        element.closest("input,textarea,select,[contenteditable=true]") ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey
      )
        return;
      const n = Number(event.key);
      if (n >= 1 && n <= 7) {
        event.preventDefault();
        selectDirection(directions[n - 1].id);
      }
      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        branch();
      }
      if (event.key.toLowerCase() === "f" && selected) {
        event.preventDefault();
        updateTake({ favorite: !selected.favorite });
      }
      if (event.key === "?") setModal("help");
      if (event.key === "/") {
        event.preventDefault();
        document.getElementById("scene-prompt")?.focus();
      }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [project, selected, modal]);
  function downloadRecovery() {
    try {
      const raw = localStorage.getItem("take7.recovery");
      if (!raw)
        return notify("No recovery backup is stored on this device yet.");
      download("take7-recovery.json", raw);
      notify(
        "Recovery backup downloaded. Import it to reopen your previous board.",
      );
    } catch {
      notify(
        "The recovery backup could not be accessed. Check browser storage permissions.",
      );
    }
  }
  async function contactSheet() {
    if (!project) return;
    notify("Preparing your director’s contact sheet…");
    try {
      await downloadContactSheet(project);
      notify("Contact sheet downloaded. Ready to share.");
    } catch (error) {
      notify((error as Error).message);
    }
  }
  if (!project || !selected)
    return (
      <div className="loading">
        <div className="brand">
          TAKE<span>7</span>
        </div>
        <p>Opening your studio…</p>
      </div>
    );
  const takeList = project.takes.filter(
    (t) =>
      (view !== "favorites" || t.favorite) &&
      `${t.title} ${t.settings.prompt}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const compare =
    project.takes.find((t) => t.id === compareId) ??
    project.takes.find((t) => t.id !== selected.id);
  const reelTake =
    project.takes.find((t) => t.id === project.sequence[playIndex]) ?? selected;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="brand" aria-label="TAKE7 home">
          TAKE<span>7</span>
          <i />
        </a>
        <div className="workspace-label">YOUR CREATIVE PLAYGROUND</div>
        <nav aria-label="Workspace">
          <button
            className={view === "studio" ? "nav-item active" : "nav-item"}
            onClick={() => setView("studio")}
          >
            <Icon name="grid" />
            Studio<span className="nav-number">01</span>
          </button>
          <button
            className={view === "favorites" ? "nav-item active" : "nav-item"}
            onClick={() => {
              setView("favorites");
              setTab("takes");
            }}
          >
            <Icon name="heart" />
            Selects
            <span className="count">
              {project.takes.filter((t) => t.favorite).length}
            </span>
          </button>
          <button
            className={view === "sequence" ? "nav-item active" : "nav-item"}
            onClick={() => setView("sequence")}
          >
            <Icon name="film" />
            Decision reel
            <span className="count">{project.sequence.length}</span>
          </button>
        </nav>
        <div className="side-heading">
          CURRENT PROJECT
          <button
            title="New project"
            aria-label="New project"
            onClick={() => setModal("new")}
          >
            <Icon name="plus" size={16} />
          </button>
        </div>
        <button className="project-item" onClick={() => setView("studio")}>
          <span className="project-thumb">
            <Scene direction="wonder" small />
          </span>
          <span>
            {project.name}
            <small>
              {project.takes.length}{" "}
              {project.takes.length === 1 ? "take" : "takes"} · Local project
            </small>
          </span>
        </button>
        <div className="sidebar-note">
          <span className="asterisk">✳</span>
          <h3>
            Follow the
            <br />
            unexpected.
          </h3>
          <p>
            Your first idea is just
            <br />
            one of seven possibilities.
          </p>
          <button onClick={() => setModal("help")}>
            Meet TAKE7 <Icon name="right" size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <a className="brand-link" href="/brand">
            <Icon name="layers" />
            The TAKE7 identity <Icon name="right" size={13} />
          </a>
          <button onClick={() => fileInput.current?.click()}>
            <Icon name="upload" />
            Import project
          </button>
          <button onClick={() => setModal("connect")}>
            <Icon name="settings" />
            Render connection
            <span
              className={`status-dot ${connection.ready ? "online" : ""}`}
            />
          </button>
          <div className="open-source">
            <span>OPEN BY DESIGN</span>
            <span>↗</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <button
              className="text-button"
              aria-label="Rename project"
              title="Rename project"
              onClick={() => {
                setRenameName(project.name);
                setModal("rename");
              }}
            >
              <strong>{project.name}</strong>
            </button>
            <span className="local-badge">LOCAL</span>
          </div>
          <div className="top-actions">
            <ThemePicker />
            <span className="save-state">
              <Icon name="check" size={14} />
              {saveStatus}
            </span>
            <button className="button subtle" onClick={exportProject}>
              <Icon name="download" />
              Export
            </button>
            <Button className="button light" onClick={openShare}>
              <Icon name="share" size={16} />
              Share & remix
            </Button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                <span />
                THE DIRECTOR’S PLAYGROUND
              </div>
              <h1>
                {view === "sequence" ? (
                  "Every choice tells a story."
                ) : view === "favorites" ? (
                  "The ones worth keeping."
                ) : (
                  <>
                    One scene. <em>Seven possibilities.</em>
                  </>
                )}
              </h1>
              <p>
                {view === "sequence"
                  ? "Arrange your takes. Play the journey. Let someone else take it somewhere new."
                  : view === "favorites"
                    ? "Your favorite directions, ready for their next act."
                    : "A different mood. A different camera. A story you didn’t see coming."}
              </p>
            </div>
            <button className="text-button" onClick={() => setModal("help")}>
              <Icon name="info" size={16} />
              How it works
            </button>
          </div>
          {view === "sequence" ? (
            <section className="reel-workspace">
              <div className="reel-screen">
                <Media take={reelTake} />
                <span className="media-label">
                  {reelTake.output ? "RENDERED TAKE" : "DEMO ARTWORK"}
                </span>
                <div className="reel-overlay">
                  <span>TAKE7 / DECISION REEL</span>
                  <h2>{reelTake.title}</h2>
                </div>
              </div>
              <div className="reel-controls">
                <button
                  className="icon-button"
                  aria-label="Previous reel take"
                  disabled={!project.sequence.length || playIndex === 0}
                  onClick={() => {
                    setPlaying(false);
                    setPlayIndex((i) => Math.max(0, i - 1));
                  }}
                >
                  <Icon name="left" />
                </button>
                <button
                  className="button primary"
                  disabled={!project.sequence.length}
                  onClick={() => setPlaying(!playing)}
                >
                  <Icon name={playing ? "pause" : "play"} />
                  {playing ? "Pause" : "Play storyboard"}
                </button>
                <button
                  className="icon-button"
                  aria-label="Next reel take"
                  disabled={
                    !project.sequence.length ||
                    playIndex >= project.sequence.length - 1
                  }
                  onClick={() => {
                    setPlaying(false);
                    setPlayIndex((i) =>
                      Math.min(project.sequence.length - 1, i + 1),
                    );
                  }}
                >
                  <Icon name="right" />
                </button>
                <p role="status" aria-live="off">
                  {project.sequence.length
                    ? `Take ${playIndex + 1} of ${project.sequence.length} · `
                    : ""}
                  {project.sequence.length * 4}s storyboard · 4s per card
                </p>
                <button className="button subtle" onClick={openShare}>
                  <Icon name="share" />
                  Share remix
                </button>
              </div>
              {project.sequence.length > 0 && (
                <div className="reel-timeline" aria-label="Storyboard timeline">
                  {project.sequence.map((id, i) => (
                    <button
                      key={id}
                      className={i === playIndex ? "active" : ""}
                      aria-label={`Jump to reel take ${i + 1}`}
                      aria-current={i === playIndex ? "step" : undefined}
                      onClick={() => {
                        setPlaying(false);
                        setPlayIndex(i);
                      }}
                    >
                      <span>{String(i + 1).padStart(2, "0")}</span>
                      <span>{i * 4}s</span>
                    </button>
                  ))}
                </div>
              )}
              {!project.sequence.length ? (
                <div className="empty-state">
                  <Icon name="film" size={30} />
                  <h3>Your reel starts with a decision.</h3>
                  <p>
                    Add takes from the studio to tell the story of your
                    exploration.
                  </p>
                  <button
                    className="button light"
                    onClick={() => setView("studio")}
                  >
                    Back to studio <Icon name="right" />
                  </button>
                </div>
              ) : (
                <div className="sequence-list">
                  {project.sequence.map((id, i) => {
                    const t = project.takes.find((t) => t.id === id)!;
                    return (
                      <div
                        className={`sequence-row ${i === playIndex ? "is-current" : ""}`}
                        key={id}
                      >
                        <span className="mono">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <button
                          className="sequence-thumb"
                          onClick={() => {
                            setPlaying(false);
                            setPlayIndex(i);
                          }}
                          aria-label={`Preview ${t.title}`}
                        >
                          <Media take={t} small />
                        </button>
                        <div>
                          <button
                            className="reel-edit-take"
                            aria-label={`Edit ${t.title}`}
                            onClick={() => {
                              setProject({ ...project, selectedId: t.id });
                              setView("studio");
                            }}
                          >
                            <strong>{t.title}</strong>
                            <span>Open in studio ↗</span>
                          </button>
                          <p>
                            {t.settings.camera} · {t.settings.lens}
                          </p>
                        </div>
                        <button
                          className="icon-button"
                          disabled={i === 0}
                          onClick={() => moveSequence(i, -1)}
                          aria-label={`Move ${t.title} earlier`}
                        >
                          <Icon name="left" />
                        </button>
                        <button
                          className="icon-button"
                          disabled={i === project.sequence.length - 1}
                          onClick={() => moveSequence(i, 1)}
                          aria-label={`Move ${t.title} later`}
                        >
                          <Icon name="right" />
                        </button>
                        <button
                          className="icon-button"
                          aria-label={`Remove ${t.title} from reel`}
                          onClick={() => {
                            setPlaying(false);
                            setPlayIndex(0);
                            setProject({
                              ...project,
                              sequence: project.sequence.filter(
                                (x) => x !== id,
                              ),
                            });
                          }}
                        >
                          <Icon name="close" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          ) : (
            <>
              <section className="studio-grid">
                <div className="viewer-panel">
                  <div className="panel-toolbar">
                    <div>
                      <span className="live-dot" />
                      SCENE 01
                      <span className="toolbar-divider" /> {selected.title}
                    </div>
                    <div>
                      <button
                        className={`icon-button ${selected.favorite ? "favorited" : ""}`}
                        aria-label={
                          selected.favorite
                            ? "Remove from selects"
                            : "Save to selects"
                        }
                        onClick={() =>
                          updateTake({ favorite: !selected.favorite })
                        }
                      >
                        <Icon name="heart" />
                      </button>
                      <button
                        className="icon-button"
                        aria-label="Expand preview"
                        onClick={() => setModal("preview")}
                      >
                        <Icon name="layers" />
                      </button>
                    </div>
                  </div>
                  <div
                    className={`viewer ratio-${selected.settings.ratio.replace(":", "-")}`}
                  >
                    <Media take={selected} />
                    <div className="viewfinder-corner tl" />
                    <div className="viewfinder-corner tr" />
                    <div className="viewfinder-corner bl" />
                    <div className="viewfinder-corner br" />
                    <div className="viewer-top">
                      <span className="media-label">
                        {selected.output ? "COMFY OUTPUT" : "DEMO ARTWORK"}
                      </span>
                      <span>
                        {selected.settings.ratio} <i /> {selected.settings.lens}
                      </span>
                    </div>
                    <div className="viewer-caption">
                      <div>
                        <span>
                          {project.name.toUpperCase()} /{" "}
                          {String(project.takes.indexOf(selected) + 1).padStart(
                            2,
                            "0",
                          )}
                        </span>
                        <h2>
                          {selected.title}
                          <i style={{ background: d.color }} />
                        </h2>
                      </div>
                      <button
                        className="round-button"
                        aria-label="Open take preview"
                        onClick={() => setModal("preview")}
                      >
                        <Icon name="play" size={22} />
                      </button>
                    </div>
                  </div>
                  <div className="viewer-footer">
                    <span>
                      <Icon name="branch" size={15} />
                      {selected.parentId ? "Branched take" : "Original scene"}
                      <span className="separator">·</span>
                      <span className="mono">
                        SEED {selected.settings.seed}
                      </span>
                    </span>
                    <button
                      className="text-button"
                      onClick={() => {
                        setCompareId(
                          project.takes.find((t) => t.id !== selected.id)?.id ||
                            "",
                        );
                        setModal("compare");
                      }}
                      disabled={project.takes.length < 2}
                    >
                      Compare takes <Icon name="layers" size={15} />
                    </button>
                  </div>
                  <div className="prompt-box">
                    <label htmlFor="scene-prompt">
                      THE SCENE<span>Your story. Before the plot twist.</span>
                    </label>
                    <textarea
                      id="scene-prompt"
                      value={selected.settings.prompt}
                      maxLength={2000}
                      onChange={(e) => settings({ prompt: e.target.value })}
                      placeholder="A place, a character, an impossible moment…"
                    />
                    <div>
                      <span>
                        <Icon name="info" size={13} />
                        The same scene anchors every direction.
                      </span>
                      <button
                        className="icon-button"
                        aria-label="Reset scene prompt"
                        onClick={() =>
                          settings({ prompt: initialSettings.prompt })
                        }
                      >
                        <Icon name="refresh" size={15} />
                      </button>
                    </div>
                  </div>
                </div>
                <aside className="inspector">
                  <div className="inspector-title">
                    <h2>Direct this take</h2>
                    <span className="mono">
                      0{directions.indexOf(d) + 1} / 07
                    </span>
                  </div>
                  <div className="direction-tag">
                    <span style={{ background: d.color }} />
                    <div>
                      <strong>{d.name}</strong>
                      <p>{d.subtitle}</p>
                    </div>
                  </div>
                  <div className="inspector-fields">
                    <label>
                      CAMERA MOVEMENT
                      <select
                        value={selected.settings.camera}
                        onChange={(e) =>
                          settings({
                            camera: e.target.value as Settings["camera"],
                          })
                        }
                      >
                        {[
                          "Slow push in",
                          "Locked off",
                          "Orbit",
                          "Handheld",
                          "Slow pull back",
                          "Gentle pan",
                          "Crane up",
                        ].map((v) => (
                          <option key={v}>{v}</option>
                        ))}
                      </select>
                    </label>
                    <div className="two-fields">
                      <label>
                        LENS
                        <select
                          value={selected.settings.lens}
                          onChange={(e) =>
                            settings({
                              lens: e.target.value as Settings["lens"],
                            })
                          }
                        >
                          {["18mm", "24mm", "28mm", "35mm", "50mm", "85mm"].map(
                            (v) => (
                              <option key={v}>{v}</option>
                            ),
                          )}
                        </select>
                      </label>
                      <label>
                        FRAME
                        <select
                          value={selected.settings.ratio}
                          onChange={(e) =>
                            settings({
                              ratio: e.target.value as Settings["ratio"],
                            })
                          }
                        >
                          {["16:9", "9:16", "1:1"].map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                    <label>
                      OUTPUT
                      <select
                        value={selected.settings.kind}
                        onChange={(e) =>
                          settings({ kind: e.target.value as Settings["kind"] })
                        }
                      >
                        <option value="image">Still frame · SDXL</option>
                        <option value="video">Motion · LTX workflow</option>
                      </select>
                    </label>
                    <div className="seed-heading">
                      <label htmlFor="seed">SEED</label>
                      <label className="switch-label">
                        <Switch.Root
                          className="switch"
                          checked={seedLock}
                          onCheckedChange={setSeedLock}
                        >
                          <Switch.Thumb className="switch-thumb" />
                        </Switch.Root>
                        Lock
                      </label>
                    </div>
                    <input
                      id="seed"
                      className="seed-input mono"
                      type="number"
                      min="0"
                      max="2147483647"
                      value={selected.settings.seed}
                      onChange={(e) =>
                        settings({
                          seed: Math.max(
                            0,
                            Math.min(
                              2147483647,
                              Math.floor(Number(e.target.value)),
                            ),
                          ),
                        })
                      }
                    />
                    <p className="field-note">
                      Lock the seed to explore creative differences with the
                      same starting noise.
                    </p>
                  </div>
                  <div className="render-box">
                    {selected.error && (
                      <p className="inline-error" role="alert">
                        {selected.error}
                      </p>
                    )}
                    {["queued", "running", "canceling"].includes(
                      selected.status,
                    ) ? (
                      <>
                        <p className="render-status">
                          <span className="spinner" />
                          {selected.status === "queued"
                            ? "Queued on Comfy"
                            : selected.status === "canceling"
                              ? "Canceling render"
                              : "Rendering on Comfy"}
                        </p>
                        <button className="button subtle full" onClick={cancel}>
                          Cancel render
                        </button>
                      </>
                    ) : (
                      <Button
                        className="button primary full"
                        onClick={generate}
                        disabled={
                          busy || selected.settings.prompt.trim().length < 3
                        }
                      >
                        <Icon name="magic" />
                        {busy
                          ? "Sending take…"
                          : connection.ready
                            ? "Render this take"
                            : "Connect to render"}
                        <Icon name="right" size={16} />
                      </Button>
                    )}
                    <p>
                      <span
                        className={`status-dot ${connection.ready ? "online" : ""}`}
                      />
                      {connection.ready
                        ? "Your Comfy engine · usage billed by provider"
                        : "No engine connected · explore for free"}
                    </p>
                  </div>
                  <div className="inspector-actions">
                    <button onClick={branch}>
                      <Icon name="branch" />
                      Branch take
                    </button>
                    <button onClick={addSequence}>
                      <Icon name="plus" />
                      Add to reel
                    </button>
                  </div>
                </aside>
              </section>
              <section className="story-invitation">
                <div>
                  <span className="eyebrow">FROM A FRAME TO A FILM</span>
                  <h2>Give your scene somewhere to go.</h2>
                  <p>
                    Seven beats. A shared world. Choose the emotional journey,
                    then direct every shot.
                  </p>
                </div>
                <button
                  className="button light"
                  onClick={() => setModal("story")}
                >
                  <Icon name="film" />
                  Build a story arc
                  <Icon name="right" />
                </button>
              </section>
              <section className="exploration">
                <Tabs.Root
                  value={tab}
                  onValueChange={(value) => setTab(String(value))}
                >
                  <div className="exploration-heading">
                    <Tabs.List className="tabs" aria-label="Explore scenes">
                      <Tabs.Tab className="tab" value="directions">
                        The seven directions <span>07</span>
                      </Tabs.Tab>
                      <Tabs.Tab className="tab" value="takes">
                        Your takes{" "}
                        <span>
                          {project.takes.length.toString().padStart(2, "0")}
                        </span>
                      </Tabs.Tab>
                      <Tabs.Tab className="tab" value="history">
                        Decision trail
                      </Tabs.Tab>
                    </Tabs.List>
                    <button className="text-button orange" onClick={explore}>
                      <Icon name="magic" size={16} />
                      Branch all seven <Icon name="right" size={15} />
                    </button>
                  </div>
                  <Tabs.Panel value="directions">
                    <div className="directions-grid">
                      {directions.map((direction, i) => (
                        <button
                          className={`direction-card ${selected.settings.direction === direction.id ? "selected" : ""}`}
                          key={direction.id}
                          onClick={() => selectDirection(direction.id)}
                        >
                          <div className="direction-image">
                            <Scene direction={direction.id} small />
                            <span className="direction-index">0{i + 1}</span>
                            {selected.settings.direction === direction.id && (
                              <span className="selected-check">
                                <Icon name="check" size={17} />
                              </span>
                            )}
                          </div>
                          <div className="direction-card-label">
                            <strong>{direction.name}</strong>
                            <span style={{ background: direction.color }} />
                          </div>
                          <small>
                            {direction.lens} · {direction.camera}
                          </small>
                        </button>
                      ))}
                    </div>
                    <div className="exploration-note">
                      <span>ONE SCENE. NO WRONG TURNS.</span>
                      <p>
                        Pre-made mood studies. Render a take to create original
                        imagery with your workflow.
                      </p>
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="history">
                    <div className="branch-trail">
                      {project.takes.map((take, i) => {
                        const parent = project.takes.find(
                          (t) => t.id === take.parentId,
                        );
                        return (
                          <button
                            className={`trail-row ${take.id === selected.id ? "selected" : ""}`}
                            key={take.id}
                            onClick={() =>
                              setProject({ ...project, selectedId: take.id })
                            }
                          >
                            <span className="trail-number">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <Icon name={parent ? "branch" : "grid"} size={17} />
                            <div>
                              <strong>{take.title}</strong>
                              <small>
                                {parent
                                  ? `From ${parent.title} · take ${project.takes.indexOf(parent) + 1}`
                                  : "The starting point"}
                              </small>
                            </div>
                            <span className="trail-detail">
                              {take.settings.camera} · {take.settings.lens}
                            </span>
                            <span className="trail-seed">
                              {take.settings.seed}
                            </span>
                            <Icon name="right" size={15} />
                          </button>
                        );
                      })}
                    </div>
                  </Tabs.Panel>
                  <Tabs.Panel value="takes">
                    <div className="take-search">
                      <Icon name="search" />
                      <input
                        aria-label="Search takes"
                        placeholder="Find a take…"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                      <span>{takeList.length} takes</span>
                    </div>
                    {takeList.length ? (
                      <div className="takes-grid">
                        {takeList.map((take, i) => (
                          <button
                            className={`take-card ${take.id === selected.id ? "selected" : ""}`}
                            key={take.id}
                            onClick={() =>
                              setProject({ ...project, selectedId: take.id })
                            }
                          >
                            <div>
                              <Media take={take} small />
                              <span className="take-state">
                                {take.status === "draft"
                                  ? "CONCEPT"
                                  : take.status.toUpperCase()}
                              </span>
                              {take.favorite && (
                                <span className="take-heart">♥</span>
                              )}
                            </div>
                            <strong>
                              {take.title}
                              <span className="mono">
                                {String(i + 1).padStart(2, "0")}
                              </span>
                            </strong>
                            <small>
                              {take.parentId ? "↳ Branched" : "Original"} ·{" "}
                              {take.settings.lens}
                            </small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <Icon name="heart" size={25} />
                        <h3>No takes here yet.</h3>
                        <p>
                          {view === "favorites"
                            ? "Tap the heart on a take to keep it here."
                            : "Try another search."}
                        </p>
                      </div>
                    )}
                  </Tabs.Panel>
                </Tabs.Root>
              </section>
            </>
          )}
          <footer className="page-footer">
            <span>
              TAKE7 <i /> Made for the what-ifs.
            </span>
            <button onClick={() => setModal("help")}>
              Your scene. Your workflow. Your rules.{" "}
              <Icon name="right" size={14} />
            </button>
          </footer>
        </main>
      </div>
      <input
        type="file"
        accept="application/json,.json"
        ref={fileInput}
        hidden
        onChange={(e) => void importFile(e.target.files?.[0])}
      />
      <Dialog.Root
        open={modal !== null}
        onOpenChange={(open) => {
          if (!open) setModal(null);
        }}
      >
        <Dialog.Portal>
          <Dialog.Backdrop className="dialog-backdrop" />
          <Dialog.Popup
            className={`dialog ${modal === "preview" || modal === "compare" || modal === "story" ? "wide" : ""}`}
          >
            <Dialog.Close
              className="dialog-close icon-button"
              aria-label="Close dialog"
            >
              <Icon name="close" />
            </Dialog.Close>
            {modal === "connect" && (
              <>
                <div className="eyebrow">BRING YOUR OWN ENGINE</div>
                <Dialog.Title>Make the possibilities real.</Dialog.Title>
                <Dialog.Description>
                  TAKE7 keeps your Comfy API key on the server. Exploring,
                  branching, and sharing concepts is free.
                </Dialog.Description>
                <div className="connection-status">
                  <span
                    className={`status-dot ${connection.ready ? "online" : ""}`}
                  />
                  {connection.message}
                </div>
                <ol className="setup-steps">
                  <li>
                    <span>01</span>
                    <div>
                      <strong>Choose a Comfy environment</strong>
                      <p>
                        Use a Developer Platform deployment, Comfy Cloud, or
                        local ComfyUI with the v2 API proxy.
                      </p>
                      <a
                        href="https://platform.comfy.org"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open Comfy Platform ↗
                      </a>
                    </div>
                  </li>
                  <li>
                    <span>02</span>
                    <div>
                      <strong>Configure the server</strong>
                      <p>
                        Set COMFY_BASE_URL, COMFY_API_KEY and TAKE7_ACCESS_TOKEN
                        in your server environment. See the repository’s setup
                        guide for model files and LTX.
                      </p>
                    </div>
                  </li>
                  <li>
                    <span>03</span>
                    <div>
                      <strong>Unlock your studio</strong>
                      <p>
                        Enter your TAKE7_ACCESS_TOKEN below. This is your studio
                        password, not your Comfy API key.
                      </p>
                    </div>
                  </li>
                </ol>
                <label className="dialog-label">
                  STUDIO ACCESS TOKEN
                  <input
                    type="password"
                    autoComplete="off"
                    placeholder="Your studio access token"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                  />
                </label>
                <button
                  className="button primary full"
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/studio?check=1", {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error);
                      sessionStorage.setItem("take7.token", token);
                      setConnection(data);
                      notify(
                        data.ready
                          ? "Studio unlocked. Ready when you are."
                          : data.message,
                      );
                      if (data.ready) setModal(null);
                    } catch (e) {
                      notify((e as Error).message);
                    }
                  }}
                >
                  Check connection <Icon name="right" />
                </button>
                <p className="fine-print">
                  Generation uses your provider credits. TAKE7 never submits
                  seven paid jobs automatically.
                </p>
              </>
            )}
            {modal === "help" && (
              <>
                <div className="eyebrow">
                  A SMALL IDEA. SEVEN DIFFERENT WORLDS.
                </div>
                <Dialog.Title>What if you took another take?</Dialog.Title>
                <Dialog.Description>
                  TAKE7 is an open cinematic exploration studio. Start with a
                  scene, then change the decisions around it.
                </Dialog.Description>
                <div className="help-grid">
                  <div>
                    <span>01 / EXPLORE</span>
                    <h3>Same scene. New feeling.</h3>
                    <p>
                      Seven authored treatments change composition, atmosphere,
                      lens, and camera direction. A locked seed makes
                      comparisons easier.
                    </p>
                  </div>
                  <div>
                    <span>02 / BRANCH</span>
                    <h3>Keep the happy accidents.</h3>
                    <p>
                      Branch any take without losing its parent. Settings are
                      preserved when a render starts. Prompts guide the model;
                      camera movement is not a geometric guarantee.
                    </p>
                  </div>
                  <div>
                    <span>03 / PASS IT ON</span>
                    <h3>Share the decisions.</h3>
                    <p>
                      Build a decision reel, export your project, or share a
                      remix link. Remix links carry settings, not private
                      generated files or credentials.
                    </p>
                  </div>
                </div>
                <button className="button subtle" onClick={downloadRecovery}>
                  Download recovery file
                </button>
                <p className="fine-print">
                  Opening a remix preserves your previous saved board here.
                  Download its JSON file, then use Import project to reopen it.
                  The backup may contain private generated-media references;
                  keep this recovery file private.
                </p>
                <div className="keyboard-guide">
                  <span>
                    <kbd>1–7</kbd> Directions
                  </span>
                  <span>
                    <kbd>B</kbd> Branch
                  </span>
                  <span>
                    <kbd>F</kbd> Favorite
                  </span>
                  <span>
                    <kbd>/</kbd> Write scene
                  </span>
                  <span>
                    <kbd>?</kbd> Help
                  </span>
                </div>
                <p className="fine-print">
                  Projects are saved in this browser. Export a backup before
                  clearing browser data. The artwork in unrendered takes is an
                  pre-made concept artwork, not a live Comfy workflow result.
                </p>
                <button className="button light" onClick={() => setModal(null)}>
                  Let’s find something unexpected <Icon name="right" />
                </button>
              </>
            )}
            {modal === "share" && (
              <>
                <div className="eyebrow">GOOD IDEAS TAKE DETOURS</div>
                <Dialog.Title>Pass the scene on.</Dialog.Title>
                <Dialog.Description>
                  Share every creative decision. Someone else can open the
                  project and take it in a completely different direction.
                </Dialog.Description>
                <div className="share-poster">
                  <div className="brand">
                    TAKE<span>7</span>
                  </div>
                  <h2>{project.name}</h2>
                  <p>
                    {project.takes.length} takes. One starting point.
                    <br />
                    Where would you take it?
                  </p>
                  <div className="poster-strips">
                    {directions.map((d) => (
                      <div key={d.id}>
                        <Scene direction={d.id} small />
                      </div>
                    ))}
                  </div>
                  <span>REMIX THE POSSIBILITIES ↗</span>
                </div>
                <label className="dialog-label">
                  REMIX LINK
                  <input
                    readOnly
                    value={shareUrl}
                    onFocus={(e) => e.target.select()}
                  />
                </label>
                <button
                  className="button primary full"
                  onClick={() => void copy(shareUrl)}
                >
                  <Icon name="copy" />
                  Copy remix link
                </button>
                <button className="button subtle full" onClick={exportProject}>
                  <Icon name="download" />
                  Download portable project
                </button>
                <div className="export-actions">
                  <button
                    className="button subtle"
                    onClick={() => void contactSheet()}
                  >
                    <Icon name="grid" />
                    Contact sheet PNG
                  </button>
                  <button
                    className="button subtle"
                    onClick={() => downloadShotList(project)}
                  >
                    <Icon name="film" />
                    Shot list CSV
                  </button>
                </div>
                <p className="fine-print">
                  Links include prompts and settings. Share only what you want
                  others to see. Generated media stays with your private engine;
                  recipients render their own versions.
                </p>
              </>
            )}
            {modal === "story" && (
              <>
                <div className="eyebrow">SEVEN SHOTS. ONE SHARED WORLD.</div>
                <Dialog.Title>Direct the emotional journey.</Dialog.Title>
                <Dialog.Description>
                  Turn the selected scene into an editable narrative sequence.
                  Preview the beats before adding them to your board.
                </Dialog.Description>
                <StoryComposer
                  available={Math.min(
                    100 - project.takes.length,
                    100 - project.sequence.length,
                  )}
                  onBuild={(id) => {
                    try {
                      setProject(buildStoryArc(project, selected, id));
                      setModal(null);
                      setPlayIndex(project.sequence.length);
                      setView("sequence");
                      notify(
                        "Seven video drafts added to your reel. Review each shot before rendering.",
                      );
                    } catch (error) {
                      notify(
                        error instanceof Error
                          ? error.message
                          : "Could not build story.",
                      );
                    }
                  }}
                />
              </>
            )}
            {modal === "rename" && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = renameName.trim();
                  if (!name || name.length > 100) return;
                  setProject({ ...project, name });
                  setModal(null);
                  notify("Project renamed.");
                }}
              >
                <div className="eyebrow">GIVE YOUR STORY A NAME</div>
                <Dialog.Title>Rename your project.</Dialog.Title>
                <Dialog.Description>
                  Choose a title for this board and its exports.
                </Dialog.Description>
                <label className="dialog-label">
                  PROJECT NAME
                  <input
                    value={renameName}
                    maxLength={100}
                    onChange={(event) => setRenameName(event.target.value)}
                    placeholder="A working title…"
                    aria-describedby="rename-name-hint"
                    aria-invalid={
                      !renameName.trim() || renameName.trim().length > 100
                    }
                  />
                </label>
                <p id="rename-name-hint" className="fine-print">
                  {!renameName.trim()
                    ? "Enter a project name."
                    : renameName.trim().length > 100
                      ? "Use 100 characters or fewer."
                      : "Up to 100 characters. Spaces around the title are trimmed."}
                </p>
                <button
                  type="submit"
                  className="button primary full"
                  disabled={
                    !renameName.trim() || renameName.trim().length > 100
                  }
                >
                  Save project name
                </button>
                <button
                  type="button"
                  className="button subtle full"
                  onClick={() => setModal(null)}
                >
                  Cancel rename
                </button>
              </form>
            )}
            {modal === "new" && (
              <>
                <div className="eyebrow">A BLANK PAGE IS A POSSIBILITY</div>
                <Dialog.Title>Start another story.</Dialog.Title>
                <Dialog.Description>
                  Your current project will be downloaded as a backup before the
                  new one opens.
                </Dialog.Description>
                <label className="dialog-label">
                  PROJECT NAME
                  <input
                    maxLength={100}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="A working title…"
                  />
                </label>
                <button
                  className="button primary full"
                  disabled={!newName.trim()}
                  onClick={() => {
                    exportProject();
                    const p = newProject();
                    p.name = newName.trim();
                    setProject(p);
                    setNewName("");
                    setModal(null);
                    setView("studio");
                    setTab("directions");
                  }}
                >
                  Create project <Icon name="plus" />
                </button>
              </>
            )}
            {modal === "preview" && (
              <>
                <Dialog.Title>{selected.title}</Dialog.Title>
                <Dialog.Description>
                  {selected.output
                    ? "Your generated take."
                    : "Pre-made demo artwork — connect Comfy to render your scene."}
                </Dialog.Description>
                <div className="expanded-media">
                  <Media take={selected} />
                </div>
                <div className="recipe">
                  <span>THE DIRECTION</span>
                  <p>{buildPrompt(selected.settings)}</p>
                  <div className="recipe-actions">
                    <button
                      className="button subtle"
                      onClick={() =>
                        download(
                          "take7-workflow-api.json",
                          JSON.stringify(
                            exportWorkflow(selected.settings),
                            null,
                            2,
                          ),
                        )
                      }
                    >
                      <Icon name="branch" />
                      Comfy workflow
                    </button>
                    <button
                      className="button subtle"
                      onClick={() =>
                        download(
                          "take7-recipe.json",
                          JSON.stringify(
                            {
                              title: selected.title,
                              settings: selected.settings,
                              prompt: buildPrompt(selected.settings),
                            },
                            null,
                            2,
                          ),
                        )
                      }
                    >
                      <Icon name="download" />
                      Export recipe
                    </button>
                    {selected.output && (
                      <a
                        className="button light"
                        href={`${selected.output.url}&download=1`}
                        download
                      >
                        Download output <Icon name="download" />
                      </a>
                    )}
                  </div>
                </div>
              </>
            )}
            {modal === "compare" && (
              <>
                <Dialog.Title>Same scene. Different story.</Dialog.Title>
                <Dialog.Description>
                  Compare the creative decisions behind two takes.
                </Dialog.Description>
                {compare ? (
                  <>
                    <select
                      aria-label="Choose comparison take"
                      value={compare.id}
                      onChange={(e) => setCompareId(e.target.value)}
                    >
                      {project.takes
                        .filter((t) => t.id !== selected.id)
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title} · seed {t.settings.seed}
                          </option>
                        ))}
                    </select>
                    <div className="comparison">
                      {[selected, compare].map((t) => (
                        <div key={t.id}>
                          <Media take={t} />
                          <h3>{t.title}</h3>
                          <p>
                            {t.settings.camera} · {t.settings.lens} ·{" "}
                            {t.settings.ratio}
                          </p>
                          <span className="mono">
                            SEED {t.settings.seed} /{" "}
                            {t.output ? "RENDERED" : "ILLUSTRATION"}
                          </span>
                        </div>
                      ))}
                    </div>
                    <DecisionComparison left={selected} right={compare} />
                  </>
                ) : (
                  <p>Branch a take to start comparing.</p>
                )}
              </>
            )}
          </Dialog.Popup>
        </Dialog.Portal>
      </Dialog.Root>
      {notice && (
        <div className="toast" role="status">
          <Icon name="info" />
          <span>{notice}</span>
          <button
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
