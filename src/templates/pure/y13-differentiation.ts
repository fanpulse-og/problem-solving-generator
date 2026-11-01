import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { DYDX, coef } from '../../engine/pure';

/**
 * Modelled on 9MA0 calculus: chain and product rules, the quotient rule leading
 * to where a function is decreasing (June 2024 P1 Q5), and a polynomial times an
 * exponential with exact stationary points.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  n: number;
  k: number;
  d: number; // core: (x² + c)/(x + d)
  c: number;
  s: number;
  alpha: number; // stretch: stationary x-values
  beta: number;
  p: number;
}

export default defineTemplate<V>({
  id: 'y13-differentiation',
  title: 'Chain, product and quotient rules',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, n: 0, k: 0, d: 0, c: 0, s: 0, alpha: 0, beta: 0, p: 0 };
    if (level === 'foundational') return { ...base, a: rng.int(2, 6), b: rng.int(1, 9) * rng.pick([1, -1]), n: rng.int(3, 7), k: rng.int(2, 5), p: rng.int(2, 5) };
    if (level === 'core') {
      const d = rng.int(1, 5);
      const s = rng.int(1, 6);
      const c = s * s - d * d;
      ensure(c !== 0, 'the numerator keeps its constant');
      return { ...base, d, s, c };
    }
    const alpha = rng.int(-5, 1);
    const beta = alpha + rng.int(1, 5);
    const b = -alpha - beta - 2;
    const c = alpha * beta - b;
    ensure(alpha !== 0 && beta !== 0 && b !== 0 && c !== 0, 'all terms appear');
    ensure(alpha * alpha + b * alpha + c !== 0 && beta * beta + b * beta + c !== 0, 'the curve does not touch the axis at a stationary point');
    return { ...base, alpha, beta, b, c };
  },

  validate(v) {
    return v.level === 'core' && v.s === 0 ? ['s must not be zero'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          part('a', 2, text(`Given that  $y = (${polyTex([v.a, v.b])})^${v.n}$,  find $${DYDX}$`)),
          part('b', 3, text(`Given that  $y = x^${v.p}\\mathrm{e}^{${v.k}x}$,  find $${DYDX}$,  giving your answer in a fully factorised form.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`The function f is defined by  $\\mathrm{f}(x) = \\frac{x^2 ${v.c < 0 ? '-' : '+'} ${Math.abs(v.c)}}{x + ${v.d}},\\ x \\neq -${v.d}$`),
        parts: [
          part('a', 3, text(`Show that  $\\mathrm{f}'(x) = \\frac{ax^2 + bx + c}{(x + ${v.d})^2}$  where $a$, $b$ and $c$ are constants to be found.`)),
          part('b', 3, text('Hence, using algebra, find the values of $x$ for which f is decreasing.')),
        ],
      };
    }
    return {
      stem: lines(`A curve has equation  $y = (${polyTex([1, v.b, v.c])})\\mathrm{e}^x$`),
      parts: [
        part('a', 3, text(`Show that  $${DYDX} = \\mathrm{e}^x(x^2 + px + q)$  where $p$ and $q$ are integers to be found.`)),
        part('b', 4, text('Find the exact coordinates of the stationary points of the curve.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: `$${v.n * v.a}(${polyTex([v.a, v.b])})^${v.n - 1}$` }, { text: `$x^{${v.p - 1}}\\mathrm{e}^{${v.k}x}(${polyTex([v.k, v.p])})$` }];
    }
    if (v.level === 'core') {
      return [{ text: `$a = 1$, $b = ${2 * v.d}$, $c = ${-v.c}$` }, { text: `$${-v.d - v.s} < x < ${-v.d}$ and $${-v.d} < x < ${-v.d + v.s}$` }];
    }
    const y = (x: number) => x * x + v.b * x + v.c;
    const pt = (x: number) => `$(${x}, ${coef(y(x), `\\mathrm{e}^{${x}}`)})$`;
    return [{ text: `$p = ${v.b + 2}$, $q = ${v.b + v.c}$` }, { text: `${pt(v.alpha)} and ${pt(v.beta)}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('M1', `$${v.n}(${polyTex([v.a, v.b])})^${v.n - 1} \\times ${v.a}$`, 'Chain rule: differentiate the outside, then multiply by the derivative of the inside.'), step('A1', `$${v.n * v.a}(${polyTex([v.a, v.b])})^${v.n - 1}$`, 'Multiply the numbers.')],
        [
          step('M1', `$u = x^${v.p}$, $v = \\mathrm{e}^{${v.k}x}$:  $u' = ${v.p}x^{${v.p - 1}}$, $v' = ${v.k}\\mathrm{e}^{${v.k}x}$`, 'Product rule: name the two parts.'),
          step('A1', `$${v.p}x^{${v.p - 1}}\\mathrm{e}^{${v.k}x} + ${v.k}x^${v.p}\\mathrm{e}^{${v.k}x}$`, 'u′v + uv′.'),
          step('A1', `$x^{${v.p - 1}}\\mathrm{e}^{${v.k}x}(${polyTex([v.k, v.p])})$`, 'Take out the highest common factor.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\mathrm{f}'(x) = \\frac{(x + ${v.d})(2x) - (x^2 ${v.c < 0 ? '-' : '+'} ${Math.abs(v.c)})(1)}{(x + ${v.d})^2}$`, 'Quotient rule from the formula booklet.'),
          step('M1', `$= \\frac{2x^2 + ${2 * v.d}x - x^2 ${v.c < 0 ? '+' : '-'} ${Math.abs(v.c)}}{(x + ${v.d})^2}$`, 'Expand the top; take care with the minus sign.'),
          step('A1', `$a = 1$, $b = ${2 * v.d}$, $c = ${-v.c}$`, 'Collect the terms.'),
        ],
        [
          step('M1', `$${polyTex([1, 2 * v.d, -v.c])} < 0$`, 'Decreasing means f′(x) < 0. The denominator is a square, so it is positive.'),
          step('M1', `$(x + ${v.d + v.s})(x ${v.d - v.s < 0 ? '-' : '+'} ${Math.abs(v.d - v.s)}) = 0$, so $x = ${-v.d - v.s}$ or $${-v.d + v.s}$`, 'Find the critical values.'),
          step('A1', `$${-v.d - v.s} < x < ${-v.d}$ and $${-v.d} < x < ${-v.d + v.s}$`, `Between the roots, but x = ${-v.d} is excluded because f is not defined there.`),
        ],
      ];
    }
    const y = (x: number) => x * x + v.b * x + v.c;
    return [
      [
        step('M1', `$u = ${polyTex([1, v.b, v.c])}$, $v = \\mathrm{e}^x$`, 'Product rule. e^x differentiates to itself.'),
        step('A1', `$(${polyTex([2, v.b])})\\mathrm{e}^x + (${polyTex([1, v.b, v.c])})\\mathrm{e}^x$`, 'u′v + uv′.'),
        step('A1', `$\\mathrm{e}^x(${polyTex([1, v.b + 2, v.b + v.c])})$`, 'Factorise out e^x and collect.'),
      ],
      [
        step('M1', `$\\mathrm{e}^x(${polyTex([1, v.b + 2, v.b + v.c])}) = 0$`, 'e^x is never zero, so the bracket must be.'),
        step('A1', `$x = ${v.alpha}$ or $x = ${v.beta}$`, 'Factorise.'),
        step('A1', `$(${v.alpha}, ${coef(y(v.alpha), `\\mathrm{e}^{${v.alpha}}`)})$`, 'Substitute into the original equation, leaving e exact.'),
        step('A1', `$(${v.beta}, ${coef(y(v.beta), `\\mathrm{e}^{${v.beta}}`)})$`, 'The second point.'),
      ],
    ];
  },

  check(v) {
    const num = (f: (x: number) => number, x: number) => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
    if (v.level === 'foundational') {
      const f = (x: number) => x ** v.p * Math.exp(v.k * x);
      const d = (x: number) => x ** (v.p - 1) * Math.exp(v.k * x) * (v.k * x + v.p);
      for (const x of [0.5, 1]) if (Math.abs(num(f, x) - d(x)) > 1e-3 * Math.max(1, Math.abs(d(x)))) return ['product'];
      return [];
    }
    if (v.level === 'core') {
      const f = (x: number) => (x * x + v.c) / (x + v.d);
      // Decreasing inside each interval, increasing outside.
      const [lo, hi] = [-v.d - v.s, -v.d + v.s];
      if (!(num(f, lo + v.s / 2) < 0 && num(f, hi - v.s / 2) < 0 && num(f, lo - 1) > 0 && num(f, hi + 1) > 0)) return ['decreasing'];
      return Math.abs(num(f, lo)) < 1e-3 ? [] : ['critical'];
    }
    const f = (x: number) => (x * x + v.b * x + v.c) * Math.exp(x);
    return Math.abs(num(f, v.alpha)) < 1e-3 * Math.max(1, Math.abs(f(v.alpha))) && Math.abs(num(f, v.beta)) < 1e-3 * Math.max(1, Math.abs(f(v.beta))) ? [] : ['stationary'];
  },

  key: (v) => `${v.a}|${v.b}|${v.n}|${v.k}|${v.d}|${v.c}|${v.s}|${v.alpha}|${v.beta}|${v.p}`,
});
