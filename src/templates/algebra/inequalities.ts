import { defineTemplate, type Tier } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';

/**
 * Modelled on Set 22 1F Q17 (solve 5x − 3 > 2x + 9), Set 23 1H Q4 (list the
 * integers n with −3 < 2n + 1 ≤ 9) and Set 24 1H Q21 (integers satisfying a
 * quadratic and a linear inequality). check() tests every candidate value
 * against the original inequalities.
 */
type Op = '<' | '<=' | '>' | '>=';
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: Tier;
  // foundational: ax + b op cx + d
  a: number;
  b: number;
  c: number;
  d: number;
  op: Op;
  // core: lo op1 qn + r op2 hi
  lo: number;
  hi: number;
  q: number;
  r: number;
  ops: [Op, Op];
  // stretch (H): (x − r1)(x − r2) op 0; (F): second linear inequality
  r1: number;
  r2: number;
  op2: Op;
}

const TEX: Record<Op, string> = { '<': '<', '<=': '\\leqslant', '>': '>', '>=': '\\geqslant' };
const holds = (l: number, op: Op, r: number) => (op === '<' ? l < r : op === '<=' ? l <= r : op === '>' ? l > r : l >= r);
const lin = (a: number, b: number) => polyTex([a, b]);
const listInts = (xs: number[]) => xs.join(', ').replace(/-/g, '−');

export default defineTemplate<V>({
  id: 'alg-inequalities',
  title: 'Solving inequalities',
  strand: 'Algebra',
  subtopic: 'Inequalities',
  tiers: ['F', 'H'],
  // Solving inequalities is not in the KS3 programme of study; old KS3 links still open.
  formerTiers: ['KS3'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, a: 0, b: 0, c: 0, d: 0, op: '<', lo: 0, hi: 0, q: 1, r: 0, ops: ['<', '<='], r1: 0, r2: 0, op2: '<' };
    const op = () => rng.pick(['<', '<=', '>', '>='] as const);
    if (level === 'foundational' || (level === 'stretch' && tier !== 'H')) {
      const c = rng.int(1, 4);
      const a = c + rng.int(1, 4);
      const k = rng.int(-4, 9);
      const b = rng.int(-9, 9);
      const d = b + (a - c) * k;
      ensure(b !== 0 && d !== 0 && Math.abs(d) <= 30, 'tidy constants');
      const v = { ...base, a, b, c, d, op: op() };
      if (level === 'stretch') {
        // A second inequality, written as px + s op2 t, cutting the first one off.
        const k2 = k + (v.op === '>' || v.op === '>=' ? rng.int(2, 5) : -rng.int(2, 5));
        const p2 = rng.int(2, 5);
        const s2 = rng.int(-6, 6);
        v.op2 = v.op === '>' || v.op === '>=' ? rng.pick(['<', '<='] as const) : rng.pick(['>', '>='] as const);
        Object.assign(v, { r1: p2, r2: s2, lo: p2 * k2 + s2 });
        ensure(s2 !== 0, 'a constant term');
        ensure(integersBoth(v).length >= 1 && integersBoth(v).length <= 6, 'a short list of answers');
      }
      return v;
    }
    if (level === 'core') {
      const q = rng.int(2, 4);
      const r = rng.int(-5, 6);
      const lo = rng.int(-12, 2);
      const hi = lo + rng.int(5, 14);
      const v = { ...base, q, r, lo, hi, ops: [rng.pick(['<', '<='] as const), rng.pick(['<', '<='] as const)] as [Op, Op] };
      const n = integersCore(v);
      ensure(n.length >= 3 && n.length <= 7 && r !== 0, 'a short list');
      ensure(n.some((x) => x <= 0) || lo < 0, 'some care with negatives');
      return v;
    }
    const r1 = rng.int(-6, 3);
    const r2 = r1 + rng.int(3, 8);
    const quadOp = rng.pick(['<', '<='] as const);
    // Linear: 2x + s > t style, cutting the interval.
    const p2 = rng.int(2, 4);
    const cut = rng.int(r1 + 1, r2 - 1);
    const s2 = rng.int(-5, 5);
    const v = { ...base, r1, r2, op: quadOp, a: p2, b: s2, d: p2 * cut + s2, op2: rng.pick(['>', '>='] as const) };
    ensure(s2 !== 0 && r1 !== 0 && r2 !== 0, 'no zero terms');
    const xs = integersQuad(v);
    ensure(xs.length >= 2 && xs.length <= 6 && xs.length < integersQuad({ ...v, d: -999 }).length, 'the linear inequality matters');
    return v;
  },

  validate(v) {
    return v.level === 'foundational' && v.a <= v.c ? ['x terms must not cancel'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const big = v.op === '>' || v.op === '>=';
      return {
        stem: [],
        parts: [
          part('a', 2, text(`Solve $${lin(v.a, v.b)} ${TEX[v.op]} ${lin(v.c, v.d)}$`)),
          part('b', 1, text(`$n$ is an integer that satisfies $${lin(v.a, v.b).replace('x', 'n')} ${TEX[v.op]} ${lin(v.c, v.d).replace('x', 'n')}$`), text(`Write down the ${big ? 'smallest' : 'largest'} possible value of $n$.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return { stem: [], parts: [single(3, text(`$n$ is an integer such that $${v.lo} ${TEX[v.ops[0]]} ${lin(v.q, v.r).replace(/x/g, 'n')} ${TEX[v.ops[1]]} ${v.hi}$`), text('Write down all the possible values of $n$.'))] };
    }
    if (v.tier !== 'H') {
      return {
        stem: [text('$x$ is an integer such that'), text(`$${lin(v.a, v.b)} ${TEX[v.op]} ${lin(v.c, v.d)}$ and $${lin(v.r1, v.r2)} ${TEX[v.op2]} ${v.lo}$`)],
        parts: [single(4, text('Find all the possible values of $x$.'))],
      };
    }
    const quad = polyTex([1, -(v.r1 + v.r2), v.r1 * v.r2]);
    return {
      stem: [text('$x$ is an integer such that'), text(`$${quad} ${TEX[v.op]} 0$ and $${lin(v.a, v.b)} ${TEX[v.op2]} ${v.d}$`)],
      parts: [single(4, text('Find all the possible values of $x$.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const k = (v.d - v.b) / (v.a - v.c);
      return [{ text: `$x ${TEX[v.op]} ${k}$` }, { text: `$n = ${extreme(v)}$` }];
    }
    if (v.level === 'core') return [{ text: listInts(integersCore(v)) }];
    if (v.tier !== 'H') return [{ text: listInts(integersBoth(v)) }];
    return [{ text: listInts(integersQuad(v)) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const k = (v.d - v.b) / (v.a - v.c);
      return [
        [step('M1', `$${lin(v.a - v.c, 0)} ${TEX[v.op]} ${v.d - v.b}$`, `Take ${v.c}x from both sides and ${v.b > 0 ? `subtract ${v.b}` : `add ${-v.b}`}, just like an equation.`), step('A1', `$x ${TEX[v.op]} ${k}$`, v.a - v.c === 1 ? 'Keep the same inequality sign.' : `Divide by ${v.a - v.c}: positive, so the sign stays the same way round.`)],
        [step('B1', `$n = ${extreme(v)}$`, v.op === '<' || v.op === '>' ? `Not $${k}$ itself: the inequality is strict.` : `$${k}$ is allowed: the inequality includes it.`)],
      ];
    }
    if (v.level === 'core') {
      const ns = integersCore(v);
      const nTex = lin(v.q, v.r).replace(/x/g, 'n');
      return [
        [
          step('M1', `$${v.lo - v.r} ${TEX[v.ops[0]]} ${v.q}n ${TEX[v.ops[1]]} ${v.hi - v.r}$`, `${v.r > 0 ? `Subtract ${v.r}` : `Add ${-v.r}`} from all three parts of $${v.lo} ${TEX[v.ops[0]]} ${nTex} ${TEX[v.ops[1]]} ${v.hi}$.`),
          step('M1', `$${fmt(v.lo - v.r, v.q)} ${TEX[v.ops[0]]} n ${TEX[v.ops[1]]} ${fmt(v.hi - v.r, v.q)}$`, `Divide all three parts by ${v.q}.`),
          step('A1', listInts(ns), 'Only whole numbers, and check each end: is it < or ⩽?'),
        ],
      ];
    }
    if (v.tier !== 'H') {
      const k = (v.d - v.b) / (v.a - v.c);
      const k2 = (v.lo - v.r2) / v.r1;
      return [
        [
          step('M1', `$x ${TEX[v.op]} ${k}$`, 'Solve the first inequality like an equation.'),
          step('M1', `$${v.r1}x ${TEX[v.op2]} ${v.lo - v.r2}$, so $x ${TEX[v.op2]} ${fmt(v.lo - v.r2, v.r1)}$`, 'Solve the second one.'),
          step('M1', `$${Math.min(k, k2) === k ? `${k}` : fmt(v.lo - v.r2, v.r1)}$ to $${Math.max(k, k2) === k ? `${k}` : fmt(v.lo - v.r2, v.r1)}$`, 'x must satisfy both: it lies between the two values.'),
          step('A1', listInts(integersBoth(v)), 'List the integers, checking the ends.'),
        ],
      ];
    }
    const quad = polyTex([1, -(v.r1 + v.r2), v.r1 * v.r2]);
    const fac = `(x ${v.r1 < 0 ? '+' : '-'} ${Math.abs(v.r1)})(x ${v.r2 < 0 ? '+' : '-'} ${Math.abs(v.r2)})`;
    return [
      [
        step('M1', `$${quad} = ${fac}$, critical values $${v.r1}$ and $${v.r2}$`, 'Factorise to find where the curve crosses the x-axis.'),
        step('M1', `$${v.r1} ${TEX[v.op]} x ${TEX[v.op]} ${v.r2}$`, 'A ∪-shaped curve is below the axis BETWEEN its roots.'),
        step('M1', `$x ${TEX[v.op2]} ${fmt(v.d - v.b, v.a)}$`, 'Solve the linear inequality.'),
        step('A1', listInts(integersQuad(v)), 'Integers that satisfy both.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const got = (s: string) => s.replace(/−/g, '-').split(',').map((t) => Number(t.trim()));
    if (v.level === 'foundational') {
      // Test x in steps of ¼ against the original inequality and the solution shown.
      const m = /x (<|\\leqslant|>|\\geqslant) (-?\d+)/.exec(answers[0].text);
      if (!m) return ['format'];
      const op: Op = m[1] === '<' ? '<' : m[1] === '>' ? '>' : m[1] === '\\leqslant' ? '<=' : '>=';
      const k = Number(m[2]);
      for (let x = -60; x <= 60; x += 0.25) if (holds(v.a * x + v.b, v.op, v.c * x + v.d) !== holds(x, op, k)) p.push(`disagrees at x = ${x}`);
      const n = Number(/n = (-?\d+)/.exec(answers[1].text)?.[1]);
      const ok = holds(v.a * n + v.b, v.op, v.c * n + v.d);
      const step1 = v.op === '>' || v.op === '>=' ? n - 1 : n + 1;
      if (!ok || holds(v.a * step1 + v.b, v.op, v.c * step1 + v.d)) p.push('not the extreme integer');
      return p.slice(0, 1);
    }
    const want: number[] = [];
    for (let x = -100; x <= 100; x++) {
      const ok =
        v.level === 'core' ? holds(v.lo, v.ops[0], v.q * x + v.r) && holds(v.q * x + v.r, v.ops[1], v.hi) :
        v.tier !== 'H' ? holds(v.a * x + v.b, v.op, v.c * x + v.d) && holds(v.r1 * x + v.r2, v.op2, v.lo) :
        holds(x * x - (v.r1 + v.r2) * x + v.r1 * v.r2, v.op, 0) && holds(v.a * x + v.b, v.op2, v.d);
      if (ok) want.push(x);
    }
    if (got(answers[0].text).join() !== want.join()) p.push(`expected ${want}`);
    return p;
  },

  key: (v) => `${v.tier === 'H' ? 'H' : ''}|${v.a}|${v.b}|${v.c}|${v.d}|${v.op}|${v.lo}|${v.hi}|${v.q}|${v.r}|${v.ops}|${v.r1}|${v.r2}|${v.op2}`,
});

/** a/b as KaTeX, simplified. */
function fmt(a: number, b: number): string {
  if (a % b === 0) return `${a / b}`;
  let [x, y] = [Math.abs(a), b];
  while (y) [x, y] = [y, x % y];
  return `${a < 0 ? '-' : ''}\\frac{${Math.abs(a) / x}}{${b / x}}`;
}
function extreme(v: V): number {
  const k = (v.d - v.b) / (v.a - v.c);
  return v.op === '>' ? k + 1 : v.op === '>=' ? k : v.op === '<' ? k - 1 : k;
}
/** Integers satisfying x op value for every bound (all coefficients already divided out). */
function intsIn(bounds: [Op, number][]): number[] {
  let lo = -Infinity;
  let hi = Infinity;
  for (const [op, k] of bounds) {
    if (op === '>') lo = Math.max(lo, Math.floor(k) + 1);
    if (op === '>=') lo = Math.max(lo, Math.ceil(k));
    if (op === '<') hi = Math.min(hi, Math.ceil(k) - 1);
    if (op === '<=') hi = Math.min(hi, Math.floor(k));
  }
  const out: number[] = [];
  for (let n = lo; n <= hi; n++) out.push(n);
  return out;
}
const flip = (op: Op): Op => (op === '<' ? '>' : op === '<=' ? '>=' : op === '>' ? '<' : '<=');
function integersCore(v: V): number[] {
  // lo op0 qn + r op1 hi  ⇔  n flip(op0) (lo − r)/q  and  n op1 (hi − r)/q
  return intsIn([[flip(v.ops[0]), (v.lo - v.r) / v.q], [v.ops[1], (v.hi - v.r) / v.q]]);
}
function integersBoth(v: V): number[] {
  return intsIn([[v.op, (v.d - v.b) / (v.a - v.c)], [v.op2, (v.lo - v.r2) / v.r1]]);
}
function integersQuad(v: V): number[] {
  // (x − r1)(x − r2) < 0 between the roots; then ax + b op2 d.
  const inside: Op = v.op === '<' ? '<' : '<=';
  return intsIn([[flip(inside), v.r1], [inside, v.r2], [v.op2, (v.d - v.b) / v.a]]);
}
