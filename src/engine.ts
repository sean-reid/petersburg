import type { Rng } from "./rng.ts";

export type PriceUnit = "coins" | "pct";
export type ZeroRule = "stop" | "credit";

export interface Settings {
  bankroll: number;
  price: number;
  unit: PriceUnit;
  zero: ZeroRule;
}

export interface Round {
  heads: number;
  price: number;
  payout: number;
}

export interface State {
  rounds: number;
  bankroll: number;
  totalPayout: number;
  longest: number;
  bust: boolean;
  last: Round | undefined;
}

export const DEFAULTS: Settings = { bankroll: 100, price: 10, unit: "coins", zero: "credit" };

export function newState(settings: Settings): State {
  return {
    rounds: 0,
    bankroll: settings.bankroll,
    totalPayout: 0,
    longest: 0,
    bust: false,
    last: undefined,
  };
}

export function flip(rng: Rng): boolean {
  return rng() < 0.5;
}

export function payoutFor(heads: number): number {
  return 2 ** (heads + 1);
}

export function priceFor(settings: Settings, bankroll: number): number {
  if (settings.unit === "coins") return settings.price;
  if (bankroll <= 0) return 1;
  return Math.max(1, Math.floor((settings.price * bankroll) / 100));
}

export function nextPrice(state: State, settings: Settings): number | undefined {
  if (state.bust) return undefined;
  const price = priceFor(settings, state.bankroll);
  if (settings.zero === "stop" && state.bankroll < price) {
    state.bust = true;
    return undefined;
  }
  return price;
}

export function settle(state: State, price: number, heads: number): Round {
  const payout = payoutFor(heads);
  state.bankroll += payout - price;
  state.rounds += 1;
  state.totalPayout += payout;
  if (heads > state.longest) state.longest = heads;
  const round = { heads, price, payout };
  state.last = round;
  return round;
}

export function step(state: State, settings: Settings, rng: Rng): Round | undefined {
  const price = nextPrice(state, settings);
  if (price === undefined) return undefined;
  let heads = 0;
  while (flip(rng)) heads++;
  return settle(state, price, heads);
}

export function averagePayout(state: State): number {
  return state.rounds === 0 ? 0 : state.totalPayout / state.rounds;
}
