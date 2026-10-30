import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on November 2022 1F Q14 (a map with scale 1 : 25 000; a road is
 * 6 cm long on the map: real length in km) and June 2022 2F Q16 (a building
 * drawn 12.4 cm by 9.4 cm; the real length is 62 m: real width). The stretch
 * question works with AREA, where the scale factor is squared.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  s: number; // scale 1 : s
  a: Q; // cm on the map / drawing
  b: Q; // foundational: real km to convert back; core/stretch: second drawn length
  price: number; // stretch: £ per hectare
}

export default defineTemplate<V>({
  id: 'geom-scales',
  title: 'Maps and scale drawings',
  strand: 'Geometry & Measures',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, s: 0, a: Q.of(0), b: Q.of(0), price: 0 };
    if (level === 'foundational') {
      const s = rng.pick([10000, 20000, 25000, 50000, 100000]);
      const a = Q.of(rng.int(calc === 'calc' ? 15 : 2, calc === 'calc' ? 150 : 15), calc === 'calc' ? 10 : 1);
      const b = Q.of(rng.int(2, 30), 2); // km, in halves
      ensure(b.mul(100000).div(s).terminatesWithin(1), 'a map distance to 1 dp');
      ensure(!a.mul(s).div(100000).eq(b), 'two different distances');
      return { ...base, s, a, b };
    }
    if (level === 'core') {
      const s = rng.pick([100, 200, 250, 400, 500]);
      const a = Q.of(rng.int(60, 180), 10);
      const b = Q.of(rng.int(30, 120), 10);
      ensure(a.gt(b) && a.mul(s).div(100).terminatesWithin(2) && b.mul(s).div(100).terminatesWithin(2), 'tidy real lengths');
      return { ...base, s, a, b };
    }
    const s = rng.pick([2000, 2500, 5000, 10000]);
    const a = Q.of(rng.int(8, 30), 2);
    const b = Q.of(rng.int(6, 24), 2);
    const price = rng.step(8000, 25000, 500);
    const ha = a.mul(s).div(100).mul(b.mul(s).div(100)).div(10000);
    ensure(!a.eq(b) && ha.terminatesWithin(2) && ha.toNumber() >= 1 && ha.toNumber() <= 200 && ha.mul(price).isInt(), 'a sensible field');
    return { ...base, s, a, b, price };
  },

  validate(v) {
    return v.s > 0 ? [] : ['scale'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`A map has a scale of 1 : ${int(v.s)}`)],
        parts: [
          part('a', 2, text(`On the map, a road has a length of ${dec(v.a)} cm.`), text('Work out the length, in kilometres, of the real road.')),
          part('b', 2, text(`Two villages are ${dec(v.b)} km apart.`), text('How far apart, in centimetres, are the villages on the map?')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`On a scale drawing, a building has length ${dec(v.a)} cm and width ${dec(v.b)} cm.`, `The real length of the building is ${dec(v.a.mul(v.s).div(100))} metres.`),
        parts: [single(3, text('Work out, in metres, the real width of the building.'))],
      };
    }
    return {
      stem: lines(`A map has a scale of 1 : ${int(v.s)}`, `On the map, a field is a rectangle ${dec(v.a)} cm by ${dec(v.b)} cm.`, `${v.name} wants to buy the field. The field costs ${money(v.price * 100)} per hectare.`, '1 hectare = 10 000 m²'),
      parts: [single(4, text('Work out the cost of the field.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(v.a.mul(v.s).div(100000))} km` }, { text: `${dec(v.b.mul(100000).div(v.s))} cm` }];
    if (v.level === 'core') return [{ text: `${dec(v.b.mul(v.s).div(100))} m` }];
    return [{ text: money(hectares(v).mul(v.price * 100).toInt()) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const cm = v.a.mul(v.s);
      return [
        [step('M1', `${dec(v.a)} ${TIMES} ${int(v.s)} = ${dec(cm)} cm`, `Every 1 cm on the map is ${int(v.s)} cm in real life.`), step('A1', `${dec(cm)} ${DIV} 100 ${DIV} 1000 = ${dec(cm.div(100000))} km`, 'cm to m: ÷ 100. m to km: ÷ 1000.')],
        [step('M1', `${dec(v.b)} km = ${dec(v.b.mul(100000))} cm`, 'Change the real distance to cm first.'), step('A1', `${dec(v.b.mul(100000))} ${DIV} ${int(v.s)} = ${dec(v.b.mul(100000).div(v.s))} cm`, 'Real to map: divide by the scale.')],
      ];
    }
    if (v.level === 'core') {
      const k = Q.of(v.s, 100);
      return [
        [
          step('M1', `${dec(v.a.mul(k))} ${DIV} ${dec(v.a)} = ${dec(k)}`, '1 cm on the drawing represents this many metres.'),
          step('M1', `${dec(v.b)} ${TIMES} ${dec(k)}`, 'Use the same scale for the width.'),
          step('A1', `${dec(v.b.mul(k))} m`, 'Check: the width should be shorter than the length, as on the drawing.'),
        ],
      ];
    }
    const L = v.a.mul(v.s).div(100);
    const W = v.b.mul(v.s).div(100);
    const ha = hectares(v);
    return [
      [
        step('P1', `${dec(v.a)} ${TIMES} ${int(v.s)} ${DIV} 100 = ${dec(L)} m, ${dec(v.b)} ${TIMES} ${int(v.s)} ${DIV} 100 = ${dec(W)} m`, 'Change each map length to a real length first (not the map area).'),
        step('P1', `${dec(L)} ${TIMES} ${dec(W)} = ${int(L.mul(W).toNumber())} m²`, 'Real area of the field.'),
        step('P1', `${int(L.mul(W).toNumber())} ${DIV} 10 000 = ${dec(ha)} hectares`, 'm² to hectares.'),
        step('A1', `${dec(ha)} ${TIMES} ${money(v.price * 100)} = ${money(ha.mul(v.price * 100).toInt())}`, `Scaling the map AREA by ${int(v.s)} instead of ${int(v.s)}² is the common mistake.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = (s: string) => Q.of(s.replace(/[£,\s]|km|cm|m$/g, '').replace(/ /g, ''));
    if (v.level === 'foundational') {
      // Convert back: km → cm → map cm must give the map length.
      if (!num(answers[0].text).mul(100000).div(v.s).eq(v.a)) p.push('road');
      if (!num(answers[1].text).mul(v.s).div(100000).eq(v.b)) p.push('villages');
      return p;
    }
    if (v.level === 'core') {
      // Ratios of lengths are the same on the drawing and in real life.
      const realL = v.a.mul(v.s).div(100);
      if (!num(answers[0].text).mul(v.a).eq(realL.mul(v.b))) p.push('width');
      return p;
    }
    // Area scale factor s², then cm² → hectares.
    const cm2 = v.a.mul(v.b).mul(v.s * v.s);
    const ha = cm2.div(10000).div(10000);
    const pounds = Q.of(answers[0].text.replace(/[£\s ]/g, ''));
    if (!pounds.eq(ha.mul(v.price))) p.push('cost');
    return p;
  },

  key: (v) => `${v.s}|${v.a}|${v.b}|${v.price}`,
});

function hectares(v: V): Q {
  return v.a.mul(v.s).div(100).mul(v.b.mul(v.s).div(100)).div(10000);
}
