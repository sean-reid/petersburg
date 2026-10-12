import "./style.css";
import { drawChart, paletteFrom, type Palette } from "./chart.ts";
import { averagePayout, type PriceUnit, type Settings, type ZeroRule } from "./engine.ts";
import { fmt, fmt2, plural } from "./format.ts";
import { randomSeed } from "./rng.ts";
import { Runner } from "./run.ts";
import { DEFAULT_SPEED, SPEEDS, type Speed } from "./speed.ts";
import { clampInt, MAX_BANKROLL, maxPrice, readLink, writeLink } from "./url.ts";

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const bankrollInput = $<HTMLInputElement>("bankroll");
const priceInput = $<HTMLInputElement>("price");
const unitGroup = $("unit");
const zeroGroup = $("zero");
const playButton = $<HTMLButtonElement>("play");
const resetButton = $<HTMLButtonElement>("reset");
const speedInput = $<HTMLInputElement>("speed");
const speedLabel = $<HTMLOutputElement>("speed-label");
const figRounds = $("f-rounds");
const figBankroll = $("f-bankroll");
const figAvg = $("f-avg");
const figStreak = $("f-streak");
const canvas = $<HTMLCanvasElement>("chart");
const flipsLine = $("flips");
const seqEl = $("seq");
const outcomeEl = $("outcome");
const bustLine = $("bust");

const FRAME_BUDGET_MS = 8;
const stillMotion = matchMedia("(prefers-reduced-motion: reduce)");

const link = readLink(location.search);
let settings: Settings = link.settings;
let seed = link.seed ?? randomSeed();
let speed: Speed = SPEEDS[DEFAULT_SPEED]!;
let runner = new Runner(settings, seed);
let palette: Palette = paletteFrom(document.documentElement);
let drawnTicks = -1;
let lastFrame = 0;

function syncUrl(): void {
  history.replaceState(null, "", writeLink(settings, seed));
}

function setPressed(group: HTMLElement, value: string): void {
  for (const b of group.querySelectorAll<HTMLButtonElement>("button")) {
    b.setAttribute("aria-pressed", String(b.dataset.value === value));
  }
}

function renderSpeed(): void {
  speedInput.value = String(SPEEDS.indexOf(speed));
  speedInput.setAttribute("aria-valuetext", speed.label);
  speedLabel.value = speed.label;
}

function renderKnobs(): void {
  const phase = runner.phase;
  bankrollInput.value = String(settings.bankroll);
  priceInput.value = String(settings.price);
  priceInput.max = String(maxPrice(settings.unit));
  setPressed(unitGroup, settings.unit);
  setPressed(zeroGroup, settings.zero);
  const locked = phase !== "idle";
  bankrollInput.disabled = locked;
  priceInput.disabled = locked;
  for (const b of [...unitGroup.children, ...zeroGroup.children]) {
    (b as HTMLButtonElement).disabled = locked;
  }
  playButton.textContent = phase === "running" ? "Pause" : phase === "bust" ? "Play again" : "Play";
  resetButton.hidden = phase === "bust";
}

function renderFigures(): void {
  const s = runner.state;
  figRounds.textContent = fmt(s.rounds);
  figBankroll.textContent = fmt(s.bankroll);
  figBankroll.classList.toggle("debt", s.bankroll < 0);
  figAvg.textContent = fmt2(averagePayout(s));
  figStreak.textContent = fmt(s.longest);
}

function renderFlips(): void {
  const s = runner.state;
  const phase = runner.phase;
  bustLine.textContent = phase === "bust" ? `Broke after ${plural(s.rounds, "round")}.` : "";
  flipsLine.hidden = phase === "bust";
  if (phase === "bust") return;
  if (phase === "idle") {
    seqEl.textContent = "";
    outcomeEl.textContent = "press Play or space to start";
    return;
  }
  if (phase === "running" && stillMotion.matches && speed.flipsPerSec === undefined) return;
  seqEl.textContent = runner.seq.map((h) => (h ? "H" : "T")).join(" ");
  const last = s.last;
  outcomeEl.textContent =
    !runner.midRound && last ? `paid ${fmt(last.price)}, won ${fmt(last.payout)}` : "";
}

function renderChart(): void {
  const { lo, hi } = drawChart(canvas, runner.history.buckets, runner.state.rounds, palette);
  if (runner.phase !== "running") {
    const rounds = plural(runner.state.rounds, "round");
    canvas.setAttribute("aria-label", `Bankroll over ${rounds}, low ${fmt(lo)}, high ${fmt(hi)}`);
  }
}

function renderAll(): void {
  renderSpeed();
  renderKnobs();
  renderFigures();
  renderFlips();
  renderChart();
  drawnTicks = runner.ticks;
}

function reset(): void {
  seed = randomSeed();
  runner = new Runner(settings, seed);
  syncUrl();
  renderAll();
}

function applySettings(next: Partial<Settings>): void {
  if (runner.phase !== "idle") return;
  settings = { ...settings, ...next };
  settings.price = Math.min(settings.price, maxPrice(settings.unit));
  runner = new Runner(settings, seed);
  syncUrl();
  renderAll();
}

function readKnob(input: HTMLInputElement, min: number, max: number, fallback: number): number {
  const n = clampInt(input.value, min, max, fallback);
  if (String(n) !== input.value.trim()) input.reportValidity();
  return n;
}

bankrollInput.addEventListener("change", () => {
  applySettings({ bankroll: readKnob(bankrollInput, 0, MAX_BANKROLL, settings.bankroll) });
});

priceInput.addEventListener("change", () => {
  applySettings({ price: readKnob(priceInput, 1, maxPrice(settings.unit), settings.price) });
});

unitGroup.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (b?.dataset.value) applySettings({ unit: b.dataset.value as PriceUnit });
});

zeroGroup.addEventListener("click", (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>("button");
  if (b?.dataset.value) applySettings({ zero: b.dataset.value as ZeroRule });
});

speedInput.addEventListener("input", () => {
  speed = SPEEDS[Number(speedInput.value)] ?? speed;
  renderSpeed();
});

function frame(now: number): void {
  const dt = now - lastFrame;
  lastFrame = now;
  if (!runner.running) return;
  runner.advance(dt, speed, FRAME_BUDGET_MS, () => performance.now());
  if (runner.ticks !== drawnTicks) {
    drawnTicks = runner.ticks;
    renderFigures();
    renderFlips();
    renderChart();
  }
  if (runner.running) requestAnimationFrame(frame);
  else {
    renderKnobs();
    renderFlips();
    renderChart();
  }
}

function togglePlay(): void {
  if (runner.phase === "bust") {
    reset();
    return;
  }
  runner.running = !runner.running;
  renderKnobs();
  renderFlips();
  renderChart();
  if (runner.running) {
    lastFrame = performance.now();
    requestAnimationFrame(frame);
  }
}

playButton.addEventListener("click", togglePlay);
resetButton.addEventListener("click", reset);

document.addEventListener("keydown", (e) => {
  if (e.key !== " " || e.repeat) return;
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement) return;
  e.preventDefault();
  togglePlay();
});

new ResizeObserver(renderChart).observe(canvas);
matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  palette = paletteFrom(document.documentElement);
  renderChart();
});
document.fonts.ready.then(() => {
  palette = paletteFrom(document.documentElement);
  renderChart();
});

speedInput.max = String(SPEEDS.length - 1);
bankrollInput.max = String(MAX_BANKROLL);
syncUrl();
renderAll();
