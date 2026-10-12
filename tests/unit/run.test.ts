import { describe, expect, it } from "vitest";
import { DEFAULTS, newState, step } from "../../src/engine.ts";
import { mulberry32 } from "../../src/rng.ts";
import { Runner } from "../../src/run.ts";

const clock = () => {
  let t = 0;
  return { now: () => t, tick: (ms: number) => (t += ms) };
};

describe("Runner", () => {
  it("does nothing until started", () => {
    const r = new Runner(DEFAULTS, 1);
    r.advance(1000, 3, 8, () => 0);
    expect(r.state.rounds).toBe(0);
    expect(r.history.count).toBe(1);
  });

  it("flips one coin per interval at a flip speed", () => {
    const r = new Runner(DEFAULTS, 1);
    r.running = true;
    for (let i = 0; i < 9; i++) r.advance(100, 0, 8, () => 0);
    expect(r.seq).toHaveLength(0);
    r.advance(100, 0, 8, () => 0);
    expect(r.seq).toHaveLength(1);
    while (r.state.rounds === 0) r.advance(100, 0, 8, () => 0);
    expect(r.seq[r.seq.length - 1]).toBe(false);
    expect(r.seq.length).toBe(r.state.last!.heads + 1);
  });

  it("runs the rate times the elapsed seconds at a round speed", () => {
    const r = new Runner(DEFAULTS, 1);
    r.running = true;
    for (let i = 0; i < 10; i++) r.advance(100, 3, 8, () => 0);
    expect(r.state.rounds).toBe(100);
    expect(r.history.count).toBe(101);
  });

  it("matches a plain engine run from the same seed", () => {
    const r = new Runner(DEFAULTS, 77);
    r.running = true;
    for (let i = 0; i < 10; i++) r.advance(100, 4, 8, () => 0);
    const s = newState(DEFAULTS);
    const rng = mulberry32(77);
    for (let i = 0; i < 1000; i++) step(s, DEFAULTS, rng);
    expect(r.state).toEqual(s);
  });

  it("stops on a bust and stays stopped", () => {
    const settings = { ...DEFAULTS, bankroll: 10, zero: "stop" as const };
    const r = new Runner(settings, 5);
    r.running = true;
    const c = clock();
    r.advance(16, 6, 8, () => c.tick(1));
    expect(r.state.bust).toBe(true);
    expect(r.running).toBe(false);
    const rounds = r.state.rounds;
    r.running = true;
    r.advance(16, 6, 8, () => c.tick(1));
    expect(r.state.rounds).toBe(rounds);
    expect(r.running).toBe(false);
  });

  it("stops at the time budget when running flat out", () => {
    const r = new Runner(DEFAULTS, 2);
    r.running = true;
    const c = clock();
    r.advance(16, 6, 8, () => c.tick(1));
    expect(r.state.rounds).toBeGreaterThan(256);
    expect(r.state.rounds).toBeLessThanOrEqual(2304);
  });

  it("finishes a half-flipped round before switching to round speed", () => {
    const r = new Runner(DEFAULTS, 9);
    r.running = true;
    while (!r.midRound) r.advance(100, 0, 8, () => 0);
    r.advance(100, 2, 8, () => 0);
    expect(r.midRound).toBe(false);
    expect(r.state.rounds).toBeGreaterThanOrEqual(1);
  });
});
