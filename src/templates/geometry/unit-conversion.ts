import { defineTemplate } from '../../engine/types';
import { part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, hoursMinutes, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 1F Q16 (change 4.6 m² into cm²: the commonest error was
 * × 100), Set 23 2F Q21 (grass seed for a lawn measured in centimetres, sold in
 * boxes) and Set 22 2F Q19 (a tank with sides in metres and centimetres fills
 * at so many litres a minute). check() converts everything to cm and cm³.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  // foundational
  m2: Q; // (a) area in m²
  rug: [number, number]; // (b) cm
  // core: lawn L × W cm, rate g per m², box grams, price per box (pence)
  lawn: [number, number];
  rate: number;
  boxG: number;
  priceP: number;
  // stretch: tank length in m (as tenths), width and depth in cm, fill rate L/min
  tank: [Q, number, number];
  flow: number;
}

const gramsOrKg = (g: number) => (g >= 1000 ? `${dec(Q.of(g, 1000))} kg` : `${g} g`);

export default defineTemplate<V>({
  id: 'geom-unit-conversion',
  title: 'Area and volume unit conversions',
  strand: 'Geometry & Measures',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const base: V = { level, name: names(rng, 1)[0], m2: Q.of(0), rug: [0, 0], lawn: [0, 0], rate: 0, boxG: 0, priceP: 0, tank: [Q.of(0), 0, 0], flow: 0 };
    if (level === 'foundational') {
      const m2 = Q.of(rng.int(11, 95), 10);
      ensure(!m2.isInt(), 'a decimal number of square metres');
      const rug: [number, number] = [rng.step(150, 400, calc === 'calc' ? 10 : 50), rng.step(100, 300, calc === 'calc' ? 10 : 50)];
      ensure(rug[0] > rug[1] && rug.every((c) => c % 100 !== 0), 'length longer than width; neither a whole number of metres');
      return { ...base, m2, rug };
    }
    if (level === 'core') {
      const step = calc === 'calc' ? 10 : 50;
      const lawn: [number, number] = [rng.step(400, 1200, step), rng.step(300, 800, step)];
      ensure(lawn[0] > lawn[1], 'length longer than width');
      const rate = rng.pick([20, 25, 30, 40, 50]);
      const boxG = rng.pick([500, 1000, 2000]);
      const grams = Q.of(lawn[0] * lawn[1] * rate, 10000);
      ensure(!grams.div(boxG).isInt(), 'boxes must be rounded up');
      ensure(Number(grams.div(boxG).ceil()) >= 2, 'more than one box');
      return { ...base, lawn, rate, boxG, priceP: rng.step(350, 1200, calc === 'calc' ? 5 : 50) };
    }
    const tank: [Q, number, number] = [Q.of(rng.int(10, 25), 10), rng.step(50, 120, 10), rng.step(40, 100, 10)];
    const flow = rng.pick([5, 6, 8, 10, 12, 15, 20]);
    const litres = tank[0].mul(100).mul(tank[1] * tank[2]).div(1000);
    ensure(litres.div(flow).isInt(), 'a whole number of minutes');
    const mins = litres.div(flow).toNumber();
    ensure(mins >= 70 && mins <= 600 && mins % 60 !== 0, 'hours and minutes');
    return { ...base, tank, flow };
  },

  validate(v) {
    return v.level === 'stretch' && !v.tank[0].gt(0) ? ['tank'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [part('a', 1, text(`Change ${dec(v.m2)} m² into cm²`)), part('b', 2, text(`A rectangular rug is ${v.rug[0]} cm long and ${v.rug[1]} cm wide.`), text('Work out the area of the rug in m²'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [
          text(`${v.name} wants to sow grass seed on a rectangular lawn.`),
          text(`The lawn is ${v.lawn[0]} cm long and ${v.lawn[1]} cm wide.`),
          text(`${v.name} needs ${v.rate} g of grass seed for each m² of lawn.`),
          text(`Grass seed is sold in ${gramsOrKg(v.boxG)} boxes. Each box costs ${money(v.priceP)}`),
        ],
        parts: [single(4, text(`Work out how much ${v.name} must spend on grass seed.`))],
      };
    }
    const [l, w, h] = v.tank;
    return {
      stem: [text(`A water tank is a cuboid ${dec(l)} m long, ${w} cm wide and ${h} cm deep.`), text('The tank is empty.'), text(`Water flows into the tank at ${v.flow} litres per minute.`), text('1 litre = 1000 cm³')],
      parts: [single(4, text('How long will it take to fill the tank?'), text('Give your answer in hours and minutes.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(v.m2.mul(10000))} cm²` }, { text: `${dec(Q.of(v.rug[0] * v.rug[1], 10000))} m²` }];
    if (v.level === 'core') {
      const boxes = Number(Q.of(v.lawn[0] * v.lawn[1] * v.rate, 10000).div(v.boxG).ceil());
      return [{ text: money(boxes * v.priceP) }];
    }
    const mins = v.tank[0].mul(100).mul(v.tank[1] * v.tank[2]).div(1000).div(v.flow).toNumber();
    return [{ text: hoursMinutes(mins) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [L, W] = v.rug;
      return [
        [step('B1', `${dec(v.m2)} ${TIMES} 10 000 = ${dec(v.m2.mul(10000))} cm²`, '1 m² = 100 cm × 100 cm = 10 000 cm², not 100 cm².')],
        [step('M1', `${dec(Q.of(L, 100))} ${TIMES} ${dec(Q.of(W, 100))}`, 'Change to metres FIRST (÷ 100), then multiply. Or find cm² and ÷ 10 000.'), step('A1', `${dec(Q.of(L * W, 10000))} m²`, `Check: ${int(L * W)} cm² ÷ 10 000 gives the same.`)],
      ];
    }
    if (v.level === 'core') {
      const [L, W] = v.lawn;
      const area = Q.of(L * W, 10000);
      const grams = area.mul(v.rate);
      const boxes = Number(grams.div(v.boxG).ceil());
      return [
        [
          step('M1', `${dec(Q.of(L, 100))} ${TIMES} ${dec(Q.of(W, 100))} = ${dec(area)} m²`, 'The rate is per m², so change the lengths to metres first.'),
          step('M1', `${dec(area)} ${TIMES} ${v.rate} = ${dec(grams)} g`, 'Grams of seed needed.'),
          step('M1', `${dec(grams)} ${DIV} ${v.boxG} = ${dec(grams.div(v.boxG))}, so ${boxes} boxes`, 'Round UP: a part box is not enough.'),
          step('A1', `${boxes} ${TIMES} ${money(v.priceP)} = ${money(boxes * v.priceP)}`, 'Cost of the boxes.'),
        ],
      ];
    }
    const [l, w, h] = v.tank;
    const cm3 = l.mul(100).mul(w * h);
    const litres = cm3.div(1000);
    const mins = litres.div(v.flow).toNumber();
    return [
      [
        step('M1', `${dec(l.mul(100))} ${TIMES} ${w} ${TIMES} ${h} = ${int(cm3.toNumber())} cm³`, `Change ${dec(l)} m to ${dec(l.mul(100))} cm so all the units match.`),
        step('M1', `${int(cm3.toNumber())} ${DIV} 1000 = ${int(litres.toNumber())} litres`, '1 litre = 1000 cm³'),
        step('M1', `${int(litres.toNumber())} ${DIV} ${v.flow} = ${mins} minutes`, 'Litres ÷ litres per minute = minutes.'),
        step('A1', hoursMinutes(mins), `${mins} minutes = ${Math.floor(mins / 60)} × 60 + ${mins % 60}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // 1 m = 100 cm along each side of a square metre.
      if (answers[0].text !== `${dec(v.m2.mul(100).mul(100))} cm²`) p.push('m² to cm²');
      if (answers[1].text !== `${dec(Q.of(v.rug[0], 100).mul(Q.of(v.rug[1], 100)))} m²`) p.push('rug');
    } else if (v.level === 'core') {
      let boxes = 0;
      const needG = Q.of(v.lawn[0], 100).mul(Q.of(v.lawn[1], 100)).mul(v.rate);
      while (needG.gt(boxes * v.boxG)) boxes++;
      if (answers[0].text !== money(boxes * v.priceP)) p.push('cost');
    } else {
      const litres = v.tank[0].mul(Q.of(v.tank[1], 100)).mul(Q.of(v.tank[2], 100)).mul(1000); // m³ × 1000
      let t = 0;
      for (let filled = 0; litres.gt(filled); filled += v.flow) t++;
      if (answers[0].text !== hoursMinutes(t)) p.push('time');
    }
    return p;
  },

  key: (v) => `${v.m2}|${v.rug}|${v.lawn}|${v.rate}|${v.boxG}|${v.priceP}|${v.tank}|${v.flow}`,
});
