# petersburg

The St. Petersburg paradox as a game you can lose at, at [sean-reid.github.io/petersburg](https://sean-reid.github.io/petersburg/). You pay a casino a price per round, a coin flips until it lands tails, and the casino pays 2 for a tails straight away, doubled for every heads before it. The expected payout is infinite, so any price is a bargain in theory. In practice three rounds in four pay 2 or 4, and the chart shows what that does to a bankroll over thousands or millions of rounds.

Set a starting bankroll, the price per round as a fixed amount or a percent of what you have (rounded down, never below 1), and whether the run stops once the bankroll cannot cover the next price or the casino lends and the bankroll goes negative. Then press play, or space, and set the speed anywhere from one flip a second to as fast as the browser goes. The coin is seeded, and the URL carries the seed and the settings, so a link replays the same run. Reset rolls a new seed; reload the link to replay.

## Development

```sh
npm install
npm run dev            # vite on http://localhost:5173/petersburg/
npm test               # unit tests
npm run test:e2e       # Playwright at 375, 768 and 1280 against vite preview
npm run build && npm run size   # gzipped first-load JS against the 15 KB budget
```

## How it runs

A static Vite build with no runtime dependencies and no server. GitHub Actions builds main after ci passes and publishes `dist/` to GitHub Pages. The simulation runs on the main thread in animation frames; chart history folds into 512 equal-width min/max buckets, doubling their width when they fill, so a run can go on indefinitely in constant memory.
