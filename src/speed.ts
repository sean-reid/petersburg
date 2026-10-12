export interface Speed {
  label: string;
  flipsPerSec?: number;
  roundsPerSec?: number;
}

export const SPEEDS: readonly Speed[] = [
  { label: "1 flip/s", flipsPerSec: 1 },
  { label: "4 flips/s", flipsPerSec: 4 },
  { label: "10 rounds/s", roundsPerSec: 10 },
  { label: "100 rounds/s", roundsPerSec: 100 },
  { label: "1,000 rounds/s", roundsPerSec: 1_000 },
  { label: "10,000 rounds/s", roundsPerSec: 10_000 },
  { label: "as fast as it goes" },
];

export const DEFAULT_SPEED = 3;
