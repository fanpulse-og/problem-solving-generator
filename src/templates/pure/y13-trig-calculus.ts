import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 calculus of trigonometric functions: integrating a sum of sines
 * and cosines between limits, cos²x through the double angle formula, and x cos kx
 * by parts. Angles are in radians and answers exact, usually with π.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  c: number;
  b: number;
}

/** "p π + q" with exact coefficients. */
const piForm = (p: Q, q: Q) => `${p.eq(1) ? '' : fracTex(p)}\\pi ${q.isPositive() ? '+' : '-'} ${fracTex(q.isPositive() ? q : q.neg())}`;

export default defineTemplate<V>({
  id: 'y13-trig-calculus',
  title: 'Integrating trigonometric functions',
  strand: 'Pure',
  subtopic: 'Integration',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'foundational') return { level, a: rng.int(2, 9), c: rng.int(2, 9), b: rng.int(2, 5) };
    if (level === 'core') return { level, a: rng.int(2, 8), c: 0, b: 0 };
    return { level, a: 0, c: 0, b: rng.int(2, 6) };
  },

  validate(v) {
    return v.level === 'stretch' || v.a > 0 ? [] : ['the coefficient must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(4, text(`Find the exact value of  $\\int_0^{\\frac{\\pi}{${2 * v.b}}} (${v.a}\\cos ${v.b}x + ${v.c}\\sin ${2 * v.b}x)\\,\\mathrm{d}x$`))] };
    if (v.level === 'core') return { stem: [], parts: [single(5, text(`Use the identity for $\\cos 2x$ to find the exact value of  $\\int_0^{\\frac{\\pi}{4}} ${v.a}\\cos^2 x\\,\\mathrm{d}x$`))] };
    return { stem: [], parts: [single(5, text(`Use integration by parts to find the exact value of  $\\int_0^{\\frac{\\pi}{${2 * v.b}}} x\\cos ${v.b}x\\,\\mathrm{d}x$`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${fracTex(Q.of(v.a + v.c, v.b))}$` }];
    if (v.level === 'core') return [{ text: `$${piForm(Q.of(v.a, 8), Q.of(v.a, 4))}$` }];
    return [{ text: `$${piForm(Q.of(1, 2 * v.b * v.b), Q.of(-1, v.b * v.b))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `$\\left[${fracTex(Q.of(v.a, v.b))}\\sin ${v.b}x - ${fracTex(Q.of(v.c, 2 * v.b))}\\cos ${2 * v.b}x\\right]$`, 'Integrating divides by the coefficient of x. The integral of sin is minus cos.'),
          step('A1', `Upper limit: $${fracTex(Q.of(v.a, v.b))}\\sin\\frac{\\pi}{2} - ${fracTex(Q.of(v.c, 2 * v.b))}\\cos\\pi = ${fracTex(Q.of(v.a, v.b))} + ${fracTex(Q.of(v.c, 2 * v.b))}$`, 'Radians: at this limit the angles are π/2 and π.'),
          step('A1', `Lower limit: $-${fracTex(Q.of(v.c, 2 * v.b))}$`, 'The cos term does not vanish at 0.'),
          step('A1', `$${fracTex(Q.of(v.a + v.c, v.b))}$`, 'Subtract the lower limit from the upper limit.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', '$\\cos^2 x = \\frac{1 + \\cos 2x}{2}$', 'Rearrange cos 2x = 2cos²x − 1. You cannot integrate cos²x directly.'),
          step('M1', `$\\int ${fracTex(Q.of(v.a, 2))}(1 + \\cos 2x)\\,\\mathrm{d}x$`, 'Substitute.'),
          step('A1', `$${fracTex(Q.of(v.a, 2))}\\left[x + \\frac{1}{2}\\sin 2x\\right]_0^{\\frac{\\pi}{4}}$`, 'Integrate each term.'),
          step('M1', `$${fracTex(Q.of(v.a, 2))}\\left(\\frac{\\pi}{4} + \\frac{1}{2}\\right)$`, 'At the upper limit sin 2x = 1. The lower limit gives 0.'),
          step('A1', `$${piForm(Q.of(v.a, 8), Q.of(v.a, 4))}$`, 'Multiply out.'),
        ],
      ];
    }
    const k = v.b;
    return [
      [
        step('M1', `$u = x$, $\\frac{\\mathrm{d}v}{\\mathrm{d}x} = \\cos ${k}x$`, 'Let u be x, since it differentiates to something simpler.'),
        step('A1', `$\\frac{\\mathrm{d}u}{\\mathrm{d}x} = 1$, $v = \\frac{1}{${k}}\\sin ${k}x$`, 'Divide by the coefficient of x when you integrate.'),
        step('M1', `$\\left[\\frac{x}{${k}}\\sin ${k}x\\right] - \\int \\frac{1}{${k}}\\sin ${k}x\\,\\mathrm{d}x$`, 'uv minus the integral of v du/dx.'),
        step('A1', `$\\left[\\frac{x}{${k}}\\sin ${k}x + \\frac{1}{${k * k}}\\cos ${k}x\\right]_0^{\\frac{\\pi}{${2 * k}}}$`, 'The two minus signs make a plus.'),
        step('A1', `$${piForm(Q.of(1, 2 * k * k), Q.of(-1, k * k))}$`, 'Upper limit π/(2k²); lower limit 1/k².'),
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
      const got = simpson((x) => v.a * Math.cos(v.b * x) + v.c * Math.sin(2 * v.b * x), 0, Math.PI / (2 * v.b));
      return Math.abs(got - (v.a + v.c) / v.b) < 1e-7 ? [] : ['integral'];
    }
    if (v.level === 'core') {
      const got = simpson((x) => v.a * Math.cos(x) ** 2, 0, Math.PI / 4);
      return Math.abs(got - v.a * (Math.PI / 8 + 1 / 4)) < 1e-7 ? [] : ['integral'];
    }
    const got = simpson((x) => x * Math.cos(v.b * x), 0, Math.PI / (2 * v.b));
    return Math.abs(got - (Math.PI / (2 * v.b * v.b) - 1 / (v.b * v.b))) < 1e-7 ? [] : ['integral'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}`,
});
