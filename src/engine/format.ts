import { Q, roundQ } from './rational';

/** Thrown inside generate() to ask the engine for a fresh attempt. */
export class Reject extends Error {
  constructor(reason: string) {
    super(reason);
  }
}

export function reject(reason: string): never {
  throw new Reject(reason);
}

export function ensure(cond: boolean, reason: string): asserts cond {
  if (!cond) throw new Reject(reason);
}

const NBSP = ' ';

/**
 * Edexcel spacing: 4-digit numbers are written solid (7200), 5+ digits are
 * grouped in threes with a space (18 000, 13 203).
 */
export function groupDigits(intPart: string): string {
  const neg = intPart.startsWith('-');
  const digits = neg ? intPart.slice(1) : intPart;
  if (digits.length < 5) return intPart;
  const out: string[] = [];
  for (let i = digits.length; i > 0; i -= 3) out.unshift(digits.slice(Math.max(0, i - 3), i));
  return (neg ? '-' : '') + out.join(NBSP);
}

/** Exact decimal string of a terminating rational (throws if it doesn't terminate within 10 dp). */
export function dec(x: Q | number, minDp = 0): string {
  const q = x instanceof Q ? x : Q.of(x);
  let dp = 0;
  while (!q.terminatesWithin(dp)) {
    dp++;
    if (dp > 10) throw new Error(`dec: ${q.toString()} does not terminate`);
  }
  dp = Math.max(dp, minDp);
  return fixed(q, dp);
}

/** Exact fixed-point string; q must terminate within dp places. */
function fixed(q: Q, dp: number): string {
  const scale = 10n ** BigInt(dp);
  const scaled = q.mul(Q.of(scale));
  if (!scaled.isInt()) throw new Error(`fixed: ${q.toString()} needs more than ${dp} dp`);
  let n = scaled.n;
  const neg = n < 0n;
  if (neg) n = -n;
  const s = n.toString().padStart(dp + 1, '0');
  const ip = s.slice(0, s.length - dp) || '0';
  const fp = dp > 0 ? '.' + s.slice(s.length - dp) : '';
  return (neg ? '-' : '') + groupDigits(ip) + fp;
}

/** Round exactly to dp places and format with exactly dp places (e.g. 2.50). */
export function roundDp(q: Q, dp: number): string {
  return fixed(roundQ(q, dp), dp);
}

/**
 * Money from pence. Whole pounds are shown without pence (£7200, £15) unless
 * `alwaysPence`; otherwise always 2 dp (£13.60).
 */
export function money(pence: number, alwaysPence = false): string {
  if (!Number.isInteger(pence)) throw new Error(`money: non-integer pence ${pence}`);
  const neg = pence < 0;
  const p = Math.abs(pence);
  const pounds = Math.floor(p / 100);
  const rest = p % 100;
  const body = rest === 0 && !alwaysPence ? groupDigits(String(pounds)) : `${groupDigits(String(pounds))}.${String(rest).padStart(2, '0')}`;
  return `${neg ? '-' : ''}£${body}`;
}

/** Money amount without the £ sign, e.g. for answer lines that already show £. */
export function moneyBare(pence: number, alwaysPence = false): string {
  return money(pence, alwaysPence).replace('£', '');
}

/** Integer with Edexcel spacing. */
export function int(n: number | bigint): string {
  if (typeof n === 'number' && !Number.isInteger(n)) throw new Error(`int: ${n} is not an integer`);
  return groupDigits(String(n));
}

/** KaTeX for a fraction in simplest form ("\frac{3}{4}", or an integer). */
export function fracTex(q: Q): string {
  if (q.isInt()) return `${q.n}`;
  const neg = q.n < 0n;
  return `${neg ? '-' : ''}\\frac{${neg ? -q.n : q.n}}{${q.d}}`;
}

/** Inline-maths fraction for text: "$\frac{3}{4}$". */
export function frac(q: Q): string {
  return `$${fracTex(q)}$`;
}

/** Fraction not simplified, for working lines: "$\frac{18}{24}$". */
export function fracRaw(n: number, d: number): string {
  return `$\\frac{${n}}{${d}}$`;
}

/** Percentage from a rational fraction, e.g. 3/8 -> "37.5%". */
export function pct(q: Q): string {
  return `${dec(q.mul(100))}%`;
}

/**
 * Round a float (only for irrational results such as π or √ answers) to dp
 * places. Rejects values too close to a rounding boundary, where floating
 * point could round the wrong way.
 */
export function roundFloatDp(x: number, dp: number): string {
  ensure(Number.isFinite(x), 'non-finite');
  const s = x * 10 ** dp;
  const frac = s - Math.floor(s);
  ensure(Math.abs(frac - 0.5) > 1e-6, 'too close to a rounding boundary');
  const r = Math.round(s);
  return dec(Q.of(r, 10 ** dp), dp);
}

/** Round a float to sf significant figures, with the same boundary guard. */
export function roundFloatSf(x: number, sf: number): string {
  ensure(Number.isFinite(x) && x > 0, 'sf of non-positive');
  const mag = Math.floor(Math.log10(x));
  const dp = sf - 1 - mag;
  if (dp >= 0) return roundFloatDp(x, dp);
  const unit = 10 ** -dp;
  const s = x / unit;
  const frac = s - Math.floor(s);
  ensure(Math.abs(frac - 0.5) > 1e-6, 'too close to a rounding boundary');
  return int(Math.round(s) * unit);
}

/** "1 hour 25 minutes", "2 hours", "45 minutes" */
export function hoursMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  const hs = h === 0 ? '' : `${h} hour${h === 1 ? '' : 's'}`;
  const ms = m === 0 ? '' : `${m} minute${m === 1 ? '' : 's'}`;
  return [hs, ms].filter(Boolean).join(' ') || '0 minutes';
}

/** 24-hour clock in Edexcel style: "09 30", "16 10". */
export function clock(minutesAfterMidnight: number): string {
  const h = Math.floor(minutesAfterMidnight / 60) % 24;
  const m = minutesAfterMidnight % 60;
  return `${String(h).padStart(2, '0')} ${String(m).padStart(2, '0')}`;
}

/** "a : b" or "a : b : c" with spaced colons as in the papers. */
export function ratio(...parts: number[]): string {
  return parts.join(' : ');
}

/** Ordinal words for small numbers used in questions. */
export function plural(n: number, one: string, many = one + 's'): string {
  return `${int(n)} ${n === 1 ? one : many}`;
}

/** A non-terminating value cut (not rounded) to 2 dp with "…", for working lines: 4.6666… → "4.66…". */
export function approx(q: Q, dp = 2): string {
  if (q.terminatesWithin(dp + 1)) return dec(q);
  const scale = 10 ** dp;
  return `${dec(Q.of(q.mul(scale).floor(), scale), dp)}…`;
}
