import { describe, expect, it } from "vitest";
import { formatSeed, mulberry32, parseSeed } from "../../src/rng.ts";

describe("mulberry32", () => {
  it("is deterministic for a seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });

  it("stays in [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 10_000; i++) {
      const x = r();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it("differs across seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
});

describe("seed text", () => {
  it("round-trips through base36", () => {
    for (const s of [0, 1, 0xffffffff, 123456789]) expect(parseSeed(formatSeed(s))).toBe(s);
  });

  it("rejects junk", () => {
    expect(parseSeed(null)).toBeUndefined();
    expect(parseSeed("")).toBeUndefined();
    expect(parseSeed("ZZ")).toBeUndefined();
    expect(parseSeed("zzzzzzzz")).toBeUndefined();
  });
});
