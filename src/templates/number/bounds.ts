import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, roundDp } from '../../engine/format';
import { Q, roundQ } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 2H Q13 (2.75 kg correct to 2 d.p.: bounds), Set 22 2H
 * Q18 (Kaidan and Sonja: "my average speed could have been greater") and
 * Set 23 2H Q19 (a = (v − u)/t to a suitable degree of accuracy).
 * All bounds are exact fractions.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  names: string[];
  // foundational
  value: Q;
  dp: number;
  item: string;
  count: number;
  // core: two journeys, each distance (to nearest `dStep`) and time (to `tStep` hours)
  d: [number, number];
  dStep: [number, number];
  t: [Q, Q];
  tStep: [Q, Q];
  // stretch: a = (v − u) / t
  v: Q;
  u: Q;
  tt: Q;
}

const half = (step: Q | number) => Q.of(step).div(2);
const lb = (x: Q | number, step: Q | number) => Q.of(x).sub(half(step));
const ub = (x: Q | number, step: Q | number) => Q.of(x).add(half(step));

/** Largest accuracy (dp 2, 1, 0, then 10s) at which both bounds round the same. */
function suitable(lo: Q, hi: Q): { label: string; value: string } | null {
  for (const dp of [3, 2, 1, 0]) {
    if (roundQ(lo, dp).eq(roundQ(hi, dp))) return { label: dp === 0 ? 'to the nearest whole number' : `to ${dp} decimal place${dp === 1 ? '' : 's'}`, value: roundDp(lo, dp) };
  }
  return null;
}

const ITEMS = [
  ['cake', 'kg'],
  ['bag of flour', 'kg'],
  ['parcel', 'kg'],
  ['plank of wood', 'm'],
] as const;

export default defineTemplate<V>({
  id: 'num-bounds',
  title: 'Upper and lower bounds',
  strand: 'Number',
  subtopic: 'Bounds & accuracy',
  tiers: ['H'],
  // Not in the Foundation specification (calculating with upper and lower bounds is Higher only, N16); old Foundation links still open.
  formerTiers: ['F'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  styleByLevel: { foundational: 'multi-step' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, names: names(rng, 2), value: Q.of(0), dp: 0, item: '', count: 0, d: [0, 0], dStep: [1, 1], t: [Q.of(0), Q.of(0)], tStep: [Q.of(1), Q.of(1)], v: Q.of(0), u: Q.of(0), tt: Q.of(0) };
    if (level === 'foundational') {
      const dp = rng.pick([1, 2]);
      const [item] = rng.pick(ITEMS);
      const value = Q.of(rng.int(110, 950), 10 ** dp);
      ensure(!value.mul(10 ** (dp - 1)).isInt() || dp === 1, 'last digit not zero');
      return { ...base, value, dp, item, count: rng.pick([6, 8, 10, 12, 20, 25]) };
    }
    if (level === 'core') {
      // Journey A looks slower, but its fastest possible speed beats B's slowest.
      const dStep: [number, number] = [rng.pick([5, 10]), rng.pick([1, 2])];
      const tStep: [Q, Q] = [Q.of(1, 10), Q.of(1, 10)];
      const dA = rng.step(40, 150, dStep[0]);
      const tA = Q.of(rng.int(12, 40), 10);
      const sA = Q.of(dA).div(tA);
      const tB = Q.of(rng.int(8, 30), 10);
      const dB = Math.round(sA.mul(tB).toNumber() * (1 + rng.int(2, 6) / 100));
      const v = { ...base, d: [dA, dB] as [number, number], dStep, t: [tA, tB] as [Q, Q], tStep };
      const maxA = ub(dA, dStep[0]).div(lb(tA, tStep[0]));
      const minB = lb(dB, dStep[1]).div(ub(tB, tStep[1]));
      ensure(Q.of(dA).div(tA).lt(Q.of(dB).div(tB)), 'A looks slower');
      ensure(maxA.gt(minB), 'but A could be faster');
      ensure(dB % dStep[1] === 0, 'B distance to its accuracy');
      return v;
    }
    const vv = Q.of(rng.int(2500, 6000), 100);
    const u = Q.of(rng.int(100, 1500), 100);
    const tt = Q.of(rng.int(25, 99), 10);
    ensure(!tt.isInt(), 'avoid t = 9.0, which reads oddly');
    const v = { ...base, v: vv, u, tt };
    const lo = vv.sub(Q.of(5, 1000)).sub(u.add(Q.of(5, 1000))).div(tt.add(Q.of(5, 100)));
    const hi = vv.add(Q.of(5, 1000)).sub(u.sub(Q.of(5, 1000))).div(tt.sub(Q.of(5, 100)));
    const s = suitable(lo, hi);
    ensure(s !== null && !s.label.includes('3'), 'a suitable accuracy of 2 d.p. or less');
    ensure(!s!.value.endsWith('.0') && s!.value !== '0', 'tidy final value');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'stretch' && !v.v.gt(v.u)) p.push('v must exceed u');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      const unit = ITEMS.find((i) => i[0] === v.item)![1];
      return {
        stem: [text(`The ${unit === 'm' ? 'length' : 'weight'} of a ${v.item} is ${dec(v.value, v.dp)} ${unit}, correct to ${v.dp} decimal place${v.dp === 1 ? '' : 's'}.`)],
        parts: [
          part('a', 1, text(`Write down the lower bound of the ${unit === 'm' ? 'length' : 'weight'} of the ${v.item}.`)),
          part('b', 1, text(`Write down the upper bound of the ${unit === 'm' ? 'length' : 'weight'} of the ${v.item}.`)),
          part('c', 2, text(`There are ${v.count} of these ${v.item === 'bag of flour' ? 'bags of flour' : `${v.item}s`}, each with this ${unit === 'm' ? 'length' : 'weight'} to the same accuracy.`), text(`Work out the greatest possible total ${unit === 'm' ? 'length' : 'weight'}.`)),
        ],
      };
    }
    if (v.level === 'core') {
      const [a, b] = v.names;
      return {
        stem: [
          ...lines(`${a} and ${b} went on two different car journeys.`, `For ${a}’s journey`, `distance = ${v.d[0]} km correct to the nearest ${v.dStep[0]} km`, `time = ${dec(v.t[0], 1)} hours correct to 1 decimal place`, `For ${b}’s journey`, `distance = ${v.d[1]} km correct to the nearest ${v.dStep[1] === 1 ? 'kilometre' : `${v.dStep[1]} km`}`, `time = ${dec(v.t[1], 1)} hours correct to 1 decimal place`),
          text(`${a} says, “My average speed could have been greater than ${b}’s average speed.”`),
        ],
        parts: [single(4, text(`By considering bounds, show that ${a} is correct.`), text('Show your working clearly.'))],
      };
    }
    return {
      stem: [
        text('The acceleration, $a$, of an object is given by $a = \\frac{v - u}{t}$'),
        ...lines(`$v$ = ${dec(v.v, 2)} correct to 2 decimal places`, `$u$ = ${dec(v.u, 2)} correct to 2 decimal places`, `$t$ = ${dec(v.tt, 1)} correct to 2 significant figures`),
      ],
      parts: [single(5, text('By considering bounds, work out the value of $a$ to a suitable degree of accuracy.'), text('You must give a reason for your answer.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const step = Q.of(1, 10 ** v.dp);
      return [{ text: dec(lb(v.value, step)) }, { text: dec(ub(v.value, step)) }, { text: dec(ub(v.value, step).mul(v.count)) }];
    }
    if (v.level === 'core') {
      const maxA = ub(v.d[0], v.dStep[0]).div(lb(v.t[0], v.tStep[0]));
      const minB = lb(v.d[1], v.dStep[1]).div(ub(v.t[1], v.tStep[1]));
      return [{ text: `Greatest speed for ${v.names[0]} ≈ ${roundDp(maxA, 2)} km/h > least speed for ${v.names[1]} ≈ ${roundDp(minB, 2)} km/h` }];
    }
    const { lo, hi } = stretchBounds(v);
    const s = suitable(lo, hi)!;
    return [{ text: `$a$ = ${s.value} (both bounds round to ${s.value} ${s.label})` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const step = Q.of(1, 10 ** v.dp);
      return [
        [step_('B1', dec(lb(v.value, step)), `Half of ${dec(step)} below.`)],
        [step_('B1', dec(ub(v.value, step)), `Half of ${dec(step)} above.`)],
        [step_('M1', `${v.count} ${TIMES} ${dec(ub(v.value, step))}`, 'Greatest total comes from the upper bound of each one.'), step_('A1', dec(ub(v.value, step).mul(v.count)), 'Give the full value; there is no need to round.')],
      ];
    }
    if (v.level === 'core') {
      const [a, b] = v.names;
      const maxA = ub(v.d[0], v.dStep[0]).div(lb(v.t[0], v.tStep[0]));
      const minB = lb(v.d[1], v.dStep[1]).div(ub(v.t[1], v.tStep[1]));
      return [
        [
          step_('P1', `${a}: distance ${dec(lb(v.d[0], v.dStep[0]))} to ${dec(ub(v.d[0], v.dStep[0]))}, time ${dec(lb(v.t[0], v.tStep[0]))} to ${dec(ub(v.t[0], v.tStep[0]))}; ${b}: distance ${dec(lb(v.d[1], v.dStep[1]))} to ${dec(ub(v.d[1], v.dStep[1]))}, time ${dec(lb(v.t[1], v.tStep[1]))} to ${dec(ub(v.t[1], v.tStep[1]))}`, 'Write down all the bounds first.'),
          step_('P1', `${a}’s greatest speed = ${dec(ub(v.d[0], v.dStep[0]))} ${DIV} ${dec(lb(v.t[0], v.tStep[0]))} = ${approx(maxA)}`, 'Greatest speed: biggest distance ÷ smallest time.'),
          step_('P1', `${b}’s least speed = ${dec(lb(v.d[1], v.dStep[1]))} ${DIV} ${dec(ub(v.t[1], v.tStep[1]))} = ${approx(minB)}`, 'Least speed: smallest distance ÷ biggest time.'),
          step_('C1', `${roundDp(maxA, 2)} > ${roundDp(minB, 2)}, so ${a} could have been faster`, 'Compare and conclude in words.'),
        ],
      ];
    }
    const { lo, hi } = stretchBounds(v);
    const s = suitable(lo, hi)!;
    return [
      [
        step_('B1', `$v$: ${dec(v.v.sub(Q.of(5, 1000)))} to ${dec(v.v.add(Q.of(5, 1000)))}, $u$: ${dec(v.u.sub(Q.of(5, 1000)))} to ${dec(v.u.add(Q.of(5, 1000)))}, $t$: ${dec(v.tt.sub(Q.of(5, 100)))} to ${dec(v.tt.add(Q.of(5, 100)))}`, 'Bounds of each measurement.'),
        step_('M1', `UB of $a$ = (${dec(v.v.add(Q.of(5, 1000)))} ${MINUS} ${dec(v.u.sub(Q.of(5, 1000)))}) ${DIV} ${dec(v.tt.sub(Q.of(5, 100)))}`, 'Largest top ÷ smallest bottom. The top is largest when u is smallest.'),
        step_('M1', `LB of $a$ = (${dec(v.v.sub(Q.of(5, 1000)))} ${MINUS} ${dec(v.u.add(Q.of(5, 1000)))}) ${DIV} ${dec(v.tt.add(Q.of(5, 100)))}`, 'Smallest top ÷ largest bottom.'),
        step_('A1', `UB = ${approx(hi, 4)}, LB = ${approx(lo, 4)}`, 'Work out both bounds.'),
        step_('C1', `$a$ = ${s.value}, because both bounds round to ${s.value} ${s.label}`, 'Give the value that both bounds agree on, and say why.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Brute-force the extremes over all eight corner combinations.
      const vs = [v.v.sub(Q.of(5, 1000)), v.v.add(Q.of(5, 1000))];
      const us = [v.u.sub(Q.of(5, 1000)), v.u.add(Q.of(5, 1000))];
      const ts = [v.tt.sub(Q.of(5, 100)), v.tt.add(Q.of(5, 100))];
      const vals = vs.flatMap((a) => us.flatMap((b) => ts.map((c) => a.sub(b).div(c))));
      const lo = vals.reduce((m, x) => (x.lt(m) ? x : m));
      const hi = vals.reduce((m, x) => (x.gt(m) ? x : m));
      const s = suitable(lo, hi);
      if (!s || !answers[0].text.startsWith(`$a$ = ${s.value} `)) p.push('suitable value');
    } else if (v.level === 'core') {
      const corners = (d: number, ds: number, t: Q, ts: Q) => [lb(d, ds), ub(d, ds)].flatMap((dd) => [lb(t, ts), ub(t, ts)].map((tt) => dd.div(tt)));
      const maxA = corners(v.d[0], v.dStep[0], v.t[0], v.tStep[0]).reduce((m, x) => (x.gt(m) ? x : m));
      const minB = corners(v.d[1], v.dStep[1], v.t[1], v.tStep[1]).reduce((m, x) => (x.lt(m) ? x : m));
      if (!maxA.gt(minB)) p.push('claim false');
    } else {
      const step = Q.of(1, 10 ** v.dp);
      if (answers[2].text !== dec(v.value.add(step.div(2)).mul(v.count))) p.push('total');
    }
    return p;
  },

  key: (v) => `${v.value}|${v.dp}|${v.count}|${v.d}|${v.t}|${v.v}|${v.u}|${v.tt}`,
});

function stretchBounds(v: V): { lo: Q; hi: Q } {
  const lo = v.v.sub(Q.of(5, 1000)).sub(v.u.add(Q.of(5, 1000))).div(v.tt.add(Q.of(5, 100)));
  const hi = v.v.add(Q.of(5, 1000)).sub(v.u.sub(Q.of(5, 1000))).div(v.tt.sub(Q.of(5, 100)));
  return { lo, hi };
}

const step_ = step;
