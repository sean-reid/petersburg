import { describe, expect, it } from "vitest";
import { DEFAULTS } from "../../src/engine.ts";
import { clampInt, readLink, writeLink } from "../../src/url.ts";

describe("link", () => {
  it("round-trips settings and seed", () => {
    const settings = { bankroll: 250, price: 5, unit: "pct" as const, zero: "stop" as const };
    const link = readLink(writeLink(settings, 123456));
    expect(link.settings).toEqual(settings);
    expect(link.seed).toBe(123456);
  });

  it("falls back to defaults on junk", () => {
    const link = readLink("?b=-1&p=x&u=euros&z=maybe&s=!!");
    expect(link.settings).toEqual(DEFAULTS);
    expect(link.seed).toBeUndefined();
  });

  it("clamps prices to the unit's ceiling and bankrolls to the cap", () => {
    expect(readLink("?u=pct&p=250").settings.price).toBe(100);
    expect(readLink("?u=pct&p=100").settings.price).toBe(100);
    expect(readLink("?u=coins&p=250").settings.price).toBe(250);
    expect(readLink("?u=coins&p=99999999999").settings.price).toBe(1_000_000_000);
    expect(readLink("?b=1000000000001").settings.bankroll).toBe(1_000_000_000_000);
    expect(readLink("?b=99999999999999999999").settings.bankroll).toBe(1_000_000_000_000);
    expect(readLink("?p=0").settings.price).toBe(1);
  });

  it("reads the seed independently of junk settings", () => {
    const link = readLink("?b=junk&p=abc&u=x&z=y&s=abc");
    expect(link.settings).toEqual(DEFAULTS);
    expect(link.seed).toBe(parseInt("abc", 36));
  });

  it("gives an empty query the defaults and no seed", () => {
    expect(readLink("")).toEqual({ settings: DEFAULTS, seed: undefined });
  });
});

describe("clampInt", () => {
  it("falls back for anything that is not a plain integer", () => {
    expect(clampInt("", 0, 10, 7)).toBe(7);
    expect(clampInt("  ", 0, 10, 7)).toBe(7);
    expect(clampInt("1.5", 0, 10, 7)).toBe(7);
    expect(clampInt("1e3", 0, 10, 7)).toBe(7);
    expect(clampInt("+5", 0, 10, 7)).toBe(7);
    expect(clampInt("-5", 0, 10, 7)).toBe(7);
    expect(clampInt(null, 0, 10, 7)).toBe(7);
  });

  it("clamps integers into range", () => {
    expect(clampInt("007", 0, 10, 7)).toBe(7);
    expect(clampInt("0", 1, 10, 7)).toBe(1);
    expect(clampInt("11", 1, 10, 7)).toBe(10);
    expect(clampInt(" 4 ", 1, 10, 7)).toBe(4);
  });
});
