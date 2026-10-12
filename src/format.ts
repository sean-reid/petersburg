const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const cents = new Intl.NumberFormat("en", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const fmt = (n: number): string => whole.format(n);
export const fmt2 = (n: number): string => cents.format(n);
export const plural = (n: number, word: string): string => `${fmt(n)} ${word}${n === 1 ? "" : "s"}`;
