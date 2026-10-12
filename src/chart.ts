import { fmt } from "./format.ts";
import type { Bucket } from "./history.ts";

export interface Palette {
  ink: string;
  soft: string;
  rule: string;
  accent: string;
  font: string;
}

export function paletteFrom(el: Element): Palette {
  const s = getComputedStyle(el);
  const v = (name: string) => s.getPropertyValue(name).trim();
  return {
    ink: v("--ink"),
    soft: v("--ink-soft"),
    rule: v("--rule"),
    accent: v("--accent"),
    font: `11px ${v("--mono")}`,
  };
}

export function drawChart(
  canvas: HTMLCanvasElement,
  buckets: readonly Bucket[],
  rounds: number,
  palette: Palette,
): { lo: number; hi: number } {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) return { lo: 0, hi: 0 };
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  let lo = 0;
  let hi = 0;
  for (const b of buckets) {
    if (b.min < lo) lo = b.min;
    if (b.max > hi) hi = b.max;
  }
  if (hi === lo) hi = lo + 1;
  const pad = { top: 14, bottom: 18 };
  const plotH = h - pad.top - pad.bottom;
  const y = (v: number) => pad.top + ((hi - v) / (hi - lo)) * plotH;
  const x = (i: number) => (buckets.length > 1 ? (i / (buckets.length - 1)) * w : 0);

  ctx.font = palette.font;
  ctx.fillStyle = palette.soft;
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillText(fmt(hi), 0, pad.top - 4);
  if (rounds > 0) {
    ctx.textAlign = "right";
    ctx.fillText(fmt(rounds), w, h - 4);
  }
  ctx.textAlign = "left";
  ctx.fillText(fmt(lo), 0, h - 4);

  const zero = y(0);
  ctx.strokeStyle = palette.rule;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, Math.round(zero) + 0.5);
  ctx.lineTo(w, Math.round(zero) + 0.5);
  ctx.stroke();

  if (buckets.length === 0) return { lo, hi };

  if (buckets.length > 1) {
    ctx.fillStyle = palette.rule;
    ctx.beginPath();
    buckets.forEach((b, i) => {
      if (i === 0) ctx.moveTo(x(i), y(b.max));
      else ctx.lineTo(x(i), y(b.max));
    });
    for (let i = buckets.length - 1; i >= 0; i--) ctx.lineTo(x(i), y(buckets[i]!.min));
    ctx.closePath();
    ctx.fill();
  }

  const trace = (color: string, clipTop: number, clipBottom: number) => {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, clipTop, w, clipBottom - clipTop);
    ctx.clip();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    buckets.forEach((b, i) => {
      if (i === 0) ctx.moveTo(x(i), y(b.last));
      else ctx.lineTo(x(i), y(b.last));
    });
    ctx.stroke();
    ctx.restore();
  };
  trace(palette.ink, 0, zero);
  trace(palette.accent, zero, h);
  return { lo, hi };
}
