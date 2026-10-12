import "./style.css";
import { drawChart, paletteFrom, type Palette } from "./chart.ts";
import { averagePayout, type PriceUnit, type Settings, type ZeroRule } from "./engine.ts";
import { fmt, fmt2, plural } from "./format.ts";
import { randomSeed } from "./rng.ts";
import { Runner } from "./run.ts";
import { DEFAULT_SPEED, SPEEDS } from "./speed.ts";
import { MAX_BANKROLL, readLink, writeLink } from "./url.ts";

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

const link = readLink(location.search);
let settings: Settings = link.settings;
let seed = link.seed ?? randomSeed();
let speed = DEFAULT_SPEED;
let runner = new Runner(settings, seed);
let palette: Palette = paletteFrom(document.documentElement);

const FRAME_BUDGET_MS = 8;

function syncUrl(): void {
  history.replaceState(null, "", writeLink(settings, seed));
}

function setPressed(group: HTMLElement, value: string): void {
  for (const b of group.querySelectorAll<HTMLButtonElement>("button")) {
    b.setAttribute("aria-pressed", String(b.dataset.value === value));
  }
}

function renderKnobs(): void {
  bankrollInput.value = String(settings.bankroll);
  priceInput.value = String(settings.price);
  priceInput.max = settings.unit === "pct" ? "100" : String(MAX_BANKROLL);
  setPressed(unitGroup, settings.unit);
  setPressed(zeroGroup, settings.zero);
  const locked = runner.state.rounds > 0 || runner.running || runner.midRound;
  bankrollInput.disabled = locked;
  priceInput.disabled = locked;
  for (const b of [...unitGroup.children, ...zeroGroup.children]) {
    (b as HTMLButtonElement).disabled = locked;
  }
  speedLabel.value = SPEEDS[speed]?.label ?? "";
  speedInput.value = String(speed);
  playButton.textContent = runner.running ? "Pause" : runner.state.bust ? "Reset" : "Play";
  resetButton.hidden = runner.state.bust;
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
  if (s.bust) {
    flipsLine.hidden = true;
    bustLine.hidden = false;
    bustLine.textContent = `Broke after ${plural(s.rounds, "round")}.`;
    return;
  }
  flipsLine.hidden = false;
  bustLine.hidden = true;
  seqEl.textContent = runner.seq.map((h) => (h ? "H" : "T")).join(" ");
  const last = s.last;
  outcomeEl.textContent =
    !runner.midRound && last ? `paid ${fmt(last.price)}, won ${fmt(last.payout)}` : "";
}

function renderChart(): void {
  drawChart(canvas, runner.history.buckets, runner.state.rounds, palette);
}

function renderAll(): void {
  renderKnobs();
  renderFigures();
  renderFlips();
  renderChart();
}

function reset(): void {
  seed = randomSeed();
  runner = new Runner(settings, seed);
  syncUrl();
  renderAll();
}

function applySettings(next: Partial<Settings>): void {
  if (runner.state.rounds > 0 || runner.running) return;
  settings = { ...settings, ...next };
  if (settings.unit === "pct" && settings.price > 100) settings.price = 100;
  runner = new Runner(settings, seed);
  syncUrl();
  renderAll();
}

function readInt(input: HTMLInputElement, min: number, max: number, fallback: number): number {
  const n = Number(input.value);
  if (!Number.isInteger(n) || n < min || n > max) return fallback;
  return n;
}

bankrollInput.addEventListener("change", () => {
  applySettings({ bankroll: readInt(bankrollInput, 0, MAX_BANKROLL, settings.bankroll) });
});

priceInput.addEventListener("change", () => {
  const max = settings.unit === "pct" ? 100 : MAX_BANKROLL;
  applySettings({ price: readInt(priceInput, 1, max, settings.price) });
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
  speed = Number(speedInput.value);
  speedLabel.value = SPEEDS[speed]?.label ?? "";
});

function togglePlay(): void {
  if (runner.state.bust) {
    reset();
    return;
  }
  runner.running = !runner.running;
  last = performance.now();
  renderKnobs();
  renderFlips();
}

playButton.addEventListener("click", togglePlay);
resetButton.addEventListener("click", reset);

document.addEventListener("keydown", (e) => {
  if (e.key !== " " || e.target instanceof HTMLInputElement) return;
  if (e.target instanceof HTMLButtonElement) return;
  e.preventDefault();
  togglePlay();
});

let last = performance.now();
function frame(now: number): void {
  const dt = now - last;
  last = now;
  if (runner.running) {
    const wasRunning = runner.running;
    runner.advance(dt, speed, FRAME_BUDGET_MS, () => performance.now());
    renderFigures();
    renderFlips();
    renderChart();
    if (wasRunning && !runner.running) renderKnobs();
  }
  requestAnimationFrame(frame);
}

new ResizeObserver(renderChart).observe(canvas);
const scheme = matchMedia("(prefers-color-scheme: dark)");
scheme.addEventListener("change", () => {
  palette = paletteFrom(document.documentElement);
  renderChart();
});

syncUrl();
renderAll();
requestAnimationFrame(frame);
