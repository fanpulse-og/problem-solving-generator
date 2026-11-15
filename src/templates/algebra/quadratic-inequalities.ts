import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, fracTex, linTex, polyTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Solving a quadratic inequality and writing the solution as a range, a
 * grade 8–9 topic on most Higher series. Practice is already in the form
 * "quadratic compared with 0"; Apply needs rearranging first; Extend has a
 * non-monic quadratic and a linear inequality that must hold as well.
 */
type Op = '<' | '<=' | '>' | '>=';
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // The quadratic ax² + bx + c compared with 0.
  a: number;
  b: number;
  c: number;
  op: Op;
  // core: shown as x² + lx  op  rx + k, where l − r = b and −k = c.
  l: number;
  r: number;
  // stretch: also px + s  op2  t.
  p: number;
  s: number;
  t: number;
  op2: Op;
}

const TEX: Record<Op, string> = { '<': '<', '<=': '\\leqslant', '>': '>', '>=': '\\geqslant' };
const holds = (l: Q, op: Op, r: Q) => (op === '<' ? l.lt(r) : op === '<=' ? !l.gt(r) : op === '>' ? l.gt(r) : !l.lt(r));
const strict = (op: Op): Op => (op === '<' || op === '>' ? '<' : '<=');
const roots = (v: V): [Q, Q] => {
  const d = Math.round(Math.sqrt(v.b * v.b - 4 * v.a * v.c));
  return [Q.of(-v.b - d, 2 * v.a), Q.of(-v.b + d, 2 * v.a)];
};
const fac = (x: Q) => `(${polyTex([Number(x.d), -Number(x.n)])})`;
const between = (lo: Q, opLo: Op, hi: Q, opHi: Op) => `$${fracTex(lo)} ${TEX[opLo]} x ${TEX[opHi]} ${fracTex(hi)}$`;

/** The solution shown on the answer line. */
function solution(v: V): string {
  const [x1, x2] = roots(v);
  if (v.level === 'stretch') {
    const k = Q.of(v.t - v.s, v.p);
    const lin = strict(v.op2);
    return v.op2 === '>' || v.op2 === '>=' ? between(k, lin, x2, v.op) : between(x1, v.op, k, lin);
  }
  if (v.op === '<' || v.op === '<=') return between(x1, v.op, x2, v.op);
  return `$x ${TEX[v.op === '>' ? '<' : '<=']} ${fracTex(x1)}$ or $x ${TEX[v.op]} ${fracTex(x2)}$`;
}

/** Whether x satisfies the inequalities as printed in the question. */
function satisfies(v: V, x: Q): boolean {
  const quad = x.mul(x).mul(v.a).add(x.mul(v.b)).add(v.c);
  if (v.level === 'stretch') return holds(quad, v.op, Q.of(0)) && holds(x.mul(v.p).add(v.s), v.op2, Q.of(v.t));
  if (v.level === 'core') return holds(x.mul(x).add(x.mul(v.l)), v.op, x.mul(v.r).sub(v.c));
  return holds(quad, v.op, Q.of(0));
}

const printed = (v: V) => (v.level === 'core' ? `${polyTex([1, v.l, 0])} ${TEX[v.op]} ${polyTex([v.r, -v.c])}` : `${polyTex([v.a, v.b, v.c])} ${TEX[v.op]} 0`);

export default defineTemplate<V>({
  id: 'alg-quadratic-inequalities',
  title: 'Quadratic inequalities',
  strand: 'Algebra',
  subtopic: 'Inequalities',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, a: 1, b: 0, c: 0, op: '<', l: 0, r: 0, p: 1, s: 0, t: 0, op2: '>' };
    if (level !== 'stretch') {
      const r1 = rng.int(-9, 6);
      const r2 = r1 + rng.int(2, 10);
      ensure(r1 !== 0 && r2 !== 0 && r1 + r2 !== 0 && r2 <= 10, 'three terms and small roots');
      const v: V = { ...base, b: -(r1 + r2), c: r1 * r2, op: rng.pick(['<', '<=', '>', '>='] as const) };
      if (level === 'core') {
        v.r = rng.int(1, 6) * rng.pick([1, -1]);
        v.l = v.b + v.r;
        ensure(Math.abs(v.l) <= 9, 'small coefficients');
      }
      return v;
    }
    // (dx − n)(x − m) with n/d not whole, then a linear inequality cutting the interval.
    const d = rng.int(2, 3);
    const n = rng.int(-7, 11);
    const m = rng.int(-5, 6);
    ensure(n % d !== 0 && m !== 0, 'one fraction root, one whole root');
    const v: V = { ...base, a: d, b: -(d * m + n), c: n * m, op: rng.pick(['<', '<='] as const), p: rng.int(2, 5), s: rng.int(1, 9) * rng.pick([1, -1]), op2: rng.pick(['<', '<=', '>', '>='] as const) };
    ensure(v.b !== 0, 'an x term');
    const [x1, x2] = roots(v);
    ensure(x2.sub(x1).gt(2), 'a wide enough interval');
    const k = rng.int(Number(x1.floor()) + 1, Number(x2.ceil()) - 1);
    ensure(Q.of(k).gt(x1) && Q.of(k).lt(x2), 'the linear inequality cuts the interval');
    v.t = v.p * k + v.s;
    return v;
  },

  validate(v) {
    return v.b * v.b - 4 * v.a * v.c > 0 ? [] : ['two different critical values are needed'];
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: [text('Find the set of values of $x$ for which'), text(`$${printed(v)}$  and  $${linTex(v.p, v.s)} ${TEX[v.op2]} ${v.t}$`)],
        parts: [single(5, text('Show your working clearly.'))],
      };
    }
    return { stem: [], parts: [single(v.level === 'core' ? 4 : 3, text(`Solve  $${printed(v)}$`))] };
  },

  answer(v) {
    return [{ text: solution(v) }];
  },

  markScheme(v) {
    const [x1, x2] = roots(v);
    const inside = v.op === '<' || v.op === '<=';
    const shape = inside ? 'The curve is ∪-shaped, so it is below the x-axis BETWEEN the critical values.' : 'The curve is ∪-shaped, so it is above the x-axis OUTSIDE the critical values. Write two separate inequalities.';
    const factorise = step('M1', `$${fac(x1)}${fac(x2)}$`, 'Factorise the quadratic.');
    const critical = step('M1', `Critical values $x = ${fracTex(x1)}$ and $x = ${fracTex(x2)}$`, 'These are where the curve crosses the x-axis. A quick sketch helps.');
    if (v.level === 'foundational') return [[factorise, critical, step('A1', solution(v), shape)]];
    if (v.level === 'core') {
      return [[step('M1', `$${polyTex([v.a, v.b, v.c])} ${TEX[v.op]} 0$`, 'Collect every term on one side, so the quadratic is compared with zero.'), factorise, critical, step('A1', solution(v), shape)]];
    }
    const k = Q.of(v.t - v.s, v.p);
    return [
      [
        factorise,
        critical,
        step('M1', `$${fracTex(x1)} ${TEX[v.op]} x ${TEX[v.op]} ${fracTex(x2)}$`, shape),
        step('M1', `$${v.p}x ${TEX[v.op2]} ${v.t - v.s}$, so $x ${TEX[v.op2]} ${fracTex(k)}$`, 'Solve the linear inequality like an equation.'),
        step('A1', solution(v), 'Both must be true. Mark the two solutions on a number line and take the overlap.'),
      ],
    ];
  },

  check(v, answers) {
    // Read the printed solution back, then test it against the question on a grid of twelfths.
    const s = answers[0].text;
    const num = '(-?(?:\\\\frac\\{\\d+\\}\\{\\d+\\}|\\d+))';
    const opRe = '(<|\\\\leqslant|>|\\\\geqslant)';
    const toQ = (t: string) => {
      const m = /(-?)\\frac\{(\d+)\}\{(\d+)\}/.exec(t);
      return m ? Q.of(Number(m[2]) * (m[1] ? -1 : 1), Number(m[3])) : Q.of(Number(t));
    };
    const toOp = (t: string): Op => (t === '<' ? '<' : t === '>' ? '>' : t === '\\leqslant' ? '<=' : '>=');
    const mid = new RegExp(`^\\$${num} ${opRe} x ${opRe} ${num}\\$$`).exec(s);
    const out = new RegExp(`^\\$x ${opRe} ${num}\\$ or \\$x ${opRe} ${num}\\$$`).exec(s);
    if (!mid && !out) return ['format'];
    const inAnswer = (x: Q) => (mid ? holds(toQ(mid[1]), toOp(mid[2]), x) && holds(x, toOp(mid[3]), toQ(mid[4])) : holds(x, toOp(out![1]), toQ(out![2])) || holds(x, toOp(out![3]), toQ(out![4])));
    for (let n = -180; n <= 180; n++) {
      const x = Q.of(n, 12);
      if (satisfies(v, x) !== inAnswer(x)) return [`disagrees at x = ${x}`];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.op}|${v.l}|${v.r}|${v.p}|${v.s}|${v.t}|${v.op2}`,
});
