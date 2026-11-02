import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { shift } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 graphs and transformations: where a factorised cubic meets
 * the axes and how a translation moves it, the asymptotes of a shifted reciprocal
 * graph, and the image of a marked point under several transformations.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  p: number;
  q: number;
  r: number;
  k: number;
  a: number;
  b: number;
  c: number;
  mx: number;
  my: number;
  s: number;
  scale: number;
  stretch: number;
}

const sample = (f: (x: number) => number, x0: number, x1: number, n = 60): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, f(x0 + ((x1 - x0) * i) / n)]);

export default defineTemplate<V>({
  id: 'y12-graphs',
  title: 'Graphs and transformations',
  strand: 'Pure',
  subtopic: 'Graphs & transformations',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'geometry-chain' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, p: 0, q: 0, r: 0, k: 0, a: 0, b: 0, c: 0, mx: 0, my: 0, s: 0, scale: 0, stretch: 0 };
    if (level === 'foundational') {
      const p = rng.int(1, 6);
      const q = rng.int(1, 6);
      const r = rng.int(1, 6);
      ensure(p !== q, 'three different roots');
      return { ...base, p, q, r, k: rng.int(1, 5) };
    }
    if (level === 'core') {
      const a = rng.int(1, 9);
      const b = rng.int(1, 6) * rng.pick([1, -1]);
      const c = rng.int(1, 6) * rng.pick([1, -1]);
      ensure(a + b * c !== 0 && c !== 0, 'the curve meets each axis');
      return { ...base, a, b, c };
    }
    return { ...base, mx: rng.pick([2, 4, 6]), my: rng.int(3, 9), s: rng.int(1, 5), scale: rng.int(2, 5), stretch: rng.pick([2, 3, 4]) };
  },

  validate(v) {
    return v.level === 'core' && v.c === 0 ? ['the asymptote must not be the y-axis'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const y = `x${shift(v.p)}${shift(-v.q)}`;
      return {
        stem: lines(`The curve $C$ has equation  $y = \\mathrm{f}(x)$  where  $\\mathrm{f}(x) = ${y}$`),
        parts: [
          part('a', 2, text('State the coordinates of the points where $C$ meets the $x$-axis.')),
          part('b', 2, text(`The curve $C$ is translated $${v.k}$ ${v.k === 1 ? 'unit' : 'units'} to the right to give the curve $D$. Write down an equation for $D$.`)),
          part('c', 2, text('Find the coordinates of the point where $D$ meets the $y$-axis.')),
        ],
      };
    }
    if (v.level === 'core') {
      const eq = `\\frac{${v.a}}{${shift(v.c).slice(1, -1)}} ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}`;
      return {
        stem: lines(`The curve $C$ has equation  $y = ${eq},\\ x \\neq ${v.c}$`),
        parts: [
          part('a', 2, text('Write down the equations of the asymptotes of $C$.')),
          part('b', 2, text('Find the coordinates of the point where $C$ meets the $y$-axis.')),
          part('c', 2, text('Find the coordinates of the point where $C$ meets the $x$-axis.')),
        ],
      };
    }
    // A hump with its maximum at M: y = my(1 − ((x − mx)/mx)²), for the sketch only.
    const f = (x: number) => v.my * (1 - ((x - v.mx) / v.mx) ** 2);
    return {
      stem: [
        diagram({
          type: 'graph',
          x: [-1, 2 * v.mx + 1.5],
          y: [-v.my * 0.5, v.my * 1.4],
          curves: [{ points: sample(f, 0, 2 * v.mx + 0.3) }],
          marks: [{ at: [v.mx, v.my], label: 'M', dot: true }],
        }),
        ...lines(`The diagram shows a sketch of the curve with equation  $y = \\mathrm{f}(x)$`, `The curve has a maximum point $M(${v.mx}, ${v.my})$`),
      ],
      parts: [
        part('a', 1, text(`Write down the coordinates of the maximum point of the curve with equation  $y = \\mathrm{f}(x) + ${v.s}$`)),
        part('b', 1, text(`Write down the coordinates of the maximum point of the curve with equation  $y = \\mathrm{f}(x - ${v.s})$`)),
        part('c', 1, text(`Write down the coordinates of the maximum point of the curve with equation  $y = ${v.scale}\\mathrm{f}(x)$`)),
        part('d', 2, text(`Write down the coordinates of the maximum point of the curve with equation  $y = \\mathrm{f}(${v.stretch}x)$`)),
        part('e', 2, text('The curve with equation  $y = -\\mathrm{f}(x)$  is drawn. State the coordinates of the point corresponding to $M$ and whether it is a maximum or a minimum.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const roots = [0, v.p, -v.q].sort((a, b) => a - b);
      const y0 = (0 - v.k) * (-v.k - v.p) * (-v.k + v.q);
      return [{ text: roots.map((x) => `$(${x}, 0)$`).join(', ') }, { text: `$y = ${shift(v.k)}${shift(v.k + v.p)}${shift(v.k - v.q)}$` }, { text: `$(0, ${y0})$` }];
    }
    if (v.level === 'core') {
      const y0 = Q.of(v.a, -v.c).add(v.b);
      const x0 = Q.of(v.c).sub(Q.of(v.a, v.b));
      return [{ text: `$x = ${v.c}$ and $y = ${v.b}$` }, { text: `$(0, ${fracTex(y0)})$` }, { text: `$(${fracTex(x0)}, 0)$` }];
    }
    return [
      { text: `$(${v.mx}, ${v.my + v.s})$` },
      { text: `$(${v.mx + v.s}, ${v.my})$` },
      { text: `$(${v.mx}, ${v.scale * v.my})$` },
      { text: `$(${fracTex(Q.of(v.mx, v.stretch))}, ${v.my})$` },
      { text: `$(${v.mx}, ${-v.my})$, a minimum` },
    ];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const roots = [0, v.p, -v.q].sort((a, b) => a - b);
      const y0 = (0 - v.k) * (-v.k - v.p) * (-v.k + v.q);
      return [
        [step('M1', `$x${shift(v.p)}${shift(-v.q)} = 0$`, 'The curve meets the x-axis where y = 0.'), step('A1', roots.map((x) => `$(${x}, 0)$`).join(', '), 'All three points, including the origin.')],
        [step('M1', `Replace $x$ by $(x - ${v.k})$`, 'Moving right means subtracting from x, which often feels backwards.'), step('A1', `$y = ${shift(v.k)}${shift(v.k + v.p)}${shift(v.k - v.q)}$`, 'Each bracket changes.')],
        [step('M1', 'Substitute $x = 0$', 'The curve meets the y-axis where x = 0.'), step('A1', `$(0, ${y0})$`, 'Multiply the three numbers.')],
      ];
    }
    if (v.level === 'core') {
      const y0 = Q.of(v.a, -v.c).add(v.b);
      const x0 = Q.of(v.c).sub(Q.of(v.a, v.b));
      return [
        [step('B1', `$x = ${v.c}$`, 'The denominator cannot be zero.'), step('B1', `$y = ${v.b}$`, 'For large x the fraction tends to zero.')],
        [step('M1', 'Substitute $x = 0$', 'Find where the curve crosses the y-axis.'), step('A1', `$(0, ${fracTex(y0)})$`, 'Add the two parts.')],
        [step('M1', `$\\frac{${v.a}}{${shift(v.c).slice(1, -1)}} = ${-v.b}$`, 'Put y = 0 and rearrange.'), step('A1', `$(${fracTex(x0)}, 0)$`, 'Solve for x.')],
      ];
    }
    return [
      [step('B1', `$(${v.mx}, ${v.my + v.s})$`, 'Adding outside moves the curve up.')],
      [step('B1', `$(${v.mx + v.s}, ${v.my})$`, 'Subtracting inside moves the curve right.')],
      [step('B1', `$(${v.mx}, ${v.scale * v.my})$`, 'A multiplier outside stretches vertically.')],
      [step('M1', `Stretch parallel to the $x$-axis, scale factor $\\frac{1}{${v.stretch}}$`, 'A multiplier inside squashes horizontally.'), step('A1', `$(${fracTex(Q.of(v.mx, v.stretch))}, ${v.my})$`, 'Divide the x coordinate.')],
      [step('M1', `$(${v.mx}, ${-v.my})$`, 'Reflection in the x-axis changes the sign of y.'), step('B1', 'A minimum', 'The curve is turned upside down.')],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const f = (x: number) => x * (x - v.p) * (x + v.q);
      const g = (x: number) => f(x - v.k);
      return f(v.p) === 0 && f(-v.q) === 0 && g(v.k + v.p) === 0 ? [] : ['roots'];
    }
    if (v.level === 'core') {
      const f = (x: number) => v.a / (x - v.c) + v.b;
      const x0 = v.c - v.a / v.b;
      return Math.abs(f(x0)) < 1e-9 && Math.abs(f(1e7) - v.b) < 1e-3 ? [] : ['curve'];
    }
    // Transform a sketch of f and scan for the top of each.
    const f = (x: number) => v.my * (1 - ((x - v.mx) / v.mx) ** 2);
    const best = (g: (x: number) => number) => {
      let bx = 0;
      for (let i = -2000; i < 6000; i++) if (g(i / 100) > g(bx)) bx = i / 100;
      return bx;
    };
    return Math.abs(best((x) => f(x - v.s)) - (v.mx + v.s)) < 0.02 && Math.abs(best((x) => f(v.stretch * x)) - v.mx / v.stretch) < 0.02 ? [] : ['transform'];
  },

  key: (v) => `${v.p}|${v.q}|${v.r}|${v.k}|${v.a}|${v.b}|${v.c}|${v.mx}|${v.my}|${v.s}|${v.scale}|${v.stretch}`,
});
