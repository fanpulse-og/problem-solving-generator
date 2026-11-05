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

/** Standard normal CDF, by its Taylor series. Accurate to about 12 places for |z| < 7. */
export function phi(z: number): number {
  if (z > 8) return 1;
  if (z < -8) return 0;
  let term = z;
  let sum = z;
  for (let i = 3; i < 400; i += 2) {
    term *= (z * z) / i;
    sum += term;
    if (Math.abs(term) < 1e-16 * Math.abs(sum)) break;
  }
  return 0.5 + (sum * Math.exp((-z * z) / 2)) / Math.sqrt(2 * Math.PI);
}

/** Inverse of phi, by bisection. */
export function invPhi(p: number): number {
  let [lo, hi] = [-8, 8];
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (phi(mid) < p) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** P(X < x) for X ~ N(mu, sigma²). */
export const normCdf = (mu: number, sigma: number, x: number) => phi((x - mu) / sigma);
