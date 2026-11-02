import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { coef, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 convex and concave curves: where a cubic is concave and its
 * point of inflection, the two points of inflection of a quartic, and x e^(kx),
 * where the point of inflection must be given exactly.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  b: number;
  c: number;
  d: number;
  p: number;
  q: number;
  k: number;
}

const evalAt = (co: number[], x: number) => co.reduce((s, c) => s * x + c, 0);

export default defineTemplate<V>({
  id: 'y13-concavity',
  title: 'Convex and concave curves',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, b: 0, c: 0, d: 0, p: 0, q: 0, k: 0 };
    if (level === 'foundational') {
      const b = 3 * rng.int(1, 4) * rng.pick([1, -1]);
      const c = rng.int(1, 9) * rng.pick([1, -1]);
      return { ...base, b, c, d: rng.int(-9, 9) };
    }
    if (level === 'core') {
      const p = rng.int(-4, 2);
      const q = p + rng.int(1, 5);
      ensure(p !== 0 && q !== 0 && p + q !== 0, 'all terms appear');
      return { ...base, p, q };
    }
    return { ...base, k: rng.int(1, 5) };
  },

  validate(v) {
    return v.level === 'core' && v.q <= v.p ? ['the inflections must be in order'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The curve $C$ has equation  $y = ${polyTex([1, v.b, v.c, v.d])}$`),
        parts: [
          part('a', 2, text('Find $\\frac{\\mathrm{d}^2y}{\\mathrm{d}x^2}$')),
          part('b', 2, text('Find the range of values of $x$ for which $C$ is concave.')),
          part('c', 2, text('Find the coordinates of the point of inflection of $C$.')),
        ],
      };
    }
    if (v.level === 'core') {
      const [a, b] = [-2 * (v.p + v.q), 6 * v.p * v.q];
      return {
        stem: lines(`The curve $C$ has equation  $y = ${polyTex([1, a, b, 0, 0])}$`),
        parts: [
          part('a', 4, text('Find the $x$ coordinates of the points of inflection of $C$.')),
          part('b', 2, text('Find the range of values of $x$ for which $C$ is convex, using set notation.')),
        ],
      };
    }
    return {
      stem: lines(`The curve $C$ has equation  $y = x\\mathrm{e}^{${v.k === 1 ? '' : v.k}x}$`),
      parts: [
        part('a', 3, text('Find $\\frac{\\mathrm{d}^2y}{\\mathrm{d}x^2}$, giving your answer in a factorised form.')),
        part('b', 3, text('Find the exact coordinates of the point of inflection of $C$.')),
        part('c', 2, text('Find the range of values of $x$ for which $C$ is concave.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const x = -v.b / 3;
      return [{ text: `$${polyTex([6, 2 * v.b])}$` }, { text: `$x < ${x}$` }, { text: `$(${x}, ${evalAt([1, v.b, v.c, v.d], x)})$` }];
    }
    if (v.level === 'core') return [{ text: `$x = ${v.p}$ and $x = ${v.q}$` }, { text: `$\\{x : x < ${v.p}\\} \\cup \\{x : x > ${v.q}\\}$` }];
    const x = Q.of(-2, v.k);
    return [
      { text: `$${coef(v.k, `\\mathrm{e}^{${v.k === 1 ? '' : v.k}x}`)}(${terms([[v.k, 1], [2, 0]])})$` },
      { text: `$\\left(${fracTex(x)}, ${fracTex(x)}\\mathrm{e}^{-2}\\right)$` },
      { text: `$x < ${fracTex(x)}$` },
    ];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const x = -v.b / 3;
      return [
        [step('M1', `$\\frac{\\mathrm{d}y}{\\mathrm{d}x} = ${polyTex([3, 2 * v.b, v.c])}$`, 'Differentiate twice.'), step('A1', `$${polyTex([6, 2 * v.b])}$`, 'The second derivative.')],
        [step('M1', `$${polyTex([6, 2 * v.b])} < 0$`, 'Concave means the second derivative is negative (or zero).'), step('A1', `$x < ${x}$`, 'Solve the inequality.')],
        [step('M1', `$${polyTex([6, 2 * v.b])} = 0$, and it changes sign there`, 'A point of inflection needs the sign to change.'), step('A1', `$(${x}, ${evalAt([1, v.b, v.c, v.d], x)})$`, 'Substitute into the curve for y.')],
      ];
    }
    if (v.level === 'core') {
      const [a, b] = [-2 * (v.p + v.q), 6 * v.p * v.q];
      return [
        [
          step('M1', `$\\frac{\\mathrm{d}y}{\\mathrm{d}x} = ${polyTex([4, 3 * a, 2 * b, 0])}$`, 'First derivative.'),
          step('A1', `$\\frac{\\mathrm{d}^2y}{\\mathrm{d}x^2} = ${polyTex([12, 6 * a, 2 * b])}$`, 'Second derivative.'),
          step('M1', `$12(x ${v.p < 0 ? '+' : '-'} ${Math.abs(v.p)})(x ${v.q < 0 ? '+' : '-'} ${Math.abs(v.q)}) = 0$`, 'Set it to zero and factorise.'),
          step('A1', `$x = ${v.p}$ and $x = ${v.q}$`, 'The sign changes at each one, since the roots are different.'),
        ],
        [step('M1', 'Convex means the second derivative is positive', 'It is a positive quadratic, so positive outside its roots.'), step('A1', `$\\{x : x < ${v.p}\\} \\cup \\{x : x > ${v.q}\\}$`, 'Both regions, in set notation.')],
      ];
    }
    const x = Q.of(-2, v.k);
    const exp = v.k === 1 ? '' : v.k;
    return [
      [
        step('M1', `$\\frac{\\mathrm{d}y}{\\mathrm{d}x} = \\mathrm{e}^{${exp}x} + ${v.k === 1 ? '' : v.k}x\\mathrm{e}^{${exp}x}$`, 'Product rule.'),
        step('M1', `$\\frac{\\mathrm{d}^2y}{\\mathrm{d}x^2} = ${v.k === 1 ? '' : v.k}\\mathrm{e}^{${exp}x} + ${v.k === 1 ? '' : v.k}\\mathrm{e}^{${exp}x} + ${v.k * v.k === 1 ? '' : v.k * v.k}x\\mathrm{e}^{${exp}x}$`, 'Product rule again on the second term.'),
        step('A1', `$${coef(v.k, `\\mathrm{e}^{${exp}x}`)}(${terms([[v.k, 1], [2, 0]])})$`, 'Take out the common factor.'),
      ],
      [
        step('M1', `$${terms([[v.k, 1], [2, 0]])} = 0$`, 'The exponential is never zero.'),
        step('A1', `$x = ${fracTex(x)}$`, 'The sign of the bracket changes here.'),
        step('A1', `$\\left(${fracTex(x)}, ${fracTex(x)}\\mathrm{e}^{-2}\\right)$`, `e to the power ${v.k}x is e⁻² at this point.`),
      ],
      [step('M1', `$${terms([[v.k, 1], [2, 0]])} < 0$`, 'The other factors are positive.'), step('A1', `$x < ${fracTex(x)}$`, 'Solve.')],
    ];
  },

  check(v) {
    const d2 = (f: (x: number) => number, x: number, h = 1e-3) => (f(x + h) - 2 * f(x) + f(x - h)) / (h * h);
    if (v.level === 'foundational') {
      const f = (x: number) => evalAt([1, v.b, v.c, v.d], x);
      const x = -v.b / 3;
      return d2(f, x - 1) < 0 && d2(f, x + 1) > 0 ? [] : ['sign change'];
    }
    if (v.level === 'core') {
      const [a, b] = [-2 * (v.p + v.q), 6 * v.p * v.q];
      const f = (x: number) => evalAt([1, a, b, 0, 0], x);
      return d2(f, v.p - 0.2) > 0 && d2(f, (v.p + v.q) / 2) < 0 && d2(f, v.q + 0.2) > 0 ? [] : ['sign change'];
    }
    const f = (x: number) => x * Math.exp(v.k * x);
    const x = -2 / v.k;
    return d2(f, x - 0.1) < 0 && d2(f, x + 0.1) > 0 ? [] : ['sign change'];
  },

  key: (v) => `${v.b}|${v.c}|${v.d}|${v.p}|${v.q}|${v.k}`,
});
