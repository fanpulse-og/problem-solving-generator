/**
 * Seeded random numbers (sfc32 seeded by cyrb128), so a question can be
 * regenerated exactly from its seed string.
 */
function cyrb128(str: string): [number, number, number, number] {
  let h1 = 1779033703,
    h2 = 3144134277,
    h3 = 1013904242,
    h4 = 2773480762;
  for (let i = 0; i < str.length; i++) {
    const k = str.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
}

export class Rng {
  private a: number;
  private b: number;
  private c: number;
  private d: number;

  constructor(readonly seed: string) {
    [this.a, this.b, this.c, this.d] = cyrb128(seed);
    for (let i = 0; i < 12; i++) this.next();
  }

  /** Uniform float in [0, 1). Only used to make choices, never as a value. */
  next(): number {
    this.a >>>= 0;
    this.b >>>= 0;
    this.c >>>= 0;
    this.d >>>= 0;
    let t = (this.a + this.b) | 0;
    this.a = this.b ^ (this.b >>> 9);
    this.b = (this.c + (this.c << 3)) | 0;
    this.c = (this.c << 21) | (this.c >>> 11);
    this.d = (this.d + 1) | 0;
    t = (t + this.d) | 0;
    this.c = (this.c + t) | 0;
    return (t >>> 0) / 4294967296;
  }

  /** Integer in [lo, hi] inclusive. */
  int(lo: number, hi: number): number {
    if (hi < lo) throw new Error(`Rng.int: empty range ${lo}..${hi}`);
    return lo + Math.floor(this.next() * (hi - lo + 1));
  }

  /** Multiple of `step` in [lo, hi]. */
  step(lo: number, hi: number, step: number): number {
    const first = Math.ceil(lo / step);
    const last = Math.floor(hi / step);
    return this.int(first, last) * step;
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('Rng.pick: empty list');
    return items[Math.floor(this.next() * items.length)];
  }

  /** `count` distinct items. */
  sample<T>(items: readonly T[], count: number): T[] {
    return this.shuffle(items).slice(0, count);
  }

  shuffle<T>(items: readonly T[]): T[] {
    const out = items.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  chance(p: number): boolean {
    return this.next() < p;
  }
}

/** A short random seed for new questions (the only non-seeded randomness). */
export function freshSeed(): string {
  return Math.floor(Math.random() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
}
