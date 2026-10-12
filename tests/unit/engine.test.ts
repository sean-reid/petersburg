import { describe, expect, it } from "vitest";
import {
  averagePayout,
  DEFAULTS,
  newState,
  nextPrice,
  payoutFor,
  priceFor,
  settle,
  step,
  type Settings,
} from "../../src/engine.ts";
import { mulberry32 } from "../../src/rng.ts";

const settings = (over: Partial<Settings> = {}): Settings => ({ ...DEFAULTS, ...over });

describe("payout", () => {
  it("pays 2 for a tails first and doubles per heads", () => {
    expect(payoutFor(0)).toBe(2);
    expect(payoutFor(1)).toBe(4);
    expect(payoutFor(10)).toBe(2048);
  });
});

describe("price", () => {
  it("is the fixed amount in coins", () => {
    expect(priceFor(settings({ price: 7 }), 1)).toBe(7);
    expect(priceFor(settings({ price: 7 }), -500)).toBe(7);
  });

  it("is a floor of the percent, never below 1", () => {
    expect(priceFor(settings({ price: 10, unit: "pct" }), 100)).toBe(10);
    expect(priceFor(settings({ price: 10, unit: "pct" }), 15)).toBe(1);
    expect(priceFor(settings({ price: 10, unit: "pct" }), 5)).toBe(1);
    expect(priceFor(settings({ price: 10, unit: "pct" }), 0)).toBe(1);
    expect(priceFor(settings({ price: 10, unit: "pct" }), -40)).toBe(1);
  });
});

describe("a round", () => {
  it("moves the bankroll by payout minus price and tracks the figures", () => {
    const s = newState(settings());
    settle(s, 10, 3);
    expect(s.bankroll).toBe(106);
    expect(s.rounds).toBe(1);
    expect(s.totalPayout).toBe(16);
    expect(s.longest).toBe(3);
    settle(s, 10, 0);
    expect(s.bankroll).toBe(98);
    expect(s.longest).toBe(3);
    expect(averagePayout(s)).toBe(9);
    expect(s.last).toEqual({ heads: 0, price: 10, payout: 2 });
  });

  it("busts under the stop rule when the price cannot be met", () => {
    const st = settings({ bankroll: 25, zero: "stop" });
    const s = newState(st);
    expect(nextPrice(s, st)).toBe(10);
    settle(s, 10, 0);
    settle(s, 10, 0);
    expect(s.bankroll).toBe(9);
    expect(nextPrice(s, st)).toBeUndefined();
    expect(s.bust).toBe(true);
    expect(step(s, st, mulberry32(1))).toBeUndefined();
    expect(s.rounds).toBe(2);
  });

  it("goes negative on credit", () => {
    const st = settings({ bankroll: 5 });
    const s = newState(st);
    expect(nextPrice(s, st)).toBe(10);
    settle(s, 10, 0);
    expect(s.bankroll).toBe(-3);
    expect(nextPrice(s, st)).toBe(10);
    expect(s.bust).toBe(false);
  });
});

describe("a run", () => {
  it("replays identically from a seed", () => {
    const a = newState(DEFAULTS);
    const b = newState(DEFAULTS);
    const ra = mulberry32(99);
    const rb = mulberry32(99);
    for (let i = 0; i < 5000; i++) {
      step(a, DEFAULTS, ra);
      step(b, DEFAULTS, rb);
    }
    expect(a).toEqual(b);
    expect(a.rounds).toBe(5000);
  });

  it("averages near 2 per flip depth over many rounds", () => {
    const s = newState(DEFAULTS);
    const rng = mulberry32(3);
    let twos = 0;
    for (let i = 0; i < 100_000; i++) {
      const r = step(s, DEFAULTS, rng);
      if (r?.heads === 0) twos++;
    }
    expect(twos / 100_000).toBeGreaterThan(0.49);
    expect(twos / 100_000).toBeLessThan(0.51);
    expect(averagePayout(s)).toBeGreaterThan(10);
  });
});
