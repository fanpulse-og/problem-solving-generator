import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 transformations: a curve with a marked maximum and minimum, the
 * images under combined transformations and modulus graphs, and counting the
 * solutions of f(x) = k from the sketch.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  mx: number;
  my: number;
  nx: number;
  ny: number;
  a: number;
  s: number;
}

/** The cubic with a maximum at (mx, my) and a minimum at (nx, ny). */
function cubic(v: V) {
  const w = (v.nx - v.mx) / 2;
  const c = (v.mx + v.nx) / 2;
  const mid = (v.my + v.ny) / 2;
  const h = (v.my - v.ny) / 2;
  return (x: number) => {
    const t = (x - c) / w;
    return mid + (h * (t ** 3 - 3 * t)) / 2;
  };
}

export default defineTemplate<V>({
  id: 'y13-transformations',
  title: 'Transformations and modulus graphs',
  strand: 'Pure',
  subtopic: 'Functions & modulus',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const mx = rng.int(-4, 2);
    const nx = mx + 2 * rng.int(1, 3);
    const my = rng.int(3, 9);
    const ny = -rng.int(1, 8);
    ensure(mx !== 0 && nx !== 0, 'the turning points are away from the y-axis');
    return { level, mx, my, nx, ny, a: rng.int(2, 4), s: rng.int(1, 5) };
  },

  validate(v) {
    return v.my > 0 && v.ny < 0 && v.nx > v.mx ? [] : ['a maximum above the axis and a minimum below it'];
  },

  render(v) {
    const f = cubic(v);
    const pts: [number, number][] = [];
    const [lo, hi] = [v.mx - (v.nx - v.mx) * 0.55, v.nx + (v.nx - v.mx) * 0.55];
    for (let i = 0; i <= 60; i++) pts.push([lo + ((hi - lo) * i) / 60, f(lo + ((hi - lo) * i) / 60)]);
    const ys = pts.map((p) => p[1]);
    const figure = diagram({
      type: 'graph',
      x: [Math.min(lo, 0) - 0.8, Math.max(hi, 0) + 1.2],
      y: [Math.min(...ys, 0) - 1, Math.max(...ys, 0) + 1.5],
      curves: [{ points: pts }],
      marks: [
        { at: [v.mx, v.my], label: 'P', dot: true },
        { at: [v.nx, v.ny], label: 'Q', dot: true, dy: 16 },
      ],
    });
    const stem = [figure, ...lines('The diagram shows a sketch of part of the curve with equation  $y = \\mathrm{f}(x)$', `The curve has a maximum at $P(${v.mx}, ${v.my})$ and a minimum at $Q(${v.nx}, ${v.ny})$`, 'Write down the coordinates of the images of the points given.')];
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 1, text(`The image of $P$ on the curve  $y = \\mathrm{f}(x) - ${v.s}$`)),
          part('b', 1, text(`The image of $Q$ on the curve  $y = \\mathrm{f}(x + ${v.s})$`)),
          part('c', 2, text(`The image of $P$ on the curve  $y = ${v.a}\\mathrm{f}(x - ${v.s})$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem,
        parts: [
          part('a', 2, text(`The image of $Q$ on the curve  $y = |\\mathrm{f}(x)|$`)),
          part('b', 2, text(`The image of $P$ on the curve  $y = \\mathrm{f}(${v.a}x) + ${v.s}$`)),
          part('c', 2, text(`The image of $Q$ on the curve  $y = -${v.a}\\mathrm{f}(x)$`)),
        ],
      };
    }
    return {
      stem: [figure, ...lines('The diagram shows a sketch of part of the curve with equation  $y = \\mathrm{f}(x)$,  where f is a cubic function with a positive coefficient of $x^3$.', `The curve has a maximum at $P(${v.mx}, ${v.my})$ and a minimum at $Q(${v.nx}, ${v.ny})$`)],
      parts: [
        part('a', 2, text('Find the set of values of $k$ for which the equation  $\\mathrm{f}(x) = k$  has exactly 3 real solutions.')),
        part('b', 2, text(`State the coordinates of the maximum point on the curve  $y = \\mathrm{f}(${v.a}x)$`)),
        part('c', 3, text(`Find the number of real solutions of the equation  $|\\mathrm{f}(x)| = ${levelFor(v)}$,  giving a reason for your answer.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$(${v.mx}, ${v.my - v.s})$` }, { text: `$(${v.nx - v.s}, ${v.ny})$` }, { text: `$(${v.mx + v.s}, ${v.a * v.my})$` }];
    if (v.level === 'core') return [{ text: `$(${v.nx}, ${-v.ny})$` }, { text: `$(${fracTex(Q.of(v.mx, v.a))}, ${v.my + v.s})$` }, { text: `$(${v.nx}, ${-v.a * v.ny})$` }];
    return [{ text: `$${v.ny} < k < ${v.my}$` }, { text: `$(${fracTex(Q.of(v.mx, v.a))}, ${v.my})$` }, { text: `${countModulus(v)} solutions` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('B1', `$(${v.mx}, ${v.my - v.s})$`, 'Subtracting outside moves the curve down.')],
        [step('B1', `$(${v.nx - v.s}, ${v.ny})$`, 'Adding inside moves the curve left.')],
        [step('M1', `Right by ${v.s}, then multiply $y$ by ${v.a}`, 'Deal with the x change and the y change separately.'), step('A1', `$(${v.mx + v.s}, ${v.a * v.my})$`, 'Both coordinates.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', 'Parts of the curve below the $x$-axis are reflected in it', 'The modulus makes every y value positive.'), step('A1', `$(${v.nx}, ${-v.ny})$`, 'The x coordinate does not change.')],
        [step('M1', `Divide $x$ by ${v.a}`, 'The multiplier inside squashes the curve horizontally. The number outside then moves it up.'), step('A1', `$(${fracTex(Q.of(v.mx, v.a))}, ${v.my + v.s})$`, 'Both coordinates.')],
        [step('M1', `Multiply $y$ by $-${v.a}$`, 'Reflect in the x-axis and stretch vertically.'), step('A1', `$(${v.nx}, ${-v.a * v.ny})$`, 'The minimum becomes a maximum.')],
      ];
    }
    const L = levelFor(v);
    return [
      [step('M1', 'A horizontal line must cut all three branches', 'It has to lie between the maximum and the minimum.'), step('A1', `$${v.ny} < k < ${v.my}$`, 'At the ends the line only touches, giving 2 solutions.')],
      [step('M1', `Divide the $x$ coordinate by ${v.a}`, 'The y coordinate does not change.'), step('A1', `$(${fracTex(Q.of(v.mx, v.a))}, ${v.my})$`, 'Both coordinates.')],
      [
        step('M1', `$\\mathrm{f}(x) = ${L}$ or $\\mathrm{f}(x) = -${L}$`, 'A modulus gives two equations.'),
        step('M1', `Solutions: ${countAt(v, L)} and ${countAt(v, -L)}`, 'Count each using the maximum and minimum heights.'),
        step('A1', `${countModulus(v)} solutions`, 'Add the two counts.'),
      ],
    ];
  },

  check(v) {
    // Scan the actual cubic: the turning points and the solution counts.
    const f = cubic(v);
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
    if (!near(f(v.mx), v.my) || !near(f(v.nx), v.ny)) return ['turning points'];
    const h = 1e-4;
    if (Math.abs((f(v.mx + h) - f(v.mx - h)) / (2 * h)) > 1e-3) return ['stationary'];
    if (!(f(v.mx - 0.1) < v.my && f(v.mx + 0.1) < v.my)) return ['maximum'];
    if (v.level !== 'stretch') return [];
    const span = v.nx - v.mx;
    const scan = (k: number) => {
      let n = 0;
      const g = (x: number) => f(x) - k;
      const [lo, hi] = [v.mx - 40 * span, v.nx + 40 * span];
      for (let i = 0; i < 80000; i++) if (g(lo + ((hi - lo) * (i + 0.137)) / 80000) * g(lo + ((hi - lo) * (i + 1.137)) / 80000) < 0) n++;
      return n;
    };
    const L = levelFor(v);
    return scan(L) + scan(-L) === countModulus(v) && scan((v.my + v.ny) / 2 + 0.01) === 3 ? [] : ['counts'];
  },

  key: (v) => `${v.mx}|${v.my}|${v.nx}|${v.ny}|${v.a}|${v.s}`,
});

/** A height strictly between the turning values or beyond them, never equal to one, so that the count is clean. */
function levelFor(v: V): number {
  const lower = Math.min(v.my, -v.ny);
  const upper = Math.max(v.my, -v.ny);
  if (lower >= 2) return lower - 1;
  return upper > lower + 1 ? lower + 1 : upper + 1;
}
const countAt = (v: V, k: number) => (k > v.ny && k < v.my ? 3 : 1);
const countModulus = (v: V) => countAt(v, levelFor(v)) + countAt(v, -levelFor(v));
