import { defineTemplate } from '../../engine/types';
import { box, lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2F Q2 (256 notebooks in packs of 8 at £2.48 a pack).
 * Core needs "at least" a number, so packs round up; stretch has two pack
 * sizes and asks for the cheapest way to buy exactly the number needed.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  item: string;
  need: number;
  packs: [number, number][]; // [size, price in pence]
}

const ITEMS = ['notebooks', 'pencils', 'glue sticks', 'paper plates', 'tea lights', 'bread rolls', 'balloons'];

/** All ways to make exactly `need` from the pack sizes, cheapest first. */
function combos(v: V): { counts: number[]; cost: number }[] {
  const [[a, pa], [b, pb]] = v.packs;
  const out: { counts: number[]; cost: number }[] = [];
  for (let x = 0; x * a <= v.need; x++) {
    const rest = v.need - x * a;
    if (rest % b === 0) out.push({ counts: [x, rest / b], cost: x * pa + (rest / b) * pb });
  }
  return out.sort((p, q) => p.cost - q.cost);
}

export default defineTemplate<V>({
  id: 'num-packs-cost',
  title: 'Buying in packs',
  strand: 'Number',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [name] = names(rng, 1);
    const item = rng.pick(ITEMS);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    const price = () => (friendly ? rng.step(100, 600, 25) : rng.step(99, 799, 1));
    if (level === 'stretch') {
      const a = rng.pick([4, 5, 6, 8]);
      const b = rng.pick([10, 12, 15, 20, 24]);
      // Big pack is better value per item.
      const pa = price();
      const pb = Math.round((pa / a) * b * (rng.int(75, 92) / 100));
      const need = rng.int(30, 80);
      const v: V = { level, name, item, need, packs: [[a, pa], [b, pb]] };
      const c = combos(v);
      ensure(c.length >= 2, 'at least two exact ways to buy');
      ensure(c[0].counts[0] > 0, 'cheapest way should mix pack sizes');
      ensure(c[0].cost < c[1].cost, 'a single cheapest way');
      return v;
    }
    const size = rng.pick([4, 5, 6, 8, 10, 12]);
    let need = rng.int(tier === 'KS3' ? 20 : 60, tier === 'KS3' ? 120 : 400);
    if (level === 'foundational') need = Math.max(size * 2, need - (need % size));
    else ensure(need % size !== 0, 'core must need rounding up');
    return { level, name, item, need, packs: [[size, price()]] };
  },

  validate(v) {
    const p: string[] = [];
    if (v.packs.some(([s, c]) => s <= 0 || c <= 0)) p.push('positive packs');
    return p;
  },

  render(v) {
    const [[size, price]] = v.packs;
    if (v.level === 'foundational') {
      return {
        stem: lines(`${v.name} buys ${int(v.need)} ${v.item}.`, `The ${v.item} are sold in packs of ${size} ${v.item}.`, `Each pack costs ${money(price, true)}`),
        parts: [part('a', 1, text(`How many packs does ${v.name} buy?`)), part('b', 2, text(`Work out the total cost of the ${v.item}.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`${v.name} needs at least ${int(v.need)} ${v.item}.`, `The ${v.item} are sold in packs of ${size} ${v.item}.`, `Each pack costs ${money(price, true)}`, `${v.name} buys the smallest number of packs needed.`),
        parts: [single(3, text(`Work out how much ${v.name} pays.`))],
      };
    }
    const [[a, pa], [b, pb]] = v.packs;
    return {
      stem: [text(`${v.name} needs exactly ${v.need} ${v.item}.`), text(`The ${v.item} are sold in two sizes of pack.`), box(`Pack of ${a}: ${money(pa, true)}`), box(`Pack of ${b}: ${money(pb, true)}`)],
      parts: [single(4, text(`Work out the least amount ${v.name} can pay for exactly ${v.need} ${v.item}.`), text('You must show your working.'))],
    };
  },

  answer(v) {
    const [[size, price]] = v.packs;
    if (v.level === 'foundational') return [{ text: `${v.need / size} packs` }, { text: money((v.need / size) * price, true) }];
    if (v.level === 'core') return [{ text: money(Math.ceil(v.need / size) * price, true) }];
    const best = combos(v)[0];
    const [[a], [b]] = v.packs;
    return [{ text: `${money(best.cost, true)} (${best.counts[0]} pack${best.counts[0] === 1 ? '' : 's'} of ${a} and ${best.counts[1]} pack${best.counts[1] === 1 ? '' : 's'} of ${b})` }];
  },

  markScheme(v) {
    const [[size, price]] = v.packs;
    if (v.level === 'foundational') {
      const n = v.need / size;
      return [[step('B1', `${int(v.need)} ${DIV} ${size} = ${n}`, 'Divide by the number in each pack.')], [step('M1', `${n} ${TIMES} ${money(price, true)}`, 'Number of packs × price of one pack.'), step('A1', money(n * price, true), 'Include the £ sign.')]];
    }
    if (v.level === 'core') {
      const exact = Q.of(v.need, size);
      const n = Math.ceil(v.need / size);
      return [
        [
          step('P1', `${int(v.need)} ${DIV} ${size} = ${Math.floor(v.need / size)} remainder ${v.need % size}`, 'Find how many packs are needed.'),
          step('P1', `${n} packs ${TIMES} ${money(price, true)}`, `Round UP: ${exact.floor()} packs would only give ${Number(exact.floor()) * size} ${v.item}.`),
          step('A1', money(n * price, true), 'Include the £ sign.'),
        ],
      ];
    }
    const [[a, pa], [b, pb]] = v.packs;
    const c = combos(v);
    const list = c.slice(0, 3).map((x) => `${x.counts[0]} × ${a} + ${x.counts[1]} × ${b}: ${money(x.cost, true)}`).join(';  ');
    return [
      [
        step('P1', `Per item: ${money(pa, true)} ${DIV} ${a} = ${approx(Q.of(pa, a))}p, ${money(pb, true)} ${DIV} ${b} = ${approx(Q.of(pb, b))}p, so the pack of ${b} is better value`, 'Work out which pack is cheaper per item.'),
        step('P1', `${c[0].counts[0]} ${TIMES} ${a} + ${c[0].counts[1]} ${TIMES} ${b} = ${v.need}`, 'Find ways that make EXACTLY the number needed. You may not be able to use only the better-value pack.'),
        step('P1', list, 'Compare the costs of the possible combinations.'),
        step('A1', money(c[0].cost, true), 'Choose the cheapest.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Brute force over both pack counts.
      const [[a, pa], [b, pb]] = v.packs;
      let best = Infinity;
      for (let x = 0; x <= v.need; x++) for (let y = 0; y <= v.need; y++) if (x * a + y * b === v.need) best = Math.min(best, x * pa + y * pb);
      if (!answers[0].text.startsWith(money(best, true) + ' ')) p.push('least cost');
      return p;
    }
    const [[size, price]] = v.packs;
    let packs = 0;
    while (packs * size < v.need) packs++;
    if (answers[answers.length - 1].text !== money(packs * price, true)) p.push('cost');
    return p;
  },

  key: (v) => `${v.need}|${JSON.stringify(v.packs)}`,
});
