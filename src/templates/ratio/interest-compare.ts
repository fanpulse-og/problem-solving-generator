import { defineTemplate } from '../../engine/types';
import { box, lines, part, single, step, text, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money } from '../../engine/format';
import { Q, roundQ } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 2F Q19 / 2H Q6 (invest £5000 for two years in Bank G or
 * Bank H: how much more interest?), Set 24 2F Q15a (compound interest) and
 * Set 22 2F Q17 (car depreciates 15% a year). Stretch: after how many years
 * does the value first fall below a target?
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  P: number; // £
  rG: Q; // compound % per year
  rH: Q; // simple % per year
  years: number;
  // stretch
  item: string;
  start: number; // £
  dep: number; // % per year
  target: number; // £
}

const compound = (P: number, r: Q, n: number) => {
  let v = Q.of(P);
  for (let i = 0; i < n; i++) v = v.mul(Q.of(1).add(r.div(100)));
  return v;
};
const simpleInterest = (P: number, r: Q, n: number) => Q.of(P).mul(r).div(100).mul(n);

/** Money to the nearest penny, flagging whether rounding was needed. */
function penny(q: Q): { text: string; rounded: boolean } {
  const r = roundQ(q, 2);
  return { text: money(r.mul(100).toInt()), rounded: !r.eq(q) };
}

function nearHalfPenny(q: Q): boolean {
  const pence = q.mul(100);
  const frac = pence.sub(Q.of(pence.floor()));
  return Math.abs(frac.toNumber() - 0.5) < 0.001;
}

function yearsBelow(v: V): number {
  let val = Q.of(v.start);
  let n = 0;
  while (!val.lt(v.target)) {
    val = val.mul(Q.of(100 - v.dep, 100));
    n++;
  }
  return n;
}

export default defineTemplate<V>({
  id: 'ratio-interest-compare',
  title: 'Compound and simple interest',
  strand: 'Ratio & Proportion',
  subtopic: 'Percentages',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'measures' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [name] = names(rng, 1);
    const base = { level, name, P: 0, rG: Q.of(0), rH: Q.of(0), years: 2, item: '', start: 0, dep: 0, target: 0 };
    if (level === 'stretch') {
      const item = rng.pick(['car', 'van', 'motorbike', 'boat']);
      const start = rng.step(8000, 40000, 500);
      const dep = rng.int(8, 25);
      const target = rng.step(Math.round(start * 0.25), Math.round(start * 0.7), 500);
      const v = { ...base, item, start, dep, target };
      const n = yearsBelow(v);
      ensure(n >= 3 && n <= 9, 'sensible number of years');
      // Not too close to the target in the deciding years.
      const m = Q.of(100 - dep, 100);
      const before = Q.of(start).mul(powQ(m, n - 1)).toNumber();
      const at = Q.of(start).mul(powQ(m, n)).toNumber();
      ensure(Math.abs(before - target) / target > 0.01 && Math.abs(at - target) / target > 0.01, 'not borderline');
      return v;
    }
    const P = rng.step(1000, 20000, 500);
    const rG = Q.of(rng.int(15, 60), 10); // 1.5% to 6%
    const rH = level === 'core' ? rG.add(Q.of(rng.int(-5, 5), 10)) : Q.of(rng.int(15, 60), 10);
    const years = level === 'foundational' ? rng.int(2, 4) : 2;
    const v = { ...base, P, rG, rH, years };
    if (level === 'core') {
      // Compound at the lower rate must still beat simple at the higher rate.
      const g = compound(P, rG, 2).sub(P);
      const h = simpleInterest(P, rH, 2);
      ensure(g.sub(h).gt(5) && g.sub(h).lt(400), 'G must pay a worthwhile amount more');
      ensure(rH.isPositive(), 'positive rate');
      ensure(!nearHalfPenny(g.sub(h)), 'avoid half-penny rounding');
    } else ensure(!nearHalfPenny(compound(P, rG, 2)), 'avoid half-penny rounding');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level !== 'stretch' && (v.P <= 0 || !v.rG.isPositive())) p.push('positive amounts');
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: lines(`${v.name} buys a ${v.item} for £${int(v.start)}`, `The value of the ${v.item} decreases by ${v.dep}% each year.`),
        parts: [single(3, text(`After how many whole years will the value of the ${v.item} first be less than £${int(v.target)}?`), text('You must show your working.'))],
      };
    }
    if (v.level === 'foundational') {
      const amt = penny(compound(v.P, v.rG, 2));
      return {
        stem: [text(`${v.name} is going to invest £${int(v.P)}`)],
        parts: [
          part('a', 2, text(`Bank H pays ${dec(v.rH)}% simple interest each year.`), text(`Work out the total interest ${v.name} would get from Bank H after ${v.years} years.`)),
          part('b', 2, text(`Bank G pays ${dec(v.rG)}% compound interest each year.`), text(`Work out how much money ${v.name} would have in Bank G at the end of 2 years.`), ...(amt.rounded ? [text('Give your answer to the nearest penny.')] : [])),
        ],
      };
    }
    const diff = penny(compound(v.P, v.rG, 2).sub(v.P).sub(simpleInterest(v.P, v.rH, 2)));
    return {
      stem: [
        text(`${v.name} is going to invest £${int(v.P)} for 2 years.`),
        text(`${v.name} can invest the money in Bank G or in Bank H.`),
        box('Bank G', `${dec(v.rG)}% per year compound interest`),
        box('Bank H', `${dec(v.rH)}% per year simple interest`),
        text(`The total interest ${v.name} would get from Bank G is more than the total interest from Bank H.`),
      ],
      parts: [single(4, text('How much more?'), ...(diff.rounded ? [text('Give your answer to the nearest penny.')] : []))],
    };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: `${yearsBelow(v)} years` }];
    if (v.level === 'foundational') return [{ text: penny(simpleInterest(v.P, v.rH, v.years)).text }, { text: penny(compound(v.P, v.rG, 2)).text }];
    return [{ text: penny(compound(v.P, v.rG, 2).sub(v.P).sub(simpleInterest(v.P, v.rH, 2))).text }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const m = Q.of(100 - v.dep, 100);
      const n = yearsBelow(v);
      const fmt = (k: number) => `£${int(Q.of(v.start).mul(powQ(m, k)).floor())}`;
      return [
        [
          step('M1', `Multiplier = 1 − ${dec(Q.of(v.dep, 100))} = ${dec(m)}`, `Losing ${v.dep}% leaves ${100 - v.dep}% each year.`),
          step('M1', `After ${n - 1} years: £${int(v.start)} ${TIMES} $${dec(m)}^{${n - 1}}$ = ${fmt(n - 1)}…  After ${n} years: ${fmt(n)}…`, 'Keep multiplying by the multiplier until the value drops below the target.'),
          step('A1', `${n} years`, `After ${n - 1} years it is still at least £${int(v.target)}, so the answer is ${n}.`),
        ],
      ];
    }
    const g2 = compound(v.P, v.rG, 2);
    const mG = Q.of(1).add(v.rG.div(100));
    if (v.level === 'foundational') {
      const si = simpleInterest(v.P, v.rH, v.years);
      return [
        [step('M1', `${dec(v.rH)}% of £${int(v.P)} = ${penny(si.div(v.years)).text} per year, ${TIMES} ${v.years}`, 'Simple interest is the same amount every year.'), step('A1', penny(si).text, 'This is the interest only.')],
        [step('M1', `£${int(v.P)} ${TIMES} ${dec(mG)}²`, `Compound interest: multiply by ${dec(mG)} once for each year.`), step('A1', penny(g2).text, 'This is the total in the account, not just the interest.')],
      ];
    }
    const gi = g2.sub(v.P);
    const hi = simpleInterest(v.P, v.rH, 2);
    return [
      [
        step('P1', `Bank G: £${int(v.P)} ${TIMES} ${dec(mG)}² = ${penny(g2).text}`, `Compound: multiply by ${dec(mG)} for each of the 2 years.`),
        step('P1', `Interest from G: ${penny(g2).text} ${MINUS} £${int(v.P)} = ${penny(gi).text}`, 'Subtract what was put in to get just the interest.'),
        step('P1', `Bank H: ${dec(v.rH)}% of £${int(v.P)} ${TIMES} 2 = ${penny(hi).text}`, 'Simple interest: the same amount each year.'),
        step('A1', `${penny(gi).text} ${MINUS} ${penny(hi).text} = ${penny(gi.sub(hi)).text}`, 'Compare interest with interest.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Year by year, subtracting the percentage (not using a multiplier).
      let val = Q.of(v.start);
      let n = 0;
      while (val.cmp(v.target) >= 0) {
        val = val.sub(val.mul(v.dep).div(100));
        n++;
      }
      if (answers[0].text !== `${n} years`) p.push('years');
      return p;
    }
    // Add the interest year by year.
    let g = Q.of(v.P);
    for (let y = 0; y < 2; y++) g = g.add(g.mul(v.rG).div(100));
    let h = Q.of(0);
    for (let y = 0; y < (v.level === 'foundational' ? v.years : 2); y++) h = h.add(Q.of(v.P).mul(v.rH).div(100));
    if (v.level === 'foundational') {
      if (answers[0].text !== penny(h).text || answers[1].text !== penny(g).text) p.push('foundational');
    } else if (answers[0].text !== penny(g.sub(v.P).sub(h)).text) p.push('difference');
    return p;
  },

  key: (v) => `${v.P}|${v.rG}|${v.rH}|${v.years}|${v.start}|${v.dep}|${v.target}`,
});

function powQ(q: Q, n: number): Q {
  let r = Q.of(1);
  for (let i = 0; i < n; i++) r = r.mul(q);
  return r;
}

