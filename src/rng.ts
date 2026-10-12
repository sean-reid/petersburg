export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
}

export function formatSeed(seed: number): string {
  return (seed >>> 0).toString(36);
}

export function parseSeed(text: string | null): number | undefined {
  if (!text || !/^[0-9a-z]{1,7}$/.test(text)) return undefined;
  const n = parseInt(text, 36);
  return n <= 0xffffffff ? n : undefined;
}
