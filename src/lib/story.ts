import { newTake, type Project, type Settings, type Take } from "./studio";

export type StoryBeat = {
  title: string;
  direction: Settings["direction"];
  camera: Settings["camera"];
  lens: Settings["lens"];
  instruction: string;
};
export type StoryArc = {
  id: string;
  name: string;
  description: string;
  beats: readonly StoryBeat[];
};

export const storyArcs: readonly StoryArc[] = [
  {
    id: "threshold",
    name: "The threshold",
    description:
      "An ordinary place opens onto something impossible. Seven shots from first sign to irreversible choice.",
    beats: [
      {
        title: "01 · The ordinary",
        direction: "quiet",
        camera: "Locked off",
        lens: "35mm",
        instruction:
          "Establish the scene before the discovery. The main subject pauses in a familiar routine; one small detail feels out of place.",
      },
      {
        title: "02 · The signal",
        direction: "wonder",
        camera: "Slow push in",
        lens: "50mm",
        instruction:
          "A narrow seam of light appears within the setting. The subject notices it and turns toward its source.",
      },
      {
        title: "03 · The approach",
        direction: "quiet",
        camera: "Gentle pan",
        lens: "35mm",
        instruction:
          "The subject approaches the strange seam cautiously. Nearby loose material drifts toward it against the natural flow.",
      },
      {
        title: "04 · The impossible",
        direction: "dream",
        camera: "Orbit",
        lens: "24mm",
        instruction:
          "The seam opens into an impossible passage. Reveal a glimpse of the same setting transformed on its far side.",
      },
      {
        title: "05 · The hesitation",
        direction: "noir",
        camera: "Locked off",
        lens: "85mm",
        instruction:
          "The subject stops at the edge. A reaching hand withdraws, then steadies; hold the moment of uncertainty.",
      },
      {
        title: "06 · The crossing",
        direction: "wonder",
        camera: "Slow push in",
        lens: "28mm",
        instruction:
          "The subject deliberately crosses the passage. Light washes across the familiar silhouette as the threshold falls behind.",
      },
      {
        title: "07 · The other side",
        direction: "future",
        camera: "Crane up",
        lens: "18mm",
        instruction:
          "Reveal the transformed setting around the subject. The passage closes quietly behind them, leaving an unfamiliar path ahead.",
      },
    ],
  },
  {
    id: "heist",
    name: "One last move",
    description:
      "A tiny theft with enormous tension. Establish the prize, spring the trap, and leave one visual twist.",
    beats: [
      {
        title: "01 · The prize",
        direction: "noir",
        camera: "Slow push in",
        lens: "50mm",
        instruction:
          "Reveal one small luminous object within the existing setting. The main subject watches it from a concealed position.",
      },
      {
        title: "02 · The opening",
        direction: "quiet",
        camera: "Gentle pan",
        lens: "35mm",
        instruction:
          "A moving band of light sweeps past the object. The subject studies the interval and prepares to move through the gap.",
      },
      {
        title: "03 · The reach",
        direction: "noir",
        camera: "Locked off",
        lens: "85mm",
        instruction:
          "The subject reaches carefully for the luminous object. Their hand stops a breath away as the moving light returns.",
      },
      {
        title: "04 · The switch",
        direction: "wild",
        camera: "Handheld",
        lens: "35mm",
        instruction:
          "In one decisive motion, the subject lifts the object and replaces it with an ordinary item already present in the scene.",
      },
      {
        title: "05 · The alarm",
        direction: "noir",
        camera: "Slow pull back",
        lens: "24mm",
        instruction:
          "The lighting abruptly changes and a barrier starts closing. The subject turns toward the narrowing escape route.",
      },
      {
        title: "06 · The escape",
        direction: "wild",
        camera: "Handheld",
        lens: "18mm",
        instruction:
          "The subject slips through the closing gap with the object held close. The barrier shuts immediately behind them.",
      },
      {
        title: "07 · The decoy",
        direction: "dream",
        camera: "Slow push in",
        lens: "85mm",
        instruction:
          "In apparent safety, the subject opens their hand. The stolen object fades to an ordinary pebble while a distant glow returns to its original place.",
      },
    ],
  },
  {
    id: "homecoming",
    name: "What stays",
    description:
      "A return, an absence, a small act of repair. A quiet emotional arc told through gestures and objects.",
    beats: [
      {
        title: "01 · The return",
        direction: "memory",
        camera: "Gentle pan",
        lens: "35mm",
        instruction:
          "The main subject enters the familiar setting after a long absence. They stop as if recognizing a place that has quietly changed.",
      },
      {
        title: "02 · The trace",
        direction: "memory",
        camera: "Slow push in",
        lens: "85mm",
        instruction:
          "The subject discovers a worn, ordinary object in the scene. Their fingertips follow a distinctive mark on its surface.",
      },
      {
        title: "03 · The echo",
        direction: "dream",
        camera: "Orbit",
        lens: "50mm",
        instruction:
          "A passing reflection briefly suggests the setting as it once was. The subject turns toward it, but the reflection slips away.",
      },
      {
        title: "04 · The absence",
        direction: "quiet",
        camera: "Locked off",
        lens: "35mm",
        instruction:
          "Hold on an empty space beside the subject. They begin a familiar gesture toward that space, then let their hand fall.",
      },
      {
        title: "05 · The repair",
        direction: "memory",
        camera: "Locked off",
        lens: "85mm",
        instruction:
          "The subject gently straightens or repairs the worn object. Focus on this small, deliberate act of care.",
      },
      {
        title: "06 · The light",
        direction: "wonder",
        camera: "Gentle pan",
        lens: "50mm",
        instruction:
          "A soft change in natural light reaches the repaired object. The subject sets it carefully back in the setting and relaxes.",
      },
      {
        title: "07 · The staying",
        direction: "quiet",
        camera: "Slow pull back",
        lens: "24mm",
        instruction:
          "The subject settles into the once-empty space. End on a still, lived-in composition with the repaired object nearby.",
      },
    ],
  },
];

const continuity =
  "Continuity direction: retain the source subject, clothing, key props and location across shots; adapt this beat to that scene. These are prompt instructions, not a guarantee of visual identity.";

/** Author seven editable drafts locally. This does not submit any render jobs. */
export function buildStoryArc(
  project: Project,
  source: Take,
  arcId: string,
): Project {
  const arc = storyArcs.find((candidate) => candidate.id === arcId);
  if (!arc) throw new Error("Choose a known story arc.");
  if (!project.takes.some((take) => take.id === source.id))
    throw new Error("The source take must belong to this project.");
  if (project.takes.length + arc.beats.length > 100)
    throw new Error(
      "A story arc needs room for seven takes. This project can hold 100 takes.",
    );
  if (project.sequence.length + arc.beats.length > 100)
    throw new Error(
      "A story arc needs seven free positions in the 100-shot sequence.",
    );
  if (source.settings.prompt.trim().length < 3)
    throw new Error("Describe your source scene before building a story arc.");
  const prompts = arc.beats.map(
    (beat, index) =>
      `${source.settings.prompt}\n\nStory: ${arc.name}. Beat ${index + 1}/7: ${beat.instruction}\n${continuity}`,
  );
  if (prompts.some((prompt) => prompt.length > 2000))
    throw new Error(
      "Shorten the source scene so each story beat fits the 2,000-character prompt limit.",
    );
  const takes = arc.beats.map((beat, index) => ({
    ...newTake(
      {
        ...source.settings,
        kind: "video",
        direction: beat.direction,
        camera: beat.camera,
        lens: beat.lens,
        prompt: prompts[index],
      },
      source.id,
    ),
    title: beat.title,
  }));
  return {
    ...project,
    takes: [...project.takes, ...takes],
    sequence: [...project.sequence, ...takes.map((take) => take.id)],
    selectedId: takes[0].id,
  };
}
