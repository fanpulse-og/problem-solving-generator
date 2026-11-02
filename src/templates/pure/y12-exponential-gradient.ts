import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, fracTex } from '../../engine/format';
import { DYDX, sf3, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 gradients of exponentials: y = ae^(kx) has gradient kae^(kx),
 * a tangent at the y-axis, an x value from a given gradient using logs, and a model
 * whose rate of change is proportional to its size.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  k: number;
  g: number;
  A: number;
  rate: Q;
  N: number;
}

export default defineTemplate<V>({
  id: 'y12-exponential-gradient',
  title: 'Gradients of exponential functions',
  strand: 'Pure',
  subtopic: 'Exponentials & logarithms',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'measures' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, k: 0, g: 0, A: 0, rate: Q.of(0), N: 0 };
    if (level === 'stretch') {
      const A = rng.step(100, 900, 50);
      const rate = Q.of(rng.int(2, 15), 100);
      const N = A * rng.int(2, 5);
      return { ...base, A, rate, N };
    }
    const a = rng.int(2, 6);
    const k = rng.int(2, 5);
    const g = a * k * rng.int(2, 9);
    ensure(g / (a * k) !== Math.E, 'a real logarithm');
    return { ...base, a, k, g };
  },

  validate(v) {
    return v.level === 'stretch' ? [] : v.a > 0 && v.k > 0 ? [] : ['constants must be positive'];
  },

  render(v) {
    const y = `${v.a}\\mathrm{e}^{${v.k}x}`;
    if (v.level === 'foundational') {
      return {
        stem: lines(`A curve has equation  $y = ${y}$`, 'The curve meets the $y$-axis at the point $P$.'),
        parts: [
          part('a', 2, text(`Find $${DYDX}$`)),
          part('b', 1, text('Find the gradient of the curve at $P$.')),
          part('c', 2, text('Find an equation of the tangent to the curve at $P$, in the form  $y = mx + c$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A curve has equation  $y = ${y}$`, `The point $Q$ on the curve has gradient ${v.g}`),
        parts: [
          part('a', 3, text('Find the exact $x$ coordinate of $Q$, giving your answer in terms of a natural logarithm.')),
          part('b', 2, text('Find the $y$ coordinate of $Q$.')),
        ],
      };
    }
    return {
      stem: lines(`The number of bacteria, $N$, in a culture is modelled by  $N = ${v.A}\\mathrm{e}^{${dec(v.rate)}t}$`, 'where $t$ is the time in hours.'),
      parts: [
        part('a', 2, text('Show that the rate of increase of $N$ is proportional to $N$.')),
        part('b', 3, text(`Find the rate of increase of $N$ at the instant when  $N = ${v.N}$,  and the value of $t$ at that instant to 3 significant figures.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${v.a * v.k}\\mathrm{e}^{${v.k}x}$` }, { text: `$${v.a * v.k}$` }, { text: `$y = ${terms([[v.a * v.k, 1], [v.a, 0]])}$` }];
    if (v.level === 'core') {
      const m = Q.of(v.g, v.a * v.k);
      return [{ text: `$x = \\frac{1}{${v.k}}\\ln ${fracTex(m)}$` }, { text: `$${fracTex(Q.of(v.g, v.k))}$` }];
    }
    return [{ text: `$\\frac{\\mathrm{d}N}{\\mathrm{d}t} = ${dec(v.rate)}N$, which is proportional to $N$` }, { text: `Rate ${dec(v.rate.mul(v.N))} per hour at $t = ${sf3(Math.log(v.N / v.A) / v.rate.toNumber())}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('M1', `Differentiating $\\mathrm{e}^{${v.k}x}$ gives $${v.k}\\mathrm{e}^{${v.k}x}$`, 'The power stays the same; its coefficient comes down as a multiplier.'), step('A1', `$${v.a * v.k}\\mathrm{e}^{${v.k}x}$`, 'Multiply by the constant in front.')],
        [step('B1', `$${v.a * v.k}$`, 'At x = 0, e to the power 0 is 1.')],
        [step('M1', `$P$ is $(0, ${v.a})$`, 'Put x = 0 in the curve.'), step('A1', `$y = ${terms([[v.a * v.k, 1], [v.a, 0]])}$`, 'The tangent crosses the y-axis at P.')],
      ];
    }
    if (v.level === 'core') {
      const m = Q.of(v.g, v.a * v.k);
      return [
        [step('M1', `$${DYDX} = ${v.a * v.k}\\mathrm{e}^{${v.k}x} = ${v.g}$`, 'Set the gradient to the value given.'), step('M1', `$\\mathrm{e}^{${v.k}x} = ${fracTex(m)}$, so $${v.k}x = \\ln ${fracTex(m)}$`, 'Get the exponential alone, then take logs.'), step('A1', `$x = \\frac{1}{${v.k}}\\ln ${fracTex(m)}$`, 'Leave it exact.')],
        [step('M1', `$y = ${v.a} \\times ${fracTex(m)}$`, `You already know the value of e^(${v.k}x).`), step('A1', `$${fracTex(Q.of(v.g, v.k))}$`, 'No logarithm is needed here.')],
      ];
    }
    const t = Math.log(v.N / v.A) / v.rate.toNumber();
    return [
      [step('M1', `$\\frac{\\mathrm{d}N}{\\mathrm{d}t} = ${dec(v.rate.mul(v.A))}\\mathrm{e}^{${dec(v.rate)}t}$`, 'Differentiate.'), step('A1', `$= ${dec(v.rate)} \\times ${v.A}\\mathrm{e}^{${dec(v.rate)}t} = ${dec(v.rate)}N$`, 'Spot N inside the expression. This is what proportional means.')],
      [step('B1', `Rate $= ${dec(v.rate)} \\times ${v.N} = ${dec(v.rate.mul(v.N))}$`, 'Use the result of part (a).'), step('M1', `$\\mathrm{e}^{${dec(v.rate)}t} = \\frac{${v.N}}{${v.A}}$`, 'Find the time from the model.'), step('A1', `$t = ${sf3(t)}$`, 'Take natural logs.')],
    ];
  },

  check(v) {
    const num = (f: (x: number) => number, x: number) => (f(x + 1e-6) - f(x - 1e-6)) / 2e-6;
    if (v.level === 'stretch') {
      const f = (t: number) => v.A * Math.exp(v.rate.toNumber() * t);
      const t = Math.log(v.N / v.A) / v.rate.toNumber();
      return Math.abs(num(f, t) - v.rate.toNumber() * v.N) < 1e-3 && Math.abs(f(t) - v.N) < 1e-6 ? [] : ['rate'];
    }
    const f = (x: number) => v.a * Math.exp(v.k * x);
    if (v.level === 'foundational') return Math.abs(num(f, 0) - v.a * v.k) < 1e-5 ? [] : ['gradient'];
    const x = Math.log(v.g / (v.a * v.k)) / v.k;
    return Math.abs(num(f, x) - v.g) < 1e-3 && Math.abs(f(x) - v.g / v.k) < 1e-6 ? [] : ['point'];
  },

  key: (v) => `${v.a}|${v.k}|${v.g}|${v.A}|${v.rate}|${v.N}`,
});
