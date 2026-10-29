import { defineTemplate } from '../../engine/types';
import { box, lines, single, step, table, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Best buys, in the "decide & justify" style of the papers (compare like with
 * like, then conclude). Stretch compares two shops' offers for a given number
 * of items.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  product: (typeof PRODUCTS)[number];
  sizes: number[]; // items (foundational) or grams/ml (core)
  prices: number[]; // pence
  // stretch
  each: [number, number]; // pence per item at shop A and shop B
  offerA: 'buy3get1' | 'threeForTwo';
  offB: number; // % off at shop B
  need: number;
}

const PRODUCTS = [
  { name: 'cereal', unit: 'g', item: 'pack' },
  { name: 'washing-up liquid', unit: 'ml', item: 'bottle' },
  { name: 'orange juice', unit: 'ml', item: 'carton' },
  { name: 'rice', unit: 'g', item: 'bag' },
] as const;
const ITEMS = ['pens', 'cans of drink', 'bread rolls', 'tennis balls', 'cupcakes'];

const unit = (v: V, i: number) => Q.of(v.prices[i], v.sizes[i]);
function costA(v: V): number {
  const per = v.offerA === 'buy3get1' ? 4 : 3; // items per deal
  const pay = v.offerA === 'buy3get1' ? 3 : 2; // items paid for per deal
  const deals = Math.floor(v.need / per);
  return (deals * pay + (v.need - deals * per)) * v.each[0];
}
const costB = (v: V) => Q.of(v.need * v.each[1] * (100 - v.offB), 100);

export default defineTemplate<V>({
  id: 'ratio-best-buy',
  title: 'Best buys and offers',
  strand: 'Ratio & Proportion',
  subtopic: 'Compound measures & best buys',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const friendly = calc === 'non-calc';
    const base: V = { level, name, product: rng.pick(PRODUCTS), sizes: [], prices: [], each: [0, 0], offerA: 'buy3get1', offB: 0, need: 0 };
    if (level === 'stretch') {
      const offerA = rng.pick(['buy3get1', 'threeForTwo'] as const);
      const per = offerA === 'buy3get1' ? 4 : 3;
      const need = per * rng.int(2, 6) + (rng.chance(0.4) ? rng.int(1, per - 1) : 0);
      const eachA = friendly ? rng.step(50, 300, 10) : rng.step(45, 350, 5);
      const eachB = eachA + rng.step(-30, 30, 5);
      const offB = friendly ? rng.pick([10, 20, 25, 30]) : rng.int(10, 35);
      const v = { ...base, each: [eachA, eachB] as [number, number], offerA, offB, need };
      ensure(costB(v).isInt(), 'whole-pence total');
      const diff = Math.abs(costA(v) - costB(v).toInt());
      ensure(diff >= 10 && diff <= 600, 'a clear but realistic difference');
      return v;
    }
    const n = level === 'foundational' ? 2 : 3;
    if (level === 'foundational') {
      const s1 = rng.int(2, 6);
      const s2 = s1 * rng.int(2, 3);
      const p1 = friendly ? rng.step(60, 400, 10) : rng.step(55, 450, 5);
      const p2 = Math.round((p1 * (s2 / s1) * (1 + rng.pick([-1, 1]) * rng.int(5, 20) / 100)) / 5) * 5;
      return { ...base, sizes: [s1, s2], prices: [p1, p2] };
    }
    const sizes = rng.sample(base.product.unit === 'g' ? [250, 375, 500, 750, 1000] : [250, 500, 750, 1000, 1500], n).sort((a, b) => a - b);
    const pricePer100 = rng.int(20, 90);
    const prices = sizes.map((s) => Math.round((pricePer100 * (s / 100) * (1 + (rng.int(-15, 15) / 100))) / 5) * 5);
    const v = { ...base, sizes, prices };
    // A single best buy, clearly ahead of the next one (at least 2%).
    const sorted = sizes.map((_, i) => unit(v, i)).sort((a, b) => a.cmp(b));
    ensure(sorted[1].div(sorted[0]).gt(Q.of(102, 100)), 'clear winner');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level !== 'stretch') {
      const u = v.sizes.map((_, i) => unit(v, i));
      if (new Set(u.map(String)).size !== u.length) p.push('tie');
      if (v.prices.some((x) => x <= 0)) p.push('prices');
    }
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      const item = ITEMS[(v.each[0] + v.need) % ITEMS.length];
      const offer = v.offerA === 'buy3get1' ? 'Buy 3, get 1 free' : '3 for the price of 2';
      return {
        stem: [
          text(`${v.name} needs to buy ${v.need} ${item}.`),
          text(`Two shops sell the same ${item}.`),
          box('Shop A', `${money(v.each[0], true)} each`, `Offer: ${offer}`),
          box('Shop B', `${money(v.each[1], true)} each`, `Offer: ${v.offB}% off everything`),
        ],
        parts: [single(4, text(`Which shop is cheaper for ${v.need} ${item}, and by how much?`), text('You must show your working.'))],
      };
    }
    const p = v.product;
    if (v.level === 'foundational') {
      const item = ITEMS[(v.prices[0] + v.sizes[0]) % ITEMS.length];
      return {
        stem: [text(`A shop sells ${item} in small packs and large packs.`), box(`Small pack: ${v.sizes[0]} ${item} for ${money(v.prices[0], true)}`), box(`Large pack: ${v.sizes[1]} ${item} for ${money(v.prices[1], true)}`)],
        parts: [single(3, text('Which pack is the better value for money?'), text('You must show how you get your answer.'))],
      };
    }
    return {
      stem: [
        ...lines(`${v.name} wants to buy some ${p.name}.`, `The ${p.name} is sold in ${v.sizes.length} sizes.`),
        table({ header: ['Size', ...v.sizes.map((s) => `${int(s)} ${p.unit}`)], rows: [['Price', ...v.prices.map((x) => money(x, true))]], rowHeaders: true }),
      ],
      parts: [single(3, text('Which size is the best value for money?'), text('You must show how you get your answer.'))],
    };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const a = costA(v);
      const b = costB(v).toInt();
      return [{ text: `Shop ${a < b ? 'A' : 'B'}, by ${money(Math.abs(a - b), true)} (A: ${money(a, true)}, B: ${money(b, true)})` }];
    }
    const best = v.sizes.map((_, i) => i).reduce((a, b) => (unit(v, b).lt(unit(v, a)) ? b : a));
    if (v.level === 'foundational') return [{ text: best === 0 ? 'The small pack' : 'The large pack' }];
    return [{ text: `The ${int(v.sizes[best])} ${v.product.unit} size` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const a = costA(v);
      const b = costB(v).toInt();
      const per = v.offerA === 'buy3get1' ? 4 : 3;
      const pay = v.offerA === 'buy3get1' ? 3 : 2;
      const deals = Math.floor(v.need / per);
      const extra = v.need - deals * per;
      return [
        [
          step('P1', `Shop A: ${deals} lots of ${per}, pay for ${deals * pay}${extra ? ` + ${extra} more` : ''} = ${deals * pay + extra} ${TIMES} ${money(v.each[0], true)} = ${money(a, true)}`, `With the offer you only pay for ${pay} in every ${per}.`),
          step('P1', `Shop B: ${v.need} ${TIMES} ${money(v.each[1], true)} = ${money(v.need * v.each[1], true)}, ${TIMES} ${dec(Q.of(100 - v.offB, 100))} = ${money(b, true)}`, `${v.offB}% off means paying ${100 - v.offB}%.`),
          step('C1', `Shop ${a < b ? 'A' : 'B'} is cheaper`, 'Compare the two totals.'),
          step('A1', `${money(Math.max(a, b), true)} ${MINUS} ${money(Math.min(a, b), true)} = ${money(Math.abs(a - b), true)}`, 'Find the difference.'),
        ],
      ];
    }
    const per = (i: number) => (v.level === 'foundational' ? Q.of(v.prices[i], v.sizes[i]) : Q.of(v.prices[i] * 100, v.sizes[i]));
    const show = (q: Q) => (q.terminatesWithin(2) ? `${dec(q)}p` : `${dec(Q.of(q.mul(100).floor(), 100), 2)}…p`);
    const label = v.level === 'foundational' ? 'per item' : `per 100 ${v.product.unit}`;
    const best = v.sizes.map((_, i) => i).reduce((a, b) => (unit(v, b).lt(unit(v, a)) ? b : a));
    const steps = v.sizes.map((s, i) => `${v.level === 'foundational' ? `${money(v.prices[i], true)} ${DIV} ${s}` : `${money(v.prices[i], true)} for ${int(s)} ${v.product.unit}`} = ${show(per(i))} ${label}`);
    return [
      [
        step(v.level === 'foundational' ? 'M1' : 'P1', steps[0], `Compare like with like: work out the cost ${label}.`),
        step(v.level === 'foundational' ? 'M1' : 'P1', steps.slice(1).join(';  '), 'Do the same for every size.'),
        step('C1', `${v.level === 'foundational' ? (best === 0 ? 'Small pack' : 'Large pack') : `${int(v.sizes[best])} ${v.product.unit}`} is the cheapest ${label}, so it is the best value`, 'Give a conclusion backed by your figures.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Count item by item at shop A.
      const per = v.offerA === 'buy3get1' ? 4 : 3;
      let a = 0;
      for (let i = 1; i <= v.need; i++) if (i % per !== 0) a += v.each[0];
      const b = Q.of(v.need * v.each[1]).sub(Q.of(v.need * v.each[1] * v.offB, 100));
      if (a !== costA(v) || !b.eq(costB(v))) p.push('costs');
      if (!answers[0].text.startsWith(`Shop ${a < b.toNumber() ? 'A' : 'B'},`)) p.push('cheaper shop');
      return p;
    }
    // Cross-multiply instead of dividing.
    let best = 0;
    for (let i = 1; i < v.sizes.length; i++) if (v.prices[i] * v.sizes[best] < v.prices[best] * v.sizes[i]) best = i;
    const want = v.level === 'foundational' ? (best === 0 ? 'The small pack' : 'The large pack') : `The ${int(v.sizes[best])} ${v.product.unit} size`;
    if (answers[0].text !== want) p.push('best buy');
    return p;
  },

  key: (v) => `${v.sizes}|${v.prices}|${v.each}|${v.offerA}|${v.offB}|${v.need}`,
});
