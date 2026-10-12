import { describe, expect, it } from "vitest";
import { History } from "../../src/history.ts";

describe("History", () => {
  it("keeps one bucket per value until the capacity fills", () => {
    const h = new History(4);
    [1, 2, 3, 4].forEach((v) => h.push(v));
    expect(h.buckets).toEqual([
      { min: 1, max: 1, last: 1 },
      { min: 2, max: 2, last: 2 },
      { min: 3, max: 3, last: 3 },
      { min: 4, max: 4, last: 4 },
    ]);
    expect(h.span).toBe(1);
  });

  it("folds pairs when full and doubles the span", () => {
    const h = new History(4);
    [1, 2, 3, 4, 5].forEach((v) => h.push(v));
    expect(h.span).toBe(2);
    expect(h.buckets).toEqual([
      { min: 1, max: 2, last: 2 },
      { min: 3, max: 4, last: 4 },
      { min: 5, max: 5, last: 5 },
    ]);
    h.push(0);
    expect(h.buckets[2]).toEqual({ min: 0, max: 5, last: 0 });
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

  it("folds again at span 4 and 8", () => {
    const h = new History(4);
    for (let v = 1; v <= 9; v++) h.push(v);
    expect(h.span).toBe(4);
    expect(h.buckets).toEqual([
      { min: 1, max: 4, last: 4 },
      { min: 5, max: 8, last: 8 },
      { min: 9, max: 9, last: 9 },
    ]);
    for (let v = 10; v <= 16; v++) h.push(v);
    expect(h.buckets).toHaveLength(4);
    expect(h.buckets[3]).toEqual({ min: 13, max: 16, last: 16 });
    h.push(17);
    expect(h.span).toBe(8);
    expect(h.buckets).toEqual([
      { min: 1, max: 8, last: 8 },
      { min: 9, max: 16, last: 16 },
      { min: 17, max: 17, last: 17 },
    ]);
  });

  it("keeps the closing value of each bucket", () => {
    const h = new History(2);
    [5, 1, 9, 3, 7].forEach((v) => h.push(v));
    expect(h.buckets.map((b) => b.last)).toEqual([3, 7]);
    expect(h.buckets[0]).toEqual({ min: 1, max: 9, last: 3 });
  });

  it("rejects odd and tiny capacities", () => {
    expect(() => new History(3)).toThrow();
    expect(() => new History(0)).toThrow();
    expect(() => new History(1)).toThrow();
    expect(new History(2).capacity).toBe(2);
  });
});
