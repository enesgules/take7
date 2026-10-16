import { directions, type Project, type Settings, type Take } from "./studio";
import { imageWorkflow, videoWorkflow } from "./workflow";

export function exportWorkflow(settings: Settings) {
  return settings.kind === "video"
    ? videoWorkflow(settings)
    : imageWorkflow(settings);
}
export function safeFilename(name: string) {
  return (
    name
      .normalize("NFKC")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "take7"
  );
}
function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[\s]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
/** Sequence order is preserved, including intentional repeated shots. */
export function shotListCsv(project: Project): string {
  const takes = project.sequence.length
    ? project.sequence
        .map((id) => project.takes.find((t) => t.id === id)!)
        .filter(Boolean)
    : project.takes;
  const rows: unknown[][] = [
    [
      "Shot",
      "Take ID",
      "Title",
      "Direction",
      "Prompt",
      "Lens",
      "Camera",
      "Aspect ratio",
      "Media",
      "Seed",
      "Status",
    ],
  ];
  takes.forEach((t, i) =>
    rows.push([
      i + 1,
      t.id,
      t.title,
      t.settings.direction,
      t.settings.prompt,
      t.settings.lens,
      t.settings.camera,
      t.settings.ratio,
      t.settings.kind,
      t.settings.seed,
      t.status,
    ]),
  );
  return "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
}
function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadShotList(project: Project) {
  download(
    new Blob([shotListCsv(project)], { type: "text/csv;charset=utf-8" }),
    `${safeFilename(project.name)}-shot-list.csv`,
  );
}
function wrapped(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  width: number,
  lines: number,
  lineHeight: number,
) {
  const words = value.replace(/\s+/g, " ").split(" ");
  let line = "",
    row = 0;
  for (let i = 0; i < words.length; i++) {
    const next = line ? `${line} ${words[i]}` : words[i];
    if (ctx.measureText(next).width > width && line) {
      ctx.fillText(
        row === lines - 1 ? line + "…" : line,
        x,
        y + row * lineHeight,
        width,
      );
      if (++row >= lines) return;
      line = words[i];
    } else line = next;
  }
  if (line) ctx.fillText(line, x, y + row * lineHeight, width);
}
async function mediaImage(take: Take): Promise<HTMLImageElement | null> {
  if (take.output?.type !== "image") return null;
  const url = new URL(take.output.url, window.location.origin);
  if (url.origin !== window.location.origin) return null;
  return new Promise((resolve) => {
    const image = new Image();
    const timer = setTimeout(() => {
      image.src = "";
      resolve(null);
    }, 6000);
    image.onload = () => {
      clearTimeout(timer);
      resolve(image);
    };
    image.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    image.src = url.href;
  });
}
function illustration(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  index: number,
  color: string,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  const sky = ctx.createLinearGradient(x, y, x, y + h);
  sky.addColorStop(0, "#151a1b");
  sky.addColorStop(1, color);
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  ctx.globalAlpha = 0.6;
  ctx.fillStyle = "#f3f0e7";
  ctx.beginPath();
  ctx.arc(
    x + w * (0.22 + (index % 3) * 0.23),
    y + h * 0.28,
    22 + (index % 4) * 9,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.globalAlpha = 1;
  for (let layer = 0; layer < 3; layer++) {
    ctx.fillStyle = ["#353d36", "#252b26", "#101713"][layer];
    ctx.beginPath();
    ctx.moveTo(x, y + h);
    for (let n = 0; n <= 8; n++)
      ctx.lineTo(
        x + (n * w) / 8,
        y + h * (0.5 + layer * 0.15) + Math.sin(n * 1.5 + index + layer) * 26,
      );
    ctx.lineTo(x + w, y + h);
    ctx.closePath();
    ctx.fill();
  }
  const doorX = x + w * 0.57,
    doorY = y + h * 0.35;
  ctx.fillStyle = color;
  ctx.fillRect(doorX, doorY, 56, h * 0.45);
  ctx.fillStyle = "#101110";
  ctx.fillRect(doorX + 8, doorY + 8, 40, h * 0.45 - 8);
  ctx.fillStyle = "#101110";
  ctx.fillRect(x + 14, y + 14, 220, 27);
  ctx.fillStyle = "#f3f0e7";
  ctx.font = "12px monospace";
  ctx.fillText("ILLUSTRATED CONCEPT / NO MEDIA", x + 22, y + 32);
  ctx.restore();
}
/** Local-only rendering. Generated video and unavailable images use labeled concept artwork. */
export async function downloadContactSheet(project: Project): Promise<void> {
  const takes = project.takes;
  const cols = 3,
    gap = 24,
    margin = 64,
    cardW = (1920 - margin * 2 - gap * 2) / 3,
    cardH = 476;
  const count = Math.max(7, takes.length),
    rows = Math.ceil(count / cols);
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 290 + rows * (cardH + gap) + 90;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Your browser could not create a contact sheet.");
  ctx.fillStyle = "#101110";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#d7ff3f";
  ctx.font = "bold 52px sans-serif";
  ctx.fillText("TAKE7", margin, 96);
  ctx.fillStyle = "#f3f0e7";
  ctx.font = "16px monospace";
  ctx.fillText("SEVEN WAYS TO SEE IT.", margin + 220, 88);
  ctx.textAlign = "right";
  ctx.fillText(
    `${String(takes.length).padStart(2, "0")} TAKES / DIRECTOR’S CONTACT SHEET`,
    1856,
    88,
  );
  ctx.textAlign = "left";
  ctx.font = "bold 62px sans-serif";
  ctx.fillText(project.name, margin, 196, 1760);
  ctx.fillStyle = "#85887f";
  ctx.font = "16px monospace";
  ctx.fillText(
    "A STUDY IN POSSIBILITY   /   REPRODUCIBLE IDEAS, FRAME BY FRAME",
    margin,
    238,
  );
  // Limit simultaneous authenticated media requests for large boards.
  for (let start = 0; start < count; start += cols) {
    const images = await Promise.all(
      takes.slice(start, start + cols).map(mediaImage),
    );
    for (let i = start; i < Math.min(count, start + cols); i++) {
      const t = takes[i],
        x = margin + (i % cols) * (cardW + gap),
        y = 290 + Math.floor(i / cols) * (cardH + gap);
      ctx.fillStyle = "#1c1e1a";
      ctx.fillRect(x, y, cardW, cardH);
      if (!t) {
        ctx.strokeStyle = "#3a3e32";
        ctx.strokeRect(x + 0.5, y + 0.5, cardW - 1, cardH - 1);
        ctx.fillStyle = "#d7ff3f";
        ctx.font = "48px monospace";
        ctx.fillText(String(i + 1).padStart(2, "0"), x + 28, y + 72);
        ctx.fillStyle = "#85887f";
        ctx.font = "18px monospace";
        ctx.fillText("A POSSIBILITY, STILL OPEN.", x + 28, y + 360);
        ctx.font = "14px monospace";
        ctx.fillText("EMPTY TAKE / EXPLORE ANOTHER DIRECTION", x + 28, y + 395);
        continue;
      }
      const image = images[i - start],
        imageH = 264;
      if (image) {
        const scale = Math.max(
          cardW / image.naturalWidth,
          imageH / image.naturalHeight,
        );
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, cardW, imageH);
        ctx.clip();
        ctx.drawImage(
          image,
          x + (cardW - image.naturalWidth * scale) / 2,
          y + (imageH - image.naturalHeight * scale) / 2,
          image.naturalWidth * scale,
          image.naturalHeight * scale,
        );
        ctx.restore();
      } else
        illustration(
          ctx,
          x,
          y,
          cardW,
          imageH,
          i,
          directions.find((d) => d.id === t.settings.direction)!.color,
        );
      ctx.fillStyle = "#d7ff3f";
      ctx.font = "14px monospace";
      ctx.fillText(
        `TAKE ${String(i + 1).padStart(2, "0")}  /  ${t.settings.direction.toUpperCase()}${t.favorite ? "  /  SELECT" : ""}`,
        x + 22,
        y + 294,
      );
      ctx.fillStyle = "#f3f0e7";
      ctx.font = "bold 26px sans-serif";
      ctx.fillText(t.title, x + 22, y + 330, cardW - 44);
      ctx.fillStyle = "#b7baaf";
      ctx.font = "17px sans-serif";
      wrapped(ctx, t.settings.prompt, x + 22, y + 360, cardW - 44, 3, 22);
      ctx.fillStyle = "#85887f";
      ctx.font = "13px monospace";
      ctx.fillText(
        `${t.settings.lens} · ${t.settings.camera} · ${t.settings.ratio}`,
        x + 22,
        y + 438,
      );
      ctx.fillText(
        `SEED ${t.settings.seed}  /  ${t.settings.kind.toUpperCase()}`,
        x + 22,
        y + 460,
      );
    }
  }
  ctx.fillStyle = "#85887f";
  ctx.font = "14px monospace";
  ctx.fillText(
    "TAKE7 / THE OPEN DIRECTOR’S STUDIO",
    margin,
    canvas.height - 40,
  );
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (b) =>
        b ? resolve(b) : reject(new Error("Contact sheet export failed.")),
      "image/png",
    ),
  );
  download(blob, `${safeFilename(project.name)}-contact-sheet.png`);
}
