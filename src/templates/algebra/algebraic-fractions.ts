import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, linTex, polyTex } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';

/**
 * The three algebraic-fraction questions that come up on Edexcel Higher papers:
 * simplify a quotient of two quadratics, solve an equation with two algebraic
 * fractions (leading to a quadratic), and write a product in the form
 * (ax + b)/(cx + d) using the difference of two squares.
 * check() compares values of the original and simplified expressions, or
 * substitutes the roots back into the original equation.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // foundational: (x + a)(x + b) / (x + a)(x + c)
  // core: p/(x + a) + q/(x + b) = 1
  // stretch: (m²x² − n²)/(k(mx + n)) × jx/(x² − cx)
  a: number;
  b: number;
  c: number;
  p: number;
  q: number;
  m: number;
  n: number;
  j: number;
  k: number;
}

const quad = (r: number, s: number) => polyTex([1, r + s, r * s]);
const br = (r: number) => `(${linTex(1, r)})`;
/** Integer roots of x² + Bx + C = 0, or null. */
function roots(B: number, C: number): [number, number] | null {
  const d = B * B - 4 * C;
  const s = Math.round(Math.sqrt(d));
  if (d <= 0 || s * s !== d || (-B + s) % 2 !== 0) return null;
  return [(-B - s) / 2, (-B + s) / 2];
}
const coreQuad = (v: V): [number, number] => [v.a + v.b - v.p - v.q, v.a * v.b - v.p * v.b - v.q * v.a];

export default defineTemplate<V>({
  id: 'alg-algebraic-fractions',
  title: 'Algebraic fractions',
  strand: 'Algebra',
  subtopic: 'Algebraic fractions',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, c: 0, p: 0, q: 0, m: 1, n: 0, j: 1, k: 1 };
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    if (level === 'foundational') {
      const a = nz(1, 7);
      const b = nz(1, 8);
      const c = nz(1, 8);
      ensure(new Set([a, b, c]).size === 3 && a + b !== 0 && a + c !== 0, 'three different factors, each quadratic with an x term');
      return { ...base, a, b, c };
    }
    if (level === 'core') {
      const a = nz(1, 5);
      const b = nz(1, 5);
      const p = rng.int(1, 6);
      const q = rng.int(1, 6);
      const v = { ...base, a, b, p, q };
      const [B, C] = coreQuad(v);
      const r = roots(B, C);
      ensure(a !== b && r !== null && C !== 0, 'a quadratic with two whole-number roots');
      ensure(r!.every((x) => x !== -a && x !== -b && Math.abs(x) <= 12), 'roots that do not make a denominator zero');
      return v;
    }
    const m = rng.int(2, 5);
    const n = rng.int(1, 7);
    const c = rng.int(1, 6);
    const j = rng.int(2, 5);
    const k = rng.int(2, 7);
    ensure(gcdInt(m, n) === 1 && gcdInt(j, k) === 1 && n !== m * c, 'nothing else cancels');
    return { ...base, m, n, c, j, k };
  },

  validate(v) {
    return v.level === 'stretch' && gcdInt(v.j, v.k) !== 1 ? ['j/k must be in lowest terms'] : [];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(3, text(`Simplify fully  $\\dfrac{${quad(v.a, v.b)}}{${quad(v.a, v.c)}}$`))] };
    if (v.level === 'core') return { stem: [], parts: [single(4, text(`Solve  $\\dfrac{${v.p}}{${linTex(1, v.a)}} + \\dfrac{${v.q}}{${linTex(1, v.b)}} = 1$`))] };
    const top = polyTex([v.m * v.m, 0, -v.n * v.n]);
    return {
      stem: [],
      parts: [
        single(
          4,
          text(`Write  $\\dfrac{${top}}{${polyTex([v.k * v.m, v.k * v.n])}} \\times \\dfrac{${v.j}x}{${polyTex([1, -v.c, 0])}}$  in the form  $\\dfrac{ax + b}{cx + d}$`),
          text('where $a$, $b$, $c$ and $d$ are integers.'),
        ),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$\\dfrac{${linTex(1, v.b)}}{${linTex(1, v.c)}}$` }];
    if (v.level === 'core') {
      const [x1, x2] = roots(...coreQuad(v))!;
      return [{ text: `$x = ${x1}$ or $x = ${x2}$` }];
    }
    return [{ text: `$\\dfrac{${polyTex([v.j * v.m, -v.j * v.n])}}{${polyTex([v.k, -v.k * v.c])}}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `$${quad(v.a, v.b)} = ${br(v.a)}${br(v.b)}$`, 'Factorise the top: two numbers that multiply to the constant and add to the x coefficient.'),
          step('M1', `$${quad(v.a, v.c)} = ${br(v.a)}${br(v.c)}$`, 'Factorise the bottom the same way.'),
          step('A1', `$\\dfrac{${linTex(1, v.b)}}{${linTex(1, v.c)}}$`, `Cancel the common factor $${br(v.a)}$. You can only cancel whole brackets, never single terms.`),
        ],
      ];
    }
    if (v.level === 'core') {
      const [B, C] = coreQuad(v);
      const [x1, x2] = roots(B, C)!;
      return [
        [
          step('M1', `$${v.p}${br(v.b)} + ${v.q}${br(v.a)} = ${br(v.a)}${br(v.b)}$`, 'Multiply every term by both denominators to clear the fractions.'),
          step('M1', `$${polyTex([v.p + v.q, v.p * v.b + v.q * v.a])} = ${quad(v.a, v.b)}$, so $${polyTex([1, B, C])} = 0$`, 'Expand both sides and collect everything on one side.'),
          step('M1', `$${br(-x1)}${br(-x2)} = 0$`, 'Factorise the quadratic.'),
          step('A1', `$x = ${x1}$ or $x = ${x2}$`, 'Give both solutions.'),
        ],
      ];
    }
    return [
      [
        step('M1', `$${polyTex([v.m * v.m, 0, -v.n * v.n])} = (${polyTex([v.m, -v.n])})(${polyTex([v.m, v.n])})$`, 'The top is a difference of two squares.'),
        step('M1', `$${polyTex([v.k * v.m, v.k * v.n])} = ${v.k}(${polyTex([v.m, v.n])})$ and $${polyTex([1, -v.c, 0])} = x${br(-v.c)}$`, 'Factorise the two denominators.'),
        step('M1', `$\\dfrac{${polyTex([v.m, -v.n])}}{${v.k}} \\times \\dfrac{${v.j}}{${linTex(1, -v.c)}}$`, `Cancel $(${polyTex([v.m, v.n])})$ and $x$.`),
        step('A1', `$\\dfrac{${polyTex([v.j * v.m, -v.j * v.n])}}{${polyTex([v.k, -v.k * v.c])}}$`, 'Multiply the tops and multiply the bottoms, then expand.'),
      ],
    ];
  },

  check(v, answers) {
    // Compare exact values of the original expression and the answer at several x.
    const xs = [11, 13, -17, 19, 23].map((x) => Q.of(x, 7));
    if (v.level === 'foundational') {
      const m = /\{x ([+-]) (\d+)\}\{x ([+-]) (\d+)\}/.exec(answers[0].text);
      if (!m) return ['format'];
      const b = Number(m[2]) * (m[1] === '-' ? -1 : 1);
      const c = Number(m[4]) * (m[3] === '-' ? -1 : 1);
      for (const x of xs) {
        const f = (r: number, s: number) => x.mul(x).add(x.mul(r + s)).add(r * s);
        if (!f(v.a, v.b).div(f(v.a, v.c)).eq(x.add(b).div(x.add(c)))) return ['values differ'];
      }
      return [];
    }
    if (v.level === 'core') {
      const got = [...answers[0].text.matchAll(/x = (-?\d+)/g)].map((m) => Number(m[1]));
      if (got.length !== 2 || got[0] === got[1]) return ['two roots'];
      // Substitute each root into the original equation.
      return got.every((x) => Q.of(v.p, x + v.a).add(Q.of(v.q, x + v.b)).eq(1)) ? [] : ['root does not satisfy the equation'];
    }
    const m = /\{(\d+)x ([+-]) (\d+)\}\{(\d+)x ([+-]) (\d+)\}/.exec(answers[0].text);
    if (!m) return ['format'];
    const [a, b, c, d] = [Number(m[1]), Number(m[3]) * (m[2] === '-' ? -1 : 1), Number(m[4]), Number(m[6]) * (m[5] === '-' ? -1 : 1)];
    for (const x of xs) {
      const left = x.mul(x).mul(v.m * v.m).sub(v.n * v.n).div(x.mul(v.k * v.m).add(v.k * v.n));
      const right = x.mul(v.j).div(x.mul(x).sub(x.mul(v.c)));
      if (!left.mul(right).eq(x.mul(a).add(b).div(x.mul(c).add(d)))) return ['values differ'];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.p}|${v.q}|${v.m}|${v.n}|${v.j}|${v.k}`,
});
