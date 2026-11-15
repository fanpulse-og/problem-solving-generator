import { defineTemplate } from '../../engine/types';
import { diagram, single, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp, roundFloatSf } from '../../engine/format';

/**
 * The sine rule in triangle ABC: a missing side from two angles and a side
 * (Practice), a missing acute angle from two sides and an angle (Apply), and a
 * side then the area ½ab sin C (Extend). check() rebuilds the triangle from
 * coordinates and measures it, rather than using the sine rule again.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  A: number; // angle BAC, degrees
  B: number; // angle ABC, degrees (core: the answer, not shown)
  a: number; // BC (foundational, core)
  b: number; // AC (core)
  c: number; // AB (stretch)
}

const rad = (d: number) => (d * Math.PI) / 180;
const sin = (d: number) => Math.sin(rad(d));
/** Unrounded answers. */
const sideAC = (v: V) => (v.level === 'stretch' ? (v.c * sin(v.B)) / sin(180 - v.A - v.B) : (v.a * sin(v.B)) / sin(v.A));
const angleB = (v: V) => (Math.asin((v.b * sin(v.A)) / v.a) * 180) / Math.PI;
const area = (v: V) => 0.5 * sideAC(v) * v.c * sin(v.A);
/** Rounded answers must not end in a zero, such as 12.0 */
const tidy = (s: string) => {
  ensure(!/\.\d*0$/.test(s), 'an answer without a trailing zero');
  return s;
};

export default defineTemplate<V>({
  id: 'geom-sine-rule',
  title: 'The sine rule',
  strand: 'Geometry & Measures',
  subtopic: 'Trigonometry',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'calc',

  generate({ rng, level }) {
    const A = rng.int(28, 75);
    if (level === 'core') {
      // a > b, so angle B is smaller than angle A and must be acute.
      const a = rng.int(8, 20);
      const b = rng.int(5, a - 2);
      const v = { level, A, B: 0, a, b, c: 0 };
      ensure(angleB(v) > 15 && A + angleB(v) < 150, 'a well-shaped triangle');
      tidy(roundFloatDp(angleB(v), 1));
      return v;
    }
    const B = rng.int(30, 80);
    ensure(A !== B && A + B >= 80 && A + B <= 140 && A + B !== 90, 'a well-shaped triangle that is not right-angled or isosceles');
    const v = { level, A, B, a: rng.int(6, 20), b: 0, c: rng.int(6, 20) };
    tidy(roundFloatSf(sideAC(v), 3));
    if (level === 'stretch') tidy(roundFloatSf(area(v), 3));
    return v;
  },

  validate(v) {
    return v.A > 0 && v.A < 180 ? [] : ['angle out of range'];
  },

  render(v) {
    // A at the origin, B along the x-axis, C above.
    const B = v.level === 'core' ? angleB(v) : v.B;
    const AB = v.level === 'stretch' ? v.c : (v.a * sin(180 - v.A - B)) / sin(v.A);
    const AC = (AB * sin(B)) / sin(180 - v.A - B);
    const points: Record<string, [number, number]> = { A: [0, 0], B: [AB, 0], C: [AC * Math.cos(rad(v.A)), AC * sin(v.A)] };
    const angles = [{ at: 'A', from: 'B', to: 'C', text: `${v.A}°` }];
    if (v.level !== 'core') angles.push({ at: 'B', from: 'C', to: 'A', text: `${v.B}°` });
    const edgeLabels =
      v.level === 'stretch' ? [{ a: 'A', b: 'B', text: `${v.c} cm` }] : v.level === 'core' ? [{ a: 'B', b: 'C', text: `${v.a} cm` }, { a: 'A', b: 'C', text: `${v.b} cm` }] : [{ a: 'B', b: 'C', text: `${v.a} cm` }];
    const d = diagram({ type: 'figure', points, segments: [['A', 'B'], ['B', 'C'], ['C', 'A']], angles, edgeLabels, notAccurate: true });
    if (v.level === 'foundational') return { stem: [text('The diagram shows triangle ABC.'), d], parts: [single(3, text('Work out the length of AC.'), text('Give your answer correct to 3 significant figures.'))] };
    if (v.level === 'core') return { stem: [text('The diagram shows triangle ABC.'), d, text('Angle ABC is acute.')], parts: [single(3, text('Work out the size of angle ABC.'), text('Give your answer correct to 1 decimal place.'))] };
    return { stem: [text('The diagram shows triangle ABC.'), d], parts: [single(5, text('Work out the area of triangle ABC.'), text('Give your answer correct to 3 significant figures.'))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${roundFloatSf(sideAC(v), 3)} cm` }];
    if (v.level === 'core') return [{ text: `${roundFloatDp(angleB(v), 1)}°` }];
    return [{ text: `${roundFloatSf(area(v), 3)} cm²` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `$\\dfrac{AC}{\\sin ${v.B}°} = \\dfrac{${v.a}}{\\sin ${v.A}°}$`, 'Sine rule: each side is paired with the angle OPPOSITE it. AC is opposite angle B.'),
          step('M1', `$AC = \\dfrac{${v.a} \\times \\sin ${v.B}°}{\\sin ${v.A}°}$`, 'Multiply both sides by sin B.'),
          step('A1', `${roundFloatSf(sideAC(v), 3)} cm`, 'Check your calculator is in degrees.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\dfrac{\\sin B}{${v.b}} = \\dfrac{\\sin ${v.A}°}{${v.a}}$`, 'For a missing angle, write the sine rule with the sines on top.'),
          step('M1', `$\\sin B = \\dfrac{${v.b} \\times \\sin ${v.A}°}{${v.a}} = ${roundFloatDp((v.b * sin(v.A)) / v.a, 4)}…$`, 'Keep the full calculator value.'),
          step('A1', `${roundFloatDp(angleB(v), 1)}°`, 'Use the inverse sine. The question says the angle is acute.'),
        ],
      ];
    }
    const C = 180 - v.A - v.B;
    return [
      [
        step('M1', `Angle ACB = 180 − ${v.A} − ${v.B} = ${C}°`, 'The known side AB is opposite angle C, so find angle C first.'),
        step('M1', `$\\dfrac{AC}{\\sin ${v.B}°} = \\dfrac{${v.c}}{\\sin ${C}°}$`, 'Sine rule: pair each side with the angle opposite it.'),
        step('A1', `AC = ${roundFloatDp(sideAC(v), 3)}… cm`, 'Do not round yet.'),
        step('M1', `$\\frac{1}{2} \\times ${v.c} \\times ${roundFloatDp(sideAC(v), 3)}… \\times \\sin ${v.A}°$`, 'Area = ½ab sin C, using two sides and the angle BETWEEN them.'),
        step('A1', `${roundFloatSf(area(v), 3)} cm²`, 'Round only at the end.'),
      ],
    ];
  },

  check(v, answers) {
    const got = Number(/[\d.]+/.exec(answers[0].text)?.[0]);
    const dist = (p: number[], q: number[]) => Math.hypot(p[0] - q[0], p[1] - q[1]);
    if (v.level === 'core') {
      // Put C at (b cos A, b sin A); B is on the x-axis, a from C, beyond the foot of the perpendicular.
      const h = v.b * sin(v.A);
      const want = (Math.atan2(h, Math.sqrt(v.a * v.a - h * h)) * 180) / Math.PI;
      return Math.abs(got - want) <= 0.051 ? [] : [`expected about ${want.toFixed(2)}`];
    }
    // C is where the ray from A at angle A meets the ray from B at angle B.
    const AB = v.level === 'stretch' ? v.c : null;
    const tA = Math.tan(rad(v.A));
    const tB = Math.tan(rad(v.B));
    // With AB = 1: x tanA = (1 − x) tanB.
    const x = tB / (tA + tB);
    const unit = { C: [x, x * tA], BC: dist([1, 0], [x, x * tA]), AC: dist([0, 0], [x, x * tA]) };
    const scale = AB ?? v.a / unit.BC;
    const want = v.level === 'stretch' ? 0.5 * scale * (unit.C[1] * scale) : unit.AC * scale;
    return Math.abs(got - want) <= want * 0.006 ? [] : [`expected about ${want.toFixed(3)}`];
  },

  key: (v) => `${v.level}|${v.A}|${v.B}|${v.a}|${v.b}|${v.c}`,
});
