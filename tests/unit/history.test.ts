import { describe, expect, it } from "vitest";
import { History } from "../../src/history.ts";

describe("History", () => {
  it("keeps one bucket per value until the capacity fills", () => {
    const h = new History(4);
    [1, 2, 3, 4].forEach((v) => h.push(v));
    expect(h.buckets).toEqual([
      { min: 1, max: 1 },
      { min: 2, max: 2 },
      { min: 3, max: 3 },
      { min: 4, max: 4 },
    ]);
    expect(h.span).toBe(1);
  });

  it("folds pairs when full and doubles the span", () => {
    const h = new History(4);
    [1, 2, 3, 4, 5].forEach((v) => h.push(v));
    expect(h.span).toBe(2);
    expect(h.buckets).toEqual([
      { min: 1, max: 2 },
      { min: 3, max: 4 },
      { min: 5, max: 5 },
    ]);
    h.push(0);
    expect(h.buckets[2]).toEqual({ min: 0, max: 5 });
    h.push(9);
    expect(h.buckets).toHaveLength(4);
    expect(h.count).toBe(7);
  });

  it("never exceeds the capacity and preserves the extremes", () => {
    const h = new History(64);
    let x = 0;
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 0; i < 100_000; i++) {
      x += i % 7 === 0 ? 50 : -3;
      lo = Math.min(lo, x);
      hi = Math.max(hi, x);
      h.push(x);
      expect(h.buckets.length).toBeLessThanOrEqual(64);
    }
    expect(Math.min(...h.buckets.map((b) => b.min))).toBe(lo);
    expect(Math.max(...h.buckets.map((b) => b.max))).toBe(hi);
    expect(h.count).toBe(100_000);
    expect(h.span * h.buckets.length).toBeGreaterThanOrEqual(100_000);
  });

  it("rejects odd capacities", () => {
    expect(() => new History(3)).toThrow();
  });
});
