import { defineTemplate } from '../../engine/types';
import { box, lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, frac, money } from '../../engine/format';
import { Q, lcmInt } from '../../engine/rational';
import { names, possessive } from '../../contexts/names';

/**
 * Modelled on Set 24 2F Q9 (Divya and Yuan pay the same special-offer price,
 * find k) and Set 23 2F Q18 (deposit plus monthly payments). Foundational
 * compares two price plans and finds when they cost the same.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: string;
  b: string;
  item: { noun: string; lo: number; hi: number };
  // core / stretch: a pays normal price P with k% off
  P: number; // pounds
  k: number;
  // core: b pays normal price R with fraction f off
  R: number;
  f: Q;
  // stretch: b pays deposit + n monthly payments
  deposit: number;
  months: number;
  monthly: number;
  // foundational plans
  plan: { what: string; fee: number; perA: number; perB: number; same: number; ask: number };
}

const ITEMS = [
  { noun: 'holiday', lo: 600, hi: 3000 },
  { noun: 'laptop', lo: 300, hi: 1500 },
  { noun: 'sofa', lo: 400, hi: 2000 },
  { noun: 'bike', lo: 200, hi: 1200 },
];
const FRACTIONS = [Q.of(1, 4), Q.of(1, 5), Q.of(1, 3), Q.of(2, 5), Q.of(1, 10), Q.of(3, 10)];
const PLANS = ['gym membership', 'phone contract', 'swimming club membership', 'music streaming plan'];

const paidA = (v: V) => Q.of(v.P).mul(Q.of(100 - v.k, 100));

export default defineTemplate<V>({
  id: 'alg-equal-cost',
  title: 'Equal costs: find the unknown',
  strand: 'Algebra',
  subtopic: 'Forming & using formulae',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [a, b] = names(rng, 2);
    const item = rng.pick(ITEMS);
    const v: V = {
      level, a, b, item, P: 0, k: 0, R: 0, f: Q.of(0), deposit: 0, months: 0, monthly: 0,
      plan: { what: rng.pick(PLANS), fee: 0, perA: 0, perB: 0, same: 0, ask: 0 },
    };
    if (level === 'foundational') {
      const perA = rng.int(tier === 'KS3' ? 8 : 12, 40);
      const perB = perA + rng.int(2, tier === 'KS3' ? 6 : 12);
      const same = rng.int(4, 12);
      v.plan = { ...v.plan, perA, perB, same, fee: (perB - perA) * same, ask: rng.int(2, 12) };
      ensure(v.plan.ask !== same, 'ask about a different month');
      return v;
    }
    const friendly = calc === 'non-calc' || tier === 'KS3';
    if (level === 'stretch') {
      // Build the payments first, then choose a k that gives a whole-pound normal price.
      v.months = rng.pick([6, 10, 12, 18, 24]);
      v.monthly = friendly ? rng.step(10, 120, 5) : rng.int(8, 120);
      v.deposit = friendly ? rng.step(50, 600, 10) : rng.int(50, 600);
      const X = v.deposit + v.months * v.monthly;
      ensure(X >= item.lo * 0.5 && X <= item.hi, 'total out of range for this item');
      const ks = rng.shuffle(friendly ? [5, 10, 15, 20, 25, 30, 35, 40, 45] : Array.from({ length: 39 }, (_, i) => i + 6));
      const k = ks.find((kk) => (X * 100) % (100 - kk) === 0);
      ensure(k !== undefined, 'no k gives a whole normal price');
      v.k = k;
      v.P = (X * 100) / (100 - k);
      return v;
    }
    v.k = friendly ? rng.step(5, 45, 5) : rng.int(6, 44);
    // Price paid X: a whole number of pounds that gives whole-pound normal prices.
    const kq = Q.of(100 - v.k, 100);
    let unit = Number(kq.n); // X must be a multiple of the numerator of (1 − k/100)
    if (level === 'core') {
      v.f = rng.pick(FRACTIONS);
      unit = lcmInt(unit, Number(Q.of(1).sub(v.f).n));
    }
    const lo = Math.ceil((item.lo * 0.6) / unit);
    const hi = Math.floor((item.hi * 0.9) / unit);
    ensure(hi >= lo, 'no price fits');
    const X = rng.int(lo, hi) * unit;
    if (calc === 'non-calc') ensure(X % 5 === 0 || X % 3 === 0, 'keep prices friendly');
    v.P = Q.of(X).div(kq).toInt();
    v.R = Q.of(X).div(Q.of(1).sub(v.f)).toInt();
    ensure(v.R !== v.P, 'normal prices must differ');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      if (v.plan.fee <= 0 || v.plan.perB <= v.plan.perA) p.push('plan B must cost more per month');
      return p;
    }
    if (!paidA(v).isInt()) p.push('A pays a non-whole amount');
    if (v.k <= 0 || v.k >= 100) p.push('k out of range');
    if (v.level === 'core' && !Q.of(v.R).mul(Q.of(1).sub(v.f)).eq(paidA(v))) p.push('prices do not match');
    if (v.level === 'stretch' && v.deposit + v.months * v.monthly !== paidA(v).toInt()) p.push('payments do not match');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      const { what, fee, perA, perB, ask } = v.plan;
      return {
        stem: [
          ...lines(`${v.a} is choosing between two plans for a ${what}.`),
          box(`Plan A: joining fee ${money(fee * 100)}, then ${money(perA * 100)} each month`),
          box(`Plan B: no joining fee, ${money(perB * 100)} each month`),
        ],
        parts: [
          part('a', 2, text(`Work out the total cost of Plan A for ${ask} months.`)),
          part('b', 2, text(`After how many months will the total cost of Plan A be the same as the total cost of Plan B?`)),
        ],
      };
    }
    const offerA = box(`${possessive(v.a)} ${v.item.noun}`, `Normal price ${money(v.P * 100)}`, 'Special offer: $k$% off the normal price');
    const offerB =
      v.level === 'core'
        ? box(`${possessive(v.b)} ${v.item.noun}`, `Normal price ${money(v.R * 100)}`, `Special offer: ${frac(v.f)} off the normal price`)
        : box(`${possessive(v.b)} ${v.item.noun}`, `Deposit of ${money(v.deposit * 100)}`, `plus ${v.months} monthly payments of ${money(v.monthly * 100)}`);
    const intro = v.level === 'core' ? `${v.a} and ${v.b} each pay for a ${v.item.noun} at a special offer price.` : `${v.a} and ${v.b} each pay for a ${v.item.noun}.`;
    return {
      stem: [text(intro), offerA, offerB, text(`The amount that ${v.a} pays is the same as the amount that ${v.b} pays.`)],
      parts: [single(4, text('Work out the value of $k$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const { fee, perA, ask, same } = v.plan;
      return [{ text: money((fee + perA * ask) * 100) }, { text: `${same} months` }];
    }
    return [{ text: `$k$ = ${v.k}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const { fee, perA, perB, ask, same } = v.plan;
      return [
        [
          step('M1', `${money(fee * 100)} + ${ask} ${TIMES} ${money(perA * 100)}`, 'Pay the joining fee once, plus the monthly cost for every month.'),
          step('A1', `= ${money((fee + perA * ask) * 100)}`, 'Include the £ sign.'),
        ],
        [
          step('M1', `Plan B costs ${money((perB - perA) * 100)} more each month; ${money(fee * 100)} ${DIV} ${money((perB - perA) * 100)}`, 'Plan B catches up by the difference every month, until it has made up the joining fee. (A table of totals works too.)'),
          step('A1', `${same} months`, `Check: Plan A ${money((fee + perA * same) * 100)}, Plan B ${money(perB * same * 100)}`),
        ],
      ];
    }
    const X = paidA(v).toInt();
    const first =
      v.level === 'core'
        ? step('P1', `${frac(v.f)} of ${money(v.R * 100)} = ${money(v.f.mul(v.R).mul(100).toInt())}, so ${v.b} pays ${money(v.R * 100)} ${MINUS} ${money(v.f.mul(v.R).mul(100).toInt())} = ${money(X * 100)}`, `Work out what ${v.b} actually pays.`)
        : step('P1', `${money(v.deposit * 100)} + ${v.months} ${TIMES} ${money(v.monthly * 100)} = ${money(X * 100)}`, `${v.b} pays the deposit plus all of the monthly payments.`);
    return [
      [
        first,
        step('P1', `${money(v.P * 100)} ${MINUS} ${money(X * 100)} = ${money((v.P - X) * 100)} off`, `So ${v.a} must also pay ${money(X * 100)}. Find how much was taken off.`),
        step('P1', `${money((v.P - X) * 100)} ${DIV} ${money(v.P * 100)} ${TIMES} 100`, 'Write the reduction as a percentage of the normal price.'),
        step('A1', `$k$ = ${v.k}`, `Check: ${v.k}% off ${money(v.P * 100)} gives ${money(X * 100)}`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Brute force: first month where the totals are equal.
      const { fee, perA, perB } = v.plan;
      let m = 1;
      while (fee + perA * m !== perB * m && m < 100) m++;
      if (answers[1].text !== `${m} months`) p.push('months');
      return p;
    }
    const bPays = v.level === 'core' ? Q.of(v.R).sub(v.f.mul(v.R)) : Q.of(v.deposit + v.months * v.monthly);
    // Solve P(1 − k/100) = bPays for k.
    const k = Q.of(1).sub(bPays.div(v.P)).mul(100);
    if (!k.eq(v.k)) p.push(`k recomputed as ${k}`);
    if (answers[0].text !== `$k$ = ${k.toString()}`) p.push('answer text');
    return p;
  },

  key: (v) => `${v.k}|${v.P}|${v.R}|${v.f}|${v.deposit}|${v.monthly}|${JSON.stringify(v.plan)}`,
});
