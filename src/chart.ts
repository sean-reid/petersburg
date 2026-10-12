export interface Bucket {
  min: number;
  max: number;
}

export interface Palette {
  ink: string;
  soft: string;
  rule: string;
  accent: string;
}

export function paletteFrom(el: Element): Palette {
  const s = getComputedStyle(el);
  return {
    ink: s.getPropertyValue("--ink").trim(),
    soft: s.getPropertyValue("--ink-soft").trim(),
    rule: s.getPropertyValue("--rule").trim(),
    accent: s.getPropertyValue("--accent").trim(),
  };
}

const fmt = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

export function drawChart(
  canvas: HTMLCanvasElement,
  buckets: readonly Bucket[],
  rounds: number,
  palette: Palette,
): void {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  let lo = 0;
  let hi = 0;
  for (const b of buckets) {
    if (b.min < lo) lo = b.min;
    if (b.max > hi) hi = b.max;
  }
  if (hi === lo) hi = lo + 1;
  const pad = { top: 14, bottom: 18, left: 0, right: 0 };
  const plotH = h - pad.top - pad.bottom;
  const y = (v: number) => pad.top + ((hi - v) / (hi - lo)) * plotH;
  const x = (i: number) => (buckets.length > 1 ? (i / (buckets.length - 1)) * w : 0);

  ctx.font = '11px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = palette.soft;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(fmt.format(hi), 0, pad.top - 4);
  ctx.textAlign = "right";
  ctx.fillText(fmt.format(rounds), w, h - 4);
  ctx.textAlign = "left";
  ctx.fillText(fmt.format(lo), 0, h - 4);

  const zero = y(0);
  ctx.strokeStyle = palette.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(zero) + 0.5);
  ctx.lineTo(w, Math.round(zero) + 0.5);
  ctx.stroke();

  if (buckets.length === 0) return;

  const trace = (color: string, clipTop: number, clipBottom: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipTop, w, clipBottom - clipTop);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    buckets.forEach((b, i) => {
      const px = x(i);
      if (i === 0) ctx.moveTo(px, y(b.max));
      ctx.lineTo(px, y(b.max));
      ctx.lineTo(px, y(b.min));
    });
    ctx.stroke();
    ctx.restore();
  };
  trace(palette.ink, 0, zero);
  trace(palette.accent, zero, h);
}
