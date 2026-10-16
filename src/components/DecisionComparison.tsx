import { directions, type Take } from "../lib/studio";

export function DecisionComparison({
  left,
  right,
}: {
  left: Take;
  right: Take;
}) {
  const rows = [
    { key: "direction", label: "Direction" },
    { key: "camera", label: "Movement" },
    { key: "lens", label: "Lens" },
    { key: "ratio", label: "Frame" },
    { key: "kind", label: "Medium" },
    { key: "seed", label: "Seed" },
    { key: "prompt", label: "Scene" },
  ] as const;
  const changes = rows.filter(
    ({ key }) => left.settings[key] !== right.settings[key],
  ).length;
  const value = (take: Take, key: (typeof rows)[number]["key"]) => {
    if (key === "direction")
      return directions.find((d) => d.id === take.settings.direction)?.name;
    if (key === "kind")
      return take.settings.kind === "image" ? "Still" : "Video";
    return String(take.settings[key]) || "Empty scene";
  };
  return (
    <section
      className="decision-comparison"
      aria-label="Creative decision differences"
    >
      <div className="decision-heading">
        <h3>The decisions behind the frame</h3>
        <span>
          {changes === 0
            ? "Identical settings"
            : `${changes} changed ${changes === 1 ? "setting" : "settings"}`}
        </span>
      </div>
      <div className="decision-table-scroll">
        <table>
          <caption className="sr-only">
            Creative settings for {left.title} and {right.title}
          </caption>
          <thead>
            <tr>
              <th scope="col">Decision</th>
              <th scope="col">A · {left.title}</th>
              <th scope="col">B · {right.title}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, label }) => {
              const changed = left.settings[key] !== right.settings[key];
              return (
                <tr key={key} data-changed={changed}>
                  <th scope="row">
                    {label}
                    <span className="decision-change">
                      {changed ? "Changed" : "Same"}
                    </span>
                  </th>
                  <td>{value(left, key)}</td>
                  <td>{value(right, key)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="decision-footnote">
        {left.settings.seed === right.settings.seed
          ? "The seed is held constant. Different models or settings can still change composition."
          : "These takes use different seeds, so randomness also contributes to the result."}
        {(!left.output || !right.output) &&
          " Illustrations show the mood only; render both takes to compare actual outputs."}
      </p>
    </section>
  );
}
