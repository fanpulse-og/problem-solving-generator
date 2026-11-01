import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 numerical methods: a change of sign, an iteration to a given
 * accuracy, Newton–Raphson (June 2024 P1 Q3), and the question that keeps coming
 * up on why a starting value at a stationary point fails.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  lo: Q; // interval start, one decimal place
  x0: Q;
  p: number; // stretch: stationary point of x³ − 3p²x + c
  c: number;
}

const f1 = (v: V, x: number) => x ** 3 + v.a * x - v.b;
const f2 = (v: V, x: number) => v.a * Math.log(x) + x * x - v.b;
const f3 = (v: V, x: number) => x ** 3 - 3 * v.p * v.p * x + v.c;
const d2 = (v: V, x: number) => v.a / x + 2 * x;
const d3 = (v: V, x: number) => 3 * x * x - 3 * v.p * v.p;
const fixed = (x: Q) => dec(x, 1);

/** Bracket a root to one decimal place by scanning upwards. */
function bracket(f: (x: number) => number, start: number, stop: number): Q {
  for (let i = Math.round(start * 10); i < stop * 10; i++) {
    if (f(i / 10) < 0 && f((i + 1) / 10) > 0) return Q.of(i, 10);
  }
  ensure(false, 'no bracket');
  return Q.of(0);
}

export default defineTemplate<V>({
  id: 'y13-numerical',
  title: 'Numerical methods',
  strand: 'Pure',
  subtopic: 'Numerical methods',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, lo: Q.of(0), x0: Q.of(0), p: 0, c: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 8);
      const b = rng.int(10, 60);
      const lo = bracket((x) => x ** 3 + a * x - b, 0, 10);
      // x = cube root of (b − ax) must converge: its gradient at the root is below 1 in size.
      const root = lo.toNumber() + 0.05;
      ensure(a / (3 * root * root) < 0.6, 'the iteration must converge');
      return { ...base, a, b, lo, x0: Q.of(Math.round(root)) };
    }
    if (level === 'core') {
      const a = rng.int(2, 9);
      const b = rng.int(5, 30);
      const lo = bracket((x) => a * Math.log(x) + x * x - b, 0.5, 8);
      return { ...base, a, b, lo, x0: lo.add(Q.of(1, 10)) };
    }
    const p = rng.int(1, 3);
    const c = rng.int(1, 3 * p ** 3 + 5);
    ensure(p ** 3 - 3 * p ** 3 + c < 0, 'the curve goes below the axis at the stationary point');
    const lo = bracket((x) => x ** 3 - 3 * p * p * x + c, p, 10);
    return { ...base, p, c, lo, x0: lo.add(Q.of(1, 10)) };
  },

  validate(v) {
    return v.lo.isPositive() ? [] : ['the interval must be positive'];
  },

  render(v) {
    const hi = v.lo.add(Q.of(1, 10));
    if (v.level === 'foundational') {
      return {
        stem: lines(`$\\mathrm{f}(x) = ${terms([[1, 3], [v.a, 1], [-v.b, 0]])}$`),
        parts: [
          part('a', 2, text(`Show that the equation  $\\mathrm{f}(x) = 0$  has a root in the interval  $[${fixed(v.lo)}, ${fixed(hi)}]$`)),
          part('b', 1, text(`Show that the equation can be written as  $x = \\sqrt[3]{${v.b} - ${v.a}x}$`)),
          part('c', 2, text(`Using the iteration formula  $x_{n+1} = \\sqrt[3]{${v.b} - ${v.a}x_n}$  with  $x_1 = ${v.x0}$,  find the value of $x_2$ and the value of $x_3$, giving each to 3 decimal places.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`$\\mathrm{f}(x) = ${v.a}\\ln x + x^2 - ${v.b},\\ x > 0$`),
        parts: [
          part('a', 2, text(`Show that the equation  $\\mathrm{f}(x) = 0$  has a root $\\alpha$ in the interval  $[${fixed(v.lo)}, ${fixed(hi)}]$`)),
          part('b', 2, text("Find $\\mathrm{f}'(x)$")),
          part('c', 2, text(`Using ${fixed(hi)} as a first approximation for $\\alpha$, apply the Newton–Raphson method once to find a second approximation. Give your answer to 3 decimal places.`)),
        ],
      };
    }
    return {
      stem: lines(`$\\mathrm{f}(x) = ${terms([[1, 3], [-3 * v.p * v.p, 1], [v.c, 0]])}$`),
      parts: [
        part('a', 2, text(`Show that the equation  $\\mathrm{f}(x) = 0$  has a root $\\alpha$ in the interval  $[${fixed(v.lo)}, ${fixed(hi)}]$`)),
        part('b', 3, text(`Using ${fixed(hi)} as a first approximation for $\\alpha$, apply the Newton–Raphson method once to find a second approximation. Give your answer to 3 decimal places.`)),
        part('c', 2, text(`Explain why  $x = ${v.p}$  cannot be used as a first approximation with the Newton–Raphson method.`)),
      ],
    };
  },

  answer(v) {
    const hi = v.lo.add(Q.of(1, 10)).toNumber();
    if (v.level === 'foundational') {
      const it = (x: number) => Math.cbrt(v.b - v.a * x);
      const x2 = it(v.x0.toNumber());
      return [{ text: 'A change of sign, and f is continuous, so there is a root in the interval.' }, { text: 'Shown' }, { text: `$x_2 = ${roundFloatDp(x2, 3)}$, $x_3 = ${roundFloatDp(it(x2), 3)}$` }];
    }
    if (v.level === 'core') {
      return [{ text: 'A change of sign, and f is continuous, so there is a root in the interval.' }, { text: `$\\frac{${v.a}}{x} + 2x$` }, { text: `$${roundFloatDp(hi - f2(v, hi) / d2(v, hi), 3)}$` }];
    }
    return [
      { text: 'A change of sign, and f is continuous, so there is a root in the interval.' },
      { text: `$${roundFloatDp(hi - f3(v, hi) / d3(v, hi), 3)}$` },
      { text: `$\\mathrm{f}'(${v.p}) = 0$, so the method would divide by zero.` },
    ];
  },

  markScheme(v) {
    const lo = v.lo.toNumber();
    const hi = v.lo.add(Q.of(1, 10)).toNumber();
    const f = v.level === 'foundational' ? (x: number) => f1(v, x) : v.level === 'core' ? (x: number) => f2(v, x) : (x: number) => f3(v, x);
    const sign = [
      step('M1', `$\\mathrm{f}(${fixed(v.lo)}) = ${roundFloatDp(f(lo), 3)}$, $\\mathrm{f}(${fixed(v.lo.add(Q.of(1, 10)))}) = ${roundFloatDp(f(hi), 3)}$`, 'Work out f at both ends.'),
      step('A1', 'A change of sign, and f is continuous, so there is a root in the interval.', 'All three points are needed: both values, the sign change and continuity.'),
    ];
    if (v.level === 'foundational') {
      const it = (x: number) => Math.cbrt(v.b - v.a * x);
      const x2 = it(v.x0.toNumber());
      return [
        sign,
        [step('B1', `$x^3 = ${v.b} - ${v.a}x$, so $x = \\sqrt[3]{${v.b} - ${v.a}x}$`, 'Set f(x) = 0 and rearrange.')],
        [step('M1', `$x_2 = \\sqrt[3]{${v.b} - ${v.a} \\times ${v.x0}} = ${roundFloatDp(x2, 3)}$`, 'Substitute the starting value.'), step('A1', `$x_3 = ${roundFloatDp(it(x2), 3)}$`, 'Use the unrounded value of x₂.')],
      ];
    }
    if (v.level === 'core') {
      const x = hi;
      return [
        sign,
        [step('M1', `$\\frac{\\mathrm{d}}{\\mathrm{d}x}(${v.a}\\ln x) = \\frac{${v.a}}{x}$`, 'The derivative of ln x is 1/x.'), step('A1', `$\\mathrm{f}'(x) = \\frac{${v.a}}{x} + 2x$`, 'The constant goes.')],
        [step('M1', `$x_2 = ${fixed(v.lo.add(Q.of(1, 10)))} - \\frac{\\mathrm{f}(${fixed(v.lo.add(Q.of(1, 10)))})}{\\mathrm{f}'(${fixed(v.lo.add(Q.of(1, 10)))})}$`, 'Newton–Raphson formula from the booklet.'), step('A1', `$${roundFloatDp(x - f2(v, x) / d2(v, x), 3)}$`, 'To 3 decimal places.')],
      ];
    }
    const x = hi;
    return [
      sign,
      [
        step('M1', `$\\mathrm{f}'(x) = ${terms([[3, 2], [-3 * v.p * v.p, 0]])}$`, 'Differentiate first.'),
        step('M1', `$x_2 = ${fixed(v.lo.add(Q.of(1, 10)))} - \\frac{${roundFloatDp(f3(v, x), 3)}}{${roundFloatDp(d3(v, x), 3)}}$`, 'Newton–Raphson formula from the booklet.'),
        step('A1', `$${roundFloatDp(x - f3(v, x) / d3(v, x), 3)}$`, 'To 3 decimal places.'),
      ],
      [step('M1', `$\\mathrm{f}'(${v.p}) = 3(${v.p})^2 - ${3 * v.p * v.p} = 0$`, 'Work out the gradient there.'), step('A1', 'The formula divides by zero: the tangent is horizontal and never meets the $x$-axis.', 'Say both why the formula fails and what it means for the tangent.')],
    ];
  },

  check(v) {
    const lo = v.lo.toNumber();
    const hi = lo + 0.1;
    const f = v.level === 'foundational' ? (x: number) => f1(v, x) : v.level === 'core' ? (x: number) => f2(v, x) : (x: number) => f3(v, x);
    if (!(f(lo) < 0 && f(hi) > 0)) return ['sign change'];
    // One Newton step should land closer to the true root (found by bisection).
    let [a, b] = [lo, hi];
    for (let i = 0; i < 80; i++) {
      const m = (a + b) / 2;
      if (f(m) < 0) a = m;
      else b = m;
    }
    if (v.level === 'foundational') {
      const it = (x: number) => Math.cbrt(v.b - v.a * x);
      return Math.abs(it(a) - a) < 1e-9 ? [] : ['fixed point'];
    }
    const d = v.level === 'core' ? (x: number) => d2(v, x) : (x: number) => d3(v, x);
    const x1 = hi - f(hi) / d(hi);
    return Math.abs(x1 - a) < Math.abs(hi - a) + 1e-9 ? [] : ['Newton step'];
  },

  key: (v) => `${v.a}|${v.b}|${v.lo}|${v.p}|${v.c}`,
});
