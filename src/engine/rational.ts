/**
 * Exact rational numbers on bigint. Every value a student sees is computed
 * with this (or with plain integers), never with floating point, so 0.1 + 0.2
 * style errors can't reach a classroom.
 */
export class Q {
  readonly n: bigint;
  readonly d: bigint;

  private constructor(n: bigint, d: bigint) {
    if (d === 0n) throw new Error('Q: division by zero');
    if (d < 0n) {
      n = -n;
      d = -d;
    }
    const g = gcd(n < 0n ? -n : n, d);
    this.n = g === 0n ? 0n : n / g;
    this.d = g === 0n ? 1n : d / g;
  }

  /** Q.of(3), Q.of('2.48'), Q.of(3, 4) */
  static of(a: number | bigint | string | Q, b: number | bigint = 1): Q {
    if (a instanceof Q) return b === 1 ? a : a.div(Q.of(b));
    if (typeof a === 'string') {
      const m = /^(-?)(\d+)(?:\.(\d+))?$/.exec(a.trim());
      if (!m) throw new Error(`Q.of: bad decimal "${a}"`);
      const frac = m[3] ?? '';
      const n = BigInt(m[2] + frac) * (m[1] ? -1n : 1n);
      return new Q(n, 10n ** BigInt(frac.length)).div(Q.of(b));
    }
    if (typeof a === 'number' && !Number.isInteger(a)) {
      throw new Error(`Q.of: non-integer number ${a}; pass a string instead`);
    }
    return new Q(BigInt(a), BigInt(b));
  }

  add(o: Q | number): Q {
    const q = toQ(o);
    return new Q(this.n * q.d + q.n * this.d, this.d * q.d);
  }
  sub(o: Q | number): Q {
    const q = toQ(o);
    return new Q(this.n * q.d - q.n * this.d, this.d * q.d);
  }
  mul(o: Q | number): Q {
    const q = toQ(o);
    return new Q(this.n * q.n, this.d * q.d);
  }
  div(o: Q | number): Q {
    const q = toQ(o);
    return new Q(this.n * q.d, this.d * q.n);
  }
  /** Integer power (negative powers allowed for non-zero values). */
  pow(k: number): Q {
    let out = Q.of(1);
    for (let i = 0; i < Math.abs(k); i++) out = out.mul(this);
    return k < 0 ? Q.of(1).div(out) : out;
  }
  neg(): Q {
    return new Q(-this.n, this.d);
  }
  cmp(o: Q | number): number {
    const q = toQ(o);
    const l = this.n * q.d;
    const r = q.n * this.d;
    return l < r ? -1 : l > r ? 1 : 0;
  }
  eq(o: Q | number): boolean {
    return this.cmp(o) === 0;
  }
  lt(o: Q | number): boolean {
    return this.cmp(o) < 0;
  }
  gt(o: Q | number): boolean {
    return this.cmp(o) > 0;
  }
  isInt(): boolean {
    return this.d === 1n;
  }
  isPositive(): boolean {
    return this.n > 0n;
  }
  /** Safe only for display/diagram scaling, never for answers. */
  toNumber(): number {
    return Number(this.n) / Number(this.d);
  }
  /** Integer value; throws if not an integer. */
  toInt(): number {
    if (!this.isInt()) throw new Error(`Q.toInt: ${this.toString()} is not an integer`);
    return Number(this.n);
  }
  floor(): bigint {
    const q = this.n / this.d;
    return this.n < 0n && q * this.d !== this.n ? q - 1n : q;
  }
  ceil(): bigint {
    const f = this.floor();
    return f * this.d === this.n ? f : f + 1n;
  }
  /** True when the decimal expansion terminates within `maxDp` places. */
  terminatesWithin(maxDp: number): boolean {
    return (this.n * 10n ** BigInt(maxDp)) % this.d === 0n;
  }
  toString(): string {
    return this.d === 1n ? `${this.n}` : `${this.n}/${this.d}`;
  }
}

export function toQ(x: Q | number): Q {
  return x instanceof Q ? x : Q.of(x);
}

export function gcd(a: bigint, b: bigint): bigint {
  while (b) [a, b] = [b, a % b];
  return a;
}

export function gcdInt(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

export function lcmInt(a: number, b: number): number {
  return (a / gcdInt(a, b)) * b;
}

/** Exact half-up rounding to `dp` decimal places. */
export function roundQ(q: Q, dp: number): Q {
  const scale = 10n ** BigInt(dp);
  const scaled = q.mul(Q.of(scale));
  const fl = scaled.floor();
  const rem = scaled.sub(Q.of(fl));
  const r = rem.cmp(Q.of(1, 2)) >= 0 ? fl + 1n : fl;
  return Q.of(r, scale);
}
