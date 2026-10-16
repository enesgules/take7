import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Icon } from "../components/Icon";
import { applyTheme, type Theme } from "../lib/themes";
export const Route = createFileRoute("/brand")({
  component: Brand,
  head: () => ({ meta: [{ title: "TAKE7 — The identity" }] }),
});
const identities = [
  {
    id: "signal",
    number: "01",
    name: "Signal Seven",
    tag: "Ideas multiply.",
    description:
      "A creative instrument with a pulse. Graphite surfaces let the work lead. Citron marks the moments when an idea changes direction.",
    colors: [
      ["Graphite", "#101110"],
      ["Signal", "#D7FF3F"],
      ["Chalk", "#F3F0E7"],
      ["Slate", "#30332B"],
    ],
    className: "signal",
  },
  {
    id: "afterlight",
    number: "02",
    name: "Afterlight",
    tag: "The next scene is yours.",
    description:
      "The warmth of a contact sheet and the precision of an editing room. Ivory, ink, and a flash of burnt orange.",
    colors: [
      ["Ivory", "#F6F2E9"],
      ["Ink", "#151612"],
      ["Ember", "#D54C19"],
      ["Sand", "#D4C1A5"],
    ],
    className: "afterlight",
  },
  {
    id: "soft",
    number: "03",
    name: "Soft Cinema",
    tag: "More human worlds.",
    description:
      "A quiet place for bold ideas. Gallery-like spacing, expressive editorial type, oxblood details, and soft lavender notes.",
    colors: [
      ["Limestone", "#EDE8E1"],
      ["Oxblood", "#7F1931"],
      ["Lavender", "#C5BFD5"],
      ["Sage", "#9DAA99"],
    ],
    className: "soft",
  },
];
function Brand() {
  const [selected, setSelected] = useState("signal");
  const identity = identities.find((i) => i.id === selected)!;
  return (
    <div className="brand-page">
      <header>
        <a href="/" className="brand">
          TAKE<span>7</span>
        </a>
        <a href="/" className="button subtle">
          <Icon name="left" />
          Back to studio
        </a>
      </header>
      <main>
        <div className="eyebrow">THE TAKE7 DESIGN LANGUAGE / V.01</div>
        <h1>
          Built for the
          <br />
          <em>unexpected.</em>
        </h1>
        <div className="brand-intro">
          <p>
            One scene is a starting point.
            <br />
            Seven is an invitation.
          </p>
          <p>
            TAKE7 is a creative playground for people who ask “what if?” Our
            identity puts possibility first: a confident mark, an editorial eye,
            and controls that leave room for the work.
          </p>
        </div>
        <div
          className="identity-tabs"
          role="group"
          aria-label="Identity direction"
        >
          {identities.map((i) => (
            <button
              key={i.id}

              aria-pressed={selected === i.id}
              aria-controls="identity-panel"
              id={`tab-${i.id}`}
              className={selected === i.id ? "active" : ""}
              onClick={() => setSelected(i.id)}
            >
              {i.number}
              <span>{i.name}</span>
              {i.id === "signal" && <small>WORKING DIRECTION</small>}
            </button>
          ))}
        </div>
        <section
          id="identity-panel"
          role="region"
          aria-labelledby={`tab-${identity.id}`}
          className={`identity-panel ${identity.className}`}
        >
          <div className="identity-hero">
            <div className="brand">
              TAKE<span>7</span>
            </div>
            <h2>{identity.tag}</h2>
            <span>ONE SCENE. SEVEN POSSIBILITIES.</span>
          </div>
          <div className="identity-try">
            <button
              className="button primary"
              onClick={() => {
                applyTheme(identity.id as Theme);
                window.location.assign("/");
              }}
            >
              Try {identity.name} in the studio <Icon name="right" />
            </button>
            <span>Same tools. A different atmosphere.</span>
          </div>
          <div className="identity-details">
            <div>
              <span>THE FEELING</span>
              <p>{identity.description}</p>
            </div>
            <div>
              <span>THE PALETTE</span>
              <div className="palette">
                {identity.colors.map(([name, hex]) => (
                  <div key={name}>
                    <i style={{ background: hex }} />
                    <strong>{name}</strong>
                    <code>{hex}</code>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
        <section className="brand-principles">
          <div>
            <span>01 / CHARACTER</span>
            <h3>
              Confident. Curious.
              <br />A little unexpected.
            </h3>
            <p>
              Short, human language. Invitations instead of instructions.
              Celebrate the creative choice, not the model underneath it.
            </p>
          </div>
          <div>
            <span>02 / COMPOSITION</span>
            <h3>
              The work gets
              <br />
              the biggest frame.
            </h3>
            <p>
              Quiet chrome, deliberate alignment, generous canvas. Numbers, fine
              rules, and small labels borrow from a filmmaker’s contact sheet.
            </p>
          </div>
          <div>
            <span>03 / BEHAVIOR</span>
            <h3>
              Every decision
              <br />
              leaves a trail.
            </h3>
            <p>
              Branches preserve their origin. Sharing invites a remix. Color
              marks the next action; motion confirms a change without stealing
              attention.
            </p>
          </div>
        </section>
        <section className="type-specimen">
          <div>
            <span>DISPLAY / SPACE GROTESK</span>
            <h2>
              What if
              <br />
              we tried <em>this?</em>
            </h2>
          </div>
          <div>
            <span>UTILITY / DM SANS</span>
            <h3>Clarity behind the camera.</h3>
            <p>
              Readable controls. Precise metadata. No unnecessary decoration.
              Our typography has two jobs: give the idea a voice, and get out of
              its way.
            </p>
            <div className="keyboard-guide">
              <span>
                <kbd>1–7</kbd> Seven directions
              </span>
              <span>
                <kbd>B</kbd> Another branch
              </span>
            </div>
          </div>
        </section>
        <section className="concept-board">
          <div>
            <h2>Three possible worlds.</h2>
            <p>
              Exploratory art-direction mockups. The functional studio uses
              Signal Seven as its working identity.
            </p>
          </div>
          <a href="/brand/directions.webp" target="_blank" rel="noreferrer">
            <img
              src="/brand/directions.webp"
              alt="Three TAKE7 brand concept mockups: Afterlight, Signal Seven and Soft Cinema"
              loading="lazy"
            />
          </a>
        </section>
        <footer className="page-footer">
          <span>TAKE7 / OPEN BY DESIGN</span>
          <a className="text-button" href="/">
            Make your next take <Icon name="right" />
          </a>
        </footer>
      </main>
    </div>
  );
}
