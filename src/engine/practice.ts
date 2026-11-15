/**
 * Marking a typed answer in practice mode. An answer is marked automatically
 * only when it is plainly a number or a short list of numbers (with units,
 * "x =", "or"); anything else, such as "Shown", an inequality, a surd or an
 * expression, is left for the student to mark against the worked solution.
 */
export type Marking = { kind: 'numbers'; values: number[]; ordered: boolean } | { kind: 'self' };

// Words that may sit beside the numbers without changing what the answer is.
const UNITS = new Set(
  'or and cm mm m km g kg mg l ml cl litre litres s sec secs second seconds min mins minute minutes h hr hrs hour hours day days week weeks month months year years mph p pence kph kmh km/h m/s per degrees degree units unit cm2 cm3 m2 m3 mm2 mm3 km2 n newtons j kn'.split(' '),
);

/**
 * The numbers in an answer, or null if it holds anything that is not a number,
 * a unit or a label. Reads fractions (3/4, \frac{3}{4}), mixed numbers,
 * standard form (3.2 × 10^5) and digit grouping (18 000 or 18,000). With
 * anyWords, other words are ignored: a student may type "63 trees".
 */
export function readNumbers(text: string, anyWords = false): number[] | null {
  let t = text
    .replace(/\$/g, ' ')
    .replace(/(-?)\s*\\[dt]?frac\{(\d+)\}\{(\d+)\}/g, ' $1$2/$3 ')
    .replace(/\\(times|cdot)/g, '×')
    .replace(/\\(,|;|!|quad|qquad| )/g, ' ')
    .replace(/\\text\{([^}]*)\}/g, ' $1 ')
    .replace(/\\(%|pounds)/g, ' ')
    .replace(/[−–]/g, '-')
    .replace(/[   ]/g, ' ')
    .replace(/\^\{(-?\d+)\}/g, '^$1')
    .replace(/[²³]/g, (c) => (c === '²' ? '2' : '3'))
    .toLowerCase();
  // Units with a power (cm^2, m^3, s^-1) are labels, not numbers.
  t = t.replace(/\b([a-z]+)\^(-?[123])\b/g, (m, w: string) => (UNITS.has(w) ? ` ${w} ` : m)).replace(/\b([a-z]+)([23])\b/g, (m, w: string) => (UNITS.has(w) ? ` ${w} ` : m));
  // Digit grouping.
  t = t.replace(/(\d)[ ,](?=\d{3}(?!\d))/g, '$1');
  const values: number[] = [];
  const take = (v: number) => {
    values.push(v);
    return ' ';
  };
  // Standard form, mixed numbers, fractions, then plain numbers.
  t = t.replace(/(-?\d+(?:\.\d+)?)\s*(?:×|x|\*)\s*10\s*\^\s*(-?\d+)/g, (_, a: string, b: string) => take(Number(a) * 10 ** Number(b)));
  t = t.replace(/(-?\d+(?:\.\d+)?)e(-?\d+)/g, (_, a: string, b: string) => take(Number(a) * 10 ** Number(b)));
  t = t.replace(/(-?)(\d+)\s+(\d+)\s*\/\s*(\d+)/g, (_, s: string, w: string, n: string, d: string) => take((s ? -1 : 1) * (Number(w) + Number(n) / Number(d))));
  t = t.replace(/(-?\d+)\s*\/\s*(\d+)/g, (_, n: string, d: string) => take(Number(n) / Number(d)));
  // Positions matter for order, so plain numbers are read in one pass with the ones above.
  if (values.length && /\d/.test(t)) {
    // A mix of forms: read everything again in order of appearance.
    return readInOrder(text, anyWords);
  }
  t = t.replace(/-?\d+(?:\.\d+)?/g, (m) => take(Number(m)));
  const rest = t
    .replace(/\b[a-z]\s*=/g, ' ')
    .replace(/[£%°(),;:=+]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (!anyWords && rest.some((w) => !UNITS.has(w))) return null;
  return values.length && values.every(Number.isFinite) ? values : null;
}

/** Fallback for answers mixing fractions and plain numbers: split on separators and read each piece. */
function readInOrder(text: string, anyWords: boolean): number[] | null {
  const pieces = text
    .replace(/\$/g, ' ')
    .split(/\bor\b|\band\b|[,;:()]/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (pieces.length < 2) return null;
  const out: number[] = [];
  for (const piece of pieces) {
    const v = readNumbers(piece, anyWords);
    if (!v || v.length !== 1) return null;
    out.push(v[0]);
  }
  return out;
}

/** How a printed answer will be marked. */
export function marking(answer: string): Marking {
  const values = readNumbers(answer);
  if (!values || values.length > 4) return { kind: 'self' };
  // "x = 2 or x = 5" may be typed either way round; a ratio, a coordinate or "x = 2, y = 5" may not.
  return { kind: 'numbers', values, ordered: !/\bor\b/i.test(answer.replace(/\$/g, ' ')) };
}

const same = (a: number, b: number) => Math.abs(a - b) <= 1e-9 * Math.max(1, Math.abs(b));

/** True or false for an answer that can be marked automatically; null when the student must mark it. */
export function isCorrect(answer: string, typed: string): boolean | null {
  const m = marking(answer);
  if (m.kind === 'self') return null;
  const got = readNumbers(typed, true);
  if (!got || got.length !== m.values.length) return false;
  if (m.ordered) return got.every((g, i) => same(g, m.values[i]));
  const want = [...m.values].sort((a, b) => a - b);
  return [...got].sort((a, b) => a - b).every((g, i) => same(g, want[i]));
}
