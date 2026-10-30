import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on November 2022 2H Q8 (buys a necklace for £120, sells it for £135:
 * percentage profit) and June 2022 2F Q19 (a 3 kg box of sweets for £17.60,
 * bags of 150 g, profit of at least 35%: what price per bag?). The examiner
 * report notes that students rounded £1.188 down to £1.18, which does NOT make
 * the profit; the answer is rounded UP.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  costP: number; // pence
  sellP: number; // foundational: selling price
  bulkKg: Q; // core: size of the bulk pack (kg)
  bagG: number; // core: grams per bag
  pct: number; // required profit %
  n: number; // stretch: number of items
  soldA: number; // stretch: how many sold at the first price
  priceA: number; // stretch: first price (pence)
}

const BUY = [
  { thing: 'a necklace', sold: 'sells the necklace' },
  { thing: 'a second-hand bike', sold: 'sells the bike' },
  { thing: 'a painting', sold: 'sells the painting' },
  { thing: 'a games console', sold: 'sells the games console' },
];
const BULK = [
  { box: 'box of sweets', what: 'sweets' },
  { box: 'sack of rice', what: 'rice' },
  { box: 'tub of dog biscuits', what: 'dog biscuits' },
];
const STOCK = [
  { what: 'T-shirts', each: 'T-shirt' },
  { what: 'phone cases', each: 'phone case' },
  { what: 'plant pots', each: 'plant pot' },
];

export default defineTemplate<V>({
  id: 'num-profit',
  title: 'Profit, loss and pricing',
  strand: 'Number',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, ctx: 0, costP: 0, sellP: 0, bulkKg: Q.of(0), bagG: 0, pct: 0, n: 0, soldA: 0, priceA: 0 };
    if (level === 'foundational') {
      const costP = rng.step(2000, 40000, 500);
      const pct = Q.of(rng.int(-40, 60) * 5, 10); // −20% … +30% in steps of 0.5
      ensure(!pct.eq(0), 'a profit or a loss');
      const sellP = Q.of(costP).mul(pct.add(100)).div(100);
      ensure(sellP.isInt() && sellP.toInt() % 100 === 0, 'whole pounds');
      return { ...base, ctx: rng.int(0, BUY.length - 1), costP, sellP: sellP.toInt() };
    }
    if (level === 'core') {
      const bulkKg = Q.of(rng.int(4, 12), 2); // 2 kg to 6 kg in half kilograms
      const bagG = rng.pick([125, 150, 175, 200, 225, 250, 300, 350]);
      const costP = rng.step(800, 3000, 5);
      const pct = rng.pick([20, 25, 30, 35, 40, 45, 50]);
      const bags = Math.floor((bulkKg.toNumber() * 1000) / bagG);
      ensure(bags >= 6 && (bulkKg.toNumber() * 1000) % bagG !== 0, 'some left over, enough bags');
      const each = Q.of(costP * (100 + pct), 100 * bags);
      ensure(!each.isInt(), 'the price must be rounded');
      return { ...base, ctx: rng.int(0, BULK.length - 1), bulkKg, bagG, costP, pct };
    }
    const n = rng.step(40, 200, 10);
    const costP = rng.step(n * 150, n * 600, 100);
    const pct = rng.pick([10, 15, 20, 25, 30]);
    const soldA = rng.int(Math.round(n * 0.5), Math.round(n * 0.8));
    const priceA = rng.step(Math.ceil(costP / n / 50) * 50 + 100, Math.ceil(costP / n / 50) * 50 + 600, 25);
    const v = { ...base, ctx: rng.int(0, STOCK.length - 1), n, costP, pct, soldA, priceA };
    const need = minRestPrice(v);
    ensure(need.gt(0) && need.lt(priceA) && !need.mul(1).isInt(), 'a sale price below the full price, needing rounding');
    return v;
  },

  validate(v) {
    return v.level === 'stretch' && v.soldA >= v.n ? ['some must be left'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const c = BUY[v.ctx];
      return {
        stem: lines(`${v.name} buys ${c.thing} for ${money(v.costP)}`, `${v.name} ${c.sold} for ${money(v.sellP)}`),
        parts: [single(3, text(`Work out ${v.name}’s percentage ${v.sellP > v.costP ? 'profit' : 'loss'}.`))],
      };
    }
    if (v.level === 'core') {
      const c = BULK[v.ctx];
      return {
        stem: lines(`${v.name} buys a ${dec(v.bulkKg)} kg ${c.box} for ${money(v.costP, true)}`, `${v.name} puts all the ${c.what} into bags to sell.`, `Each bag contains ${v.bagG} g of ${c.what}.`, `${v.name} fills as many bags as possible.`, `${v.name} will sell each bag for the same price.`, `${v.name} wants to make a profit of at least ${v.pct}%`),
        parts: [single(5, text(`Work out the least price ${v.name} should sell each bag for.`))],
      };
    }
    const c = STOCK[v.ctx];
    return {
      stem: lines(`A shop buys ${v.n} ${c.what} for a total of ${money(v.costP)}`, `The shop sells ${v.soldA} of the ${c.what} for ${money(v.priceA)} each.`, `The shop reduces the price of the rest of the ${c.what}.`, `The shop wants to make a profit of at least ${v.pct}% on all ${v.n} ${c.what}.`),
      parts: [single(4, text(`Work out the least price the shop can charge for each of the rest of the ${c.what}.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(Q.of(Math.abs(v.sellP - v.costP) * 100, v.costP))}%` }];
    if (v.level === 'core') {
      const bags = Math.floor((v.bulkKg.toNumber() * 1000) / v.bagG);
      return [{ text: money(Number(Q.of(v.costP * (100 + v.pct), 100 * bags).ceil()), true) }];
    }
    return [{ text: money(Number(minRestPrice(v).ceil()), true) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const d = Math.abs(v.sellP - v.costP);
      return [
        [
          step('M1', `${money(v.sellP)} − ${money(v.costP)} = ${money(v.sellP - v.costP)}`.replace('= -', '= −'), v.sellP > v.costP ? 'The profit is the difference.' : 'A negative difference: it is a loss.'),
          step('M1', `${money(d)} ${DIV} ${money(v.costP)} ${TIMES} 100`, 'Percentage of the ORIGINAL (cost) price, not the selling price.'),
          step('A1', `${dec(Q.of(d * 100, v.costP))}%`, v.sellP > v.costP ? 'Percentage profit.' : 'Percentage loss.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const grams = v.bulkKg.mul(1000).toInt();
      const bags = Math.floor(grams / v.bagG);
      const target = Q.of(v.costP * (100 + v.pct), 100);
      const each = target.div(bags);
      return [
        [
          step('P1', `${dec(v.bulkKg)} kg = ${int(grams)} g; ${int(grams)} ${DIV} ${v.bagG} = ${approx(Q.of(grams, v.bagG))}`, 'Change kg to g so the units match.'),
          step('P1', `${bags} bags`, 'Only FULL bags can be sold: round down.'),
          step('P1', `${money(v.costP, true)} ${TIMES} ${dec(Q.of(100 + v.pct, 100))} = ${pounds(target)}`, `Total money needed for a ${v.pct}% profit: multiply by ${dec(Q.of(100 + v.pct, 100))}.`),
          step('P1', `${pounds(target)} ${DIV} ${bags} = £${approx(each.div(100), 3)}`, 'Share it between the bags.'),
          step('A1', money(Number(each.ceil()), true), 'Round UP to the next penny: rounding down would not make enough profit.'),
        ],
      ];
    }
    const target = Q.of(v.costP * (100 + v.pct), 100);
    const got = v.soldA * v.priceA;
    const left = v.n - v.soldA;
    const need = minRestPrice(v);
    return [
      [
        step('P1', `${money(v.costP)} ${TIMES} ${dec(Q.of(100 + v.pct, 100))} = ${pounds(target)}`, `The total takings needed for at least ${v.pct}% profit.`),
        step('P1', `${v.soldA} ${TIMES} ${money(v.priceA, true)} = ${money(got, true)}`, 'Money from the items sold at full price.'),
        step('P1', `(${pounds(target)} − ${money(got, true)}) ${DIV} ${left} = £${approx(need.div(100), 3)}`, `The rest of the money has to come from the other ${left}.`),
        step('A1', money(Number(need.ceil()), true), 'Round UP to the next penny.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const pence = Math.round(Number(answers[0].text.replace(/[£%\s]/g, '')) * 100);
    if (v.level === 'foundational') {
      // Apply the percentage to the cost and see if we reach the selling price.
      const pc = Q.of(answers[0].text.replace('%', ''));
      const sign = v.sellP > v.costP ? 1 : -1;
      if (!Q.of(v.costP).mul(Q.of(100).add(pc.mul(sign))).div(100).eq(v.sellP)) p.push('percentage');
      return p;
    }
    // The price must reach the target, and one penny less must not.
    const cost = Q.of(v.costP);
    const ok = (price: number) => {
      const takings = v.level === 'core' ? Q.of(price * Math.floor((v.bulkKg.toNumber() * 1000) / v.bagG)) : Q.of(v.soldA * v.priceA + price * (v.n - v.soldA));
      return takings.sub(cost).mul(100).cmp(cost.mul(v.pct)) >= 0;
    };
    if (!ok(pence) || ok(pence - 1)) p.push('not the least price');
    return p;
  },

  key: (v) => `${v.costP}|${v.sellP}|${v.bulkKg}|${v.bagG}|${v.pct}|${v.n}|${v.soldA}|${v.priceA}`,
});

/** Pounds from exact pence, at least 2 dp: £23.7625 */
const pounds = (pence: Q) => `£${dec(pence.div(100), 2)}`;

/** Least price (in pence, exact) for each of the remaining items. */
function minRestPrice(v: V): Q {
  const target = Q.of(v.costP * (100 + v.pct), 100);
  return target.sub(v.soldA * v.priceA).div(v.n - v.soldA);
}
