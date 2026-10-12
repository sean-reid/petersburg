import { DEFAULTS, type PriceUnit, type Settings } from "./engine.ts";
import { formatSeed, parseSeed } from "./rng.ts";

export interface Link {
  settings: Settings;
  seed: number | undefined;
}

export const MAX_BANKROLL = 1_000_000_000_000;
export const MAX_COINS = 1_000_000_000;

export const maxPrice = (unit: PriceUnit): number => (unit === "pct" ? 100 : MAX_COINS);

export function clampInt(text: string | null, min: number, max: number, fallback: number): number {
  if (text === null || !/^\d+$/.test(text.trim())) return fallback;
  const n = Number(text);
  if (!Number.isSafeInteger(n)) return max;
  return Math.min(Math.max(n, min), max);
}

export function readLink(search: string): Link {
  const q = new URLSearchParams(search);
  const unit: PriceUnit = q.get("u") === "pct" ? "pct" : "coins";
  const zero = q.get("z") === "stop" ? "stop" : "credit";
  return {
    settings: {
      bankroll: clampInt(q.get("b"), 0, MAX_BANKROLL, DEFAULTS.bankroll),
      price: clampInt(q.get("p"), 1, maxPrice(unit), DEFAULTS.price),
      unit,
      zero,
    },
    seed: parseSeed(q.get("s")),
  };
}

export function writeLink(settings: Settings, seed: number): string {
  const q = new URLSearchParams();
  q.set("b", String(settings.bankroll));
  q.set("p", String(settings.price));
  q.set("u", settings.unit);
  q.set("z", settings.zero);
  q.set("s", formatSeed(seed));
  return `?${q.toString()}`;
}
