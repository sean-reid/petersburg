import { describe, expect, it } from "vitest";
import { fmt, fmt2, plural } from "../../src/format.ts";

describe("format", () => {
  it("groups whole numbers and keeps the sign", () => {
    expect(fmt(-8)).toBe("-8");
    expect(fmt(1_000_000_000_000)).toBe("1,000,000,000,000");
    expect(fmt(2.6)).toBe("3");
  });

  it("shows two decimals", () => {
    expect(fmt2(9)).toBe("9.00");
    expect(fmt2(27.589)).toBe("27.59");
  });

  it("pluralises", () => {
    expect(plural(1, "round")).toBe("1 round");
    expect(plural(0, "round")).toBe("0 rounds");
    expect(plural(1234, "round")).toBe("1,234 rounds");
  });
});
