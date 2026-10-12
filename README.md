# petersburg

The St. Petersburg paradox as a game you can lose at, at [sean-reid.github.io/petersburg](https://sean-reid.github.io/petersburg/). You pay a casino a price per round, a coin flips until it lands tails, and the casino pays 2 for a tails straight away, doubled for every heads before it. The expected payout is infinite, so any price is a bargain in theory. In practice almost every round pays 2 or 4, and the chart shows what that does to a bankroll over thousands or millions of rounds.

Set a starting bankroll, the price per round as a fixed amount or a percent of what you have, and whether going broke stops the run or the casino keeps lending. Then press play and set the speed anywhere from one flip a second to as fast as the browser goes. The coin is seeded, and the URL carries the seed and the settings, so a link replays the same run.

## Development

```sh
npm install
npm run dev            # vite on http://localhost:5173/petersburg/
npm test               # unit tests
npm run test:e2e       # Playwright at 375, 768 and 1280 against vite preview
npm run size           # gzipped first-load JS against the budget
```

## How it runs

A static Vite build with no runtime dependencies and no server. GitHub Actions builds main after ci passes and publishes `dist/` to GitHub Pages. The simulation runs on the main thread in animation frames; chart history folds into fixed-width min/max buckets so a run can go on indefinitely in constant memory.
