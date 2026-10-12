import { flip, newState, nextPrice, settle, step, type Settings, type State } from "./engine.ts";
import { History } from "./history.ts";
import { mulberry32, type Rng } from "./rng.ts";
import type { Speed } from "./speed.ts";

const MAX_DT = 100;
const MAX_ROUNDS_PER_FRAME = 250_000;
export const BUDGET_CHECK_EVERY = 256;

export type Phase = "idle" | "running" | "paused" | "bust";

export class Runner {
  state: State;
  history = new History();
  running = false;
  ticks = 0;
  private rng: Rng;
  private acc = 0;
  private speed: Speed | undefined;
  private inRound = false;
  private flips: boolean[] = [];
  private price = 0;

  constructor(
    public settings: Settings,
    seed: number,
  ) {
    this.rng = mulberry32(seed);
    this.state = newState(settings);
    this.history.push(this.state.bankroll);
  }

  get midRound(): boolean {
    return this.inRound;
  }

  get phase(): Phase {
    if (this.state.bust) return "bust";
    if (this.running) return "running";
    return this.state.rounds > 0 || this.inRound ? "paused" : "idle";
  }

  get seq(): readonly boolean[] {
    if (this.inRound) return this.flips;
    const last = this.state.last;
    if (!last) return [];
    const out = Array<boolean>(last.heads).fill(true);
    out.push(false);
    return out;
  }

  advance(dt: number, speed: Speed, budgetMs: number, now: () => number): void {
    if (!this.running) return;
    if (speed !== this.speed) {
      this.speed = speed;
      this.acc = 0;
    }
    dt = Math.max(0, Math.min(dt, MAX_DT));
    if (speed.flipsPerSec !== undefined) this.flipMode(dt, 1000 / speed.flipsPerSec);
    else if (speed.roundsPerSec !== undefined) this.roundMode(dt, speed.roundsPerSec);
    else this.maxMode(budgetMs, now);
  }

  private flipMode(dt: number, interval: number): void {
    this.acc += dt;
    while (this.acc >= interval && this.running) {
      this.acc -= interval;
      this.tick();
    }
  }

  private tick(): void {
    if (!this.inRound) {
      const price = nextPrice(this.state, this.settings);
      if (price === undefined) {
        this.running = false;
        return;
      }
      this.price = price;
      this.flips = [];
      this.inRound = true;
    }
    const heads = flip(this.rng);
    this.flips.push(heads);
    this.ticks++;
    if (heads) return;
    settle(this.state, this.price, this.flips.length - 1);
    this.inRound = false;
    this.complete();
  }

  private complete(): void {
    this.history.push(this.state.bankroll);
    if (nextPrice(this.state, this.settings) === undefined) this.running = false;
  }

  private roundMode(dt: number, rps: number): void {
    this.finishRound();
    this.acc += (dt * rps) / 1000;
    let n = Math.min(Math.floor(this.acc), MAX_ROUNDS_PER_FRAME);
    this.acc -= n;
    while (n-- > 0 && this.stepOnce());
  }

  private maxMode(budgetMs: number, now: () => number): void {
    this.finishRound();
    const start = now();
    let n = 0;
    while (this.stepOnce()) {
      if (++n % BUDGET_CHECK_EVERY === 0 && now() - start >= budgetMs) break;
    }
  }

  private finishRound(): void {
    if (!this.inRound) return;
    while (this.inRound) this.tick();
    this.acc = 0;
  }

  private stepOnce(): boolean {
    if (step(this.state, this.settings, this.rng) === undefined) {
      this.running = false;
      return false;
    }
    this.ticks++;
    this.complete();
    return this.running;
  }
}
