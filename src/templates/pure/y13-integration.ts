import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 integration: by parts with an exponential, by parts with ln x
 * between limits to an exact answer, and a definite integral by substitution.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  k: number;
  a: number;
  n: number; // core: ∫ xⁿ ln x
  c: number; // stretch: ∫ x√(x² + c) from 0 to m, with both roots whole
  m: number;
  low: number;
  high: number;
}

const SQUARES: [number, number, number][] = [
  // c, m, with √c and √(m² + c) whole: [c, m, top root]
  [9, 4, 5],
  [16, 3, 5],
  [25, 12, 13],
  [36, 8, 10],
  [64, 6, 10],
  [144, 5, 13],
  [144, 9, 15],
  [81, 12, 15],
  [225, 8, 17],
  [64, 15, 17],
];

export default defineTemplate<V>({
  id: 'y13-integration',
  title: 'Integration by parts and substitution',
  strand: 'Pure',
  subtopic: 'Integration',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, k: 0, a: 0, n: 0, c: 0, m: 0, low: 0, high: 0 };
    if (level === 'foundational') return { ...base, k: rng.int(2, 6), a: rng.int(2, 5) };
    if (level === 'core') return { ...base, n: rng.int(1, 3), a: rng.int(2, 5) };
    const [c, m, high] = rng.pick(SQUARES);
    return { ...base, c, m, high, low: Math.round(Math.sqrt(c)) };
  },

  validate(v) {
    return v.level === 'stretch' && v.m * v.m + v.c !== v.high * v.high ? ['the upper root must be whole'] : [];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(4, text(`Find  $\\int ${v.a}x\\mathrm{e}^{${v.k}x}\\,\\mathrm{d}x$`))] };
    if (v.level === 'core') return { stem: [], parts: [single(5, text(`Use integration by parts to find the exact value of  $\\int_1^{${v.a}} x${v.n === 1 ? '' : `^${v.n}`}\\ln x\\,\\mathrm{d}x$`))] };
    return {
      stem: [],
      parts: [
        single(5, text(`Use the substitution  $u = x^2 + ${v.c}$  to find the exact value of`), text(`$\\int_0^{${v.m}} x\\sqrt{x^2 + ${v.c}}\\,\\mathrm{d}x$`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: `$${fracTex(Q.of(v.a, v.k))}x\\mathrm{e}^{${v.k}x} - ${fracTex(Q.of(v.a, v.k * v.k))}\\mathrm{e}^{${v.k}x} + c$` }];
    }
    if (v.level === 'core') {
      const N = v.n + 1;
      const c1 = Q.of(v.a ** N, N);
      const c2 = Q.of(v.a ** N - 1, N * N);
      return [{ text: `$${fracTex(c1)}\\ln ${v.a} - ${fracTex(c2)}$` }];
    }
    return [{ text: `$${fracTex(Q.of(v.high ** 3 - v.low ** 3, 3))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const p = Q.of(v.a, v.k);
      const q = Q.of(v.a, v.k * v.k);
      return [
        [
          step('M1', `$u = ${v.a}x$, $\\frac{\\mathrm{d}v}{\\mathrm{d}x} = \\mathrm{e}^{${v.k}x}$`, 'Choose u to be the part that gets simpler when differentiated.'),
          step('A1', `$\\frac{\\mathrm{d}u}{\\mathrm{d}x} = ${v.a}$, $v = \\frac{1}{${v.k}}\\mathrm{e}^{${v.k}x}$`, 'Remember to divide by k when you integrate.'),
          step('M1', `$${fracTex(p)}x\\mathrm{e}^{${v.k}x} - \\int ${fracTex(p)}\\mathrm{e}^{${v.k}x}\\,\\mathrm{d}x$`, 'uv minus the integral of v du/dx.'),
          step('A1', `$${fracTex(p)}x\\mathrm{e}^{${v.k}x} - ${fracTex(q)}\\mathrm{e}^{${v.k}x} + c$`, 'Finish, and include the constant.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const N = v.n + 1;
      const c1 = Q.of(v.a ** N, N);
      const c2 = Q.of(v.a ** N - 1, N * N);
      const xn = v.n === 1 ? 'x' : `x^${v.n}`;
      return [
        [
          step('M1', `$u = \\ln x$, $\\frac{\\mathrm{d}v}{\\mathrm{d}x} = ${xn}$`, 'ln x has no simple integral, so it must be u.'),
          step('A1', `$\\frac{\\mathrm{d}u}{\\mathrm{d}x} = \\frac{1}{x}$, $v = \\frac{x^${N}}{${N}}$`, 'Differentiate one, integrate the other.'),
          step('M1', `$\\left[\\frac{x^${N}}{${N}}\\ln x\\right] - \\int \\frac{x^${v.n}}{${N}}\\,\\mathrm{d}x$`, 'The x cancels with 1/x.'),
          step('A1', `$\\left[\\frac{x^${N}}{${N}}\\ln x - \\frac{x^${N}}{${N * N}}\\right]_1^{${v.a}}$`, 'Integrate again.'),
          step('A1', `$${fracTex(c1)}\\ln ${v.a} - ${fracTex(c2)}$`, 'Substitute the limits. ln 1 = 0.'),
        ],
      ];
    }
    return [
      [
        step('M1', '$\\frac{\\mathrm{d}u}{\\mathrm{d}x} = 2x$, so $x\\,\\mathrm{d}x = \\frac{1}{2}\\mathrm{d}u$', 'Differentiate the substitution.'),
        step('B1', `$x = 0 \\Rightarrow u = ${v.c}$;  $x = ${v.m} \\Rightarrow u = ${v.high * v.high}$`, 'Change the limits as well.'),
        step('M1', `$\\frac{1}{2}\\int_{${v.c}}^{${v.high * v.high}} u^{\\frac{1}{2}}\\,\\mathrm{d}u$`, 'Rewrite the integral entirely in u.'),
        step('A1', `$\\left[\\frac{1}{3}u^{\\frac{3}{2}}\\right]_{${v.c}}^{${v.high * v.high}}$`, 'Add 1 to the power and divide.'),
        step('A1', `$${fracTex(Q.of(v.high ** 3 - v.low ** 3, 3))}$`, `${v.high}³ − ${v.low}³, all divided by 3.`),
      ],
    ];
  },

  check(v) {
    const simpson = (f: (x: number) => number, a: number, b: number, n = 2000) => {
      let s = f(a) + f(b);
      for (let i = 1; i < n; i++) s += f(a + ((b - a) * i) / n) * (i % 2 ? 4 : 2);
      return (s * (b - a)) / (3 * n);
    };
    if (v.level === 'foundational') {
      // Differentiating the answer gives the integrand back.
      const F = (x: number) => (v.a / v.k) * x * Math.exp(v.k * x) - (v.a / (v.k * v.k)) * Math.exp(v.k * x);
      const x = 0.3;
      const d = (F(x + 1e-6) - F(x - 1e-6)) / 2e-6;
      return Math.abs(d - v.a * x * Math.exp(v.k * x)) < 1e-3 ? [] : ['derivative'];
    }
    if (v.level === 'core') {
      const N = v.n + 1;
      const exact = (v.a ** N / N) * Math.log(v.a) - (v.a ** N - 1) / (N * N);
      return Math.abs(simpson((x) => x ** v.n * Math.log(x), 1, v.a) - exact) < 1e-6 ? [] : ['integral'];
    }
    const exact = (v.high ** 3 - v.low ** 3) / 3;
    return Math.abs(simpson((x) => x * Math.sqrt(x * x + v.c), 0, v.m) - exact) < 1e-6 ? [] : ['integral'];
  },

  key: (v) => `${v.k}|${v.a}|${v.n}|${v.c}|${v.m}`,
});
