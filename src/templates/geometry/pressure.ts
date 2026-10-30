import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on June 2022 2H Q9 (a box exerts 180 N at a pressure of 187.5 N/m²;
 * the face is 1.2 m long: work out its width) and November 2022 3H Q25 (a
 * pyramid made of two materials: mass and density of the top, mass of the
 * bottom, average density: find the density of the bottom). The examiner
 * report says students used the AVERAGE density for one part, so the stretch
 * note warns against it.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: 'KS3' | 'F' | 'H';
  len: Q; // m
  wid: Q; // m
  force: Q; // N
  // stretch
  m1: Q;
  d1: Q;
  m2: Q;
  D: Q; // H: average density; F: second density
  v1: number; // F: cm³ of each metal
  v2: number;
}

const PRESSURE = 'pressure = $\\frac{\\text{force}}{\\text{area}}$';

export default defineTemplate<V>({
  id: 'geom-pressure-density',
  title: 'Pressure and density of combined solids',
  strand: 'Ratio & Proportion',
  subtopic: 'Compound measures & best buys',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  styleByLevel: { core: 'backwards', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, len: Q.of(0), wid: Q.of(0), force: Q.of(0), m1: Q.of(0), d1: Q.of(0), m2: Q.of(0), D: Q.of(0), v1: 0, v2: 0 };
    if (level !== 'stretch') {
      const len = Q.of(rng.int(4, 25), 10);
      const wid = Q.of(rng.int(3, 15), 10);
      const force = Q.of(rng.step(60, 900, 10));
      ensure(!len.eq(wid), 'a rectangle, not a square');
      const p = force.div(len.mul(wid));
      ensure(p.terminatesWithin(2), 'pressure to at most 2 dp');
      return { ...base, len, wid, force };
    }
    if (tier === 'H') {
      // Choose the given values; the bottom density is then usually not a tidy number (hence 3 s.f.).
      const d1 = Q.of(rng.int(15, 40), 10);
      const v1 = rng.int(15, 60);
      const m1 = d1.mul(v1);
      const D = Q.of(rng.int(45, 80), 10);
      const m2 = Q.of(rng.int(4000, 12000), 10);
      const v = { ...base, m1, d1, m2, D };
      const vol2 = m1.add(m2).div(D).sub(m1.div(d1));
      ensure(vol2.gt(0), 'a positive volume for the bottom part');
      const d2 = bottomDensity(v);
      ensure(d2.toNumber() > D.toNumber() + 0.5 && d2.toNumber() < 20 && !d2.terminatesWithin(2), 'a realistic density that needs rounding');
      ensure(!/\.0+$/.test(roundFloatSf(d2.toNumber(), 3)), 'no trailing zero');
      return v;
    }
    const v1 = rng.step(20, 200, 10);
    const v2 = rng.step(20, 200, 10);
    const d1 = Q.of(rng.int(25, 90), 10);
    const D = Q.of(rng.int(70, 195), 10);
    ensure(v1 !== v2 && !d1.eq(D), 'different amounts and metals');
    const mix = d1.mul(v1).add(D.mul(v2)).div(v1 + v2);
    ensure(mix.terminatesWithin(2), 'a tidy answer');
    return { ...base, v1, v2, d1, D };
  },

  validate(v) {
    return v.level === 'stretch' && v.tier === 'H' && !v.D.gt(v.d1) ? ['the bottom must be denser'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('A box in the shape of a cuboid is placed on a horizontal floor.', `The face in contact with the floor is a rectangle ${dec(v.len)} m by ${dec(v.wid)} m.`, `The box exerts a force of ${dec(v.force)} newtons on the floor.`, PRESSURE),
        parts: [single(3, text('Work out the pressure on the floor due to the box.'), text('Give your answer in newtons/m².'))],
      };
    }
    if (v.level === 'core') {
      const p = v.force.div(v.len.mul(v.wid));
      return {
        stem: lines('A box in the shape of a cuboid is placed on a horizontal floor.', `The box exerts a force of ${dec(v.force)} newtons on the floor.`, `The box exerts a pressure of ${dec(p)} newtons/m² on the floor.`, `The face in contact with the floor is a rectangle of length ${dec(v.len)} metres.`, PRESSURE),
        parts: [single(3, text('Work out the width of this face.'))],
      };
    }
    if (v.tier === 'H') {
      return {
        stem: lines('A solid is made from two parts, a top part and a bottom part, made of different materials.', `The top part has a mass of ${dec(v.m1)} g and is made from a material with a density of ${dec(v.d1)} g/cm³.`, `The bottom part has a mass of ${dec(v.m2)} g.`, `The average density of the whole solid is ${dec(v.D)} g/cm³.`),
        parts: [single(5, text('Work out the density of the material in the bottom part.'), text('Give your answer correct to 3 significant figures.'))],
      };
    }
    return {
      stem: lines(`Metal A has a density of ${dec(v.d1)} g/cm³.`, `Metal B has a density of ${dec(v.D)} g/cm³.`, `${v.v1} cm³ of metal A and ${v.v2} cm³ of metal B are melted and mixed to make an alloy.`),
      parts: [single(4, text('Work out the density of the alloy.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(v.force.div(v.len.mul(v.wid)))} newtons/m²` }];
    if (v.level === 'core') return [{ text: `${dec(v.wid)} m` }];
    if (v.tier === 'H') return [{ text: `${roundFloatSf(bottomDensity(v).toNumber(), 3)} g/cm³` }];
    return [{ text: `${dec(v.d1.mul(v.v1).add(v.D.mul(v.v2)).div(v.v1 + v.v2))} g/cm³` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const A = v.len.mul(v.wid);
      return [
        [
          step('M1', `${dec(v.len)} ${TIMES} ${dec(v.wid)} = ${dec(A)} m²`, 'Area of the face in contact with the floor.'),
          step('M1', `${dec(v.force)} ${DIV} ${dec(A)}`, 'Pressure = force ÷ area.'),
          step('A1', `${dec(v.force.div(A))} newtons/m²`, 'A smaller area would give a bigger pressure: check your answer makes sense.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const p = v.force.div(v.len.mul(v.wid));
      const A = v.len.mul(v.wid);
      return [
        [
          step('M1', `$${dec(p)} = \\frac{${dec(v.force)}}{\\text{area}}$`, 'Substitute the force and the pressure into the formula.'),
          step('M1', `area = ${dec(v.force)} ${DIV} ${dec(p)} = ${dec(A)} m²`, 'Rearrange: area = force ÷ pressure (not pressure ÷ force).'),
          step('A1', `${dec(A)} ${DIV} ${dec(v.len)} = ${dec(v.wid)} m`, 'Area of a rectangle = length × width, so divide by the length.'),
        ],
      ];
    }
    if (v.tier === 'H') {
      const v1 = v.m1.div(v.d1);
      const total = v.m1.add(v.m2).div(v.D);
      const v2 = total.sub(v1);
      return [
        [
          step('P1', `Top: ${dec(v.m1)} ${DIV} ${dec(v.d1)} = ${dec(v1)} cm³`, 'Volume = mass ÷ density, for the part where you know both.'),
          step('P1', `Total mass ${dec(v.m1)} + ${dec(v.m2)} = ${dec(v.m1.add(v.m2))} g`, 'The average density uses the TOTAL mass and TOTAL volume.'),
          step('P1', `Total volume ${dec(v.m1.add(v.m2))} ${DIV} ${dec(v.D)} = ${approx(total)} cm³`, 'Do not use the average density for one part on its own.'),
          step('P1', `Bottom: ${approx(total)} − ${dec(v1)} = ${approx(v2)} cm³, so ${dec(v.m2)} ${DIV} ${approx(v2)}`, 'Volume of the bottom part, then its density.'),
          step('A1', `${roundFloatSf(bottomDensity(v).toNumber(), 3)} g/cm³`, 'Check: it should be more than the average, as the top part is less dense.'),
        ],
      ];
    }
    const ma = v.d1.mul(v.v1);
    const mb = v.D.mul(v.v2);
    return [
      [
        step('P1', `A: ${dec(v.d1)} ${TIMES} ${v.v1} = ${dec(ma)} g`, 'Mass = density × volume, for each metal.'),
        step('P1', `B: ${dec(v.D)} ${TIMES} ${v.v2} = ${dec(mb)} g`, 'Same for metal B.'),
        step('P1', `(${dec(ma)} + ${dec(mb)}) ${DIV} (${v.v1} + ${v.v2})`, 'Density of the alloy = total mass ÷ total volume (not the mean of the two densities).'),
        step('A1', `${dec(ma.add(mb).div(v.v1 + v.v2))} g/cm³`, 'Check: it lies between the two densities.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = Q.of(answers[0].text.split(' ')[0]);
    if (v.level === 'foundational') {
      if (!num.mul(v.len).mul(v.wid).eq(v.force)) p.push('pressure × area should give the force');
      return p;
    }
    if (v.level === 'core') {
      const pr = v.force.div(v.len.mul(v.wid));
      if (!pr.mul(v.len).mul(num).eq(v.force)) p.push('width');
      return p;
    }
    if (v.tier === 'H') {
      // Mass-weighted harmonic mean: total mass / (m1/d1 + m2/d2) must give the average density.
      const d2 = num.toNumber();
      const avg = (v.m1.toNumber() + v.m2.toNumber()) / (v.m1.toNumber() / v.d1.toNumber() + v.m2.toNumber() / d2);
      if (Math.abs(avg - v.D.toNumber()) > 0.005 * v.D.toNumber()) p.push('average density');
      return p;
    }
    // Volume-weighted mean of the densities.
    const w = v.d1.mul(v.v1).add(v.D.mul(v.v2)).div(v.v1 + v.v2);
    if (!w.eq(num)) p.push('alloy density');
    return p;
  },

  key: (v) => `${v.tier === 'H' && v.level === 'stretch' ? 'H' : ''}|${v.len}|${v.wid}|${v.force}|${v.m1}|${v.d1}|${v.m2}|${v.D}|${v.v1}|${v.v2}`,
});

function bottomDensity(v: V): Q {
  const vol = v.m1.add(v.m2).div(v.D).sub(v.m1.div(v.d1));
  return v.m2.div(vol);
}
