import type { Question } from './types';

/**
 * How hard is the hand arithmetic in a question? Read off the mark-scheme
 * working, which is the arithmetic a student actually has to do.
 *
 * Numbers are judged by their significant digits, since zeros and decimal
 * points cost nothing (300 × 40 is easy; 24 704 ÷ 0.64 is not). A "friendly"
 * number is 1–12, 15, 16, 25, 75 or 125 times a power of ten (÷ 1.1, × 0.25, ÷ 1.25).
 * - a × b is fine if sig(a) × sig(b) ≤ 6 (up to 3-digit × 2-digit), or one
 *   factor is friendly and the other has at most 5 significant digits;
 * - a ÷ b is fine if the divisor is friendly, or sig(a) × sig(b) ≤ 4, or the
 *   answer is a friendly whole number (448 ÷ 112 = 4);
 * - no number in the working has more than 6 significant digits.
 * Values shown with "…" are skipped: rounding them is a step the question
 * has already made a student do.
 */
export const NONCALC_LIMIT = { product: 6, digits: 6 };
const FRIENDLY = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 25, 75, 125]);

/** Significant digits: 24 704 → 5, 0.64 → 2, 3000 → 1, 1.50 → 2. */
export function sigDigits(s: string): number {
  return sigInt(s).toString().length;
}
/** The significant part as a whole number: 0.64 → 64, 3000 → 3, 1.25 → 125. */
export function sigInt(s: string): number {
  const digits = s.replace(/[^\d]/g, '').replace(/^0+/, '').replace(/0+$/, '');
  return Number(digits || '0');
}
const friendly = (s: string) => FRIENDLY.has(sigInt(s));
const value = (s: string) => Number(s.replace(/[^\d.]/g, ''));

const NUM = String.raw`\d[\d   ]*(?:\.\d+)?`;
const OP = String.raw`(×|÷|\\times|\\div)`;
const PAIR = new RegExp(`(${NUM})(…)?\\s*${OP}\\s*\\(?\\s*(${NUM})(…)?`, 'g');

export interface ArithmeticIssue {
  working: string;
  reason: string;
}

/** Arithmetic in one line of working that is too heavy without a calculator. */
export function lineIssues(working: string): ArithmeticIssue[] {
  const out: ArithmeticIssue[] = [];
  // Drop KaTeX powers, fractions' braces and sub/superscripts so "10^{6}" isn't read as a 6.
  const w = working.replace(/\^\{[^}]*\}|\^\d|_\{[^}]*\}|_\d/g, ' ').replace(/[²³]/g, ' ');
  for (const m of w.matchAll(PAIR)) {
    const [, a, aRounded, op, b, bRounded] = m;
    if (aRounded || bRounded) continue;
    const sa = sigDigits(a);
    const sb = sigDigits(b);
    const isDiv = op === '÷' || op === '\\div';
    let heavy: boolean;
    if (isDiv) {
      const quotient = value(a) / value(b);
      const wholeFriendly = Number.isInteger(Math.round(quotient * 1e9) / 1e9) && FRIENDLY.has(sigInt(String(Math.round(quotient))));
      heavy = !(friendly(b) && sa <= NONCALC_LIMIT.digits) && sa * sb > 4 && !wholeFriendly;
    } else {
      heavy = sa * sb > NONCALC_LIMIT.product && !((friendly(a) || friendly(b)) && Math.max(sa, sb) <= 5);
    }
    if (heavy) out.push({ working, reason: `${a.trim()} ${isDiv ? '÷' : '×'} ${b.trim()} (${sa} × ${sb} significant digits)` });
  }
  for (const m of w.matchAll(new RegExp(`${NUM}(…)?`, 'g'))) {
    if (m[1]) continue;
    if (sigDigits(m[0]) > NONCALC_LIMIT.digits) out.push({ working, reason: `${m[0].trim()} has ${sigDigits(m[0])} significant digits` });
  }
  return out;
}

/** Every arithmetic issue in a question's mark scheme (only meaningful for non-calculator questions). */
export function arithmeticIssues(q: Question): ArithmeticIssue[] {
  return q.scheme.flat().flatMap((s) => lineIssues(s.working));
}

/**
 * Is an answer tidy? Exact answers are fine even with several decimal places
 * (0.35 × 0.65 = 0.2275; 182 500 cm = 1.825 km). Untidy means: a value cut off
 * with "…", more than 4 decimal places the question did not ask for, more than
 * 7 significant digits, a fraction with a denominator over 1000, or a broken
 * value (NaN, undefined, Infinity).
 */
export function untidyAnswers(q: Question): string[] {
  const asked = q.content.parts
    .flatMap((p) => p.blocks)
    .concat(q.content.stem)
    .map((b) => (b.kind === 'text' ? b.text : ''))
    .join(' ');
  const rounding = /correct to|decimal place|significant figure|nearest/.test(asked);
  const bad: string[] = [];
  for (const a of q.answers) {
    const t = a.text;
    if (t.includes('…') || /NaN|undefined|Infinity/.test(t)) bad.push(t);
    for (const m of t.matchAll(/\d+\.(\d+)/g)) if (!rounding && m[1].length > 4) bad.push(t);
    for (const m of t.matchAll(new RegExp(NUM, 'g'))) if (sigDigits(m[0]) > 7) bad.push(t);
    for (const m of t.matchAll(/\\frac\{(\d+)\}\{(\d+)\}/g)) if (Number(m[2]) > 1000) bad.push(t);
  }
  return [...new Set(bad)];
}
