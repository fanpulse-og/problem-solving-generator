import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { lineTex, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 straight lines: a gradient and equation from two points, a
 * perpendicular bisector meeting an axis, and two perpendicular lines forming a
 * triangle with the y-axis.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: [number, number];
  b: [number, number];
  m: number;
  r: [number, number];
  k: number;
}

export default defineTemplate<V>({
  id: 'y12-straight-lines',
  title: 'Straight lines',
  strand: 'Pure',
  subtopic: 'Coordinate geometry',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'geometry-chain' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: [0, 0], b: [0, 0], m: 0, r: [0, 0], k: 0 };
    if (level === 'stretch') {
      const m = rng.pick([2, 3, 4, 5, -2, -3, -4]);
      const r: [number, number] = [rng.int(2, 8) * rng.pick([1, -1]), rng.int(2, 9)];
      const k = rng.int(1, 3) * rng.pick([1, -1]);
      ensure(r[1] - m * r[0] !== 0, 'the line does not pass through O');
      return { ...base, m, r, k };
    }
    const a: [number, number] = [rng.int(-8, 8), rng.int(-8, 8)];
    const b: [number, number] = [a[0] + 2 * rng.int(1, 5) * rng.pick([1, -1]), a[1] + 2 * rng.int(1, 5) * rng.pick([1, -1])];
    return { ...base, a, b };
  },

  validate(v) {
    return v.level !== 'stretch' && v.a[0] === v.b[0] ? ['the line must not be vertical'] : [];
  },

  render(v) {
    if (v.level === 'stretch') {
      const c = v.r[1] - v.m * v.r[0];
      const q = [v.r[0] + v.m * v.k, v.r[1] - v.k];
      return {
        stem: lines(`The line $l_1$ has equation  $y = ${terms([[v.m, 1], [c, 0]])}$`, `The line $l_2$ is perpendicular to $l_1$ and passes through the point $Q(${q[0]}, ${q[1]})$`, 'The lines $l_1$ and $l_2$ meet at the point $R$.'),
        parts: [
          part('a', 2, text('Find an equation for $l_2$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
          part('b', 2, text('Find the coordinates of $R$.')),
          part('c', 3, text('Find the exact area of the triangle formed by $l_1$, $l_2$ and the $y$-axis.')),
        ],
      };
    }
    const stem = lines(`The point $A$ has coordinates $(${v.a[0]}, ${v.a[1]})$ and the point $B$ has coordinates $(${v.b[0]}, ${v.b[1]})$`);
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 2, text('Find the gradient of the line $AB$.')),
          part('b', 2, text('Find an equation of the line $AB$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
          part('c', 1, text('Find the coordinates of the midpoint of $AB$.')),
        ],
      };
    }
    return {
      stem,
      parts: [
        part('a', 4, text('Find an equation of the perpendicular bisector of $AB$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
        part('b', 2, text('The perpendicular bisector meets the $x$-axis at the point $C$.'), text('Find the coordinates of $C$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const [p, q] = v.r;
      const c1 = q - v.m * p;
      const c2 = Q.of(q).add(Q.of(p, v.m));
      const area = c2.sub(c1).mul(p).div(2);
      return [{ text: `$${lineTex(1, v.m, -(p + v.m * q))}$` }, { text: `$(${p}, ${q})$` }, { text: `$${fracTex(area.isPositive() ? area : area.neg())}$` }];
    }
    const [dx, dy] = [v.b[0] - v.a[0], v.b[1] - v.a[1]];
    const mid = [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2];
    if (v.level === 'foundational') return [{ text: `$${fracTex(Q.of(dy, dx))}$` }, { text: `$${lineTex(dy, -dx, -(dy * v.a[0] - dx * v.a[1]))}$` }, { text: `$(${mid[0]}, ${mid[1]})$` }];
    const x = Q.of(dx * mid[0] + dy * mid[1], dx);
    return [{ text: `$${lineTex(dx, dy, -(dx * mid[0] + dy * mid[1]))}$` }, { text: `$(${fracTex(x)}, 0)$` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const [p, q] = v.r;
      const c1 = q - v.m * p;
      const c2 = Q.of(q).add(Q.of(p, v.m));
      const area = c2.sub(c1).mul(p).div(2);
      const Qp = [p + v.m * v.k, q - v.k];
      return [
        [step('M1', `Gradient of $l_2$ is $${fracTex(Q.of(-1, v.m))}$`, 'Perpendicular gradients multiply to −1.'), step('A1', `$${lineTex(1, v.m, -(p + v.m * q))}$`, `Use the point (${Qp[0]}, ${Qp[1]}) and clear the fraction.`)],
        [step('M1', `Substitute $y = ${terms([[v.m, 1], [c1, 0]])}$ into $l_2$`, 'Solve the two equations together.'), step('A1', `$(${p}, ${q})$`, 'Find x, then y.')],
        [
          step('M1', `$l_1$ meets the $y$-axis at $${c1}$ and $l_2$ at $${fracTex(c2)}$`, 'Put x = 0 in each equation.'),
          step('M1', `Base $= ${fracTex(c2.sub(c1).isPositive() ? c2.sub(c1) : c2.sub(c1).neg())}$, height $= ${Math.abs(p)}$`, 'The base runs along the y-axis; the height is the distance of R from that axis.'),
          step('A1', `$${fracTex(area.isPositive() ? area : area.neg())}$`, 'Half base times height.'),
        ],
      ];
    }
    const [dx, dy] = [v.b[0] - v.a[0], v.b[1] - v.a[1]];
    const mid = [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2];
    const m = Q.of(dy, dx);
    if (v.level === 'foundational') {
      return [
        [step('M1', `$\\frac{${v.b[1]} - (${v.a[1]})}{${v.b[0]} - (${v.a[0]})}$`, 'Change in y over change in x.'), step('A1', `$${fracTex(m)}$`, 'Simplify the fraction.')],
        [step('M1', `$y - (${v.a[1]}) = ${fracTex(m)}(x - (${v.a[0]}))$`, 'Use one of the points.'), step('A1', `$${lineTex(dy, -dx, -(dy * v.a[0] - dx * v.a[1]))}$`, 'Clear the fraction and collect the terms.')],
        [step('B1', `$(${mid[0]}, ${mid[1]})$`, 'Average the x values and average the y values.')],
      ];
    }
    const x = Q.of(dx * mid[0] + dy * mid[1], dx);
    return [
      [
        step('B1', `Midpoint $(${mid[0]}, ${mid[1]})$`, 'The bisector passes through the midpoint.'),
        step('M1', `Gradient of $AB = ${fracTex(m)}$, so the perpendicular gradient is $${dy === 0 ? 'undefined' : fracTex(Q.of(-dx, dy))}$`, 'Negative reciprocal.'),
        step('M1', `$${dx}(x - (${mid[0]})) + ${dy < 0 ? `(${dy})` : dy}(y - (${mid[1]})) = 0$`, 'Write the line through the midpoint.'),
        step('A1', `$${lineTex(dx, dy, -(dx * mid[0] + dy * mid[1]))}$`, 'Whole numbers, in the form asked.'),
      ],
      [step('M1', 'Put $y = 0$ in the equation', 'Every point on the x-axis has y = 0.'), step('A1', `$(${fracTex(x)}, 0)$`, 'Give both coordinates.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'stretch') {
      const [p, q] = v.r;
      // Area by coordinates (shoelace) from the three corners.
      const [c1, c2] = [q - v.m * p, q + p / v.m];
      const area = Math.abs(0.5 * (0 * (c2 - q) + 0 * (q - c1) + p * (c1 - c2)));
      const shown = answers[2].text.match(/frac\{(\d+)\}\{(\d+)\}/);
      const value = shown ? Number(shown[1]) / Number(shown[2]) : Number(answers[2].text.replace(/\$/g, ''));
      return Math.abs(area - value) < 1e-9 ? [] : ['area'];
    }
    const [dx, dy] = [v.b[0] - v.a[0], v.b[1] - v.a[1]];
    if (v.level === 'foundational') return dy * (v.b[0] - v.a[0]) === dx * (v.b[1] - v.a[1]) ? [] : ['line'];
    // C is the same distance from A and from B.
    const mid = [(v.a[0] + v.b[0]) / 2, (v.a[1] + v.b[1]) / 2];
    const x = (dx * mid[0] + dy * mid[1]) / dx;
    return Math.abs(Math.hypot(x - v.a[0], v.a[1]) - Math.hypot(x - v.b[0], v.b[1])) < 1e-9 ? [] : ['equidistant'];
  },

  key: (v) => `${v.a}|${v.b}|${v.m}|${v.r}|${v.k}`,
});
