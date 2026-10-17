import { useState } from "react";
import { storyArcs } from "../lib/story";
import { Icon } from "./Icon";
export function StoryComposer({
  onBuild,
  available,
}: {
  onBuild: (id: string) => void;
  available: number;
}) {
  const [arcId, setArcId] = useState(storyArcs[0].id);
  const arc = storyArcs.find((a) => a.id === arcId)!;
  return (
    <div className="story-composer">
      <div className="story-choices" aria-label="Choose a story arc">
        {storyArcs.map((a) => (
          <button
            key={a.id}
            aria-pressed={a.id === arcId}
            onClick={() => setArcId(a.id)}
          >
            <strong>{a.name}</strong>
            <span>{a.description}</span>
          </button>
        ))}
      </div>
      <ol className="story-beats">
        {arc.beats.map((beat, i) => (
          <li key={beat.title}>
            <span className="story-beat-number">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div>
              <strong>{beat.title}</strong>
              <p>{beat.instruction}</p>
              <small>
                {beat.camera} · {beat.lens}
              </small>
            </div>
          </li>
        ))}
      </ol>
      <div className="story-contract">
        <Icon name="link" />
        <p>
          Your scene, seed, and frame stay shared. Each beat adds its own action
          and camera direction. Continuity is prompt-guided; matching characters
          across renders is not guaranteed.
        </p>
      </div>
      <button
        className="button primary full"
        disabled={available < 7}
        onClick={() => onBuild(arcId)}
      >
        <Icon name="film" />
        Create seven-shot story
      </button>
      <p className="fine-print">
        {available < 7
          ? "This board needs room for seven more takes. Start a new project or export your work first."
          : "Creates seven editable video drafts and adds them to your reel. No renders are submitted. LTX requires a configured, validated engine."}
      </p>
    </div>
  );
}
