import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { fracTex, polyTex } from '../../engine/format';
import { terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 integration: f′(x) with a root term and a known point
 * (June 2018 Q1 and the "find f(x)" parts), the area of a shaded region, and a
 * region bounded by a line and a curve where the area is given and a constant
 * must be found. The diagram is sketched from the question's own numbers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number; // foundational: f'(x) = 3a x² + 3b√x
  b: number;
  p: number;
  q: number;
  alpha: number; // core: y = (x − α)(β − x)
  beta: number;
  m: number; // stretch: y = mx, y = x(k − x)
  k: number;
}

const sample = (f: (x: number) => number, x0: number, x1: number, n = 48): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, f(x0 + ((x1 - x0) * i) / n)]);

/** Exact ∫(x − α)(β − x) dx from α to β. */
const humpArea = (alpha: number, beta: number) => Q.of((beta - alpha) ** 3, 6);

export default defineTemplate<V>({
  id: 'y12-integration',
  title: 'Integration and area',
  strand: 'Pure',
  subtopic: 'Integration',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, p: 0, q: 0, alpha: 0, beta: 0, m: 0, k: 0 };
    if (level === 'foundational') return { ...base, a: rng.int(1, 4), b: rng.int(1, 4) * rng.pick([1, -1]), p: rng.pick([1, 4]), q: rng.int(-20, 40) };
    if (level === 'core') {
      const alpha = rng.int(1, 4);
      return { ...base, alpha, beta: alpha + rng.int(2, 6) };
    }
    const m = rng.int(1, 3);
    return { ...base, m, k: m + rng.int(2, 8) };
  },

  validate(v) {
    return v.level === 'core' && v.beta <= v.alpha ? ['the roots must be in order'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The curve with equation  $y = \\mathrm{f}(x),\\ x > 0$,  passes through the point $(${v.p}, ${v.q})$`, `Given that  $\\mathrm{f}'(x) = ${3 * v.a}x^2 ${v.b < 0 ? '-' : '+'} ${3 * Math.abs(v.b)}\\sqrt{x}$`),
        parts: [
          part('a', 2, text('find an expression for $\\mathrm{f}(x)$, including a constant of integration,')),
          part('b', 2, text(`hence find $\\mathrm{f}(x)$ in full.`)),
        ],
      };
    }
    if (v.level === 'core') {
      const f = (x: number) => (x - v.alpha) * (v.beta - x);
      const mid = (v.alpha + v.beta) / 2;
      const top = f(mid);
      return {
        stem: [
          diagram({
            type: 'graph',
            x: [-0.8, v.beta + 1.4],
            y: [-top * 0.5, top * 1.35],
            curves: [{ points: sample(f, v.alpha - 0.5, v.beta + 0.5) }],
            shade: sample(f, v.alpha, v.beta),
            marks: [
              { at: [v.alpha, 0], label: 'A', dx: -8, dy: 16 },
              { at: [v.beta, 0], label: 'B', dx: 8, dy: 16 },
              { at: [mid, top * 0.4], label: 'R', dy: 0 },
            ],
            notAccurate: false,
          }),
          ...lines(`The diagram shows a sketch of part of the curve with equation  $y = ${polyTex([-1, v.alpha + v.beta, -v.alpha * v.beta])}$`, 'The curve crosses the $x$-axis at the points $A$ and $B$.', 'The finite region $R$, shown shaded, is bounded by the curve and the $x$-axis.'),
        ],
        parts: [
          part('a', 2, text('Find the coordinates of $A$ and $B$.')),
          part('b', 4, text('Use algebraic integration to find the exact area of $R$.')),
        ],
      };
    }
    const f = (x: number) => x * (v.k - x);
    const d = v.k - v.m;
    const top = Math.max(f(v.k / 2), v.m * d);
    return {
      stem: [
        diagram({
          type: 'graph',
          x: [-0.8, v.k + 1.8],
          y: [-top * 0.35, top * 1.4],
          curves: [{ points: sample(f, 0, v.k + 0.2), label: 'C', labelAt: [v.k + 0.5, -top * 0.15] }, { points: [[0, 0], [d + 0.8, (d + 0.8) * v.m]], label: 'l', labelAt: [d + 1.0, (d + 1.0) * v.m] }],
          shade: [...sample(f, 0, d), [0, 0]],
          marks: [{ at: [d, v.m * d], label: 'P', dx: 8, dy: -8, dot: true }, { at: [(d * 2) / 3, (f((d * 2) / 3) + (v.m * d * 2) / 3) / 2], label: 'R', dy: 4 }],
        }),
        ...lines(`The diagram shows the curve $C$ with equation  $y = x(k - x)$,  where $k$ is a constant and $k > ${v.m}$,  and the line $l$ with equation  $y = ${terms([[v.m, 1]])}$`, 'The curve and the line meet at $O$ and at the point $P$.', 'The finite region $R$, shown shaded, is bounded by $C$ and $l$.'),
      ],
      parts: [
        part('a', 2, text('Find, in terms of $k$, the $x$ coordinate of $P$.')),
        part('b', 3, text(`Use algebraic integration to show that the area of $R$ is  $\\frac{1}{6}(k - ${v.m})^3$`)),
        part('c', 1, text(`Given that the area of $R$ is $${fracTex(Q.of(d ** 3, 6))}$, find the value of $k$.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const c = Q.of(v.q - v.a * v.p ** 3).sub(Q.of(2 * v.b * Math.round(Math.sqrt(v.p)) ** 3));
      return [
        { text: `$\\mathrm{f}(x) = ${terms([[v.a, 3], [2 * v.b, '\\frac{3}{2}']])} + c$` },
        { text: `$\\mathrm{f}(x) = ${terms([[v.a, 3], [2 * v.b, '\\frac{3}{2}'], [c, 0]])}$` },
      ];
    }
    if (v.level === 'core') return [{ text: `$A(${v.alpha}, 0)$ and $B(${v.beta}, 0)$` }, { text: `$${fracTex(humpArea(v.alpha, v.beta))}$` }];
    return [{ text: `$k - ${v.m}$` }, { text: 'Shown' }, { text: `$k = ${v.k}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const root = Math.round(Math.sqrt(v.p));
      const c = Q.of(v.q - v.a * v.p ** 3).sub(Q.of(2 * v.b * root ** 3));
      return [
        [step('M1', `$\\sqrt{x} = x^{\\frac{1}{2}}$`, 'Write the root as a power, then add 1 to each power and divide by the new power.'), step('A1', `$${terms([[v.a, 3], [2 * v.b, '\\frac{3}{2}']])} + c$`, `Dividing by 3/2 is multiplying by 2/3.`)],
        [step('M1', `$${v.q} = ${v.a}(${v.p})^3 ${v.b < 0 ? '-' : '+'} ${2 * Math.abs(v.b)}(${v.p})^{\\frac{3}{2}} + c$`, 'Substitute the point to find c.'), step('A1', `$\\mathrm{f}(x) = ${terms([[v.a, 3], [2 * v.b, '\\frac{3}{2}'], [c, 0]])}$`, 'Write out f(x) with the value of c.')],
      ];
    }
    if (v.level === 'core') {
      const F = (x: number) => Q.of(-(x ** 3), 3).add(Q.of((v.alpha + v.beta) * x * x, 2)).sub(Q.of(v.alpha * v.beta * x));
      return [
        [step('M1', `$${polyTex([-1, v.alpha + v.beta, -v.alpha * v.beta])} = 0$, so $(x - ${v.alpha})(${v.beta} - x) = 0$`, 'The curve meets the x-axis where y = 0.'), step('A1', `$A(${v.alpha}, 0)$ and $B(${v.beta}, 0)$`, 'Both coordinates are needed.')],
        [
          step('M1', `$\\int (${polyTex([-1, v.alpha + v.beta, -v.alpha * v.beta])})\\,\\mathrm{d}x$`, 'The area is the integral between the two roots.'),
          step('A1', `$\\left[${terms([[Q.of(-1, 3), 3], [Q.of(v.alpha + v.beta, 2), 2], [-v.alpha * v.beta, 1]])}\\right]_{${v.alpha}}^{${v.beta}}$`, 'Integrate each term.'),
          step('M1', `$(${fracTex(F(v.beta))}) - (${fracTex(F(v.alpha))})$`, 'Upper limit minus lower limit.'),
          step('A1', `$${fracTex(humpArea(v.alpha, v.beta))}$`, 'Give the exact value, as the question asks.'),
        ],
      ];
    }
    const d = v.k - v.m;
    return [
      [step('M1', `$x(k - x) = ${terms([[v.m, 1]])}$`, 'Set the curve equal to the line.'), step('A1', `$x = k - ${v.m}$`, 'Divide by x (x = 0 is O), then rearrange.')],
      [
        step('M1', `$\\int_0^{k - ${v.m}} (x(k - x) - ${terms([[v.m, 1]])})\\,\\mathrm{d}x$`, 'Area between: the top curve minus the bottom line.'),
        step('M1', `$\\left[\\frac{(k - ${v.m})x^2}{2} - \\frac{x^3}{3}\\right]_0^{k - ${v.m}}$`, 'Treat k − m as a constant when you integrate.'),
        step('A1', `$\\frac{(k - ${v.m})^3}{2} - \\frac{(k - ${v.m})^3}{3} = \\frac{1}{6}(k - ${v.m})^3$`, 'Substitute the limit. This is the printed answer.'),
      ],
      [step('B1', `$(k - ${v.m})^3 = ${d ** 3}$, so $k = ${v.k}$`, 'Multiply by 6, then take the cube root.')],
    ];
  },

  check(v) {
    const simpson = (f: (x: number) => number, a: number, b: number, n = 200) => {
      let s = f(a) + f(b);
      for (let i = 1; i < n; i++) s += f(a + ((b - a) * i) / n) * (i % 2 ? 4 : 2);
      return (s * (b - a)) / (3 * n);
    };
    if (v.level === 'foundational') {
      // The shown f(x) passes through the point and has the right gradient.
      const root = Math.round(Math.sqrt(v.p));
      const c = v.q - v.a * v.p ** 3 - 2 * v.b * root ** 3;
      const F = (x: number) => v.a * x ** 3 + 2 * v.b * x ** 1.5 + c;
      const numeric = (F(5 + 1e-5) - F(5 - 1e-5)) / 2e-5;
      return F(v.p) === v.q && Math.abs(numeric - (3 * v.a * 25 + 3 * v.b * Math.sqrt(5))) < 1e-3 ? [] : ['f'];
    }
    if (v.level === 'core') return Math.abs(simpson((x) => (x - v.alpha) * (v.beta - x), v.alpha, v.beta) - humpArea(v.alpha, v.beta).toNumber()) < 1e-6 ? [] : ['area'];
    const d = v.k - v.m;
    return Math.abs(simpson((x) => x * (v.k - x) - v.m * x, 0, d) - d ** 3 / 6) < 1e-6 ? [] : ['area'];
  },

  key: (v) => `${v.a}|${v.b}|${v.p}|${v.q}|${v.alpha}|${v.beta}|${v.m}|${v.k}`,
});
