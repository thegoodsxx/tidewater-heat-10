/**
 * Tidewater Heat - Seeded deterministic pseudo-random number generator
 * Mulberry32 implementation for reproducible city generation and shot staging.
 */

export class Rng {
  constructor(seed = 1) {
    this.seed = (seed | 0) || 1;
    this.s = this.seed;
  }

  next() {
    let t = (this.s += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min, max) {
    return min + this.next() * (max - min);
  }

  rangeInt(min, max) {
    return Math.floor(this.range(min, max + 1));
  }

  choice(arr) {
    if (!arr || arr.length === 0) return null;
    return arr[Math.floor(this.next() * arr.length)];
  }

  bool(prob = 0.5) {
    return this.next() < prob;
  }

  angle() {
    return this.next() * Math.PI * 2;
  }

  shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      const temp = a[i];
      a[i] = a[j];
      a[j] = temp;
    }
    return a;
  }

  reset(seed = this.seed) {
    this.seed = (seed | 0) || 1;
    this.s = this.seed;
  }
}

export const defaultRng = new Rng(1);
