import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 2F Q7 (5 kg of tomatoes into 350 g tins: weight left
 * over), Set 24 2F Q2 (a book plus as many pencils as possible from £15) and
 * Set 24 2F Q17 (cubes of side 40 cm in a 10 m × 2.4 m × 2.4 m container),
 * where dividing the volumes gives the wrong answer.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  // foundational: kg into containers of g grams
  kg: number;
  grams: number;
  food: string;
  // core: budget, one fixed item, then as many as possible
  budgetP: number;
  fixedP: number;
  eachP: number;
  fixedItem: string;
  manyItem: string;
  oneItem: string;
  // stretch: container in metres (tenths), cube side in cm
  box: [Q, Q, Q];
  side: number;
}

const FOODS = ['chopped tomatoes', 'soup', 'rice', 'flour', 'jam'];
const BUYS: [string, string, string][] = [
  ['a book', 'pencils', 'pencil'],
  ['a pencil case', 'pens', 'pen'],
  ['a magazine', 'stickers', 'sticker'],
  ['a sandwich', 'pieces of fruit', 'piece of fruit'],
];

const fitAlong = (lengthM: Q, side: number) => Number(lengthM.mul(100).div(side).floor());

export default defineTemplate<V>({
  id: 'num-as-many-as-possible',
  title: 'As many as possible (rounding in context)',
  strand: 'Number',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [name] = names(rng, 1);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    const base: V = { level, name, kg: 0, grams: 0, food: '', budgetP: 0, fixedP: 0, eachP: 0, fixedItem: '', manyItem: '', oneItem: '', box: [Q.of(0), Q.of(0), Q.of(0)], side: 0 };
    if (level === 'foundational') {
      const kg = rng.int(2, 10);
      const grams = rng.step(150, 600, friendly ? 50 : 25);
      ensure((kg * 1000) % grams !== 0, 'some left over');
      return { ...base, kg, grams, food: rng.pick(FOODS) };
    }
    if (level === 'core') {
      const [fixedItem, manyItem, oneItem] = rng.pick(BUYS);
      const fixedP = friendly ? rng.step(200, 1200, 50) : rng.step(199, 1299, 1);
      const eachP = friendly ? rng.step(20, 120, 5) : rng.step(19, 135, 1);
      const budgetP = rng.step(fixedP + eachP * 4, fixedP + eachP * 30, 100);
      ensure((budgetP - fixedP) % eachP !== 0, 'some money left over');
      return { ...base, budgetP, fixedP, eachP, fixedItem, manyItem, oneItem };
    }
    const side = rng.pick([20, 25, 30, 40, 50, 60]);
    const box: [Q, Q, Q] = [Q.of(rng.int(40, 120), 10), Q.of(rng.int(15, 30), 10), Q.of(rng.int(15, 30), 10)];
    const v = { ...base, box, side };
    const fit = box.map((l) => fitAlong(l, side));
    const byVolume = Number(box[0].mul(box[1]).mul(box[2]).mul(1000000).div(side ** 3).floor());
    ensure(fit[0] * fit[1] * fit[2] < byVolume, 'dividing the volumes must give the wrong answer');
    ensure(box.some((l) => !l.mul(100).div(side).isInt()), 'at least one length does not divide exactly');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'core' && v.budgetP <= v.fixedP) p.push('budget too small');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`${v.name} has ${v.kg} kg of ${v.food}.`, `${v.name} also has some empty tins.`, `When full, each tin holds ${v.grams} g of ${v.food}.`, `${v.name} fills as many tins as possible.`),
        parts: [part('a', 2, text(`How many tins does ${v.name} fill?`)), part('b', 2, text(`Work out the weight of ${v.food} left over.`), text('Give the units of your answer.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`${v.name} buys ${v.fixedItem} and some ${v.manyItem}.`, `${capital(v.fixedItem.replace(/^a /, 'the '))} costs ${money(v.fixedP, true)}`, `Each ${v.oneItem} costs ${money(v.eachP, true)}`, `${v.name} has a total of ${money(v.budgetP)} to spend.`, `${v.name} buys as many ${v.manyItem} as possible.`),
        parts: [single(3, text(`Work out how many ${v.manyItem} ${v.name} buys.`))],
      };
    }
    const [l, w, h] = v.box.map((x) => dec(x));
    return {
      stem: lines(`${v.name} puts boxes into a shipping container.`, `The container is a cuboid ${l} metres by ${w} metres by ${h} metres.`, `Each box is a cube of side ${v.side} centimetres.`),
      parts: [single(3, text(`Work out the greatest number of boxes that ${v.name} can put into the container.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const n = Math.floor((v.kg * 1000) / v.grams);
      return [{ text: `${n} tins` }, { text: `${int(v.kg * 1000 - n * v.grams)} g` }];
    }
    if (v.level === 'core') return [{ text: `${Math.floor((v.budgetP - v.fixedP) / v.eachP)} ${v.manyItem}` }];
    const fit = v.box.map((l) => fitAlong(l, v.side));
    return [{ text: int(fit[0] * fit[1] * fit[2]) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const total = v.kg * 1000;
      const n = Math.floor(total / v.grams);
      return [
        [step('M1', `${v.kg} kg = ${int(total)} g, ${int(total)} ${DIV} ${v.grams} = ${dec(Q.of(total, v.grams).terminatesWithin(2) ? Q.of(total, v.grams) : Q.of(Q.of(total * 100, v.grams).floor(), 100))}${Q.of(total, v.grams).terminatesWithin(2) ? '' : '…'}`, 'Use the same units: change kg to g first.'), step('A1', `${n} tins`, 'Round DOWN: a tin that is not full does not count.')],
        [step('M1', `${int(total)} ${MINUS} ${n} ${TIMES} ${v.grams}`, 'Take away what went into the full tins.'), step('A1', `${int(total - n * v.grams)} g`, 'Remember the units.')],
      ];
    }
    if (v.level === 'core') {
      const left = v.budgetP - v.fixedP;
      const n = Math.floor(left / v.eachP);
      return [
        [
          step('P1', `${money(v.budgetP)} ${MINUS} ${money(v.fixedP, true)} = ${money(left, true)}`, `Pay for ${v.fixedItem.replace(/^a /, 'the ')} first.`),
          step('P1', `${money(left, true)} ${DIV} ${money(v.eachP, true)} = ${n} remainder ${money(left - n * v.eachP, true)}`, 'How many times does one price fit into what is left?'),
          step('A1', `${n} ${v.manyItem}`, 'Round DOWN: there isn’t enough money for another one.'),
        ],
      ];
    }
    const fit = v.box.map((l) => fitAlong(l, v.side));
    const cm = v.box.map((l) => dec(l.mul(100)));
    return [
      [
        step('P1', `${cm[0]} cm by ${cm[1]} cm by ${cm[2]} cm`, 'Change the container to centimetres to match the boxes.'),
        step('P1', `${cm[0]} ${DIV} ${v.side} → ${fit[0]},  ${cm[1]} ${DIV} ${v.side} → ${fit[1]},  ${cm[2]} ${DIV} ${v.side} → ${fit[2]}`, 'Count how many boxes fit along each edge, rounding DOWN. Dividing the volumes would count boxes that don’t fit.'),
        step('A1', `${fit[0]} ${TIMES} ${fit[1]} ${TIMES} ${fit[2]} = ${int(fit[0] * fit[1] * fit[2])}`, 'Multiply the three numbers.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      let n = 0;
      let left = v.kg * 1000;
      while (left >= v.grams) {
        left -= v.grams;
        n++;
      }
      if (answers[0].text !== `${n} tins` || answers[1].text !== `${int(left)} g`) p.push('tins');
    } else if (v.level === 'core') {
      let n = 0;
      while (v.fixedP + (n + 1) * v.eachP <= v.budgetP) n++;
      if (answers[0].text !== `${n} ${v.manyItem}`) p.push('count');
    } else {
      // Count boxes edge by edge in whole centimetres.
      const counts = v.box.map((l) => {
        let k = 0;
        while ((k + 1) * v.side <= l.mul(100).toNumber() + 1e-9) k++;
        return k;
      });
      if (answers[0].text !== int(counts[0] * counts[1] * counts[2])) p.push('boxes');
    }
    return p;
  },

  key: (v) => `${v.kg}|${v.grams}|${v.budgetP}|${v.fixedP}|${v.eachP}|${v.box.join(',')}|${v.side}`,
});

function capital(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
