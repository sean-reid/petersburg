import { describe, expect, it } from "vitest";
import { DEFAULTS, newState, step, type Settings } from "../../src/engine.ts";
import { mulberry32 } from "../../src/rng.ts";
import { BUDGET_CHECK_EVERY, Runner } from "../../src/run.ts";
import { SPEEDS } from "../../src/speed.ts";

const FLIP1 = SPEEDS[0]!;
const FLIP4 = SPEEDS[1]!;
const R10 = SPEEDS[2]!;
const R100 = SPEEDS[3]!;
const R1K = SPEEDS[4]!;
const MAX = SPEEDS[6]!;
const zero = () => 0;

const clock = () => {
  let t = 0;
  return { now: () => t, tick: (ms: number) => (t += ms) };
};

const start = (settings: Settings, seed: number) => {
  const r = new Runner(settings, seed);
  r.running = true;
  return r;
};

describe("Runner", () => {
  it("does nothing until started", () => {
    const r = new Runner(DEFAULTS, 1);
    r.advance(1000, R100, 8, zero);
    expect(r.state.rounds).toBe(0);
    expect(r.history.count).toBe(1);
    expect(r.phase).toBe("idle");
    expect(r.seq).toEqual([]);
  });

  it("flips one coin per interval at a flip speed", () => {
    const r = start(DEFAULTS, 1);
    for (let i = 0; i < 9; i++) r.advance(100, FLIP1, 8, zero);
    expect(r.seq).toHaveLength(0);
    r.advance(100, FLIP1, 8, zero);
    expect(r.seq).toHaveLength(1);
    expect(r.ticks).toBe(1);
    while (r.state.rounds === 0) r.advance(100, FLIP1, 8, zero);
    expect(r.seq[r.seq.length - 1]).toBe(false);
    expect(r.seq.length).toBe(r.state.last!.heads + 1);
  });

  it("clamps a frame to 100 ms so a backgrounded tab does not burst", () => {
    const r = start(DEFAULTS, 1);
    r.advance(10_000, R100, 8, zero);
    expect(r.state.rounds).toBe(10);
    const f = start(DEFAULTS, 1);
    f.advance(10_000, FLIP1, 8, zero);
    expect(f.ticks).toBe(0);
  });

  it("ignores a negative frame time", () => {
    const r = start(DEFAULTS, 1);
    r.advance(-5, R100, 8, zero);
    r.advance(5, R100, 8, zero);
    expect(r.state.rounds).toBe(0);
  });

  it("drops the accumulator when the speed changes", () => {
    const r = start(DEFAULTS, 1);
    r.advance(100, FLIP1, 8, zero);
    r.advance(100, FLIP1, 8, zero);
    r.advance(100, FLIP1, 8, zero);
    r.advance(16, FLIP4, 8, zero);
    expect(r.ticks).toBe(0);
    const f = start(DEFAULTS, 1);
    f.advance(100, FLIP1, 8, zero);
    f.advance(0, R10, 8, zero);
    expect(f.state.rounds).toBe(0);
  });

  it("runs the rate times the elapsed seconds at a round speed", () => {
    const r = start(DEFAULTS, 1);
    for (let i = 0; i < 10; i++) r.advance(100, R100, 8, zero);
    expect(r.state.rounds).toBe(100);
    expect(r.history.count).toBe(101);
    expect(r.seq[r.seq.length - 1]).toBe(false);
    expect(r.seq.length).toBe(r.state.last!.heads + 1);
  });

  it("matches a plain engine run from the same seed across speed changes", () => {
    const r = start(DEFAULTS, 77);
    const stops = [R1K, FLIP1, MAX, FLIP4, R10, R100];
    const c = clock();
    for (let i = 0; i < 60; i++) r.advance(50, stops[i % stops.length]!, 1, () => c.tick(1));
    while (r.midRound) r.advance(1000, FLIP4, 8, zero);
    const s = newState(DEFAULTS);
    const rng = mulberry32(77);
    for (let i = 0; i < r.state.rounds; i++) step(s, DEFAULTS, rng);
    expect(r.state).toEqual(s);
    expect(r.state.rounds).toBeGreaterThan(100);
  });

  it("stops on a bust the moment the bankroll cannot cover the next price", () => {
    const settings = { ...DEFAULTS, bankroll: 10, zero: "stop" as const };
    const r = start(settings, 5);
    const c = clock();
    r.advance(16, MAX, 8, () => c.tick(1));
    expect(r.state.bust).toBe(true);
    expect(r.running).toBe(false);
    expect(r.phase).toBe("bust");
    expect(r.state.rounds).toBeGreaterThan(0);
    const rounds = r.state.rounds;
    r.running = true;
    r.advance(16, MAX, 8, () => c.tick(1));
    expect(r.state.rounds).toBe(rounds);
    expect(r.running).toBe(false);
  });

  it("busts in flip mode right after the losing tails", () => {
    const settings = { ...DEFAULTS, bankroll: 10, zero: "stop" as const };
    const r = start(settings, 5);
    while (r.state.rounds === 0) r.advance(100, FLIP1, 8, zero);
    expect(r.state.bankroll).toBeLessThan(10);
    expect(r.running).toBe(false);
    expect(r.state.bust).toBe(true);
    expect(r.midRound).toBe(false);
  });

  it("busts at round zero when the first price is unaffordable", () => {
    const settings = { ...DEFAULTS, bankroll: 5, zero: "stop" as const };
    const r = start(settings, 5);
    r.advance(100, R100, 8, zero);
    expect(r.state.rounds).toBe(0);
    expect(r.phase).toBe("bust");
  });

  it("stops at the time budget when running flat out", () => {
    const r = start(DEFAULTS, 2);
    const c = clock();
    r.advance(16, MAX, 8, () => c.tick(1));
    expect(r.state.rounds).toBeGreaterThan(BUDGET_CHECK_EVERY);
    expect(r.state.rounds).toBeLessThanOrEqual(9 * BUDGET_CHECK_EVERY);
  });

  it("finishes a half-flipped round before switching to a round speed", () => {
    const r = start(DEFAULTS, 9);
    while (!r.midRound) r.advance(100, FLIP1, 8, zero);
    expect(r.phase).toBe("running");
    r.advance(100, R10, 8, zero);
    expect(r.midRound).toBe(false);
    expect(r.state.rounds).toBeGreaterThanOrEqual(1);
  });

  it("holds a half-flipped round while paused", () => {
    const r = start(DEFAULTS, 9);
    while (!r.midRound) r.advance(100, FLIP1, 8, zero);
    const seq = [...r.seq];
    r.running = false;
    expect(r.phase).toBe("paused");
    r.advance(100, FLIP1, 8, zero);
    expect(r.seq).toEqual(seq);
    r.running = true;
    while (r.state.rounds < 3) r.advance(100, FLIP1, 8, zero);
    const s = newState(DEFAULTS);
    const rng = mulberry32(9);
    for (let i = 0; i < 3; i++) step(s, DEFAULTS, rng);
    expect(r.state).toEqual(s);
  });

  it("charges a percent of the bankroll each round", () => {
    const settings: Settings = { bankroll: 100, price: 10, unit: "pct", zero: "stop" };
    const r = start(settings, 11);
    let before = 100;
    for (let i = 0; i < 50; i++) {
      r.advance(100, R10, 8, zero);
      const last = r.state.last!;
      expect(last.price).toBe(Math.max(1, Math.floor(before / 10)));
      before = r.state.bankroll;
    }
    expect(r.state.bust).toBe(false);
  });
});
