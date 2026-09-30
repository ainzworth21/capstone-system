/**
 * Draw a certificate name centered at (x, y), auto-fitting long names:
 * 1) shrink font from preferred size down to minFontSize to fit maxWidth
 * 2) if still too wide, wrap onto up to maxLines (word-aware), still centered on y
 */
export function drawFittedName(
  ctx: CanvasRenderingContext2D,
  name: string,
  x: number,
  y: number,
  opts: {
    fontSize: number;
    fontFamily: string;
    color: string;
    maxWidth: number;
    minFontSize?: number;
    maxLines?: number;
  }
) {
  const text = (name || "").trim() || "—";
  const minFont = opts.minFontSize ?? 18;
  const maxLines = opts.maxLines ?? 2;
  let size = Math.max(minFont, opts.fontSize);

  const applyFont = (s: number) => {
    ctx.font = `bold ${s}px ${opts.fontFamily}, serif`;
  };

  applyFont(size);
  while (size > minFont && ctx.measureText(text).width > opts.maxWidth) {
    size -= 1;
    applyFont(size);
  }

  ctx.fillStyle = opts.color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  if (ctx.measureText(text).width <= opts.maxWidth || maxLines <= 1) {
    ctx.fillText(text, x, y);
    return { fontSize: size, lines: 1 };
  }

  // Word-wrap into up to maxLines; shrink further if a single word overflows
  const words = text.split(/\s+/);
  let lines: string[] = [];

  const buildLines = (fontPx: number) => {
    applyFont(fontPx);
    const out: string[] = [];
    let current = "";
    for (const word of words) {
      const test = current ? `${current} ${word}` : word;
      if (ctx.measureText(test).width <= opts.maxWidth) {
        current = test;
      } else {
        if (current) out.push(current);
        current = word;
      }
    }
    if (current) out.push(current);
    return out;
  };

  lines = buildLines(size);
  while (
    size > minFont &&
    (lines.length > maxLines ||
      lines.some((line) => ctx.measureText(line).width > opts.maxWidth))
  ) {
    size -= 1;
    lines = buildLines(size);
  }

  // Collapse excess lines into the last allowed line
  if (lines.length > maxLines) {
    const head = lines.slice(0, maxLines - 1);
    const rest = lines.slice(maxLines - 1).join(" ");
    lines = [...head, rest];
  }

  const lineHeight = size * 1.2;
  const blockHeight = lineHeight * (lines.length - 1);
  const startY = y - blockHeight / 2;

  applyFont(size);
  lines.forEach((line, i) => {
    ctx.fillText(line, x, startY + i * lineHeight);
  });

  return { fontSize: size, lines: lines.length };
}
