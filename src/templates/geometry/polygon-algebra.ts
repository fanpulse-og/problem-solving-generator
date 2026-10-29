import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, MINUS, TIMES } from '../../engine/blocks';
import { ensure } from '../../engine/format';
import type { Rng } from '../../engine/rng';

/**
 * Modelled on Set 23 2F Q15 / 2H Q3 (a pentagon with angles in terms of x:
 * work out x). Foundational: a quadrilateral with one unknown angle. Stretch:
 * a hexagon, asking for the largest angle.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  sides: number;
  x: number;
  // each angle is k·x + c (k = 0 for a plain number)
  angles: [number, number][];
  points: [number, number][];
}

const angleSum = (n: number) => (n - 2) * 180;
const value = (v: V, [k, c]: [number, number]) => k * v.x + c;

function label([k, c]: [number, number], x?: number): string {
  if (k === 0) return `${c}°`;
  if (x !== undefined) return `${k * x + c}°`;
  const kx = `${k === 1 ? '' : k}x`;
  return c === 0 ? `${kx}°` : `(${kx} ${c > 0 ? '+' : '-'} ${Math.abs(c)})°`;
}

/** A convex polygon with roughly even angles, jittered so it looks hand-drawn. */
function shape(rng: Rng, n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = (2 * Math.PI * i) / n + Math.PI / 2 + (rng.next() - 0.5) * 0.35;
    const r = 1 + (rng.next() - 0.5) * 0.25;
    return [r * Math.cos(t), r * Math.sin(t)] as [number, number];
  });
}

export default defineTemplate<V>({
  id: 'geom-polygon-algebra',
  title: 'Angles in polygons with algebra',
  strand: 'Geometry & Measures',
  subtopic: 'Angles & polygons',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'either',

  generate({ rng, level }) {
    const sides = level === 'foundational' ? 4 : level === 'core' ? 5 : 6;
    const S = angleSum(sides);
    const x = level === 'foundational' ? rng.int(55, 140) : rng.int(12, 45);
    const nAlg = level === 'foundational' ? 1 : level === 'core' ? 3 : 4;
    const angles: [number, number][] = [];
    if (level === 'foundational') angles.push([1, 0]);
    else
      for (let i = 0; i < nAlg; i++) {
        const k = rng.int(1, 4);
        const c = rng.pick([0, 10, 15, 20, 25, 30, -10, -15, -20]);
        angles.push([k, c]);
      }
    // Fill the rest with whole-number angles so the total is right.
    const used = angles.reduce((s, a) => s + a[0] * x + a[1], 0);
    let rest = S - used;
    const nNum = sides - angles.length;
    for (let i = 0; i < nNum - 1; i++) {
      const a = rng.int(70, 170);
      angles.push([0, a]);
      rest -= a;
    }
    angles.push([0, rest]);
    const vals = angles.map(([k, c]) => k * x + c);
    ensure(vals.every((a) => a >= 45 && a < 180), 'convex, sensible angles');
    ensure(new Set(vals).size === vals.length, 'all angles different');
    const order = rng.shuffle(angles);
    return { level, sides, x, angles: order, points: shape(rng, sides) };
  },

  validate(v) {
    const p: string[] = [];
    const total = v.angles.reduce((s, a) => s + value(v, a), 0);
    if (total !== angleSum(v.sides)) p.push('angles must add up to the angle sum');
    if (v.angles.some((a) => value(v, a) >= 180 || value(v, a) <= 0)) p.push('convex polygon');
    return p;
  },

  render(v) {
    const name = v.sides === 4 ? 'quadrilateral' : v.sides === 5 ? 'pentagon' : 'hexagon';
    const d = diagram({ type: 'polygon', points: v.points, angleLabels: v.angles.map((a) => label(a)), notAccurate: true });
    if (v.level === 'foundational') {
      return {
        stem: [text(`The diagram shows a ${name}.`), d],
        parts: [part('a', 2, text('Work out the value of $x$')), part('b', 1, text('Give a reason for your answer.'))],
      };
    }
    if (v.level === 'core') return { stem: [text(`The diagram shows a ${name}.`), d], parts: [single(3, text('Work out the value of $x$'))] };
    return { stem: [text(`The diagram shows a ${name}.`), d], parts: [single(4, text(`Work out the size of the largest angle of the ${name}.`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$x$ = ${v.x}` }, { text: 'Angles in a quadrilateral add up to 360°' }];
    if (v.level === 'core') return [{ text: `$x$ = ${v.x}` }];
    return [{ text: `${Math.max(...v.angles.map((a) => value(v, a)))}°` }];
  },

  markScheme(v) {
    const S = angleSum(v.sides);
    const sumStep = (code: 'M1' | 'P1') => step(code, `(${v.sides} ${MINUS} 2) ${TIMES} 180 = ${S}°`, `Split the ${v.sides}-sided shape into ${v.sides - 2} triangles from one corner.`);
    const ks = v.angles.reduce((s, [k]) => s + k, 0);
    const cs = v.angles.reduce((s, [, c]) => s + c, 0);
    const eq = `$${ks === 1 ? '' : ks}x + ${cs} = ${S}$`;
    const solve = `$${ks === 1 ? '' : ks}x = ${S - cs}$, so $x = ${v.x}$`;
    if (v.level === 'foundational') {
      const known = v.angles.filter(([k]) => k === 0).map(([, c]) => c);
      return [
        [step('M1', `360 ${MINUS} (${known.join(' + ')})`, 'All four angles add up to 360°.'), step('A1', `$x$ = ${v.x}`, 'Check: the four angles now total 360°.')],
        [step('C1', 'Angles in a quadrilateral add up to 360°', 'Write the angle fact in words.')],
      ];
    }
    if (v.level === 'core') {
      return [[sumStep('M1'), step('M1', `${eq}  (collect the $x$ terms and the numbers)`, 'Add all five angles and set them equal to the angle sum.'), step('A1', solve, `Check: substitute $x$ = ${v.x} and the angles total ${S}°.`)]];
    }
    const largest = v.angles.reduce((a, b) => (value(v, b) > value(v, a) ? b : a));
    return [
      [
        sumStep('P1'),
        step('P1', eq, 'Add all the angles and set them equal to the angle sum.'),
        step('P1', solve, 'Solve the equation.'),
        step('A1', `Largest: ${largest[0] === 0 ? '' : `${largest[0]} ${TIMES} ${v.x} ${largest[1] >= 0 ? '+' : MINUS} ${Math.abs(largest[1])} = `}${value(v, largest)}°`, 'Substitute to find every angle, then pick the largest.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Try every whole x and keep those giving the right angle sum.
    const sols: number[] = [];
    for (let x = -200; x <= 400; x++) if (v.angles.reduce((s, [k, c]) => s + k * x + c, 0) === angleSum(v.sides)) sols.push(x);
    if (sols.length !== 1 || sols[0] !== v.x) p.push('x not unique');
    const want = v.level === 'stretch' ? `${Math.max(...v.angles.map(([k, c]) => k * sols[0] + c))}°` : `$x$ = ${sols[0]}`;
    if (answers[0].text !== want) p.push('answer');
    return p;
  },

  key: (v) => `${v.sides}|${v.x}|${JSON.stringify(v.angles)}`,
});
