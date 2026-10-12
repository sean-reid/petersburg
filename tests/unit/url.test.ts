import { describe, expect, it } from "vitest";
import { DEFAULTS } from "../../src/engine.ts";
import { readLink, writeLink } from "../../src/url.ts";

describe("link", () => {
  it("round-trips settings and seed", () => {
    const settings = { bankroll: 250, price: 5, unit: "pct" as const, zero: "stop" as const };
    const link = readLink(writeLink(settings, 123456));
    expect(link.settings).toEqual(settings);
    expect(link.seed).toBe(123456);
  });

  it("falls back to defaults on junk", () => {
    const link = readLink("?b=-1&p=0&u=euros&z=maybe&s=!!");
    expect(link.settings).toEqual(DEFAULTS);
    expect(link.seed).toBeUndefined();
  });

  it("caps a percent price at 100", () => {
    expect(readLink("?u=pct&p=250").settings.price).toBe(10);
    expect(readLink("?u=pct&p=100").settings.price).toBe(100);
    expect(readLink("?u=coins&p=250").settings.price).toBe(250);
  });

  it("gives an empty query the defaults and no seed", () => {
    expect(readLink("")).toEqual({ settings: DEFAULTS, seed: undefined });
  });
});
