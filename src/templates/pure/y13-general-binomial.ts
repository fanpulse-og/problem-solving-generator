import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, fracTex, roundFloatDp } from '../../engine/format';
import { gCr, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 binomial series: a negative or fractional power with its range
 * of validity, factorising out a constant first, and using the series to estimate
 * a root (9MA0/01 June 2024 Q2 asks why a value of x may not be used).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  n: Q;
  a: number; // the constant inside the bracket (a perfect square at core)
  b: number;
  c: number; // stretch: (c + dx)(1 + bx)^n
  d: number;
}

/** First three terms of (1 + bx)^n as exact coefficients. */
const coeffs = (n: Q, b: Q) => [Q.of(1), gCr(n, 1).mul(b), gCr(n, 2).mul(b).mul(b)];
const asc = (co: Q[]) => terms(co.map((c, i) => [c, i] as [Q, number]));
const powTex = (n: Q) => (n.isInt() ? `${n}` : `${n.n < 0n ? '-' : ''}\\frac{${n.n < 0n ? -n.n : n.n}}{${n.d}}`);
const brack = (a: number, b: number) => `${a} ${b < 0 ? '-' : '+'} ${Math.abs(b) === 1 ? '' : Math.abs(b)}x`;

export default defineTemplate<V>({
  id: 'y13-general-binomial',
  title: 'Binomial series for any power',
  strand: 'Pure',
  subtopic: 'Binomial expansion',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    if (level === 'foundational') return { level, n: Q.of(rng.pick([-1, -2, -3])), a: 1, b: nz(2, 5), c: 0, d: 0 };
    if (level === 'core') {
      const a = rng.pick([4, 9, 16, 25]);
      const b = nz(1, 8);
      ensure(Math.abs(b) < a, 'the estimate value lies inside the range of validity');
      return { level, n: Q.of(1, 2), a, b, c: 0, d: 0 };
    }
    const c = rng.int(2, 5);
    const d = nz(1, 5);
    const b = nz(2, 4);
    return { level, n: rng.pick([Q.of(-2), Q.of(-1), Q.of(1, 2), Q.of(-1, 2)]), a: 1, b, c, d };
  },

  validate(v) {
    return v.a > 0 ? [] : ['the constant must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`$\\mathrm{f}(x) = (${brack(1, v.b)})^{${powTex(v.n)}}$`),
        parts: [
          part('a', 3, text('Find the binomial expansion of $\\mathrm{f}(x)$ in ascending powers of $x$, up to and including the term in $x^2$, giving each coefficient in its simplest form.')),
          part('b', 1, text('State the range of values of $x$ for which this expansion is valid.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`$\\mathrm{g}(x) = \\sqrt{${brack(v.a, v.b)}}$`),
        parts: [
          part('a', 4, text('Find the binomial expansion of $\\mathrm{g}(x)$ in ascending powers of $x$, up to and including the term in $x^2$, giving each coefficient as a simplified fraction.')),
          part('b', 1, text('State the range of values of $x$ for which this expansion is valid.')),
          part('c', 2, text(`Use your expansion with  $x = 0.1$  to find an estimate for  $\\sqrt{${dec(Q.of(v.a).add(Q.of(v.b, 10)))}}$,  giving your answer to 4 decimal places.`)),
        ],
      };
    }
    return {
      stem: lines(`$\\mathrm{h}(x) = (${brack(v.c, v.d)})(${brack(1, v.b)})^{${powTex(v.n)}}$`),
      parts: [
        part('a', 3, text(`Find the first three terms, in ascending powers of $x$, of the expansion of  $(${brack(1, v.b)})^{${powTex(v.n)}}$`)),
        part('b', 3, text('Hence find the coefficient of $x^2$ in the expansion of $\\mathrm{h}(x)$')),
      ],
    };
  },

  answer(v) {
    const lim = (x: Q) => `$|x| < ${fracTex(x)}$`;
    if (v.level === 'foundational') return [{ text: `$${asc(coeffs(v.n, Q.of(v.b)))}$` }, { text: lim(Q.of(1, Math.abs(v.b))) }];
    if (v.level === 'core') {
      const r = Math.round(Math.sqrt(v.a));
      const co = coeffs(v.n, Q.of(v.b, v.a)).map((c) => c.mul(r));
      const est = co[0].add(co[1].div(10)).add(co[2].div(100));
      return [{ text: `$${asc(co)}$` }, { text: lim(Q.of(v.a, Math.abs(v.b))) }, { text: `$${roundFloatDp(est.toNumber(), 4)}$` }];
    }
    const co = coeffs(v.n, Q.of(v.b));
    return [{ text: `$${asc(co)}$` }, { text: `$${fracTex(co[2].mul(v.c).add(co[1].mul(v.d)))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const co = coeffs(v.n, Q.of(v.b));
      return [
        [
          step('M1', `$1 + (${v.n})(${v.b}x) + \\frac{(${v.n})(${v.n.sub(1)})}{2!}(${v.b}x)^2$`, 'Use the series from the formula booklet with the whole bracket term.'),
          step('A1', `$1 ${co[1].isPositive() ? '+' : '-'} ${fracTex(co[1].isPositive() ? co[1] : co[1].neg())}x$`, 'Second term.'),
          step('A1', `$${asc(co)}$`, 'Remember to square the coefficient as well as x.'),
        ],
        [step('B1', `$|x| < ${fracTex(Q.of(1, Math.abs(v.b)))}$`, 'The bracket term must have size less than 1.')],
      ];
    }
    if (v.level === 'core') {
      const r = Math.round(Math.sqrt(v.a));
      const inner = Q.of(v.b, v.a);
      const co = coeffs(v.n, inner).map((c) => c.mul(r));
      const est = co[0].add(co[1].div(10)).add(co[2].div(100));
      return [
        [
          step('B1', `$\\sqrt{${brack(v.a, v.b)}} = ${r}\\left(1 ${inner.isPositive() ? '+' : '-'} ${fracTex(inner.isPositive() ? inner : inner.neg())}x\\right)^{\\frac{1}{2}}$`, `Take the factor of ${v.a} out first: it becomes ${r} outside the root.`),
          step('M1', `$\\left(\\frac{1}{2}\\right)\\left(-\\frac{1}{2}\\right) \\div 2! = -\\frac{1}{8}$`, 'The coefficient of the squared term.'),
          step('A1', `$${r} ${co[1].isPositive() ? '+' : '-'} ${fracTex(co[1].isPositive() ? co[1] : co[1].neg())}x$`, 'First two terms.'),
          step('A1', `$${asc(co)}$`, 'All three terms, as simplified fractions.'),
        ],
        [step('B1', `$|x| < ${fracTex(Q.of(v.a, Math.abs(v.b)))}$`, 'The term in the bracket has size less than 1.')],
        [step('M1', 'Substitute $x = 0.1$ into your three terms', `The bracket becomes ${dec(Q.of(v.a).add(Q.of(v.b, 10)))} when x = 0.1.`), step('A1', `$${roundFloatDp(est.toNumber(), 4)}$`, 'To 4 decimal places.')],
      ];
    }
    const co = coeffs(v.n, Q.of(v.b));
    const ans = co[2].mul(v.c).add(co[1].mul(v.d));
    return [
      [
        step('M1', `$\\frac{(${powTex(v.n)})(${powTex(v.n.sub(1))})}{2!}(${v.b}x)^2$`, 'Use the general series for the third term.'),
        step('A1', `$1 ${co[1].isPositive() ? '+' : '-'} ${fracTex(co[1].isPositive() ? co[1] : co[1].neg())}x$`, 'First two terms.'),
        step('A1', `$${asc(co)}$`, 'All three.'),
      ],
      [
        step('M1', `$${v.c} \\times (${fracTex(co[2])})$`, `One way to get x²: ${v.c} times the x² term.`),
        step('M1', `$${v.d} \\times (${fracTex(co[1])})$`, `The other way: ${v.d}x times the x term.`),
        step('A1', `$${fracTex(ans)}$`, 'Add the two contributions.'),
      ],
    ];
  },

  check(v, answers) {
    // Differentiate numerically at 0: the Taylor coefficients of the original function.
    const f = (x: number) => (v.a + v.b * x) ** v.n.toNumber();
    const h = 1e-4;
    const near = (a: number, b: number) => Math.abs(a - b) <= 1e-3 * Math.max(1, Math.abs(b));
    const c1 = (f(h) - f(-h)) / (2 * h);
    const c2 = (f(h) - 2 * f(0) + f(-h)) / (2 * h * h);
    if (v.level === 'stretch') {
      const coef = v.c * c2 + v.d * c1;
      const co = coeffs(v.n, Q.of(v.b));
      return near(co[2].mul(v.c).add(co[1].mul(v.d)).toNumber(), coef) ? [] : ['x^2'];
    }
    const inner = Q.of(v.b, v.a);
    const scale = Math.round(v.a ** v.n.toNumber());
    const co = coeffs(v.n, inner).map((c) => c.mul(scale));
    if (!near(co[1].toNumber(), c1) || !near(co[2].toNumber(), c2)) return ['coefficients'];
    return answers.length ? [] : ['answers'];
  },

  key: (v) => `${v.n}|${v.a}|${v.b}|${v.c}|${v.d}`,
});
