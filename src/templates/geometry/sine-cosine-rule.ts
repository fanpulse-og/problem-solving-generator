import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text } from '../../engine/blocks';
import { ensure, roundFloatSf } from '../../engine/format';

/**
 * Modelled on Set 22 2H Q16 (kite ABCD, AB = 6, BC = 11, angle ABC = 118°:
 * area) and Set 24 2H Q17 (AB, BC, area 12 cm², angle ABC acute: perimeter).
 * Foundational: area ½ab sin C, then the third side by the cosine rule.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number; // AB
  b: number; // BC
  angle: number; // angle ABC in degrees (stretch: derived from the area)
  area: number; // stretch: given area
}

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const t4 = (x: number) => `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;
const third = (a: number, b: number, C: number) => Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(rad(C)));
const sf3 = (x: number) => roundFloatSf(x, 3);

function trianglePoints(a: number, b: number, angle: number): Record<string, [number, number]> {
  // B at the origin, A along the x-axis, C at the given angle.
  return { B: [0, 0], A: [a, 0], C: [b * Math.cos(rad(angle)), b * Math.sin(rad(angle))] };
}

export default defineTemplate<V>({
  id: 'geom-sine-cosine-rule',
  title: 'Area of a triangle and the cosine rule',
  strand: 'Geometry & Measures',
  subtopic: 'Trigonometry',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const a = rng.int(4, 15);
    const b = rng.int(4, 15);
    ensure(a !== b, 'two different sides');
    if (level === 'stretch') {
      const area = rng.int(Math.ceil(a * b * 0.15), Math.floor(a * b * 0.45));
      const angle = deg(Math.asin((2 * area) / (a * b)));
      ensure(angle > 15 && angle < 75, 'a clearly acute angle');
      const v = { level, a, b, angle, area };
      const per = a + b + third(a, b, angle);
      ensure(!/\.0$/.test(sf3(per)), 'avoid trailing zero');
      return v;
    }
    const angle = level === 'core' ? rng.int(95, 140) : rng.int(35, 130);
    const v = { level, a, b, angle, area: 0 };
    ensure(!/\.0$/.test(sf3(0.5 * a * b * Math.sin(rad(angle)) * (level === 'core' ? 2 : 1))), 'avoid trailing zero');
    if (level === 'foundational') ensure(!/\.0$/.test(sf3(third(a, b, angle))), 'avoid trailing zero');
    return v;
  },

  validate(v) {
    return v.a > 0 && v.b > 0 ? [] : ['sides'];
  },

  render(v) {
    if (v.level === 'core') {
      // Kite ABCD symmetric about AC: AB = AD = a, CB = CD = b, angle ABC = angle ADC.
      const AC = third(v.a, v.b, v.angle);
      const cosA = (v.a * v.a + AC * AC - v.b * v.b) / (2 * v.a * AC);
      const sinA = Math.sqrt(1 - cosA * cosA);
      const A: [number, number] = [0, 0];
      const C: [number, number] = [AC, 0];
      const B: [number, number] = [v.a * cosA, -v.a * sinA];
      const D: [number, number] = [v.a * cosA, v.a * sinA];
      return {
        stem: [
          text('The diagram shows a kite ABCD.'),
          diagram({ type: 'figure', points: { A, B, C, D }, segments: [['A', 'B'], ['B', 'C'], ['C', 'D'], ['D', 'A']], angles: [{ at: 'B', from: 'A', to: 'C', text: `${v.angle}°` }], edgeLabels: [{ a: 'A', b: 'B', text: `${v.a} cm` }, { a: 'B', b: 'C', text: `${v.b} cm` }], notAccurate: true }),
          text(`AB = ${v.a} cm\u2003\u2003BC = ${v.b} cm\u2003\u2003Angle ABC = ${v.angle}°`),
        ],
        parts: [single(3, text('Calculate the area of the kite.'), text('Give your answer correct to 3 significant figures.'))],
      };
    }
    const pts = trianglePoints(v.a, v.b, v.angle);
    const d = diagram({
      type: 'figure',
      points: pts,
      segments: [['A', 'B'], ['B', 'C'], ['C', 'A']],
      angles: v.level === 'foundational' ? [{ at: 'B', from: 'A', to: 'C', text: `${v.angle}°` }] : [],
      edgeLabels: [{ a: 'A', b: 'B', text: `${v.a} cm` }, { a: 'B', b: 'C', text: `${v.b} cm` }],
      notAccurate: true,
    });
    if (v.level === 'foundational') {
      return {
        stem: [text('The diagram shows triangle ABC.'), d],
        parts: [
          part('a', 2, text('Work out the area of triangle ABC.'), text('Give your answer correct to 3 significant figures.')),
          part('b', 3, text('Work out the length of AC.'), text('Give your answer correct to 3 significant figures.')),
        ],
      };
    }
    return {
      stem: [text('The diagram shows triangle ABC.'), d, ...lines(`AB = ${v.a} cm\u2003\u2003BC = ${v.b} cm\u2003\u2003Angle ABC is acute.`, `The area of triangle ABC is ${v.area} cm²`)],
      parts: [single(5, text('Work out the perimeter of triangle ABC.'), text('Give your answer correct to 3 significant figures.'))],
    };
  },

  answer(v) {
    const area = 0.5 * v.a * v.b * Math.sin(rad(v.angle));
    if (v.level === 'foundational') return [{ text: `${sf3(area)} cm²` }, { text: `${sf3(third(v.a, v.b, v.angle))} cm` }];
    if (v.level === 'core') return [{ text: `${sf3(2 * area)} cm²` }];
    return [{ text: `${sf3(v.a + v.b + third(v.a, v.b, v.angle))} cm` }];
  },

  markScheme(v) {
    const area = 0.5 * v.a * v.b * Math.sin(rad(v.angle));
    const ac = third(v.a, v.b, v.angle);
    const cos = `$${v.a}^2 + ${v.b}^2 - 2 \\times ${v.a} \\times ${v.b} \\times \\cos B$`;
    if (v.level === 'foundational') {
      return [
        [step('M1', `½ × ${v.a} × ${v.b} × sin ${v.angle}°`, 'Area = ½ab sin C, using the two sides either side of the angle.'), step('A1', `${sf3(area)} cm²`, 'Round to 3 s.f.')],
        [
          step('M1', `AC² = ${cos.replace('B', `${v.angle}°`)}`, 'Two sides and the angle between them: use the cosine rule.'),
          step('M1', `AC² = ${t4(ac * ac)}`, 'Work it out on your calculator in one go.'),
          step('A1', `AC = ${sf3(ac)} cm`, 'Square root, then round.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `Area of triangle ABC = ½ × ${v.a} × ${v.b} × sin ${v.angle}° = ${t4(area)}`, 'Area = ½ab sin C with the two sides either side of angle B.'),
          step('M1', `Kite = 2 × ${t4(area)}`, 'The diagonal AC is a line of symmetry, so triangle ADC is identical to triangle ABC.'),
          step('A1', `${sf3(2 * area)} cm²`, 'Round to 3 s.f. at the end.'),
        ],
      ];
    }
    return [
      [
        step('M1', `½ × ${v.a} × ${v.b} × sin B = ${v.area}`, 'Use the area formula backwards.'),
        step('A1', `sin B = ${t4((2 * v.area) / (v.a * v.b))}, B = ${t4(v.angle)}°`, 'B is acute, so take the angle from sin⁻¹ directly.'),
        step('M1', `AC² = ${cos.replace('B', `${t4(v.angle)}°`)}`, 'Now use the cosine rule for the third side.'),
        step('A1', `AC = ${t4(ac)}`, 'Keep the full value.'),
        step('A1', `${v.a} + ${v.b} + ${t4(ac)} = ${sf3(v.a + v.b + ac)} cm`, 'Perimeter: add all three sides, then round.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const near = (s: string, x: number) => Math.abs(parseFloat(s) - x) <= 0.5 * 10 ** (Math.floor(Math.log10(x)) - 2) + 1e-9;
    // Coordinates + shoelace + distance formula (no trig rules).
    const pts = trianglePoints(v.a, v.b, v.angle);
    const [A, B, C] = [pts.A, pts.B, pts.C];
    const shoe = Math.abs((A[0] * (B[1] - C[1]) + B[0] * (C[1] - A[1]) + C[0] * (A[1] - B[1])) / 2);
    const ac = Math.hypot(A[0] - C[0], A[1] - C[1]);
    if (v.level === 'foundational' && (!near(answers[0].text, shoe) || !near(answers[1].text, ac))) p.push('area or AC');
    if (v.level === 'core' && !near(answers[0].text, 2 * shoe)) p.push('kite');
    if (v.level === 'stretch') {
      if (Math.abs(shoe - v.area) > 1e-6) p.push('area mismatch');
      if (!near(answers[0].text, v.a + v.b + ac)) p.push('perimeter');
    }
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.angle}|${v.area}`,
});
