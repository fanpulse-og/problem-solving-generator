import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV } from '../../engine/blocks';
import { dec, ensure, money, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1F Q12 (bike hire C = 12 + 8h), Set 22 2F Q19 (v = u + at:
 * find t) and Set 24 2H Q11 (v² = u² + 2as: work out u). Each value asked for
 * is chosen first, so non-calculator answers are exact.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  calc: boolean;
  ctx: number;
  // foundational: C = rate × h + fixed (pence); h1 forward, h2 backward
  rate: number;
  fixed: number;
  h: [number, number];
  // core / stretch: the known values (as decimals in tenths) and the unknown
  vals: Record<string, Q>;
}

/** Pounds from pence for a formula: 8, 4.20 */
const pounds = (p: number) => (p % 100 === 0 ? `${p / 100}` : dec(Q.of(p, 100), 2));

const HIRE = [
  { what: 'hiring a bike', unit: 'hours', sym: 'h', who: 'a bike' },
  { what: 'hiring a kayak', unit: 'hours', sym: 'h', who: 'a kayak' },
  { what: 'a taxi journey', unit: 'miles', sym: 'm', who: 'a taxi' },
];

// Core: linear formulae, solve for the unknown.
const CORE = [
  { f: 'v = u + at', find: 't', given: ['v', 'u', 'a'], solve: (g: Record<string, Q>) => g.v.sub(g.u).div(g.a) },
  { f: 'F = \\frac{9C}{5} + 32', find: 'C', given: ['F'], solve: (g: Record<string, Q>) => g.F.sub(32).mul(5).div(9) },
  { f: 'A = \\frac{1}{2}(a + b)h', find: 'h', given: ['A', 'a', 'b'], solve: (g: Record<string, Q>) => g.A.mul(2).div(g.a.add(g.b)) },
];
// Stretch: the unknown is squared.
const STRETCH = [
  { f: 'v^2 = u^2 + 2as', find: 'u', given: ['v', 'a', 's'], sq: (g: Record<string, Q>) => g.v.mul(g.v).sub(g.a.mul(g.s).mul(2)), note: 'u is positive' },
  { f: 'E = \\frac{1}{2}mv^2', find: 'v', given: ['E', 'm'], sq: (g: Record<string, Q>) => g.E.mul(2).div(g.m), note: 'v is positive' },
];

export default defineTemplate<V>({
  id: 'alg-formulae',
  title: 'Using and rearranging formulae',
  strand: 'Algebra',
  subtopic: 'Forming & using formulae',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'backwards',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const isCalc = calc === 'calc';
    const base: V = { level, name, calc: isCalc, ctx: 0, rate: 0, fixed: 0, h: [0, 0], vals: {} };
    if (level === 'foundational') {
      const rate = rng.step(isCalc ? 135 : 150, 900, isCalc ? 5 : 50);
      const fixed = rng.step(200, 1500, isCalc ? 10 : 50);
      const [h1, h2] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12], 2);
      return { ...base, ctx: rng.int(0, HIRE.length - 1), rate, fixed, h: [h1, h2] };
    }
    if (level === 'core') {
      const ctx = rng.int(0, CORE.length - 1);
      const tenth = (lo: number, hi: number) => (isCalc ? Q.of(rng.int(lo * 10, hi * 10), 10) : Q.of(rng.int(lo, hi)));
      let vals: Record<string, Q>;
      if (ctx === 0) {
        const u = tenth(0, 15);
        const a = isCalc ? Q.of(rng.int(5, 40), 10) : Q.of(rng.int(2, 6));
        const t = isCalc ? Q.of(rng.int(2, 20)) : Q.of(rng.int(2, 9));
        vals = { u, a, t, v: u.add(a.mul(t)) };
      } else if (ctx === 1) {
        const C = Q.of(rng.int(-4, 20) * 5);
        vals = { C, F: C.mul(9).div(5).add(32) };
      } else {
        const a = tenth(3, 12);
        const b = tenth(3, 12);
        const h = isCalc ? Q.of(rng.int(20, 90), 10) : Q.of(rng.int(2, 10));
        ensure(!a.eq(b), 'different parallel sides');
        vals = { a, b, h, A: a.add(b).mul(h).div(2) };
      }
      ensure(Object.values(vals).every((q) => q.terminatesWithin(2)), 'tidy values');
      return { ...base, ctx, vals };
    }
    const ctx = rng.int(0, STRETCH.length - 1);
    let vals: Record<string, Q>;
    if (ctx === 0) {
      const u = isCalc ? Q.of(rng.int(15, 120), 10) : Q.of(rng.int(2, 12));
      const a = isCalc ? Q.of(rng.int(5, 40), 10) : Q.of(rng.int(1, 5));
      const s = isCalc ? Q.of(rng.int(10, 200), 10) : Q.of(rng.int(2, 20));
      const v2 = u.mul(u).add(a.mul(s).mul(2));
      // Calculator: v is given to 1 dp, so u comes from v as shown.
      ensure(isCalc || Number.isInteger(Math.sqrt(v2.toNumber())), 'v is a whole number without a calculator');
      const v = isCalc ? Q.of(Math.round(Math.sqrt(v2.toNumber()) * 10), 10) : Q.of(Math.sqrt(v2.toNumber()));
      vals = { v, a, s };
      ensure(STRETCH[0].sq(vals).gt(0), 'u² must be positive');
    } else {
      const m = isCalc ? Q.of(rng.int(5, 80), 10) : Q.of(rng.pick([2, 4, 5, 8, 10]));
      const v = isCalc ? Q.of(rng.int(15, 150), 10) : Q.of(rng.int(2, 12));
      const E = m.mul(v).mul(v).div(2);
      ensure(E.terminatesWithin(isCalc ? 3 : 0), 'tidy energy');
      vals = { E, m };
      if (isCalc) vals.E = Q.of(Math.round(E.toNumber()));
      ensure(vals.E.gt(0), 'positive energy');
    }
    const sq = STRETCH[ctx].sq(vals).toNumber();
    if (isCalc) ensure(!Number.isInteger(Math.sqrt(sq)) && !/\.0+$/.test(roundFloatSf(Math.sqrt(sq), 3)), 'needs a calculator, no trailing zero');
    else ensure(Number.isInteger(Math.sqrt(sq)), 'exact without a calculator');
    return { ...base, ctx, vals };
  },

  validate(v) {
    return v.level === 'foundational' && v.rate <= 0 ? ['rate'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const c = HIRE[v.ctx];
      const [h1, h2] = v.h;
      const cost2 = v.rate * h2 + v.fixed;
      return {
        stem: lines(`The cost, $C$ pounds, of ${c.what} for $${c.sym}$ ${c.unit} is given by the formula`, `$C = ${pounds(v.fixed)} + ${pounds(v.rate)}${c.sym}$`),
        parts: [part('a', 2, text(`Work out the cost of ${c.what} for ${h1} ${c.unit}.`)), part('b', 2, text(`${v.name} paid ${money(cost2)} for ${c.what}.`), text(`For how many ${c.unit} did ${v.name} use ${c.who}?`))],
      };
    }
    if (v.level === 'core') {
      const c = CORE[v.ctx];
      return { stem: [text(`$${c.f}$`)], parts: [single(3, text(`Work out the value of $${c.find}$ when ${c.given.map((g) => `$${g} = ${dec(v.vals[g])}$`).join(', ').replace(/, ([^,]*)$/, ' and $1')}`))] };
    }
    const c = STRETCH[v.ctx];
    return {
      stem: [text(`$${c.f}$`)],
      parts: [single(3, text(`Work out the value of $${c.find}$ when ${c.given.map((g) => `$${g} = ${dec(v.vals[g])}$`).join(', ').replace(/, ([^,]*)$/, ' and $1')}`), text(`${c.note.replace(/^(\w)/, '$$$1$$')}.`), ...(v.calc ? [text('Give your answer correct to 3 significant figures.')] : []))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: money(v.rate * v.h[0] + v.fixed) }, { text: `${v.h[1]} ${HIRE[v.ctx].unit}` }];
    }
    if (v.level === 'core') return [{ text: `$${CORE[v.ctx].find} = ${dec(CORE[v.ctx].solve(v.vals))}$` }];
    const r = Math.sqrt(STRETCH[v.ctx].sq(v.vals).toNumber());
    return [{ text: `$${STRETCH[v.ctx].find} = ${v.calc ? roundFloatSf(r, 3) : r}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const c = HIRE[v.ctx];
      const [h1, h2] = v.h;
      const cost2 = v.rate * h2 + v.fixed;
      return [
        [step('M1', `${pounds(v.fixed)} + ${pounds(v.rate)} × ${h1}`, `Substitute ${c.sym} = ${h1} into the formula.`), step('A1', money(v.rate * h1 + v.fixed), 'Multiply first, then add.')],
        [step('M1', `(${pounds(cost2)} − ${pounds(v.fixed)}) ${DIV} ${pounds(v.rate)}`, 'Work backwards: take off the fixed charge, then divide by the rate.'), step('A1', `${h2} ${c.unit}`, `Check: ${pounds(v.fixed)} + ${pounds(v.rate)} × ${h2} = ${pounds(cost2)}`)],
      ];
    }
    if (v.level === 'core') {
      const c = CORE[v.ctx];
      const g = v.vals;
      const sub = v.ctx === 0 ? `$${dec(g.v)} = ${dec(g.u)} + ${dec(g.a)}t$` : v.ctx === 1 ? `$${dec(g.F)} = \\frac{9C}{5} + 32$` : `$${dec(g.A)} = \\frac{1}{2}(${dec(g.a)} + ${dec(g.b)})h$`;
      const mid = v.ctx === 0 ? `$${dec(g.v.sub(g.u))} = ${dec(g.a)}t$` : v.ctx === 1 ? `$${dec(g.F.sub(32))} = \\frac{9C}{5}$, so $9C = ${dec(g.F.sub(32).mul(5))}$` : `$${dec(g.A.mul(2))} = ${dec(g.a.add(g.b))}h$`;
      return [[step('M1', sub, 'Substitute the values you know.'), step('M1', mid, 'Rearrange: undo each operation in reverse order.'), step('A1', `$${c.find} = ${dec(c.solve(g))}$`, 'Check by substituting back into the formula.')]];
    }
    const c = STRETCH[v.ctx];
    const g = v.vals;
    const sq = c.sq(g);
    const r = Math.sqrt(sq.toNumber());
    const sub = v.ctx === 0 ? `$${dec(g.v)}^2 = u^2 + 2 \\times ${dec(g.a)} \\times ${dec(g.s)}$` : `$${dec(g.E)} = \\frac{1}{2} \\times ${dec(g.m)} \\times v^2$`;
    const mid = v.ctx === 0 ? `$u^2 = ${dec(g.v.mul(g.v))} - ${dec(g.a.mul(g.s).mul(2))} = ${dec(sq)}$` : `$v^2 = \\frac{2 \\times ${dec(g.E)}}{${dec(g.m)}} = ${sq.terminatesWithin(4) ? dec(sq) : sq.toNumber().toFixed(4) + '…'}$`;
    return [[step('M1', sub, 'Substitute the values you know.'), step('M1', mid, `Rearrange to get ${c.find}² on its own.`), step('A1', `$${c.find} = \\sqrt{${sq.terminatesWithin(4) ? dec(sq) : '…'}} = ${v.calc ? roundFloatSf(r, 3) : r}$`, `Square root. ${c.note.replace(/^(\w)/, '$$$1$$')}, so take the positive root.`)]];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = (s: string) => Number(s.replace(/[^\d.-]/g, ''));
    if (v.level === 'foundational') {
      // Count up the hours/miles until the cost matches.
      const target = v.rate * v.h[1] + v.fixed;
      let k = 0;
      while (v.fixed + v.rate * k < target) k++;
      if (answers[1].text !== `${k} ${HIRE[v.ctx].unit}` || v.fixed + v.rate * k !== target) p.push('backwards');
      if (answers[0].text !== money(v.fixed + v.rate * v.h[0])) p.push('forwards');
      return p;
    }
    const x = Q.of(answers[0].text.replace(/^.*= /, '').replace(/\$/g, ''));
    const g = v.vals;
    // Substitute the answer back into the original formula.
    if (v.level === 'core') {
      const ok = v.ctx === 0 ? g.u.add(g.a.mul(x)).eq(g.v) : v.ctx === 1 ? x.mul(9).div(5).add(32).eq(g.F) : g.a.add(g.b).mul(x).div(2).eq(g.A);
      if (!ok) p.push('does not satisfy the formula');
      return p;
    }
    const xv = num(answers[0].text.replace(/^.*= /, ''));
    const lhs = v.ctx === 0 ? g.v.toNumber() ** 2 : g.E.toNumber();
    const rhs = v.ctx === 0 ? xv ** 2 + 2 * g.a.toNumber() * g.s.toNumber() : 0.5 * g.m.toNumber() * xv ** 2;
    // Allow for the answer being rounded to 3 s.f.: half a unit in the 3rd figure, times the rate of change.
    const unit = 10 ** (Math.floor(Math.log10(xv)) - 2);
    const slope = v.ctx === 0 ? 2 * xv : g.m.toNumber() * xv;
    const tol = v.calc ? slope * (unit / 2) * 1.01 + 1e-9 : 1e-9;
    if (Math.abs(lhs - rhs) > tol || xv <= 0) p.push('does not satisfy the formula');
    return p;
  },

  key: (v) => `${v.ctx}|${v.rate}|${v.fixed}|${v.h}|${Object.entries(v.vals).map(([k, q]) => k + q.toString())}`,
});
