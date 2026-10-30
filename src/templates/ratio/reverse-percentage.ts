import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, money } from '../../engine/format';
import { Q, gcdInt, lcmInt } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2H Q6 (cinema ticket after a 12% increase is £18.20, find
 * the original) and Set 23 2F Q18b / Set 24 2F Q15b (van and investment that
 * decreased). Stretch reverses two years of depreciation.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: { item: string; up: string; down: string };
  pct: number;
  increase: boolean;
  originalP: number; // pence
  forwardP: number; // foundational (a): a different item's price before the change
  items: [string, string]; // foundational: two different items
  years: number;
  nc: boolean; // stretch: undo one year at a time (÷ 0.8 twice), not ÷ 0.64
}

const CONTEXTS = [
  { item: 'the cost of an adult cinema ticket', up: 'A cinema increased the cost of an adult ticket by', down: 'In a sale, a cinema reduced the cost of an adult ticket by' },
  { item: 'the price of a bike', up: 'A shop increased the price of a bike by', down: 'In a sale, a shop reduced the price of a bike by' },
  { item: 'the cost of a train season ticket', up: 'A train company increased the cost of a season ticket by', down: 'A train company reduced the cost of a season ticket by' },
  { item: 'the price of a games console', up: 'A shop increased the price of a games console by', down: 'In a sale, a shop reduced the price of a games console by' },
];

const ITEMS = ['lamp', 'rug', 'kettle', 'jacket', 'pair of trainers', 'tent', 'desk', 'mirror'];

const mult = (v: V) => Q.of(v.increase ? 100 + v.pct : 100 - v.pct, 100);
const after = (v: V) => mult(v).mul(v.originalP); // pence

export default defineTemplate<V>({
  id: 'ratio-reverse-percentage',
  title: 'Reverse percentages',
  strand: 'Ratio & Proportion',
  subtopic: 'Percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'backwards',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const friendly = calc === 'non-calc';
    const ctx = rng.pick(CONTEXTS);
    if (level === 'stretch') {
      // Value falls by pct% each year for `years` years.
      // Non-calculator: multipliers 0.81 and 0.64 can be reversed by hand.
      const pct = friendly ? rng.pick([10, 20]) : rng.int(3, 18);
      const years = 2;
      const m2 = (100 - pct) ** 2; // over 10 000
      // originalP × m2 / 10 000 must be whole pence: originalP multiple of 10 000 / gcd.
      const unit0 = 10000 / gcdInt(m2, 10000);
      const unit = friendly ? lcmInt(unit0, 10000) : unit0; // non-calculator: whole £100s
      const originalP = rng.int(Math.ceil(800000 / unit), Math.floor(4000000 / unit)) * unit;
      return { level, name, ctx: { item: 'the value of the car', up: '', down: '' }, pct, increase: false, originalP, forwardP: 0, items: ['', ''], years, nc: friendly };
    }
    const increase = rng.chance(0.5);
    const pct = friendly || level === 'foundational' ? rng.pick([10, 20, 25, 5, 15, 30]) : rng.int(3, 35);
    // Original in pounds (or 10p steps for calculator), chosen so the new price is whole pence.
    const m = Q.of(increase ? 100 + pct : 100 - pct, 100);
    const step = friendly ? 100 : 10;
    let originalP = rng.step(1000, 60000, step);
    originalP = Math.round(originalP / Number(m.d)) * Number(m.d) || Number(m.d);
    const v: V = { level, name, ctx, pct, increase, originalP, forwardP: 0, items: rng.sample(ITEMS, 2) as [string, string], years: 0, nc: friendly };
    ensure(after(v).isInt(), 'new price must be whole pence');
    if (friendly) ensure(after(v).toInt() % 5 === 0 && originalP % 100 === 0, 'friendly prices');
    if (level === 'foundational') {
      v.forwardP = rng.step(1000, 30000, 100);
      ensure(mult(v).mul(v.forwardP).isInt(), 'forward price whole pence');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (!after(v).isInt()) p.push('new price not whole pence');
    if (v.level === 'stretch' && !Q.of(100 - v.pct, 100).mul(Q.of(100 - v.pct, 100)).mul(v.originalP).isInt()) p.push('value after 2 years not whole pence');
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      const end = Q.of(100 - v.pct, 100).mul(Q.of(100 - v.pct, 100)).mul(v.originalP).toInt();
      return {
        stem: lines(`${v.name} bought a car.`, `The value of the car decreased by ${v.pct}% each year.`, `At the end of 2 years, the value of the car was ${money(end)}`),
        parts: [single(3, text(`Work out how much ${v.name} paid for the car.`))],
      };
    }
    const change = `${v.increase ? v.ctx.up : v.ctx.down} ${v.pct}%`;
    const afterLine = `After the ${v.increase ? 'increase' : 'reduction'}, ${v.ctx.item} was ${money(after(v).toInt())}`;
    if (v.level === 'foundational') {
      const chg = v.increase ? 'increase' : 'reduction';
      const [a, b] = v.items;
      return {
        stem: [text(v.increase ? `A shop increased all of its prices by ${v.pct}%.` : `In a sale, a shop reduced all of its prices by ${v.pct}%.`)],
        parts: [
          part('a', 2, text(`Before the ${chg}, the price of a ${a} was ${money(v.forwardP)}`), text(`Work out the price of the ${a} after the ${chg}.`)),
          part('b', 3, text(`After the ${chg}, the price of a ${b} was ${money(after(v).toInt())}`), text(`Work out the price of the ${b} before the ${chg}.`)),
        ],
      };
    }
    return { stem: lines(`${change}.`, afterLine), parts: [single(3, text(`Work out ${v.ctx.item} before the ${v.increase ? 'increase' : 'reduction'}.`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: money(mult(v).mul(v.forwardP).toInt()) }, { text: money(v.originalP) }];
    return [{ text: money(v.originalP) }];
  },

  markScheme(v) {
    const m = mult(v);
    const pctAfter = v.increase ? 100 + v.pct : 100 - v.pct;
    if (v.level === 'stretch') {
      const m1 = Q.of(100 - v.pct, 100);
      const end = m1.mul(m1).mul(v.originalP).toInt();
      if (v.nc) {
        // Without a calculator, undo one year at a time: two easy divisions instead of ÷ 0.64.
        const mid = m1.mul(v.originalP).toInt();
        return [
          [
            step('P1', `Multiplier = 1 − ${dec(Q.of(v.pct, 100))} = ${dec(m1)} each year`, `A decrease of ${v.pct}% leaves ${100 - v.pct}% each year.`),
            step('P1', `${money(end)} ${DIV} ${dec(m1)} = ${money(mid)}`, 'Work backwards one year: divide by the multiplier (don’t add the percentage back on).'),
            step('A1', `${money(mid)} ${DIV} ${dec(m1)} = ${money(v.originalP)}`, 'And again for the other year.'),
          ],
        ];
      }
      return [
        [
          step('P1', `Multiplier = 1 − ${dec(Q.of(v.pct, 100))} = ${dec(m1)}, over 2 years: ${dec(m1)}² = ${dec(m1.mul(m1))}`, 'Each year the value is multiplied by the same amount, so square it for 2 years.'),
          step('P1', `${money(end)} ${DIV} ${dec(m1.mul(m1))}`, 'Work backwards: divide by the multiplier (don’t add the percentage back on).'),
          step('A1', money(v.originalP), `Check: ${money(v.originalP)} × ${dec(m1)} × ${dec(m1)} = ${money(end)}`),
        ],
      ];
    }
    const reverse = [
      step('P1', `${money(after(v).toInt())} is ${pctAfter}% of the original price`, `The new price is ${v.increase ? `100% + ${v.pct}%` : `100% − ${v.pct}%`} of the price before.`),
      step('P1', `${money(after(v).toInt())} ${DIV} ${dec(m)}  (or ÷ ${pctAfter} ${TIMES} 100)`, `Divide by the multiplier ${dec(m)}. Finding ${v.pct}% of the new price is the common mistake.`),
      step('A1', money(v.originalP), `Check: ${v.increase ? 'increase' : 'decrease'} ${money(v.originalP)} by ${v.pct}%.`),
    ];
    if (v.level === 'foundational') {
      const fwd = mult(v).mul(v.forwardP).toInt();
      return [
        [step('M1', `${v.pct}% of ${money(v.forwardP)} = ${money(Q.of(v.pct, 100).mul(v.forwardP).toInt())}`, `Find ${v.pct}% first (10% is ÷ 10).`), step('A1', `${money(v.forwardP)} ${v.increase ? '+' : '−'} ${money(Q.of(v.pct, 100).mul(v.forwardP).toInt())} = ${money(fwd)}`, v.increase ? 'Add it on.' : 'Take it off.')],
        reverse,
      ];
    }
    return [reverse];
  },

  check(v, answers) {
    const p: string[] = [];
    // Forwards from the answer must reproduce the given price.
    if (v.level === 'stretch') {
      let val = Q.of(v.originalP);
      for (let y = 0; y < 2; y++) val = val.sub(val.mul(v.pct).div(100));
      const given = Q.of(100 - v.pct, 100).mul(Q.of(100 - v.pct, 100)).mul(v.originalP);
      if (!val.eq(given)) p.push('two-year value');
    } else {
      const change = Q.of(v.originalP).mul(v.pct).div(100);
      const fwd = v.increase ? Q.of(v.originalP).add(change) : Q.of(v.originalP).sub(change);
      if (!fwd.eq(after(v))) p.push('forward mismatch');
    }
    if (answers[answers.length - 1].text !== money(v.originalP)) p.push('answer');
    return p;
  },

  key: (v) => `${v.pct}|${v.increase}|${v.originalP}|${v.forwardP}`,
});
