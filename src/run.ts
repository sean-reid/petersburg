import { flip, newState, nextPrice, settle, step, type Settings, type State } from "./engine.ts";
import { History } from "./history.ts";
import { mulberry32, type Rng } from "./rng.ts";
import { SPEEDS } from "./speed.ts";

const MAX_DT = 100;
const MAX_ROUNDS_PER_FRAME = 250_000;

export class Runner {
  state: State;
  history = new History();
  running = false;
  seq: boolean[] = [];
  private rng: Rng;
  private acc = 0;
  private inRound = false;
  private heads = 0;
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

  advance(dt: number, speed: number, budgetMs: number, now: () => number): void {
    if (!this.running) return;
    const s = SPEEDS[speed] ?? SPEEDS[SPEEDS.length - 1]!;
    dt = Math.min(dt, MAX_DT);
    if (s.flipsPerSec !== undefined) this.flipMode(dt, 1000 / s.flipsPerSec);
    else if (s.roundsPerSec !== undefined) this.roundMode(dt, s.roundsPerSec);
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
      this.heads = 0;
      this.seq = [];
      this.inRound = true;
    }
    const heads = flip(this.rng);
    this.seq.push(heads);
    if (heads) {
      this.heads++;
      return;
    }
    settle(this.state, this.price, this.heads);
    this.history.push(this.state.bankroll);
    this.inRound = false;
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
      if (++n % 256 === 0 && now() - start >= budgetMs) break;
    }
  }

  private finishRound(): void {
    while (this.inRound) this.tick();
    this.acc = Math.min(this.acc, 1);
  }

  private stepOnce(): boolean {
    const round = step(this.state, this.settings, this.rng);
    if (round === undefined) {
      this.running = false;
      return false;
    }
    this.history.push(this.state.bankroll);
    this.seq = Array<boolean>(round.heads).fill(true);
    this.seq.push(false);
    return true;
  }
}
