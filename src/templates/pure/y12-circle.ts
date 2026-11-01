import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { circleTex, lineTex, shift, terms } from '../../engine/pure';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 circle questions: complete the square to find the centre and
 * radius, the tangent at a point from the perpendicular radius, and (stretch)
 * the 9MA0/01 June 2018 Q6 idea of a tangent line, its perpendicular through the
 * centre and the parallel tangent on the far side of the circle.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  p: number; // centre
  q: number;
  r2: number; // radius squared
  ux: number; // radius vector to the marked point
  uy: number;
  m: number; // stretch: gradient of the tangent
  t: number;
  test: [number, number]; // foundational: point to test
}

const TRIPLES: [number, number][] = [
  [3, 4],
  [4, 3],
  [5, 12],
  [12, 5],
  [6, 8],
  [8, 6],
];

const expanded = (v: V) => {
  const f = v.p * v.p + v.q * v.q - v.r2;
  return `x^2 + y^2 ${terms([[-2 * v.p, 1]]).startsWith('-') ? '' : '+ '}${terms([[-2 * v.p, 1]]).replace('-', '- ')} ${-2 * v.q < 0 ? '-' : '+'} ${Math.abs(2 * v.q)}y ${f < 0 ? '-' : '+'} ${Math.abs(f)} = 0`;
};

export default defineTemplate<V>({
  id: 'y12-circle',
  title: 'Equations of circles',
  strand: 'Pure',
  subtopic: 'Circles',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, p: 0, q: 0, r2: 0, ux: 0, uy: 0, m: 0, t: 0, test: [0, 0] };
    if (level === 'stretch') {
      const m = rng.pick([2, 3, 4, -2, -3]);
      const t = rng.pick([1, 2, -1, -2]);
      const p = rng.int(2, 9);
      const q = rng.int(2, 9);
      return { ...base, p, q, m, t, ux: -m * t, uy: t, r2: t * t * (m * m + 1) };
    }
    const p = rng.int(1, 9) * rng.pick([1, -1]);
    const q = rng.int(1, 9) * rng.pick([1, -1]);
    const [a, b] = rng.pick(TRIPLES);
    const ux = a * rng.pick([1, -1]);
    const uy = b * rng.pick([1, -1]);
    const r2 = ux * ux + uy * uy;
    ensure(p * p + q * q !== r2, 'no zero constant term');
    if (level === 'foundational') {
      const test: [number, number] = [p + rng.int(-6, 6), q + rng.int(-6, 6)];
      const d = (test[0] - p) ** 2 + (test[1] - q) ** 2;
      ensure(d !== r2 && (test[0] !== p || test[1] !== q), 'the point must not be on the circle');
      return { ...base, p, q, r2, ux, uy, test };
    }
    return { ...base, p, q, r2, ux, uy };
  },

  validate(v) {
    return v.ux * v.ux + v.uy * v.uy === v.r2 ? [] : ['the marked point must be on the circle'];
  },

  render(v) {
    if (v.level === 'stretch') {
      const [Px, Py] = [v.p + v.ux, v.q + v.uy];
      const c = Py - v.m * Px;
      return {
        stem: lines(`The circle $C$ has centre $A$ with coordinates $(${v.p}, ${v.q})$`, `The line $l$ with equation  $y = ${terms([[v.m, 1], [c, 0]])}$  is the tangent to $C$ at the point $P$.`),
        parts: [
          part('a', 2, text('Find an equation of the line through $A$ and $P$, in the form  $x + by = d$')),
          part('b', 2, text('Find the coordinates of $P$')),
          part('c', 2, text('Find an equation for $C$')),
          part('d', 2, text(`The line with equation  $y = ${terms([[v.m, 1]])} + k$,  $k \\neq ${c}$,  is also a tangent to $C$.`), text('Find the value of the constant $k$')),
        ],
      };
    }
    if (v.level === 'foundational') {
      return {
        stem: lines(`The circle $C$ has equation  $${expanded(v)}$`),
        parts: [
          part('a', 3, text('Find the coordinates of the centre of $C$ and the radius of $C$')),
          part('b', 2, text(`Determine whether the point $Q(${v.test[0]}, ${v.test[1]})$ lies inside or outside $C$, giving a reason for your answer.`)),
        ],
      };
    }
    return {
      stem: lines(`The circle $C$ has equation  $${expanded(v)}$`, `The point $P(${v.p + v.ux}, ${v.q + v.uy})$ lies on $C$.`),
      parts: [
        part('a', 3, text('Find the coordinates of the centre of $C$ and the radius of $C$')),
        part('b', 4, text('Find an equation of the tangent to $C$ at $P$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
      ],
    };
  },

  answer(v) {
    const centre = { text: `Centre $(${v.p}, ${v.q})$, radius ${Math.sqrt(v.r2)}` };
    if (v.level === 'foundational') {
      const d = (v.test[0] - v.p) ** 2 + (v.test[1] - v.q) ** 2;
      return [centre, { text: d < v.r2 ? 'Inside' : 'Outside' }];
    }
    if (v.level === 'core') {
      const [Px, Py] = [v.p + v.ux, v.q + v.uy];
      return [centre, { text: `$${lineTex(v.ux, v.uy, -(v.ux * Px + v.uy * Py))}$` }];
    }
    const [Px, Py] = [v.p + v.ux, v.q + v.uy];
    const k = v.q - v.uy - v.m * (v.p - v.ux);
    return [
      { text: `$x ${v.m < 0 ? '-' : '+'} ${Math.abs(v.m)}y = ${v.p + v.m * v.q}$` },
      { text: `$(${Px}, ${Py})$` },
      { text: `$${circleTex(v.p, v.q, v.r2)}$` },
      { text: `$k = ${k}$` },
    ];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const [Px, Py] = [v.p + v.ux, v.q + v.uy];
      const c = Py - v.m * Px;
      const k = v.q - v.uy - v.m * (v.p - v.ux);
      return [
        [
          step('M1', `Gradient of $AP$ is $${fracTex(Q.of(-1, v.m))}$`, 'The radius is perpendicular to the tangent, so use the negative reciprocal.'),
          step('A1', `$x ${v.m < 0 ? '-' : '+'} ${Math.abs(v.m)}y = ${v.p + v.m * v.q}$`, `Use the point A, then clear the fraction.`),
        ],
        [step('M1', `$x ${v.m < 0 ? '-' : '+'} ${Math.abs(v.m)}(${terms([[v.m, 1], [c, 0]])}) = ${v.p + v.m * v.q}$`, 'Substitute the equation of l to find where the lines meet.'), step('A1', `$(${Px}, ${Py})$`, 'Find x, then y from l.')],
        [step('M1', `$r^2 = (${Px} - ${v.p < 0 ? `(${v.p})` : v.p})^2 + (${Py} - ${v.q < 0 ? `(${v.q})` : v.q})^2 = ${v.r2}$`, 'The radius is the distance from A to P.'), step('A1', `$${circleTex(v.p, v.q, v.r2)}$`, 'Use the centre and r².')],
        [
          step('M1', `Far end of the diameter: $(${v.p - v.ux}, ${v.q - v.uy})$`, 'The second tangent is parallel, so it touches at the opposite end of the diameter through P.'),
          step('A1', `$k = ${k}$`, `Substitute that point into y = ${v.m}x + k.`),
        ],
      ];
    }
    const f = v.p * v.p + v.q * v.q - v.r2;
    const a = [
      step('M1', `$${shift(v.p)}^2 - ${v.p * v.p} + ${shift(v.q, 'y')}^2 - ${v.q * v.q} ${f < 0 ? '-' : '+'} ${Math.abs(f)} = 0$`, 'Complete the square in x and in y separately.'),
      step('A1', `Centre $(${v.p}, ${v.q})$`, 'The signs change: (x − a)² has centre at x = a.'),
      step('A1', `Radius $= \\sqrt{${v.r2}} = ${Math.sqrt(v.r2)}$`, 'Collect the numbers on the right, then take the square root.'),
    ];
    if (v.level === 'foundational') {
      const d = (v.test[0] - v.p) ** 2 + (v.test[1] - v.q) ** 2;
      return [a, [step('M1', `$(${v.test[0]} - ${v.p < 0 ? `(${v.p})` : v.p})^2 + (${v.test[1]} - ${v.q < 0 ? `(${v.q})` : v.q})^2 = ${d}$`, 'Find the distance squared from the centre to Q.'), step('A1', `$${d} ${d < v.r2 ? '<' : '>'} ${v.r2}$, so $Q$ is ${d < v.r2 ? 'inside' : 'outside'} $C$.`, 'Compare it with the radius squared.')]];
    }
    const [Px, Py] = [v.p + v.ux, v.q + v.uy];
    const g = gcdInt(v.ux, v.uy);
    return [
      a,
      [
        step('M1', `Gradient of radius $= ${fracTex(Q.of(v.uy, v.ux))}$`, 'Change in y over change in x, from the centre to P.'),
        step('M1', `Gradient of tangent $= ${fracTex(Q.of(-v.ux, v.uy))}$`, 'The tangent is perpendicular to the radius.'),
        step('M1', `$y - (${Py}) = ${fracTex(Q.of(-v.ux, v.uy))}(x - (${Px}))$`, 'Use the point P.'),
        step('A1', `$${lineTex(v.ux / g, v.uy / g, -((v.ux * Px + v.uy * Py) / g))}$`, 'Clear the fraction and write in the required form.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'stretch') {
      // Distance from the centre to each tangent, squared, must equal r²: (mp − q + c)²/(m² + 1).
      const [Px, Py] = [v.p + v.ux, v.q + v.uy];
      const c = Py - v.m * Px;
      const k = Number(answers[3].text.match(/= (-?\d+)/)![1]);
      for (const ic of [c, k]) if (Q.of((v.m * v.p - v.q + ic) ** 2, v.m * v.m + 1).toNumber() !== v.r2) return ['tangent'];
      return k !== c ? [] : ['same line'];
    }
    // Rebuild the expanded equation and confirm the centre and radius from it.
    const D = -2 * v.p;
    const E = -2 * v.q;
    const F = v.p * v.p + v.q * v.q - v.r2;
    if ((D * D + E * E) / 4 - F !== v.r2) return ['radius'];
    if (v.level === 'foundational') return answers.length === 2 ? [] : ['parts'];
    // The tangent passes through P and meets the circle nowhere else: a nearby point on it is outside.
    const [Px, Py] = [v.p + v.ux, v.q + v.uy];
    const [dx, dy] = [v.uy, -v.ux];
    const off = (Px + dx - v.p) ** 2 + (Py + dy - v.q) ** 2;
    return off > v.r2 && v.ux * dx + v.uy * dy === 0 ? [] : ['tangent'];
  },

  key: (v) => `${v.p}|${v.q}|${v.r2}|${v.ux}|${v.uy}|${v.m}|${v.t}|${v.test}`,
});
