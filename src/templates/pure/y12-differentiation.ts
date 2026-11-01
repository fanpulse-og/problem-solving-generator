import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { DYDX, lineTex, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 differentiation: a tangent at a point, a normal with a
 * negative power in the curve, and stationary points with their nature and the
 * range where the curve is increasing, written in set notation.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  co: number[]; // polynomial, highest first (foundational, stretch)
  a: number; // core: y = ax² + b/x + c
  b: number;
  c: number;
  p: number;
  alpha: number; // stretch: stationary x-values
  beta: number;
}

/** y = ax² + b/x + c and its derivative, with fractions as the papers write them. */
const curveTex = (v: V) => `${terms([[v.a, 2]])} ${v.b < 0 ? '-' : '+'} \\frac{${Math.abs(v.b)}}{x}${v.c === 0 ? '' : ` ${v.c < 0 ? '-' : '+'} ${Math.abs(v.c)}`}`;
const gradTex = (v: V) => `${2 * v.a}x ${v.b < 0 ? '+' : '-'} \\frac{${Math.abs(v.b)}}{x^2}`;
const evalAt = (co: number[], x: number) => co.reduce((s, k) => s * x + k, 0);
const deriv = (co: number[]) => co.slice(0, -1).map((k, i) => k * (co.length - 1 - i));

export default defineTemplate<V>({
  id: 'y12-differentiation',
  title: 'Tangents, normals and stationary points',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, co: [], a: 0, b: 0, c: 0, p: 0, alpha: 0, beta: 0 };
    if (level === 'foundational') {
      const co = [rng.int(1, 3), rng.int(-6, 6), rng.int(-9, 9), rng.int(-9, 9)];
      const p = rng.int(-3, 3);
      ensure(p !== 0 && co[1] !== 0 && co[2] !== 0, 'all terms appear');
      return { ...base, co, p };
    }
    if (level === 'core') {
      const p = rng.pick([1, 2]);
      const a = rng.int(1, 4);
      const b = rng.int(1, 6) * p * p * rng.pick([1, -1]);
      const c = rng.int(-5, 5);
      const m = 2 * a * p - b / (p * p);
      ensure(m !== 0 && m !== 1 && m !== -1, 'a normal with a fractional gradient');
      return { ...base, a, b, c, p };
    }
    const alpha = rng.int(-5, 1);
    const beta = alpha + 2 * rng.int(1, 3);
    const co = [1, (-3 * (alpha + beta)) / 2, 3 * alpha * beta, rng.int(-9, 9)];
    ensure(alpha !== 0 && beta !== 0 && co[1] !== 0, 'all terms appear');
    return { ...base, co, alpha, beta };
  },

  validate(v) {
    return v.level === 'stretch' && (evalAt(deriv(v.co), v.alpha) !== 0 || evalAt(deriv(v.co), v.beta) !== 0) ? ['the gradient must be zero at the stationary points'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A curve has equation  $y = ${polyTex(v.co)}$`, `The point $P$ on the curve has $x$ coordinate $${v.p}$`),
        parts: [
          part('a', 2, text(`Find $${DYDX}$`)),
          part('b', 1, text('Find the gradient of the curve at $P$')),
          part('c', 2, text('Find an equation of the tangent to the curve at $P$, in the form  $y = mx + c$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A curve has equation  $y = ${curveTex(v)},\\ x \\neq 0$`, `The point $P$ on the curve has $x$ coordinate $${v.p}$`),
        parts: [
          part('a', 2, text(`Find $${DYDX}$`)),
          part('b', 1, text('Find the gradient of the curve at $P$')),
          part('c', 3, text('Find an equation of the normal to the curve at $P$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
        ],
      };
    }
    return {
      stem: lines(`A curve has equation  $y = ${polyTex(v.co)}$`),
      parts: [
        part('a', 4, text('Using calculus, find the coordinates of the stationary points of the curve.')),
        part('b', 2, text('Determine the nature of each stationary point, justifying your answer.')),
        part('c', 2, text('Write down the set of values of $x$ for which $y$ is increasing, using set notation.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const d = deriv(v.co);
      const m = evalAt(d, v.p);
      const y = evalAt(v.co, v.p);
      return [{ text: `$${polyTex(d)}$` }, { text: `$${m}$` }, { text: `$y = ${terms([[m, 1], [y - m * v.p, 0]])}$` }];
    }
    if (v.level === 'core') {
      const m = 2 * v.a * v.p - v.b / (v.p * v.p);
      const y = Q.of(v.a * v.p * v.p + v.c).add(Q.of(v.b, v.p));
      return [{ text: `$${gradTex(v)}$` }, { text: `$${m}$` }, { text: `$${lineTex(1, m, -(v.p + m * y.toInt()))}$` }];
    }
    const ya = evalAt(v.co, v.alpha);
    const yb = evalAt(v.co, v.beta);
    return [
      { text: `$(${v.alpha}, ${ya})$ and $(${v.beta}, ${yb})$` },
      { text: `$(${v.alpha}, ${ya})$ is a maximum; $(${v.beta}, ${yb})$ is a minimum.` },
      { text: `$\\{x : x < ${v.alpha}\\} \\cup \\{x : x > ${v.beta}\\}$` },
    ];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const d = deriv(v.co);
      const m = evalAt(d, v.p);
      const y = evalAt(v.co, v.p);
      return [
        [step('M1', 'Multiply by the power, then reduce the power by 1', 'Do this for each term; the constant disappears.'), step('A1', `$${DYDX} = ${polyTex(d)}$`, 'All terms correct.')],
        [step('B1', `$${m}$`, `Substitute x = ${v.p} into the derivative, not into y.`)],
        [step('M1', `$y - (${y}) = ${m}(x - (${v.p}))$`, `P is (${v.p}, ${y}): find y from the equation of the curve.`), step('A1', `$y = ${terms([[m, 1], [y - m * v.p, 0]])}$`, 'Expand and collect the terms.')],
      ];
    }
    if (v.level === 'core') {
      const m = 2 * v.a * v.p - v.b / (v.p * v.p);
      const y = Q.of(v.a * v.p * v.p + v.c).add(Q.of(v.b, v.p)).toInt();
      return [
        [step('M1', `$y = ${terms([[v.a, 2], [v.b, '-1'], [v.c, 0]])}$`, 'Write the fraction as a negative power first.'), step('A1', `$${DYDX} = ${gradTex(v)}$`, 'The power −1 becomes −2.')],
        [step('B1', `$${m}$`, `Substitute x = ${v.p}.`)],
        [
          step('M1', `Gradient of normal $= ${fracTex(Q.of(-1, m))}$`, 'The normal is perpendicular to the tangent.'),
          step('M1', `$y - (${y}) = ${fracTex(Q.of(-1, m))}(x - ${v.p})$`, `P is (${v.p}, ${y}).`),
          step('A1', `$${lineTex(1, m, -(v.p + m * y))}$`, 'Multiply through to clear the fraction.'),
        ],
      ];
    }
    const d = deriv(v.co);
    const ya = evalAt(v.co, v.alpha);
    const yb = evalAt(v.co, v.beta);
    return [
      [
        step('M1', `$${DYDX} = ${polyTex(d)}$`, 'Differentiate.'),
        step('M1', `$${polyTex(d)} = 0$`, 'Stationary points have zero gradient.'),
        step('A1', `$x = ${v.alpha}$ or $x = ${v.beta}$`, 'Divide by 3 first, then factorise.'),
        step('A1', `$(${v.alpha}, ${ya})$ and $(${v.beta}, ${yb})$`, 'Substitute into the equation of the curve for y.'),
      ],
      [
        step('M1', `$\\frac{\\mathrm{d}^2y}{\\mathrm{d}x^2} = ${polyTex(deriv(d))}$`, 'Differentiate again, then substitute each x value.'),
        step('A1', `At $x = ${v.alpha}$ it is $${evalAt(deriv(d), v.alpha)} < 0$: maximum. At $x = ${v.beta}$ it is $${evalAt(deriv(d), v.beta)} > 0$: minimum.`, 'Negative means a maximum; positive means a minimum.'),
      ],
      [step('M1', `$x < ${v.alpha}$ or $x > ${v.beta}$`, 'The curve rises outside the two stationary points.'), step('A1', `$\\{x : x < ${v.alpha}\\} \\cup \\{x : x > ${v.beta}\\}$`, 'Set notation needs curly brackets and the union sign.')],
    ];
  },

  check(v, answers) {
    const num = (f: (x: number) => number, x: number) => (f(x + 1e-5) - f(x - 1e-5)) / 2e-5;
    if (v.level === 'core') {
      const f = (x: number) => v.a * x * x + v.b / x + v.c;
      const m = Number(answers[1].text.replace(/\$/g, ''));
      return Math.abs(num(f, v.p) - m) < 1e-4 ? [] : ['gradient'];
    }
    const f = (x: number) => evalAt(v.co, x);
    if (v.level === 'foundational') {
      const m = Number(answers[1].text.replace(/\$/g, ''));
      return Math.abs(num(f, v.p) - m) < 1e-3 ? [] : ['gradient'];
    }
    if (Math.abs(num(f, v.alpha)) > 1e-3 || Math.abs(num(f, v.beta)) > 1e-3) return ['stationary'];
    return f(v.alpha) > f((v.alpha + v.beta) / 2) && f(v.beta) < f((v.alpha + v.beta) / 2) ? [] : ['nature'];
  },

  key: (v) => `${v.co}|${v.a}|${v.b}|${v.c}|${v.p}`,
});
