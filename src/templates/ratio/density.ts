import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, table, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int, roundFloatDp, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 24 2F Q18 / 2H Q4 (two solids melted into one: density of
 * the new solid) and Set 22 2F Q24 (cylinder, diameter, mass in kg: density
 * in g/cm³). Stretch identifies the metal from a table of densities.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // foundational: cuboid
  dims: [number, number, number];
  material: string; // foundational
  density: Q; // g/cm³ of the cuboid (foundational) or true metal (stretch)
  // core: cylinder A + solid B
  r: number;
  h: number;
  massA: number; // g
  massB: number; // g
  volB: number; // cm³
  // stretch
  diameter: number;
  massKg: Q;
}

const METALS: [string, Q][] = [
  ['aluminium', Q.of('2.7')],
  ['zinc', Q.of('7.1')],
  ['iron', Q.of('7.9')],
  ['copper', Q.of('9')],
  ['silver', Q.of('10.5')],
  ['lead', Q.of('11.3')],
  ['gold', Q.of('19.3')],
];
// Each material with a realistic density in g/cm³.
const CUBOID_MATERIALS: [string, string][] = [
  ['pine wood', '0.45'],
  ['oak wood', '0.75'],
  ['plastic', '1.2'],
  ['glass', '2.5'],
  ['aluminium', '2.7'],
  ['iron', '7.9'],
];

const cylVol = (r: number, h: number) => Math.PI * r * r * h;
const coreDensity = (v: V) => (v.massA + v.massB) / (cylVol(v.r, v.h) + v.volB);
const stretchDensity = (v: V) => (v.massKg.toNumber() * 1000) / cylVol(v.diameter / 2, v.h);

export default defineTemplate<V>({
  id: 'ratio-density',
  title: 'Density problems',
  strand: 'Ratio & Proportion',
  subtopic: 'Compound measures & best buys',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, dims: [0, 0, 0], material: '', density: Q.of(0), r: 0, h: 0, massA: 0, massB: 0, volB: 0, diameter: 0, massKg: Q.of(0) };
    if (level === 'foundational') {
      const dims: [number, number, number] = [rng.int(2, 20), rng.int(2, 15), rng.int(2, 12)];
      const [material, d] = rng.pick(CUBOID_MATERIALS);
      const density = Q.of(d);
      ensure(density.mul(dims[0] * dims[1] * dims[2]).isInt(), 'whole-gram mass');
      return { ...base, dims, density, material };
    }
    if (level === 'core') {
      const r = rng.int(2, 6);
      const h = rng.int(3, 12);
      const [dA, dB] = rng.sample(METALS, 2).map((m) => m[1].toNumber());
      const massA = Math.round(dA * cylVol(r, h) / 10) * 10;
      const volB = rng.step(100, 800, 25);
      const massB = Math.round((dB * volB) / 5) * 5;
      const v = { ...base, r, h, massA, massB, volB };
      ensure(!roundFloatDp(coreDensity(v), 1).endsWith('.0'), 'avoid answers like 8.0');
      return v;
    }
    const [, d] = rng.pick(METALS);
    const diameter = rng.int(4, 16);
    const h = rng.int(2, 12);
    const massKg = Q.of(Math.round(d.toNumber() * cylVol(diameter / 2, h) / 10), 100);
    ensure(massKg.gt(Q.of(1, 10)), 'heavy enough to measure');
    const v = { ...base, diameter, h, massKg, density: d };
    // The computed density must clearly match this metal and no other.
    const got = stretchDensity(v);
    const nearest = METALS.reduce((a, b) => (Math.abs(b[1].toNumber() - got) < Math.abs(a[1].toNumber() - got) ? b : a));
    ensure(nearest[1].eq(d) && Math.abs(got - d.toNumber()) < 0.05, 'must identify the metal');
    roundFloatSf(got, 3);
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'core' && (v.massA <= 0 || v.massB <= 0)) p.push('masses positive');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      const [l, w, hh] = v.dims;
      const mass = v.density.mul(l * w * hh);
      return {
        stem: lines(`A solid block of ${v.material} is in the shape of a cuboid.`, `The cuboid measures ${l} cm by ${w} cm by ${hh} cm.`, `The mass of the block is ${dec(mass)} g`),
        parts: [part('a', 2, text('Work out the volume of the block.')), part('b', 2, text('Work out the density of the block.'), text('Give the units of your answer.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(
          'Solid A and solid B are made from two different metals.',
          `Solid A is a cylinder with radius ${v.r} cm and height ${v.h} cm.`,
          `Solid A has a mass of ${int(v.massA)} g`,
          `Solid B has a mass of ${int(v.massB)} g`,
          `Solid B has a volume of ${v.volB} cm³`,
          'All of the metal from solid A and solid B is melted down to make a uniform solid C.',
          'There is no change to the total mass or the total volume.',
        ),
        parts: [single(3, text('Work out the density of solid C.'), text('Give your answer correct to one decimal place.'))],
      };
    }
    return {
      stem: [
        ...lines('A solid cylinder is made from one of the metals in the table.', `The cylinder has diameter ${v.diameter} cm and height ${v.h} cm.`, `The mass of the cylinder is ${dec(v.massKg)} kg`),
        table({ header: ['Metal', ...METALS.map((m) => m[0])], rows: [['Density (g/cm³)', ...METALS.map((m) => dec(m[1]))]], rowHeaders: true }),
      ],
      parts: [single(4, text('Which metal is the cylinder made from?'), text('You must show how you get your answer.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const vol = v.dims[0] * v.dims[1] * v.dims[2];
      return [{ text: `${int(vol)} cm³` }, { text: `${dec(v.density)} g/cm³` }];
    }
    if (v.level === 'core') return [{ text: `${roundFloatDp(coreDensity(v), 1)} g/cm³` }];
    const name = METALS.find((m) => m[1].eq(v.density))![0];
    return [{ text: `${name[0].toUpperCase()}${name.slice(1)} (density ${roundFloatSf(stretchDensity(v), 3)} g/cm³)` }];
  },

  markScheme(v) {
    const trunc = (x: number) => `${(Math.floor(x * 100) / 100).toFixed(2)}…`;
    if (v.level === 'foundational') {
      const [l, w, hh] = v.dims;
      const vol = l * w * hh;
      const mass = v.density.mul(vol);
      return [
        [step('M1', `${l} ${TIMES} ${w} ${TIMES} ${hh}`, 'Volume of a cuboid = length × width × height.'), step('A1', `= ${int(vol)} cm³`, 'cm × cm × cm gives cm³.')],
        [step('M1', `${dec(mass)} ${DIV} ${int(vol)}`, 'Density = mass ÷ volume.'), step('A1', `= ${dec(v.density)} g/cm³`, 'Grams ÷ cm³ gives g/cm³.')],
      ];
    }
    if (v.level === 'core') {
      const va = cylVol(v.r, v.h);
      return [
        [
          step('P1', `Volume of A = π ${TIMES} ${v.r}² ${TIMES} ${v.h} = ${trunc(va)} cm³`, 'Volume of a cylinder = πr²h.'),
          step('P1', `(${int(v.massA)} + ${int(v.massB)}) ${DIV} (${trunc(va)} + ${v.volB})`, 'Total mass ÷ total volume. You can’t just average the two densities.'),
          step('A1', `${roundFloatDp(coreDensity(v), 1)} g/cm³`, 'Round to 1 decimal place at the end.'),
        ],
      ];
    }
    const r = v.diameter / 2;
    const vol = cylVol(r, v.h);
    const name = METALS.find((m) => m[1].eq(v.density))![0];
    return [
      [
        step('P1', `radius = ${v.diameter} ${DIV} 2 = ${r} cm, volume = π ${TIMES} ${r}² ${TIMES} ${v.h} = ${trunc(vol)} cm³`, 'Halve the diameter first.'),
        step('P1', `${dec(v.massKg)} kg = ${dec(v.massKg.mul(1000))} g`, 'The densities are in g/cm³, so change kg to g.'),
        step('P1', `${dec(v.massKg.mul(1000))} ${DIV} ${trunc(vol)} = ${trunc(stretchDensity(v))} g/cm³`, 'Density = mass ÷ volume.'),
        step('C1', `${trunc(stretchDensity(v))} is closest to ${dec(v.density)}, so ${name}`, 'Compare with the table and name the metal.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      const [l, w, hh] = v.dims;
      // Mass ÷ density must give back the volume.
      if (!v.density.mul(l * w * hh).div(v.density).eq(l * w * hh)) p.push('volume');
      return p;
    }
    if (v.level === 'core') {
      const d = (v.massA + v.massB) / ((v.r * v.r * v.h * 355) / 113 + v.volB); // π ≈ 355/113 (error < 3e-7)
      if (Math.abs(parseFloat(answers[0].text) - d) > 0.051) p.push(`density ${answers[0].text} vs ${d}`);
      return p;
    }
    const d = (v.massKg.toNumber() * 1000 * 4) / (Math.PI * v.diameter * v.diameter * v.h);
    const best = METALS.map(([n, x]) => [n, Math.abs(x.toNumber() - d)] as const).sort((a, b) => a[1] - b[1]);
    if (!answers[0].text.toLowerCase().startsWith(best[0][0])) p.push('wrong metal');
    if (best[1][1] < 0.3) p.push('two metals too close to tell apart');
    return p;
  },

  key: (v) => `${v.dims}|${v.density}|${v.r}|${v.h}|${v.massA}|${v.massB}|${v.volB}|${v.diameter}|${v.massKg}`,
});
