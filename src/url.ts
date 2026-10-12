import { DEFAULTS, type Settings } from "./engine.ts";
import { formatSeed, parseSeed } from "./rng.ts";

export interface Link {
  settings: Settings;
  seed: number | undefined;
}

export const MAX_BANKROLL = 1_000_000_000_000;

function int(text: string | null, min: number, max: number, fallback: number): number {
  if (text === null || !/^\d{1,13}$/.test(text)) return fallback;
  const n = Number(text);
  return n >= min && n <= max ? n : fallback;
}

export function readLink(search: string): Link {
  const q = new URLSearchParams(search);
  const unit = q.get("u") === "pct" ? "pct" : "coins";
  const zero = q.get("z") === "stop" ? "stop" : "credit";
  const maxPrice = unit === "pct" ? 100 : MAX_BANKROLL;
  return {
    settings: {
      bankroll: int(q.get("b"), 0, MAX_BANKROLL, DEFAULTS.bankroll),
      price: int(q.get("p"), 1, maxPrice, Math.min(DEFAULTS.price, maxPrice)),
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
