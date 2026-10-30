import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure, fracTex, int, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 24 2H Q19 (statue and model: surface areas 3600 and 625,
 * model volume 750, find the statue's volume) and Set 22 2H Q22 (volume 20%
 * less, surface area k% less). Foundational uses two similar triangles.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier?: 'KS3' | 'F' | 'H';
  // foundational: triangle ABC ~ DEF with scale factor p/q
  p: number;
  q: number;
  sides: [number, number, number]; // small triangle sides (whole numbers)
  areaSmall: number;
  // core: area ratio (p/q)² gives volume ratio (p/q)³
  areaUnit: number;
  volSmall: number;
  thing: [string, string];
  // stretch
  r: number; // volume r% less
}

const THINGS: [string, string][] = [
  ['statue', 'model of the statue'],
  ['water tank', 'model of the water tank'],
  ['vase', 'miniature version of the vase'],
  ['lighthouse', 'model of the lighthouse'],
];

/** Exact decimal when it terminates, otherwise a fraction (e.g. 4/3). */
const show = (q: Q) => (q.terminatesWithin(6) ? dec(q) : `$${fracTex(q)}$`);

const texOf = (q: Q) => (q.terminatesWithin(6) ? dec(q) : fracTex(q));

const k = (r: number) => (1 - Math.pow(1 - r / 100, 2 / 3)) * 100;

/** Area scale factors are Higher only (G19): KS3 and Foundation find the perimeter instead. */
const areaPart = (v: V) => v.tier === 'H';
const perimeter = (v: V) => v.sides[0] + v.sides[1] + v.sides[2];

export default defineTemplate<V>({
  id: 'geom-similarity',
  title: 'Similar shapes',
  strand: 'Geometry & Measures',
  subtopic: 'Similarity',
  tiers: ['KS3', 'F', 'H'],
  // Area and volume scale factors are Higher only (G19): KS3 and Foundation work with lengths.
  levelsByTier: { KS3: ['foundational'], F: ['foundational'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, p: 1, q: 1, sides: [0, 0, 0], areaSmall: 0, areaUnit: 0, volSmall: 0, thing: rng.pick(THINGS), r: 0 };
    if (level === 'stretch') {
      const r = rng.int(10, 60);
      ensure(!roundFloatSf(k(r), 3).endsWith('.0'), 'avoid answers like 20.0');
      return { ...base, r };
    }
    const [p, q] = rng.pick([
      [3, 2],
      [5, 2],
      [4, 3],
      [5, 3],
      [5, 4],
      [7, 4],
      [2, 1],
      [3, 1],
    ]);
    if (level === 'foundational') {
      const s = q * rng.int(2, 5);
      const sides: [number, number, number] = [s, q * rng.int(2, 6), q * rng.int(2, 6)];
      ensure(sides[0] + sides[1] > sides[2] && sides[0] + sides[2] > sides[1] && sides[1] + sides[2] > sides[0], 'a real triangle');
      ensure(new Set(sides).size === 3, 'scalene, so matching sides matter');
      const areaSmall = q * q * rng.int(2, 12);
      return { ...base, p, q, sides, areaSmall };
    }
    const areaUnit = rng.int(5, 40);
    const volSmall = q ** 3 * rng.int(2, 30);
    return { ...base, p, q, areaUnit, volSmall };
  },

  validate(v) {
    return v.p > v.q || v.level === 'stretch' ? [] : ['larger shape must be bigger'];
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: lines(`A ${v.thing[0]} and a ${v.thing[1]} are mathematically similar.`, `The volume of the ${v.thing[1]} is ${v.r}% less than the volume of the ${v.thing[0]}.`, `The surface area of the ${v.thing[1]} is $k$% less than the surface area of the ${v.thing[0]}.`),
        parts: [single(4, text('Work out the value of $k$'), text('Give your answer correct to 3 significant figures.'))],
      };
    }
    if (v.level === 'foundational') {
      const [a, b, c] = v.sides;
      // Draw ABC with AB = a, AC = b, BC = c, and DEF scaled by p/q to the right.
      const cosA = (a * a + b * b - c * c) / (2 * a * b);
      const C: [number, number] = [b * cosA, b * Math.sqrt(1 - cosA * cosA)];
      const f = v.p / v.q;
      const off = a + 3;
      return {
        stem: [
          text('Triangle ABC is mathematically similar to triangle DEF.'),
          diagram({
            type: 'figure',
            points: { A: [0, 0], B: [a, 0], C, D: [off, 0], E: [off + a * f, 0], F: [off + C[0] * f, C[1] * f] },
            segments: [['A', 'B'], ['B', 'C'], ['C', 'A'], ['D', 'E'], ['E', 'F'], ['F', 'D']],
            edgeLabels: [
              { a: 'A', b: 'B', text: `${a} cm` },
              { a: 'A', b: 'C', text: `${b} cm` },
              { a: 'D', b: 'E', text: `${int((a * v.p) / v.q)} cm` },
              { a: 'E', b: 'F', text: 'x cm' },
            ],
            notAccurate: true,
          }),
          text(`BC = ${c} cm.`),
        ],
        parts: [
          part('a', 2, text('Work out the value of $x$')),
          areaPart(v) ? part('b', 2, text(`The area of triangle ABC is ${v.areaSmall} cm²`), text('Work out the area of triangle DEF.')) : part('b', 2, text('Work out the perimeter of triangle DEF.')),
        ],
      };
    }
    const [big, small] = v.thing;
    return {
      stem: lines(`A ${big} and a ${small} are mathematically similar.`, `The ${big} has a total surface area of ${int(v.areaUnit * v.p * v.p)} cm²`, `The ${small} has a total surface area of ${int(v.areaUnit * v.q * v.q)} cm²`, `The volume of the ${small} is ${int(v.volSmall)} cm³`),
      parts: [single(3, text(`Work out the volume of the ${big}.`))],
    };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: `$k$ = ${roundFloatSf(k(v.r), 3)}` }];
    const f = Q.of(v.p, v.q);
    if (v.level === 'foundational') return [{ text: `$x$ = ${dec(f.mul(v.sides[2]))}` }, { text: areaPart(v) ? `${dec(f.mul(f).mul(v.areaSmall))} cm²` : `${dec(f.mul(perimeter(v)))} cm` }];
    return [{ text: `${int(f.mul(f).mul(f).mul(v.volSmall).toInt())} cm³` }];
  },

  markScheme(v) {
    const f = Q.of(v.p, v.q);
    if (v.level === 'stretch') {
      const vol = 1 - v.r / 100;
      const len = Math.cbrt(vol);
      const area = len * len;
      const t = (x: number) => `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;
      return [
        [
          step('P1', `Volume scale factor = 1 ${MINUS} ${dec(Q.of(v.r, 100))} = ${dec(Q.of(100 - v.r, 100))}`, `${v.r}% less means ${100 - v.r}% of the original.`),
          step('P1', `Length scale factor = $\\sqrt[3]{${dec(Q.of(100 - v.r, 100))}}$ = ${t(len)}`, 'Volume factor = (length factor)³, so take the cube root.'),
          step('P1', `Area scale factor = ${t(len)}² = ${t(area)}`, 'Area factor = (length factor)².'),
          step('A1', `$k$ = (1 ${MINUS} ${t(area)}) × 100 = ${roundFloatSf(k(v.r), 3)}`, 'Turn the factor back into a percentage decrease.'),
        ],
      ];
    }
    if (v.level === 'foundational') {
      const [a, b, c] = v.sides;
      return [
        [step('M1', `Scale factor = ${int((a * v.p) / v.q)} ${DIV} ${a} = ${show(f)}`, 'Divide a pair of matching sides: AB matches DE.'), step('A1', `$x$ = ${c} × ${show(f)} = ${dec(f.mul(c))}`, 'EF matches BC.')],
        areaPart(v) ? [step('M1', `Area scale factor = ${show(f)}² = ${show(f.mul(f))}`, 'Areas scale by the square of the length factor.'), step('A1', `${v.areaSmall} × ${show(f.mul(f))} = ${dec(f.mul(f).mul(v.areaSmall))} cm²`, 'Not just × the length factor!')] : [
          step('M1', `DF = ${b} × ${show(f)} = ${dec(f.mul(b))}`, 'DF matches AC. You already have DE and EF.'),
          step('A1', `${int((a * v.p) / v.q)} + ${dec(f.mul(c))} + ${dec(f.mul(b))} = ${dec(f.mul(perimeter(v)))} cm`, 'Add all three sides of DEF (or ABC’s perimeter × the scale factor).'),
        ],
      ];
    }
    const A1 = v.areaUnit * v.p * v.p;
    const A2 = v.areaUnit * v.q * v.q;
    return [
      [
        step('M1', `Area factor = ${int(A1)} ${DIV} ${int(A2)} = ${show(f.mul(f))}, so length factor = $\\sqrt{${texOf(f.mul(f))}}$ = ${show(f)}`, 'Area factor = (length factor)², so square root.'),
        step('M1', `Volume factor = ${show(f)}³ = ${show(f.mul(f).mul(f))}`, 'Volume factor = (length factor)³.'),
        step('A1', `${int(v.volSmall)} × ${show(f.mul(f).mul(f))} = ${int(f.mul(f).mul(f).mul(v.volSmall).toInt())} cm³`, 'Check the bigger object has the bigger volume.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Area ratio = volume ratio ^ (2/3), computed with logs.
      const kk = 100 * (1 - Math.exp((2 / 3) * Math.log(1 - v.r / 100)));
      if (Math.abs(parseFloat(answers[0].text.replace(/[^\d.]/g, '')) - kk) > 0.05 * Math.pow(10, Math.floor(Math.log10(kk)) - 1) * 10) p.push('k');
      return p;
    }
    if (v.level === 'core') {
      // Recover the length factor from the areas by searching small fractions.
      const A1 = v.areaUnit * v.p * v.p;
      const A2 = v.areaUnit * v.q * v.q;
      let found: Q | null = null;
      for (let a = 1; a <= 20; a++) for (let b = 1; b <= 20; b++) if (Q.of(a * a, b * b).eq(Q.of(A1, A2))) found = Q.of(a, b);
      if (!found || answers[0].text !== `${int(found.mul(found).mul(found).mul(v.volSmall).toInt())} cm³`) p.push('volume');
    } else {
      if (!Q.of(v.p * v.sides[2], v.q).eq(Q.of(dec(Q.of(v.p * v.sides[2], v.q))))) p.push('x');
      // Perimeter by adding the three enlarged sides one at a time.
      const sum = v.sides.reduce((t, x) => t.add(Q.of(x * v.p, v.q)), Q.of(0));
      if (!areaPart(v) && answers[1].text !== `${dec(sum)} cm`) p.push('perimeter');
    }
    return p;
  },

  key: (v) => `${v.p}/${v.q}|${v.sides}|${v.areaSmall}|${v.areaUnit}|${v.volSmall}|${v.r}`,
});
