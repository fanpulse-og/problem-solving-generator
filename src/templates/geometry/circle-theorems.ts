import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, MINUS } from '../../engine/blocks';
import { ensure } from '../../engine/format';

/**
 * Modelled on Set 22 2H Q13 (P, Q, R, S on a circle, PS a diameter, angle
 * PQR = 136°: find angle RPS) and Set 23 1H Q19 (tangent, circle theorems
 * with reasons). Positions on the circle are chosen from the angles, so the
 * diagram always matches the numbers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  x: number; // foundational: angle CAB; core: angle RPS; stretch: angle between tangent and chord
  qAt: number; // core: position of Q on the circle (degrees)
}

const R = 1;
// D sits on the minor arc AB but away from the bisector of angle BAT, so its chord doesn't cross the angle label.
const dAt = (x: number) => 270 + 1.6 * x;
const on = (deg: number): [number, number] => [R * Math.cos((deg * Math.PI) / 180), R * Math.sin((deg * Math.PI) / 180)];

const REASONS = {
  semicircle: 'the angle in a semicircle is 90°',
  cyclic: 'opposite angles of a cyclic quadrilateral add up to 180°',
  triangle: 'angles in a triangle add up to 180°',
  altSeg: 'the alternate segment theorem',
};
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default defineTemplate<V>({
  id: 'geom-circle-theorems',
  title: 'Circle theorems with reasons',
  strand: 'Geometry & Measures',
  subtopic: 'Circle theorems',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'either',

  generate({ rng, level }) {
    if (level === 'foundational') {
      const x = rng.int(20, 70);
      ensure(x !== 45, 'avoid an isosceles right triangle');
      return { level, x, qAt: 0 };
    }
    if (level === 'core') {
      const x = rng.int(15, 65); // angle RPS; R sits at 2x degrees
      const qAt = rng.int(2 * x + 25, 165);
      return { level, x, qAt };
    }
    return { level, x: rng.int(30, 72), qAt: 0 };
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'core' && !(v.qAt > 2 * v.x && v.qAt < 180)) p.push('Q must lie between R and P');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      const pts = { O: [0, 0] as [number, number], A: on(180), B: on(0), C: on(2 * v.x) };
      return {
        stem: [
          text('A, B and C are points on a circle, centre O.'),
          text('AB is a diameter of the circle.'),
          diagram({ type: 'figure', points: pts, circle: { center: 'O', r: R }, dots: ['O'], segments: [['A', 'B'], ['A', 'C'], ['B', 'C']], angles: [{ at: 'A', from: 'B', to: 'C', text: `${v.x}°` }], notAccurate: true }),
        ],
        parts: [
          part('a(i)', 1, text('Write down the size of angle ACB.')),
          part('a(ii)', 1, text('Give a reason for your answer.')),
          part('b', 1, text('Work out the size of angle ABC.')),
        ],
      };
    }
    if (v.level === 'core') {
      const pts = { O: [0, 0] as [number, number], P: on(180), Q: on(v.qAt), R: on(2 * v.x), S: on(0) };
      return {
        stem: [
          text('P, Q, R and S are points on a circle with centre O.'),
          text('PS is a diameter of the circle.'),
          diagram({ type: 'figure', points: pts, circle: { center: 'O', r: R }, dots: ['O'], segments: [['P', 'Q'], ['Q', 'R'], ['R', 'S'], ['P', 'S'], ['P', 'R']], angles: [{ at: 'Q', from: 'P', to: 'R', text: `${90 + v.x}°` }], notAccurate: true }),
          text(`Angle PQR = ${90 + v.x}°`),
        ],
        parts: [single(4, text('Work out the size of angle RPS.'), text('Give a reason for each stage of your working.'))],
      };
    }
    // Tangent at A (bottom of the circle); B on the minor arc to the right.
    const A = on(270);
    const pts = { O: [0, 0] as [number, number], A, B: on(270 + 2 * v.x), C: on(150), D: on(dAt(v.x)), T: [1.5, -R] as [number, number], S: [-1.5, -R] as [number, number] };
    return {
      stem: [
        text('A, B, C and D are points on a circle, centre O.'),
        text('The line SAT is the tangent to the circle at A.'),
        diagram({
          type: 'figure',
          points: pts,
          labelled: ['O', 'A', 'B', 'C', 'D', 'S', 'T'],
          circle: { center: 'O', r: R },
          dots: ['O'],
          segments: [['S', 'T'], ['A', 'B'], ['A', 'C'], ['C', 'B'], ['A', 'D'], ['D', 'B']],
          angles: [{ at: 'A', from: 'T', to: 'B', text: `${v.x}°` }],
          notAccurate: true,
        }),
        text(`Angle BAT = ${v.x}°`),
      ],
      parts: [single(4, text('Work out the size of angle ADB.'), text('Give a reason for each stage of your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: '90°' }, { text: cap(REASONS.semicircle) }, { text: `${90 - v.x}°` }];
    if (v.level === 'core') return [{ text: `${v.x}°` }];
    return [{ text: `${180 - v.x}°` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('B1', 'Angle ACB = 90°', 'AB is a diameter, so the angle at C is a right angle.')],
        [step('C1', cap(REASONS.semicircle), 'Write the circle theorem in words.')],
        [step('B1', `180 ${MINUS} 90 ${MINUS} ${v.x} = ${90 - v.x}°`, `${cap(REASONS.triangle)}.`)],
      ];
    }
    if (v.level === 'core') {
      const pqr = 90 + v.x;
      return [
        [
          step('B1', `Angle PSR = 180 ${MINUS} ${pqr} = ${180 - pqr}°`, `PQRS is a cyclic quadrilateral: ${REASONS.cyclic}.`),
          step('B1', 'Angle PRS = 90°', `PS is a diameter: ${REASONS.semicircle}.`),
          step('B1', `Angle RPS = 180 ${MINUS} 90 ${MINUS} ${180 - pqr} = ${v.x}°`, `${cap(REASONS.triangle)}.`),
          step('C1', `Reasons: ${REASONS.cyclic}; ${REASONS.semicircle}; ${REASONS.triangle}`, 'Every stage needs its reason in words.'),
        ],
      ];
    }
    return [
      [
        step('M1', `Angle ACB = ${v.x}°`, 'The angle between the tangent and the chord AB equals the angle in the alternate segment.'),
        step('C1', cap(REASONS.altSeg), 'Name the theorem.'),
        step('A1', `Angle ADB = 180 ${MINUS} ${v.x} = ${180 - v.x}°`, 'ACBD is a cyclic quadrilateral, so angles C and D are opposite.'),
        step('C1', cap(REASONS.cyclic), 'Give the second reason too.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Measure the angles from the actual coordinates used in the diagram.
    const ang = (at: [number, number], a: [number, number], b: [number, number]) => {
      const u = [a[0] - at[0], a[1] - at[1]];
      const w = [b[0] - at[0], b[1] - at[1]];
      return (Math.acos((u[0] * w[0] + u[1] * w[1]) / (Math.hypot(u[0], u[1]) * Math.hypot(w[0], w[1]))) * 180) / Math.PI;
    };
    const close = (s: string, x: number) => Math.abs(parseFloat(s) - x) < 1e-6;
    if (v.level === 'foundational') {
      if (!close(answers[0].text, ang(on(2 * v.x), on(180), on(0))) || !close(answers[2].text, ang(on(0), on(180), on(2 * v.x)))) p.push('semicircle angles');
      if (Math.abs(ang(on(180), on(0), on(2 * v.x)) - v.x) > 1e-6) p.push('diagram angle');
    } else if (v.level === 'core') {
      if (Math.abs(ang(on(v.qAt), on(180), on(2 * v.x)) - (90 + v.x)) > 1e-6) p.push('angle PQR in diagram');
      if (!close(answers[0].text, ang(on(180), on(2 * v.x), on(0)))) p.push('RPS');
    } else {
      const A = on(270);
      if (Math.abs(ang(A, [1.5, -R], on(270 + 2 * v.x)) - v.x) > 1e-6) p.push('tangent angle');
      if (!close(answers[0].text, ang(on(dAt(v.x)), A, on(270 + 2 * v.x)))) p.push('ADB');
    }
    return p;
  },

  key: (v) => `${v.x}|${v.qAt}`,
});
