import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { polyTex } from '../../engine/format';

/**
 * Modelled on the differentiation from first principles questions that appear in
 * almost every 8MA0/01 and 9MA0/01 paper. The marks are for the structure: the
 * expansion, cancelling h, and the explicit limit as h tends to 0.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  p: number;
}

const LIMIT = '\\lim_{h \\to 0}';

export default defineTemplate<V>({
  id: 'y12-first-principles',
  title: 'Differentiation from first principles',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'foundational') return { level, a: 1, b: rng.int(1, 9) * rng.pick([1, -1]), c: 0, p: rng.int(1, 6) };
    if (level === 'core') return { level, a: rng.int(2, 6), b: rng.int(1, 9) * rng.pick([1, -1]), c: rng.int(1, 9) * rng.pick([1, -1]), p: 0 };
    return { level, a: rng.int(2, 6), b: 0, c: 0, p: 0 };
  },

  validate(v) {
    return v.a > 0 ? [] : ['the leading coefficient must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The curve $C$ has equation  $y = ${polyTex([1, v.b, 0])}$`, `The point $P$ on $C$ has $x$ coordinate $${v.p}$ and the point $Q$ on $C$ has $x$ coordinate $${v.p} + h$`),
        parts: [
          part('a', 3, text(`Show that the gradient of the chord $PQ$ is  $${2 * v.p + v.b === 0 ? '' : `${2 * v.p + v.b} + `}h$`)),
          part('b', 2, text('Explain how this shows the value of the gradient of $C$ at $P$, and state that value.')),
        ],
      };
    }
    if (v.level === 'core') return { stem: [], parts: [single(4, text(`Prove, from first principles, that the derivative of  $${polyTex([v.a, v.b, v.c])}$  is  $${polyTex([2 * v.a, v.b])}$`))] };
    return { stem: [], parts: [single(5, text(`Prove, from first principles, that the derivative of  $${v.a}x^3$  is  $${3 * v.a}x^2$`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: 'Shown' }, { text: `As $h \\to 0$, $Q$ approaches $P$ and the gradient of the chord tends to $${2 * v.p + v.b}$` }];
    if (v.level === 'core') return [{ text: `Proof: the limit is $${polyTex([2 * v.a, v.b])}$` }];
    return [{ text: `Proof: the limit is $${3 * v.a}x^2$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const m = 2 * v.p + v.b;
      const py = v.p * v.p + v.b * v.p;
      return [
        [
          step('M1', `$y_Q = (${v.p} + h)^2 ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}(${v.p} + h)$ and $y_P = ${py}$`, 'Substitute each x value into the curve.'),
          step('M1', `Gradient $= \\frac{y_Q - y_P}{(${v.p} + h) - ${v.p}} = \\frac{${m === 0 ? '' : m + 'h + '}h^2}{h}$`, 'Change in y over change in x. The constants cancel.'),
          step('A1', `$= ${m === 0 ? '' : m + ' + '}h$`, 'Cancel h. This is the printed answer.'),
        ],
        [step('B1', 'As $h \\to 0$, $Q$ moves towards $P$, so the chord becomes the tangent at $P$.', 'The limit of the chord gradient is the gradient of the curve.'), step('B1', `Gradient $= ${m}$`, 'Put h = 0 only after cancelling.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\mathrm{f}(x + h) - \\mathrm{f}(x) = ${v.a}(x + h)^2 ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}(x + h) ${v.c < 0 ? '-' : '+'} ${Math.abs(v.c)} - (${polyTex([v.a, v.b, v.c])})$`, 'Write out f(x + h) − f(x).'),
          step('A1', `$= ${2 * v.a}xh + ${v.a}h^2 ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}h$`, 'Everything without an h cancels.'),
          step('M1', `$\\frac{\\mathrm{f}(x + h) - \\mathrm{f}(x)}{h} = ${polyTex([2 * v.a, v.b])} + ${v.a}h$`, 'Divide by h.'),
          step('A1', `$${LIMIT} (${polyTex([2 * v.a, v.b])} + ${v.a}h) = ${polyTex([2 * v.a, v.b])}$`, 'You must show the limit. Writing h = 0 too early loses this mark.'),
        ],
      ];
    }
    return [
      [
        step('M1', `$\\mathrm{f}(x + h) = ${v.a}(x + h)^3$`, 'Start from the definition.'),
        step('M1', `$(x + h)^3 = x^3 + 3x^2h + 3xh^2 + h^3$`, 'Expand with the binomial theorem.'),
        step('A1', `$\\mathrm{f}(x + h) - \\mathrm{f}(x) = ${3 * v.a}x^2h + ${3 * v.a}xh^2 + ${v.a}h^3$`, 'The x³ terms cancel.'),
        step('M1', `$\\frac{\\mathrm{f}(x + h) - \\mathrm{f}(x)}{h} = ${3 * v.a}x^2 + ${3 * v.a}xh + ${v.a}h^2$`, 'Divide by h.'),
        step('A1', `$${LIMIT} (${3 * v.a}x^2 + ${3 * v.a}xh + ${v.a}h^2) = ${3 * v.a}x^2$`, 'State the limit as h tends to 0.'),
      ],
    ];
  },

  check(v) {
    // The difference quotient for a small h must be close to the stated derivative.
    const h = 1e-6;
    const quotient = (f: (x: number) => number, x: number) => (f(x + h) - f(x)) / h;
    for (const x of [-2, -0.5, 1, 3]) {
      if (v.level === 'foundational') {
        const f = (t: number) => t * t + v.b * t;
        if (Math.abs(quotient(f, v.p) - (2 * v.p + v.b)) > 1e-3) return ['limit'];
        return [];
      }
      const f = v.level === 'core' ? (t: number) => v.a * t * t + v.b * t + v.c : (t: number) => v.a * t ** 3;
      const d = v.level === 'core' ? 2 * v.a * x + v.b : 3 * v.a * x * x;
      if (Math.abs(quotient(f, x) - d) > 1e-3) return ['limit'];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.p}`,
});
