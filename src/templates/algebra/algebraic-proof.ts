import { defineTemplate, type Tier } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { gcdInt } from '../../engine/rational';

/**
 * Modelled on Set 22 1H Q20 (prove that (2n + 3)² − (2n − 3)² is a multiple
 * of 8), Set 24 1H Q11 (sum of three consecutive even numbers) and Set 23 1H
 * Q21 (the square of an odd number is one more than a multiple of 8). The
 * claims are recomputed numerically in check() for n = 1 … 60.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier?: Tier;
  kind: 'consec-int' | 'consec-even' | 'consec-odd' | 'diff-squares' | 'odd-squares' | 'general' | 'odd-square' | 'sum-squares';
  k: number; // number of consecutive terms
  a: number; // (an + b)² − (cn + d)²
  b: number;
  c: number;
  d: number;
  g: number; // the claimed factor
}

type Poly = [number, number, number]; // An² + Bn + C

/** The expression being proved about, as a polynomial in n. */
function poly(v: V): Poly {
  switch (v.kind) {
    case 'consec-int':
      return [0, v.k, (v.k * (v.k - 1)) / 2];
    case 'consec-even':
      return [0, 2 * v.k, v.k * (v.k - 1)];
    case 'consec-odd':
      return [0, 2 * v.k, v.k * v.k];
    case 'odd-square':
      return [4, 4, 1];
    case 'sum-squares':
      return [2, 2, 1];
    default:
      return [v.a * v.a - v.c * v.c, 2 * (v.a * v.b - v.c * v.d), v.b * v.b - v.d * v.d];
  }
}

const lin = (a: number, b: number) => polyTex([a, b], 'n');
const P = (p: Poly) => polyTex(p, 'n');
/** g(…) with the bracket simplified, e.g. 6n + 6 = 6(n + 1). */
const factored = (p: Poly, g: number) => {
  const inner: Poly = [p[0] / g, p[1] / g, p[2] / g];
  return inner.filter((c) => c !== 0).length === 1 ? `${g} \\times ${P(inner)}` : `${g}(${P(inner)})`;
};

function statement(v: V): string {
  switch (v.kind) {
    case 'consec-int':
      return `the sum of any ${v.k} consecutive whole numbers is a multiple of ${v.k}`;
    case 'consec-even':
      return `the sum of any ${v.k} consecutive even numbers is a multiple of ${v.g}`;
    case 'consec-odd':
      return `the sum of any ${v.k} consecutive odd numbers is a multiple of ${v.g}`;
    case 'odd-squares':
      return 'the difference between the squares of any two consecutive odd numbers is a multiple of 8';
    case 'odd-square':
      return 'the square of any odd number is 1 more than a multiple of 8';
    case 'sum-squares':
      return 'the sum of the squares of any two consecutive whole numbers is always an odd number';
    default:
      return `$(${lin(v.a, v.b)})^2 - (${lin(v.c, v.d)})^2$ is a multiple of ${v.g} for all positive integer values of $n$`;
  }
}

/** Consecutive terms, e.g. ["n", "n + 1", "n + 2"]. */
function termList(v: V): string[] {
  const f = v.kind === 'consec-int' ? (i: number) => lin(1, i) : v.kind === 'consec-even' ? (i: number) => lin(2, 2 * i) : (i: number) => lin(2, 2 * i + 1);
  return Array.from({ length: v.k }, (_, i) => f(i));
}

/** The expression written algebraically, e.g. "n + (n + 1) + (n + 2)". */
function setup(v: V): string {
  switch (v.kind) {
    case 'consec-int':
    case 'consec-even':
    case 'consec-odd':
      return termList(v)
        .map((t, i) => (i === 0 ? t : `(${t})`))
        .join(' + ');
    case 'odd-squares':
      return '(2n + 1)^2 - (2n - 1)^2';
    case 'odd-square':
      return '(2n + 1)^2';
    case 'sum-squares':
      return 'n^2 + (n + 1)^2';
    default:
      return `(${lin(v.a, v.b)})^2 - (${lin(v.c, v.d)})^2`;
  }
}

export default defineTemplate<V>({
  id: 'alg-algebraic-proof',
  title: 'Algebraic proof',
  strand: 'Algebra',
  subtopic: 'Algebraic proof',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, kind: 'general', k: 0, a: 0, b: 0, c: 0, d: 0, g: 0 };
    if (level === 'foundational') {
      const kind = rng.pick(['consec-int', 'consec-even', 'consec-odd'] as const);
      const k = rng.pick([3, 5]);
      const p = poly({ ...base, kind, k });
      // Claim the largest factor that holds for every n: gcd of the coefficients.
      const g = kind === 'consec-int' ? k : gcdInt(p[1], p[2]);
      return { ...base, kind, k, g };
    }
    if (level === 'core') {
      if (rng.chance(0.25)) return { ...base, kind: 'odd-squares', a: 2, b: 1, c: 2, d: -1, g: 8 };
      const a = rng.int(1, 3);
      const b = rng.int(1, 6);
      ensure(gcdInt(a, b) === 1, 'brackets in simplest form');
      return { ...base, kind: 'diff-squares', a, b, c: a, d: -b, g: 4 * a * b };
    }
    if (tier === 'H' && rng.chance(0.35)) {
      return { ...base, kind: rng.pick(['odd-square', 'sum-squares'] as const), g: 8 };
    }
    const a = rng.int(2, 5);
    const c = rng.int(1, a - 1);
    const b = rng.int(-6, 7);
    const d = rng.int(-6, 7);
    ensure(b !== 0 && d !== 0 && (a !== c || b !== d) && (b !== -d || a !== c), 'a real expansion');
    const p = poly({ ...base, a, b, c, d });
    const g = gcdInt(gcdInt(p[0], p[1]), p[2]);
    ensure(g >= 3 && g <= 24 && p[0] > 0 && p[2] !== 0, 'a factor worth proving');
    ensure(gcdInt(a, b) === 1 && gcdInt(c, d) === 1, 'brackets in simplest form');
    ensure(Array.from({ length: 30 }, (_, i) => i + 1).every((n) => p[0] * n * n + p[1] * n + p[2] > 0), 'positive for every n');
    return { ...base, kind: 'general', a, b, c, d, g };
  },

  validate(v) {
    const p = poly(v);
    if (v.kind === 'odd-square' || v.kind === 'sum-squares') return [];
    return p.every((x) => x % v.g === 0) ? [] : ['claimed factor does not divide every coefficient'];
  },

  render(v) {
    const s = statement(v);
    const marks = v.level === 'foundational' || v.level === 'core' ? 3 : 4;
    // Proof is Higher only (A6); Foundation students "argue mathematically to show".
    return { stem: [], parts: [single(marks, text(`${v.tier === 'F' ? 'Show' : 'Prove'} algebraically that ${s}.`))] };
  },

  answer(v) {
    const p = poly(v);
    if (v.kind === 'odd-square') return [{ text: `$(2n + 1)^2 = 4n^2 + 4n + 1 = 4n(n + 1) + 1$; $n(n + 1)$ is even, so $4n(n + 1)$ is a multiple of 8` }];
    if (v.kind === 'sum-squares') return [{ text: `$n^2 + (n + 1)^2 = 2n^2 + 2n + 1 = 2(n^2 + n) + 1$, which is 1 more than an even number, so it is odd` }];
    return [{ text: `$${setup(v)} = ${P(p)} = ${factored(p, v.g)}$, which is a multiple of ${v.g}` }];
  },

  markScheme(v) {
    const p = poly(v);
    if (v.level === 'foundational') {
      const word = v.kind === 'consec-int' ? 'whole number' : v.kind === 'consec-even' ? 'even number' : 'odd number';
      const first = v.kind === 'consec-int' ? 'n' : v.kind === 'consec-even' ? '2n' : '2n + 1';
      return [
        [
          step('M1', termList(v).map((t) => `$${t}$`).join(', '), `Let the first ${word} be $${first}$. Each one is ${v.kind === 'consec-int' ? '1' : '2'} more than the one before.`),
          step('M1', `$${setup(v)} = ${P(p)}$`, 'Add them: collect the n terms and the number terms.'),
          step('A1', `$${P(p)} = ${factored(p, v.g)}$, so it is a multiple of ${v.g}`, `Take out ${v.g} as a factor: anything ${v.g} × (a whole number) is a multiple of ${v.g}.`),
        ],
      ];
    }
    if (v.kind === 'odd-square') {
      return [
        [
          step('M1', 'Any odd number is $2n + 1$', 'Use n for any whole number; 2n is always even.'),
          step('M1', '$(2n + 1)^2 = 4n^2 + 4n + 1$', 'Expand the brackets: (2n + 1)(2n + 1).'),
          step('M1', '$= 4n(n + 1) + 1$', 'Factorise the first two terms.'),
          step('A1', '$n$ and $n + 1$ are consecutive, so one is even: $n(n + 1)$ is even, so $4n(n + 1)$ is a multiple of 8', 'Explain WHY it is a multiple of 8, then say it is 1 more.'),
        ],
      ];
    }
    if (v.kind === 'sum-squares') {
      return [
        [
          step('M1', 'Two consecutive whole numbers: $n$ and $n + 1$', 'Call the first one n.'),
          step('M1', '$n^2 + (n + 1)^2 = n^2 + n^2 + 2n + 1$', 'Expand (n + 1)²: don’t forget the 2n.'),
          step('M1', '$= 2n^2 + 2n + 1 = 2(n^2 + n) + 1$', 'Simplify and take out a factor of 2.'),
          step('A1', '$2(n^2 + n)$ is even, so $2(n^2 + n) + 1$ is odd', 'Even + 1 is always odd.'),
        ],
      ];
    }
    const sq = (a: number, b: number) => polyTex([a * a, 2 * a * b, b * b], 'n');
    const steps = [
      step('M1', `$(${lin(v.a, v.b)})^2 = ${sq(v.a, v.b)}$`, 'Expand each bracket as (…)(…): four terms, then simplify.'),
      step('M1', `$(${lin(v.c, v.d)})^2 = ${sq(v.c, v.d)}$`, 'Expand the second bracket the same way.'),
      step('M1', `$${sq(v.a, v.b)} - (${sq(v.c, v.d)}) = ${P(p)}$`, 'Subtract: the minus sign changes the sign of EVERY term in the second bracket.'),
      step('A1', `$${P(p)} = ${factored(p, v.g)}$, which is a multiple of ${v.g}`, `Write it as ${v.g} × (something) to show it is a multiple of ${v.g}.`),
    ];
    if (v.level === 'core') return [[step('M1', `${steps[0].working} and ${steps[1].working}`, 'Expand each bracket as (…)(…): four terms, then simplify.'), steps[2], steps[3]]];
    return [steps];
  },

  check(v, answers) {
    const p: string[] = [];
    // Evaluate the original expression for n = 1 … 60 from scratch.
    const value = (n: number): number => {
      switch (v.kind) {
        case 'consec-int':
          return Array.from({ length: v.k }, (_, i) => n + i).reduce((s, x) => s + x, 0);
        case 'consec-even':
          return Array.from({ length: v.k }, (_, i) => 2 * n + 2 * i).reduce((s, x) => s + x, 0);
        case 'consec-odd':
          return Array.from({ length: v.k }, (_, i) => 2 * n + 1 + 2 * i).reduce((s, x) => s + x, 0);
        case 'odd-square':
          return (2 * n + 1) ** 2;
        case 'sum-squares':
          return n * n + (n + 1) ** 2;
        default:
          return (v.a * n + v.b) ** 2 - (v.c * n + v.d) ** 2;
      }
    };
    for (let n = 1; n <= 60; n++) {
      const x = value(n);
      const ok = v.kind === 'odd-square' ? (x - 1) % 8 === 0 : v.kind === 'sum-squares' ? Math.abs(x % 2) === 1 : x % v.g === 0;
      if (!ok) {
        p.push(`claim fails at n = ${n}`);
        break;
      }
    }
    // The simplified polynomial shown must equal the expression.
    const m = /= ([^=$]+) = /.exec(answers[0].text);
    if (!m) p.push('no simplified form');
    else {
      const shown = parsePoly(m[1]);
      for (let n = 0; n <= 5; n++) if (shown[0] * n * n + shown[1] * n + shown[2] !== value(n)) p.push(`simplified form wrong at n = ${n}`);
    }
    return p;
  },

  key: (v) => `${v.kind}|${v.k}|${v.a}|${v.b}|${v.c}|${v.d}`,
});

/** "4n^2 + 4n + 1" → [4, 4, 1] */
function parsePoly(s: string): Poly {
  const out: Poly = [0, 0, 0];
  const t = s.replace(/\s+/g, '');
  for (const m of t.matchAll(/([+-]?)(\d*)(n(?:\^2)?)?/g)) {
    if (!m[0]) continue;
    const coef = (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
    if (m[3] === 'n^2') out[0] += coef;
    else if (m[3] === 'n') out[1] += coef;
    else if (m[2] !== '') out[2] += coef;
  }
  return out;
}
