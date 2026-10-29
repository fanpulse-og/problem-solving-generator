import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int, roundDp } from '../../engine/format';
import { Q } from '../../engine/rational';
import { GROUP_MEAN_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 24 2F Q21 (32 students mean 55, 28 students mean 52, find
 * the mean of all 60). Stretch reverses it: the overall mean is known, find
 * the mean of the second group.
 */
type Ctx = (typeof GROUP_MEAN_CONTEXTS)[number];
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: Ctx;
  n1: number;
  n2: number;
  m1: number;
  m2: Q;
  exact: boolean; // answer shown exactly, or to 1 d.p.
}

const overall = (v: V) => Q.of(v.n1 * v.m1).add(v.m2.mul(v.n2)).div(v.n1 + v.n2);

function shown(q: Q, exact: boolean): string {
  return exact ? dec(q) : roundDp(q, 1);
}

export default defineTemplate<V>({
  id: 'stats-combined-mean',
  title: 'Combining the means of two groups',
  strand: 'Statistics',
  subtopic: 'Averages & range',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'averages',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const ctx = rng.pick(GROUP_MEAN_CONTEXTS);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    const n1 = rng.int(tier === 'KS3' ? 5 : 12, tier === 'KS3' ? 20 : 35);
    const n2 = rng.int(tier === 'KS3' ? 5 : 12, tier === 'KS3' ? 20 : 35);
    ensure(n1 !== n2, 'different group sizes');
    if (level === 'stretch') {
      // Constructive: overall mean M first; then n1(M − m1) = n2(m2 − M) gives a whole m2.
      const M = rng.int(ctx.lo + 5, ctx.hi - 5);
      const d1 = rng.pick([-1, 1]) * rng.int(1, 12);
      ensure((n1 * d1) % n2 === 0, 'whole-number mean for the second group');
      const m1 = M - d1;
      const m2 = Q.of(M + (n1 * d1) / n2);
      ensure(m2.gt(0) && m2.toNumber() <= ctx.hi * 1.3 && m1 > 0, 'realistic means');
      return { level, ctx, n1, n2, m1, m2, exact: true };
    }
    const m1 = rng.int(ctx.lo, ctx.hi);
    const m2 = Q.of(rng.int(ctx.lo, ctx.hi));
    ensure(!m2.eq(m1), 'different means');
    const v: V = { level, ctx, n1, n2, m1, m2, exact: true };
    const target = overall(v);
    if (friendly) {
      ensure(target.isInt() || target.mul(2).isInt(), 'whole or half for non-calculator');
    } else {
      v.exact = target.terminatesWithin(2);
      if (!v.exact) {
        // Exact rationals round unambiguously, but avoid values within 0.001 of a .x5 boundary for clarity.
        const r = target.mul(10).sub(Q.of(target.mul(10).floor()));
        ensure(Math.abs(r.toNumber() - 0.5) > 0.01, 'too close to a rounding boundary');
        ensure(!roundDp(target, 1).endsWith('.0'), 'avoid answers like 61.0');
      }
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.n1 <= 0 || v.n2 <= 0) p.push('group sizes');
    if (!v.m2.isPositive()) p.push('mean must be positive');
    return p;
  },

  render(v) {
    const { ctx } = v;
    const N = v.n1 + v.n2;
    const [g1, g2] = ctx.groups;
    const intro = `${int(N)} ${ctx.who} ${ctx.intro}`;
    const l1 = `The mean ${ctx.what} for the ${v.n1} ${ctx.who} in ${g1} was ${int(v.m1)} ${ctx.unit}.`;
    const l2 = `The mean ${ctx.what} for the ${v.n2} ${ctx.who} in ${g2} was ${dec(v.m2)} ${ctx.unit}.`;
    const acc = v.exact ? [] : [text('Give your answer correct to 1 decimal place.')];
    if (v.level === 'stretch') {
      return {
        stem: lines(intro, `There are ${v.n1} ${ctx.who} in ${g1} and ${v.n2} ${ctx.who} in ${g2}.`, `The mean ${ctx.what} for all ${int(N)} ${ctx.who} was ${dec(overall(v))} ${ctx.unit}.`, l1),
        parts: [single(3, text(`Work out the mean ${ctx.what} for the ${ctx.who} in ${g2}.`))],
      };
    }
    if (v.level === 'foundational') {
      return {
        stem: lines(intro, l1, l2),
        parts: [part('a', 1, text(`Work out the total ${ctx.total} for the ${ctx.who} in ${g1}.`)), part('b', 2, text(`Find the mean ${ctx.what} for all ${int(N)} ${ctx.who}.`), ...acc)],
      };
    }
    return { stem: lines(intro, l1, l2), parts: [single(3, text(`Find the mean ${ctx.what} for all ${int(N)} ${ctx.who}.`), ...acc)] };
  },

  answer(v) {
    const u = v.ctx.unit;
    if (v.level === 'stretch') return [{ text: `${dec(v.m2)} ${u}` }];
    const all = `${shown(overall(v), v.exact)} ${u}`;
    if (v.level === 'foundational') return [{ text: `${int(v.n1 * v.m1)} ${u}` }, { text: all }];
    return [{ text: all }];
  },

  markScheme(v) {
    const N = v.n1 + v.n2;
    const t1 = v.n1 * v.m1;
    const t2 = v.m2.mul(v.n2);
    const u = v.ctx.unit;
    const [, g2] = v.ctx.groups;
    if (v.level === 'stretch') {
      const T = overall(v).mul(N);
      return [
        [
          step('P1', `${int(N)} ${TIMES} ${dec(overall(v))} = ${dec(T)}`, `Total for everyone = mean × number of ${v.ctx.who}.`),
          step('P1', `${dec(T)} ${MINUS} ${v.n1} ${TIMES} ${int(v.m1)} = ${dec(T)} ${MINUS} ${int(t1)} = ${dec(t2)}`, `Take away the total for the first group to leave the total for ${g2}.`),
          step('A1', `${dec(t2)} ${DIV} ${v.n2} = ${dec(v.m2)} ${u}`, `Divide by the number of ${v.ctx.who} in ${g2}.`),
        ],
      ];
    }
    const fin = step('A1', `${int(t1 + t2.toInt())} ${DIV} ${int(N)} = ${shown(overall(v), v.exact)} ${u}`, v.exact ? 'Divide the grand total by the total number.' : 'Divide, then round to 1 decimal place.');
    if (v.level === 'foundational') {
      return [
        [step('B1', `${v.n1} ${TIMES} ${int(v.m1)} = ${int(t1)}`, 'Mean × number = total.')],
        [step('M1', `${int(t1)} + ${v.n2} ${TIMES} ${dec(v.m2)} = ${int(t1 + t2.toInt())}`, 'Find the total for the second group and add the two totals.'), fin],
      ];
    }
    return [
      [
        step('P1', `${v.n1} ${TIMES} ${int(v.m1)} = ${int(t1)} and ${v.n2} ${TIMES} ${dec(v.m2)} = ${dec(t2)}`, 'You cannot just average the two means: the groups are different sizes. Find each total first.'),
        step('P1', `(${int(t1)} + ${dec(t2)}) ${DIV} ${int(N)}`, `Add the totals and divide by all ${int(N)}.`),
        fin,
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Weighted mean via fractions of the whole group (a different formula).
    const w = Q.of(v.n1, v.n1 + v.n2);
    const mean = w.mul(v.m1).add(Q.of(1).sub(w).mul(v.m2));
    if (!mean.eq(overall(v))) p.push('weighted mean mismatch');
    if (v.level === 'stretch') {
      const back = mean.mul(v.n1 + v.n2).sub(v.n1 * v.m1).div(v.n2);
      if (answers[0].text !== `${dec(back)} ${v.ctx.unit}`) p.push('reverse');
    } else if (answers[answers.length - 1].text !== `${shown(mean, v.exact)} ${v.ctx.unit}`) p.push('overall');
    return p;
  },

  key: (v) => `${v.n1}|${v.n2}|${v.m1}|${v.m2}`,
});
