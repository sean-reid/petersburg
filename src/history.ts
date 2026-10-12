export interface Bucket {
  min: number;
  max: number;
  last: number;
}

export class History {
  readonly buckets: Bucket[] = [];
  span = 1;
  count = 0;
  private fill = 0;

  constructor(readonly capacity = 512) {
    if (capacity < 2 || capacity % 2 !== 0) throw new Error("capacity must be even and at least 2");
  }

  push(value: number): void {
    if (this.fill === 0) {
      if (this.buckets.length === this.capacity) this.fold();
      this.buckets.push({ min: value, max: value, last: value });
    } else {
      const b = this.buckets[this.buckets.length - 1]!;
      if (value < b.min) b.min = value;
      if (value > b.max) b.max = value;
      b.last = value;
    }
    this.count += 1;
    this.fill = (this.fill + 1) % this.span;
  }

  private fold(): void {
    const merged: Bucket[] = [];
    for (let i = 0; i < this.buckets.length; i += 2) {
      const a = this.buckets[i]!;
      const b = this.buckets[i + 1]!;
      merged.push({ min: Math.min(a.min, b.min), max: Math.max(a.max, b.max), last: b.last });
    }
    this.buckets.length = 0;
    this.buckets.push(...merged);
    this.span *= 2;
  }
}
