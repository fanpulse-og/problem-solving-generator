import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { dec, ensure, fracTex, roundFloatDp } from '../../engine/format';
import { DEG, coef, inRange, polyQ, signed, signedCoef } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 trigonometry: solving in degrees with a shifted angle, using
 * cos²x = 1 − sin²x to get a quadratic, and tanθ = sinθ/cosθ followed by a double
 * angle substitution. Answers are to 1 decimal place, as the papers ask.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  fn: 'sin' | 'cos';
  alpha: number;
  s: Q; // value of the trig function
  w: number; // other root, outside [−1, 1]
  n: number;
  m: number;
}

const THETA = (fn: 'sin' | 'cos', s: Q) => (fn === 'sin' ? Math.asin(s.toNumber()) : Math.acos(s.toNumber())) / DEG;
const both = (fn: 'sin' | 'cos', s: Q) => {
  const p = THETA(fn, s);
  return fn === 'sin' ? [p, 180 - p] : [p, -p];
};
const list = (xs: number[], v = 'x') => xs.map((x) => `$${v} = ${roundFloatDp(x, 1)}^\\circ$`).join(', ');

/** Solutions of the foundational question. */
const solveShift = (v: V) =>
  inRange(both(v.fn, v.s), v.alpha, 360 + v.alpha).map((a) => a - v.alpha);
/** Core: sin x = s in [0, 360). */
const solveCore = (v: V) => inRange(both('sin', v.s), 0, 360);
/** Stretch: cos 2x = s, 0 ≤ x < 180. */
const solveStretch = (v: V) => inRange(both('cos', v.s), 0, 360).map((a) => a / 2);

export default defineTemplate<V>({
  id: 'y12-trig-equations',
  title: 'Trigonometric equations',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'foundational') {
      const fn = rng.pick(['sin', 'cos'] as const);
      const s = Q.of(rng.pick([2, 3, 4, 6, 7, 8]) * rng.pick([1, -1]), 10);
      const alpha = rng.pick([20, 25, 30, 35, 40, 50, 55, 60, 70]);
      solveShift({ level, fn, alpha, s, w: 0, n: 0, m: 0 }).forEach((x) => roundFloatDp(x, 1));
      return { level, fn, alpha, s, w: 0, n: 0, m: 0 };
    }
    if (level === 'core') {
      const n = rng.pick([2, 3, 4, 5]);
      const m = rng.int(1, n - 1) * rng.pick([1, -1]);
      const s = Q.of(m, n);
      ensure(s.d === BigInt(n), 'fraction in lowest terms');
      const w = rng.pick([2, 3, -2, -3]);
      const v: V = { level, fn: 'sin', alpha: 0, s, w, n, m };
      solveCore(v).forEach((x) => roundFloatDp(x, 1));
      ensure(n + m * w !== 0 && n * w + m !== 0, 'all terms appear');
      return v;
    }
    const n = rng.pick([2, 3, 4, 5]);
    const m = rng.int(1, n - 1) * rng.pick([1, -1]);
    const s = Q.of(m, n);
    ensure(s.d === BigInt(n), 'fraction in lowest terms');
    const w = m > 0 ? rng.pick([-2, -3]) : rng.pick([2, 3]);
    const v: V = { level, fn: 'cos', alpha: 0, s, w, n, m };
    solveStretch(v).forEach((x) => roundFloatDp(x, 1));
    ensure(n * w + m !== 0 && n !== -m * w, 'all terms appear');
    return v;
  },

  validate(v) {
    return Math.abs(v.s.toNumber()) < 1 ? [] : ['the value must be a possible sine or cosine'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          single(
            4,
            text(`Solve, for  $0 \\leqslant x < 360^\\circ$,  the equation`),
            text(`$\\${v.fn}(x + ${v.alpha}^\\circ) = ${dec(v.s)}$`),
            text('giving your answers to 1 decimal place.'),
          ),
        ],
      };
    }
    if (v.level === 'core') {
      const B = v.n * v.w + v.m;
      const R = v.n + v.m * v.w;
      return {
        stem: lines(`$${v.n}\\cos^2 x ${signedCoef(B, '\\sin x')} = ${R}$`),
        parts: [
          part('a', 2, text(`Show that this equation can be written as  $${polyQ([v.n, -B, v.m * v.w], '\\sin x')} = 0$`.replace(/\\sin x\^\{2\}/, '\\sin^2 x'))),
          part('b', 4, text('Hence solve the equation for  $0 \\leqslant x < 360^\\circ$,  giving your answers to 1 decimal place.')),
        ],
      };
    }
    const a = -v.m * v.w;
    const c = v.n - a;
    const b = -(v.n * v.w + v.m);
    return {
      stem: lines(`Consider the equation  $${coef(a, '\\sin\\theta\\tan\\theta')} = ${b} ${c === 0 ? '' : signedCoef(c, '\\cos\\theta')}$`, 'where $\\theta$ is not an odd multiple of $90^\\circ$.'),
      parts: [
        part('a', 3, text(`Show that the equation can be written as  $${v.n}\\cos^2\\theta ${signedCoef(b, '\\cos\\theta')} ${signed(-a)} = 0$`)),
        part('b', 4, text(`Hence solve, for  $0 \\leqslant x < 180^\\circ$,  the equation`), text(`$${coef(a, '\\sin 2x\\tan 2x')} = ${b} ${c === 0 ? '' : signedCoef(c, '\\cos 2x')}$`), text('giving your answers to 1 decimal place.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: list(solveShift(v)) }];
    if (v.level === 'core') return [{ text: 'Shown' }, { text: list(solveCore(v)) }];
    return [{ text: 'Shown' }, { text: list(solveStretch(v)) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const p = THETA(v.fn, v.s);
      const xs = solveShift(v);
      return [
        [
          step('M1', `$x + ${v.alpha}^\\circ = ${roundFloatDp(p, 1)}^\\circ$`, `Use inverse ${v.fn}. Work in terms of the whole bracket first.`),
          step('M1', `Range for the bracket: $${v.alpha}^\\circ \\leqslant x + ${v.alpha}^\\circ < ${360 + v.alpha}^\\circ$`, 'Adding the shift moves the range too.'),
          step('A1', `$x = ${roundFloatDp(xs[0], 1)}^\\circ$`, 'Subtract the shift.'),
          step('A1', `$x = ${roundFloatDp(xs[1], 1)}^\\circ$`, v.fn === 'sin' ? 'The second value comes from 180° minus the first.' : 'The second value comes from 360° minus the first.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const B = v.n * v.w + v.m;
      const R = v.n + v.m * v.w;
      const xs = solveCore(v);
      return [
        [
          step('M1', `$${v.n}(1 - \\sin^2 x) ${signedCoef(B, '\\sin x')} = ${R}$`, 'Use cos²x = 1 − sin²x, so that only sin x is left.'),
          step('A1', `$${polyQ([v.n, -B, v.m * v.w], '\\sin x').replace(/\\sin x\^\{2\}/, '\\sin^2 x')} = 0$`, 'Collect everything on one side. This is the printed answer.'),
        ],
        [
          step('M1', `$(${v.n}\\sin x ${signed(-v.m)})(\\sin x ${signed(-v.w)}) = 0$`, 'Factorise as a quadratic in sin x.'),
          step('A1', `$\\sin x = ${fracTex(v.s)}$ (and $\\sin x = ${v.w}$ has no solutions)`, 'Sine is always between −1 and 1.'),
          step('M1', `$x = \\arcsin(${fracTex(v.s)})$`, 'Use inverse sine, then find the second solution in the range.'),
          step('A1', list(xs), 'Both values, to 1 decimal place.'),
        ],
      ];
    }
    const a = -v.m * v.w;
    const b = -(v.n * v.w + v.m);
    const c = v.n - a;
    const xs = solveStretch(v);
    return [
      [
        step('M1', `$${coef(a, '\\sin\\theta')} \\times \\frac{\\sin\\theta}{\\cos\\theta} = ${b} ${c === 0 ? '' : signedCoef(c, '\\cos\\theta')}$`, 'Use tan θ = sin θ ÷ cos θ.'),
        step('M1', `$${coef(a, '\\sin^2\\theta')} = ${coef(b, '\\cos\\theta')} ${c === 0 ? '' : signedCoef(c, '\\cos^2\\theta')}$`, 'Multiply through by cos θ.'),
        step('A1', `$${coef(a, '(1 - \\cos^2\\theta)')} = ${coef(b, '\\cos\\theta')} ${c === 0 ? '' : signedCoef(c, '\\cos^2\\theta')}$, which gives the result.`, 'Use sin²θ = 1 − cos²θ and collect the terms.'),
      ],
      [
        step('M1', `$(${v.n}\\cos\\theta ${signed(-v.m)})(\\cos\\theta ${signed(-v.w)}) = 0$`, 'Factorise, with θ = 2x.'),
        step('A1', `$\\cos 2x = ${fracTex(v.s)}$`, `cos 2x = ${v.w} has no solutions.`),
        step('M1', `$2x = ${roundFloatDp(THETA('cos', v.s), 1)}^\\circ$, $${roundFloatDp(360 - THETA('cos', v.s), 1)}^\\circ$`, 'x runs from 0° to 180°, so 2x runs from 0° to 360°.'),
        step('A1', list(xs), 'Divide by 2 at the end.'),
      ],
    ];
  },

  check(v, answers) {
    const shown = [...answers[answers.length - 1].text.matchAll(/= (-?[\d.]+)\^/g)].map((m) => Number(m[1]));
    if (shown.length !== 2) return ['two solutions expected'];
    for (const x of shown) {
      const r = x * DEG;
      if (v.level === 'foundational') {
        const y = v.fn === 'sin' ? Math.sin(r + v.alpha * DEG) : Math.cos(r + v.alpha * DEG);
        if (Math.abs(y - v.s.toNumber()) > 0.002) return ['foundational'];
      } else if (v.level === 'core') {
        const B = v.n * v.w + v.m;
        const R = v.n + v.m * v.w;
        if (Math.abs(v.n * Math.cos(r) ** 2 + B * Math.sin(r) - R) > 0.05) return ['core'];
      } else {
        const a = -v.m * v.w;
        const b = -(v.n * v.w + v.m);
        const c = v.n - a;
        if (Math.abs(a * Math.sin(2 * r) * Math.tan(2 * r) - b - c * Math.cos(2 * r)) > 0.2) return ['stretch'];
      }
    }
    return [];
  },

  key: (v) => `${v.fn}|${v.alpha}|${v.s}|${v.w}`,
});
