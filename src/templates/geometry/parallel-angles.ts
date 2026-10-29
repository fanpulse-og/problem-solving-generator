import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text, MINUS } from '../../engine/blocks';
import { ensure } from '../../engine/format';

/**
 * Modelled on Set 23 2F Q12 and Set 22 1F Q18 (angles with parallel lines,
 * "give a reason for each stage of your working"). APRB and CQD are parallel
 * with triangle PQR between them. With a = angle APQ and b = angle RQD:
 *   angle QPR = 180 − a (angles on a straight line)
 *   angle PRQ = b       (alternate angles)
 *   angle PQR = a − b   (angles in a triangle)
 * Stretch gives the angles as expressions in x.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  // stretch: a = 3x + c1, b = x + c2, PQR = x + c3
  x: number;
  c1: number;
  c2: number;
  c3: number;
}

const REASONS = {
  line: 'angles on a straight line add up to 180°',
  alt: 'alternate angles are equal',
  tri: 'angles in a triangle add up to 180°',
};

const expr = (k: number, c: number) => `(${k === 1 ? '' : k}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)})°`;

export default defineTemplate<V>({
  id: 'geom-parallel-angles',
  title: 'Angles in parallel lines with reasons',
  strand: 'Geometry & Measures',
  subtopic: 'Angles & polygons',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, level }) {
    if (level === 'stretch') {
      const x = rng.int(15, 35);
      const c1 = rng.int(-20, 40);
      const c2 = rng.int(-10, 30);
      const a = 3 * x + c1;
      const b = x + c2;
      const c3 = a - b - x;
      ensure(a >= 100 && a <= 150 && b >= 25 && a - b >= 25, 'a drawable triangle');
      ensure(c1 !== 0 && c2 !== 0 && c3 !== 0, 'every expression has a constant');
      return { level, a, b, x, c1, c2, c3 };
    }
    const a = rng.int(100, 150);
    const b = rng.int(25, a - 25);
    return { level, a, b, x: 0, c1: 0, c2: 0, c3: 0 };
  },

  validate(v) {
    const p: string[] = [];
    if (!(v.a > 90 && v.a < 180)) p.push('angle APQ must be obtuse');
    if (!(v.b > 0 && v.b < v.a)) p.push('triangle must exist');
    if (v.level === 'stretch' && v.x + v.c3 !== v.a - v.b) p.push('expressions inconsistent');
    return p;
  },

  render(v) {
    const intro = lines('APRB and CQD are parallel straight lines.', 'PQR is a triangle.');
    if (v.level === 'stretch') {
      return {
        stem: [...intro, diagram({ type: 'parallelTriangle', a: v.a, b: v.b, labels: { APQ: expr(3, v.c1), RQD: expr(1, v.c2), PQR: expr(1, v.c3) }, notAccurate: true })],
        parts: [single(5, text('Work out the size of angle PQR.'), text('You must show all your working.'))],
      };
    }
    if (v.level === 'foundational') {
      return {
        stem: [...intro, diagram({ type: 'parallelTriangle', a: v.a, b: v.b, labels: { APQ: `${v.a}°`, RQD: `${v.b}°`, QPR: 'x', PRQ: 'y' }, notAccurate: true })],
        parts: [
          part('a(i)', 1, text('Work out the value of $x$')),
          part('a(ii)', 1, text('Give a reason for your answer.')),
          part('b(i)', 1, text('Work out the value of $y$')),
          part('b(ii)', 1, text('Give a reason for your answer.')),
        ],
      };
    }
    return {
      stem: [...intro, diagram({ type: 'parallelTriangle', a: v.a, b: v.b, labels: { APQ: `${v.a}°`, RQD: `${v.b}°`, PQR: 'x' }, notAccurate: true })],
      parts: [single(4, text('Work out the value of $x$'), text('Give a reason for each stage of your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: `$x$ = ${180 - v.a}` }, { text: `Angles on a straight line add up to 180°` }, { text: `$y$ = ${v.b}` }, { text: 'Alternate angles are equal' }];
    }
    if (v.level === 'core') return [{ text: `$x$ = ${v.a - v.b}` }];
    return [{ text: `Angle PQR = ${v.a - v.b}° ($x$ = ${v.x})` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('B1', `$x$ = 180 ${MINUS} ${v.a} = ${180 - v.a}`, 'APR is a straight line.')],
        [step('C1', cap(REASONS.line), 'Use the proper wording of the angle fact.')],
        [step('B1', `$y$ = ${v.b}`, 'Look for the Z shape between the parallel lines.')],
        [step('C1', cap(REASONS.alt), 'Use the proper wording of the angle fact.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `Angle QPR = 180 ${MINUS} ${v.a} = ${180 - v.a}°`, `Because ${REASONS.line}.`),
          step('M1', `Angle PRQ = ${v.b}°`, `Because ${REASONS.alt} (the Z shape between the parallel lines).`),
          step('A1', `$x$ = 180 ${MINUS} ${180 - v.a} ${MINUS} ${v.b} = ${v.a - v.b}`, `Because ${REASONS.tri}.`),
          step('C1', `Reasons: ${REASONS.line}; ${REASONS.alt}; ${REASONS.tri}`, 'Every stage needs its reason, in words.'),
        ],
      ];
    }
    const s = (k: number, c: number) => `${k === 1 ? '' : k}x ${c >= 0 ? '+' : '-'} ${Math.abs(c)}`;
    return [
      [
        step('M1', `Angle QPR = $180 - (${s(3, v.c1)}) = ${180 - v.c1} - 3x$`, `${cap(REASONS.line)}.`),
        step('M1', `Angle PRQ = $${s(1, v.c2)}$`, `${cap(REASONS.alt)}.`),
        step('M1', `$${180 - v.c1} - 3x + ${s(1, v.c2)} + ${s(1, v.c3)} = 180$`, `${cap(REASONS.tri)}, so set up an equation.`),
        step('A1', `$${180 - v.c1 + v.c2 + v.c3} - x = 180$, so $x = ${v.x}$`, 'Collect the x terms and the numbers.'),
        step('A1', `Angle PQR = ${v.x} ${v.c3 >= 0 ? '+' : MINUS} ${Math.abs(v.c3)} = ${v.a - v.b}°`, 'Substitute x back in. The question asks for the angle, not x.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Angle sum of triangle PQR from first principles.
    const qpr = 180 - v.a;
    const prq = v.b;
    const pqr = 180 - qpr - prq;
    if (qpr + prq + pqr !== 180 || pqr <= 0) p.push('triangle');
    if (v.level === 'stretch') {
      // Solve 180 − (3x + c1) + (x + c2) + (x + c3) = 180 by trying every x.
      const sols: number[] = [];
      for (let x = -100; x <= 200; x++) if (180 - (3 * x + v.c1) + (x + v.c2) + (x + v.c3) === 180) sols.push(x);
      if (sols.length !== 1 || sols[0] !== v.x || answers[0].text !== `Angle PQR = ${pqr}° ($x$ = ${v.x})`) p.push('stretch');
    } else if (v.level === 'core' && answers[0].text !== `$x$ = ${pqr}`) p.push('x');
    else if (v.level === 'foundational' && (answers[0].text !== `$x$ = ${qpr}` || answers[2].text !== `$y$ = ${prq}`)) p.push('x and y');
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.x}|${v.c1}|${v.c2}`,
});

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
