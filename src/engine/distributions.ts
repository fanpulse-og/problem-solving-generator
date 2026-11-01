import { nCr } from './pure';

/** The binomial distribution, for A-level Statistics. Probabilities are shown rounded, so floats are safe here. */
export const binomPdf = (n: number, p: number, k: number): number => (k < 0 || k > n ? 0 : nCr(n, k) * p ** k * (1 - p) ** (n - k));

/** P(X ≤ k) */
export function binomCdf(n: number, p: number, k: number): number {
  let s = 0;
  for (let i = 0; i <= Math.min(k, n); i++) s += binomPdf(n, p, i);
  return Math.min(1, s);
}

/** Probability to 3 significant figures, as the papers ask. A value this close to 0 or 1 makes a poor question, so the caller rejects it. */
export const between = (x: number, lo = 0.005, hi = 0.995) => x > lo && x < hi;
