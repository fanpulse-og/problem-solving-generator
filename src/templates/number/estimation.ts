import { defineTemplate, type Tier } from '../../engine/types';
import { part, single, step, text, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Estimating by rounding each number to 1 significant figure: a calculation
 * (Practice), an estimate in context with "overestimate or underestimate?"
 * (Apply), and using an estimate to make a decision (Extend).
 * check() rounds with its own digit-by-digit method and, for the decision,
 * confirms the exact cost agrees with the estimate.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: Tier;
  name: string;
  ctx: number;
  // All values in hundredths, so 3.87 is 387.
  a: number;
  b: number;
  c: number;
  budget: number; // pounds (stretch)
}

const CORE: { intro: () => string; thing: string; ask: string }[] = [
  { intro: () => 'A cinema sells {a} tickets in one day.', thing: 'Each ticket costs {b}', ask: 'the total amount paid for the tickets' },
  { intro: () => 'A club sells {a} programmes at a football match.', thing: 'Each programme costs {b}', ask: 'the total amount paid for the programmes' },
  { intro: () => 'A café sells {a} sandwiches in one week.', thing: 'Each sandwich costs {b}', ask: 'the total amount paid for the sandwiches' },
  { intro: () => 'A ferry carries {a} cars in one day.', thing: 'The charge for each car is {b}', ask: 'the total amount charged for the cars' },
];
const FLOORS = ['a rectangular patio', 'a rectangular kitchen floor', 'a rectangular lawn', 'a rectangular hall floor'];
const COVER = ['paving', 'tiles', 'turf', 'carpet'];

/** Round a positive number of hundredths to 1 significant figure (still in hundredths). */
function oneSf(h: number): number {
  let unit = 1;
  while (h / unit >= 10) unit *= 10;
  return Math.round(h / unit) * unit;
}
const show = (h: number) => dec(Q.of(h, 100));
const r = (h: number) => Q.of(oneSf(h), 100);
const estimate = (v: V) => (v.level === 'foundational' ? r(v.a).mul(r(v.b)).div(r(v.c)) : v.level === 'core' ? r(v.a).mul(r(v.b)) : r(v.a).mul(r(v.b)).mul(r(v.c)));
const exact = (v: V) => Q.of(v.a, 100).mul(Q.of(v.b, 100)).mul(Q.of(v.c, 100));
const up = (h: number) => oneSf(h) > h;

export default defineTemplate<V>({
  id: 'num-estimation',
  title: 'Estimating by rounding',
  strand: 'Number',
  subtopic: 'Bounds & accuracy',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const off = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base = { level, tier, name, ctx: 0, budget: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 9) * 1000 + off(1, 49) * 10;
      const b = rng.int(2, 9) * 100 + off(3, 45);
      const [c0, lo, hi] = rng.pick(tier === 'KS3' ? [[200, 8, 24], [500, 8, 45]] : [[50, 1, 4], [20, 1, 3], [200, 8, 24], [500, 8, 45]]);
      const v = { ...base, a, b, c: c0 + off(lo, hi) };
      ensure(b % 10 !== 0 && estimate(v).isInt() && estimate(v).toInt() >= 10, 'a whole-number estimate');
      return v;
    }
    if (level === 'core') {
      const dir = rng.pick([1, -1]);
      const a = (rng.int(2, 9) * 100 + dir * rng.int(4, 45)) * 100;
      const b = rng.int(2, 9) * 100 + dir * rng.int(5, 45);
      ensure(b % 10 !== 0, 'a price in pounds and pence');
      return { ...base, ctx: rng.int(0, CORE.length - 1), a, b, c: 0 };
    }
    // Length × width × price per square metre against a budget.
    const a = rng.int(3, 9) * 100 + off(1, 4) * 10;
    const b = rng.int(2, 6) * 100 + off(1, 4) * 10;
    const c = rng.int(1, 4) * 1000 + off(5, 45) * 10 + rng.pick([0, 5]);
    const v = { ...base, ctx: rng.int(0, FLOORS.length - 1), a, b, c };
    const est = estimate(v).toInt();
    const budget = Math.round((est * (1 + rng.pick([-1, 1]) * rng.pick([0.12, 0.15, 0.2, 0.25]))) / 10) * 10;
    ensure(a > b && Math.abs(budget - est) >= 0.1 * est, 'a clear decision');
    // The exact cost must lead to the same decision, comfortably.
    const real = exact(v).toNumber();
    ensure(real < budget === est < budget && Math.abs(real - budget) >= 0.05 * budget, 'the estimate and the exact cost agree');
    return { ...v, budget };
  },

  validate(v) {
    return v.a > 0 && v.b > 0 ? [] : ['positive values'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return { stem: [], parts: [single(3, text(`Work out an estimate for the value of  $\\dfrac{${show(v.a)} \\times ${show(v.b)}}{${show(v.c)}}$`))] };
    }
    if (v.level === 'core') {
      const c = CORE[v.ctx];
      const fill = (s: string) => s.replace('{a}', int(v.a / 100)).replace('{b}', money(v.b, true));
      return {
        stem: [text(fill(c.intro())), text(fill(c.thing))],
        parts: [part('a', 2, text(`Work out an estimate for ${c.ask}.`)), part('b', 1, text('Is your answer to part (a) an underestimate or an overestimate?'), text('Give a reason for your answer.'))],
      };
    }
    return {
      stem: [
        text(`${v.name} is going to cover ${FLOORS[v.ctx]} with ${COVER[v.ctx]}.`),
        text(`The ${FLOORS[v.ctx].replace('a rectangular ', '')} is ${show(v.a)} m long and ${show(v.b)} m wide.`),
        text(`The ${COVER[v.ctx]} costs ${money(v.c, true)} per square metre.`),
        text(`${v.name} has ${money(v.budget * 100)} to spend.`),
      ],
      parts: [single(4, text(`By estimating, decide whether ${v.name} is likely to have enough money.`), text('You must show all your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: int(estimate(v).toInt()) }];
    if (v.level === 'core') {
      return [{ text: money(estimate(v).mul(100).toInt()) }, { text: `${up(v.a) ? 'Overestimate' : 'Underestimate'}, because both numbers were rounded ${up(v.a) ? 'up' : 'down'}` }];
    }
    const est = estimate(v).toInt();
    return [{ text: `${est < v.budget ? 'Yes' : 'No'}, the estimated cost is ${money(est * 100)}, which is ${est < v.budget ? 'less' : 'more'} than ${money(v.budget * 100)}` }];
  },

  markScheme(v) {
    const R = (h: number) => show(oneSf(h));
    if (v.level === 'foundational') {
      const topv = r(v.a).mul(r(v.b));
      return [
        [
          step('M1', `${R(v.a)} or ${R(v.b)} or ${R(v.c)}`, 'Round each number to 1 significant figure.'),
          step('M1', `$\\dfrac{${R(v.a)} \\times ${R(v.b)}}{${R(v.c)}} = \\dfrac{${dec(topv)}}{${R(v.c)}}$`, 'Use all three rounded values.'),
          step('A1', int(estimate(v).toInt()), oneSf(v.c) < 100 ? `Dividing by ${R(v.c)} is the same as multiplying by ${dec(Q.of(100, oneSf(v.c)))}.` : 'Now divide.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const tot = estimate(v);
      const calc = `${R(v.a)} ${TIMES} ${R(v.b)}`;
      return [
        [step('M1', calc, `Round to 1 significant figure: ${int(v.a / 100)} is about ${R(v.a)}, and ${money(v.b, true)} is about £${R(v.b)}.`), step('A1', money(tot.mul(100).toInt()), 'An estimate uses the rounded values, not the exact ones.')],
        [step('C1', `${up(v.a) ? 'Overestimate' : 'Underestimate'}, because both numbers were rounded ${up(v.a) ? 'up' : 'down'}`, 'Say which way you rounded. Just writing the word is not enough for the mark.')],
      ];
    }
    const est = estimate(v).toInt();
    const areaEst = r(v.a).mul(r(v.b)).toInt();
    return [
      [
        step('M1', `${R(v.a)}, ${R(v.b)} and ${R(v.c)}`, 'Round each number to 1 significant figure.'),
        step('M1', `${R(v.a)} ${TIMES} ${R(v.b)} = ${areaEst} m²`, 'Estimate the area: length × width.'),
        step('M1', `${areaEst} ${TIMES} ${R(v.c)} = ${int(est)}`, 'Estimate the cost: area × cost per square metre.'),
        step('C1', `${est < v.budget ? 'Yes' : 'No'}, ${money(est * 100)} is ${est < v.budget ? 'less' : 'more'} than ${money(v.budget * 100)}`, 'Give a decision AND the figures you compared.'),
      ],
    ];
  },

  check(v, answers) {
    // Round each value with JavaScript's own significant-figure rounding.
    const sf = (h: number) => Number((h / 100).toPrecision(1));
    const near = (x: number, y: number) => Math.abs(x - y) < 1e-6;
    const first = Number(answers[0].text.replace(/[^\d.]/g, ''));
    if (v.level === 'foundational') return near(first, (sf(v.a) * sf(v.b)) / sf(v.c)) ? [] : ['estimate'];
    if (v.level === 'core') {
      const want = sf(v.a) * sf(v.b);
      const dirs = [sf(v.a) > v.a / 100, sf(v.b) > v.b / 100];
      if (dirs[0] !== dirs[1]) return ['mixed rounding'];
      return near(first, want) && answers[1].text.startsWith(dirs[0] ? 'Over' : 'Under') ? [] : ['estimate or direction'];
    }
    const est = sf(v.a) * sf(v.b) * sf(v.c);
    const real = (v.a * v.b * v.c) / 1e6;
    const yes = answers[0].text.startsWith('Yes');
    return yes === est < v.budget && yes === real < v.budget && answers[0].text.includes(money(Math.round(est) * 100)) ? [] : ['decision'];
  },

  key: (v) => `${v.level}|${v.a}|${v.b}|${v.c}|${v.budget}`,
});
