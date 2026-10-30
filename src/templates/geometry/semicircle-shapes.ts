import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, int, roundFloatDp, roundFloatSf } from '../../engine/format';

/**
 * Modelled on Set 22 2F Q23 / 2H Q9 (square ABCD with four semicircles on
 * its sides, square area 36 cm², total area to 1 d.p.). Stretch: a plate with
 * a semicircle cut from each end, area and perimeter to 3 s.f.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  side: number; // square side (foundational/core)
  L: number; // plate length (stretch)
  W: number; // plate width (stretch)
}

const PI = Math.PI;
const trunc = (x: number) => `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;

const semicircle = (v: V) => 0.5 * PI * (v.side / 2) ** 2;
const totalArea = (v: V) => v.side ** 2 + 4 * semicircle(v);
const plateArea = (v: V) => v.L * v.W - PI * (v.W / 2) ** 2;
const platePerimeter = (v: V) => 2 * v.L + PI * v.W;

export default defineTemplate<V>({
  id: 'geom-semicircle-shapes',
  title: 'Shapes made from squares and semicircles',
  strand: 'Geometry & Measures',
  subtopic: 'Area & perimeter problems',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'stretch') {
      const W = rng.int(4, 20);
      const L = rng.int(Math.ceil(W * 1.5), W * 3);
      const v = { level, side: 0, L, W };
      // Guard both rounded answers against rounding boundaries.
      ensure(!/\.0+$/.test(roundFloatSf(plateArea(v), 3)), 'avoid trailing zero answers');
      ensure(!/\.0+$/.test(roundFloatSf(platePerimeter(v), 3)), 'avoid trailing zero answers');
      return v;
    }
    const side = rng.int(3, 15);
    const v = { level, side, L: 0, W: 0 };
    ensure(!roundFloatDp(totalArea(v), 1).endsWith('.0'), 'avoid answers like 126.0');
    ensure(!roundFloatDp(semicircle(v), 1).endsWith('.0'), 'avoid answers like 77.0');
    ensure(side % 2 === 0 || side > 4, 'avoid tiny odd squares');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'stretch' && v.W >= v.L) p.push('cut-outs would overlap');
    if (v.level !== 'stretch' && v.side <= 0) p.push('side');
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: [
          ...lines(`A metal plate is made from a rectangle ${int(v.L)} cm long and ${int(v.W)} cm wide.`, 'A semicircle is cut from each end of the rectangle.', 'Each semicircle has the width of the rectangle as its diameter.'),
          diagram({ type: 'plateCutouts', lengthLabel: `${int(v.L)} cm`, widthLabel: `${int(v.W)} cm`, notAccurate: true }),
        ],
        parts: [
          part('a', 3, text('Work out the area of the plate.'), text('Give your answer correct to 3 significant figures.')),
          part('b', 2, text('Work out the perimeter of the plate.'), text('Give your answer correct to 3 significant figures.')),
        ],
      };
    }
    const stem = [
      text('The diagram shows a shape made from a square ABCD and 4 identical semicircles.'),
      diagram({ type: 'squareSemicircles', label: 'ABCD', notAccurate: true }),
      ...lines('As shown in the diagram, the semicircles have AB, BC, CD and DA as diameters.', `The area of the square is ${int(v.side ** 2)} cm²`),
    ];
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [part('a', 1, text('Work out the length of AB.')), part('b', 2, text('Work out the area of one of the semicircles.'), text('Give your answer correct to one decimal place.'))],
      };
    }
    return { stem, parts: [{ label: null, marks: 4, blocks: [text('Calculate the total area of the shape.'), text('Give your answer correct to one decimal place.')] }] };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: `${roundFloatSf(plateArea(v), 3)} cm²` }, { text: `${roundFloatSf(platePerimeter(v), 3)} cm` }];
    if (v.level === 'foundational') return [{ text: `${int(v.side)} cm` }, { text: `${roundFloatDp(semicircle(v), 1)} cm²` }];
    return [{ text: `${roundFloatDp(totalArea(v), 1)} cm²` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const r = v.W / 2;
      return [
        [
          step('P1', `Rectangle: ${int(v.L)} ${TIMES} ${int(v.W)} = ${int(v.L * v.W)} cm²`, 'Start with the whole rectangle before anything is cut out.'),
          step('P1', `Two semicircles make one circle of radius ${r} cm: π ${TIMES} ${r}² = ${trunc(PI * r * r)}`, 'Halve the diameter to get the radius.'),
          step('A1', `${int(v.L * v.W)} ${MINUS} ${trunc(PI * r * r)} = ${roundFloatSf(plateArea(v), 3)} cm²`, 'Subtract the cut-out, then round to 3 s.f.'),
        ],
        [
          step('M1', `2 ${TIMES} ${int(v.L)} + π ${TIMES} ${int(v.W)}`, 'The two long edges stay. Each curved edge is half a circle, so the two together make one full circumference (π × diameter).'),
          step('A1', `= ${roundFloatSf(platePerimeter(v), 3)} cm`, 'The short straight ends were cut away, so don’t include them.'),
        ],
      ];
    }
    const r = v.side / 2;
    const sideStep = (code: 'B1' | 'P1') => step(code, `$\\sqrt{${v.side ** 2}}$ = ${int(v.side)} cm`, 'The side of a square is the square root of its area.');
    if (v.level === 'foundational') {
      return [
        [sideStep('B1')],
        [step('M1', `radius = ${int(v.side)} ${DIV} 2 = ${r}, ½ ${TIMES} π ${TIMES} ${r}²`, 'A semicircle is half of a circle: ½ × π × r².'), step('A1', `= ${roundFloatDp(semicircle(v), 1)} cm²`, 'Round to one decimal place.')],
      ];
    }
    return [
      [
        sideStep('P1'),
        step('P1', `radius = ${int(v.side)} ${DIV} 2 = ${r} cm`, 'Each semicircle has a side of the square as its diameter.'),
        step('P1', `4 semicircles = 2 circles: 2 ${TIMES} π ${TIMES} ${r}² = ${trunc(4 * semicircle(v))}`, 'Four halves make two whole circles.'),
        step('A1', `${int(v.side ** 2)} + ${trunc(4 * semicircle(v))} = ${roundFloatDp(totalArea(v), 1)} cm²`, 'Add the square. Round only at the end.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Closed forms, written differently from the step-by-step route.
    if (v.level === 'stretch') {
      const area = v.W * (v.L - (PI * v.W) / 4);
      const per = PI * v.W + v.L + v.L;
      const a = parseFloat(answers[0].text);
      const b = parseFloat(answers[1].text);
      if (Math.abs(a - area) / area > 0.005) p.push(`area ${a} vs ${area}`);
      if (Math.abs(b - per) / per > 0.005) p.push(`perimeter ${b} vs ${per}`);
    } else {
      const total = v.side ** 2 * (1 + PI / 2);
      const shown = parseFloat(answers[answers.length - 1].text);
      const expect = v.level === 'core' ? total : (PI * v.side ** 2) / 8;
      if (Math.abs(shown - expect) > 0.05 + 1e-9) p.push(`area ${shown} vs ${expect}`);
    }
    return p;
  },

  key: (v) => `${v.side}|${v.L}|${v.W}`,
});
