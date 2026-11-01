import { ensure, fracTex, roundFloatSf } from './format';
import { Q, gcdInt, toQ } from './rational';

/** Helpers for A-level Pure: algebra written the way the papers write it. */

/** One term: coefficient and power of the variable (a number, or a KaTeX exponent such as '\\frac{1}{2}'). */
export type Term = [Q | number, number | string];

/** A sum of terms in the order given, e.g. [[3, 2], [-1, 1], [Q.of(1, 2), 0]] → "3x^2 - x + \frac{1}{2}". */
export function terms(list: Term[], v = 'x'): string {
  let s = '';
  for (const [c0, p] of list) {
    const c = toQ(c0);
    if (c.eq(0)) continue;
    const abs = c.isPositive() ? c : c.neg();
    const isOne = abs.eq(1);
    const power = p === 0 ? '' : p === 1 ? v : `${v}^{${p}}`;
    const body = p === 0 ? fracTex(abs) : `${isOne ? '' : fracTex(abs)}${power}`;
    s += s === '' ? `${c.isPositive() ? '' : '-'}${body}` : ` ${c.isPositive() ? '+' : '-'} ${body}`;
  }
  return s || '0';
}

/** A polynomial with rational coefficients, highest power first. */
export const polyQ = (coeffs: (Q | number)[], v = 'x'): string => terms(coeffs.map((c, i) => [c, coeffs.length - 1 - i] as Term), v);

/** "+ 3" or "- 3", for gluing a number on to an expression. */
export const signed = (n: Q | number): string => {
  const q = toQ(n);
  return q.isPositive() || q.eq(0) ? `+ ${fracTex(q)}` : `- ${fracTex(q.neg())}`;
};

/** "(x - 3)", "(x + 2)"; a zero shift gives "x". */
export const shift = (r: number, v = 'x'): string => (r === 0 ? v : `(${v} ${r > 0 ? '-' : '+'} ${Math.abs(r)})`);

/** "(x - 3)^2 + (y + 2)^2 = 25" for a circle. */
export const circleTex = (p: number, q: number, r2: number): string => `${shift(p)}^2 + ${shift(q, 'y')}^2 = ${r2}`;

/** Binomial coefficient, exactly. */
export function nCr(n: number, r: number): number {
  let out = 1;
  for (let i = 1; i <= r; i++) out = (out * (n - r + i)) / i;
  return Math.round(out);
}

/** Generalised binomial coefficient for a rational power. */
export function gCr(n: Q, r: number): Q {
  let out = Q.of(1);
  for (let i = 0; i < r; i++) out = out.mul(n.sub(i)).div(i + 1);
  return out;
}

/** √n as a·√b with b square-free. */
export function surd(n: number): [number, number] {
  let a = 1;
  let b = n;
  for (let f = 2; f * f <= b; f++) {
    while (b % (f * f) === 0) {
      b /= f * f;
      a *= f;
    }
  }
  return [a, b];
}

/** KaTeX for √n, simplified: "3\sqrt{2}", or a whole number. */
export function surdTex(n: number): string {
  const [a, b] = surd(n);
  if (b === 1) return String(a);
  return `${a === 1 ? '' : a}\\sqrt{${b}}`;
}

/** Whole-number line ax + by + c = 0, with a positive and no common factor. */
export function lineTex(a: number, b: number, c: number): string {
  const g = gcdInt(gcdInt(a, b), c) || 1;
  const s = a < 0 || (a === 0 && b < 0) ? -1 : 1;
  const [A, B, C] = [(a * s) / g, (b * s) / g, (c * s) / g];
  const xy = terms([[A, 1]]);
  const y = B === 0 ? '' : ` ${B > 0 ? '+' : '-'} ${Math.abs(B) === 1 ? '' : Math.abs(B)}y`;
  const k = C === 0 ? '' : ` ${C > 0 ? '+' : '-'} ${Math.abs(C)}`;
  return `${A === 0 ? '' : xy}${y}${k} = 0`.replace(/^ \+ /, '');
}

/** Solutions of sin/cos/tan-free angle lists: every value in [lo, hi) of base + 360k. */
export function inRange(angles: number[], lo: number, hi: number, period = 360): number[] {
  const out: number[] = [];
  for (const a of angles) {
    for (let k = -4; k <= 4; k++) {
      const x = a + k * period;
      if (x >= lo - 1e-9 && x < hi - 1e-9 && !out.some((y) => Math.abs(y - x) < 1e-9)) out.push(x);
    }
  }
  return out.sort((p, q) => p - q);
}

export const DEG = Math.PI / 180;
/** dy/dx as the papers write it. */
export const DYDX = '\\frac{\\mathrm{d}y}{\\mathrm{d}x}';

/** 3 significant figures, retrying the question rather than showing "52.0". */
export function sf3(x: number): string {
  const s = roundFloatSf(x, 3);
  ensure(!/\.0+$/.test(s), 'no trailing zero in the answer');
  return s;
}

/** "3\sin x", "\sin x", "-\sin x": a coefficient of 1 is not written. */
export const coef = (c: number, body: string): string => `${c === 1 ? '' : c === -1 ? '-' : c}${body}`;

/** "+ 3\sin x", "- \sin x": the same, for gluing on to an expression. */
export const signedCoef = (c: number, body: string): string => `${c < 0 ? '-' : '+'} ${Math.abs(c) === 1 ? '' : Math.abs(c)}${body}`;
