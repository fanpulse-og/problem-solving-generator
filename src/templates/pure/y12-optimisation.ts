import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { fracTex, polyTex } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on the 8MA0/01 optimisation questions: an open box cut from a square
 * sheet, a cuboid with fixed surface area (show the formula, then maximise), and a
 * closed cylinder whose surface area is minimised and justified by the second
 * derivative.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  k: number;
  x0: number;
  A: number;
  V: number;
}

const CYL = (v: V) => Math.cbrt(v.V / (2 * Math.PI));

export default defineTemplate<V>({
  id: 'y12-optimisation',
  title: 'Optimisation',
  strand: 'Pure',
  subtopic: 'Differentiation',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, k: 0, x0: 0, A: 0, V: 0 };
    if (level === 'foundational') return { ...base, a: 6 * rng.int(2, 8) };
    if (level === 'core') {
      const k = rng.int(2, 4);
      const x0 = rng.int(2, 10);
      return { ...base, k, x0, A: 6 * k * x0 * x0 };
    }
    const V0 = rng.step(100, 1000, 50);
    sf3(CYL({ ...base, V: V0 }));
    return { ...base, V: V0 };
  },

  validate(v) {
    return v.level === 'core' && v.A !== 6 * v.k * v.x0 * v.x0 ? ['the area must match the stationary point'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A square sheet of card has sides of length ${v.a} cm.`, 'A square of side $x$ cm is cut from each corner, and the sides are folded up to make an open box.'),
        parts: [
          part('a', 2, text(`Show that the volume of the box, $V$ cm³, is given by  $V = x(${v.a} - 2x)^2$`)),
          part('b', 3, text('Find the value of $x$ for which $V$ is a maximum.')),
          part('c', 1, text('Find the maximum volume.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A closed box is a cuboid with base $x$ cm by ${v.k}$x$ cm and height $h$ cm.`, `The total surface area of the box is ${v.A} cm².`),
        parts: [
          part('a', 3, text(`Show that the volume, $V$ cm³, is given by  $V = ${fracTex(Q.of(v.k * v.A, 2 * (v.k + 1)))}x - ${fracTex(Q.of(v.k * v.k, v.k + 1))}x^3$`)),
          part('b', 3, text('Use calculus to find the value of $x$ for which $V$ is stationary.')),
          part('c', 2, text('Justify that this gives a maximum, and find the maximum volume.')),
        ],
      };
    }
    return {
      stem: lines(`A closed cylindrical can has radius $r$ cm and height $h$ cm.`, `The volume of the can is ${v.V} cm³.`),
      parts: [
        part('a', 3, text(`Show that the total surface area, $S$ cm², is given by  $S = 2\\pi r^2 + \\frac{${2 * v.V}}{r}$`)),
        part('b', 3, text('Use calculus to find the value of $r$ for which $S$ is stationary, giving your answer to 3 significant figures.')),
        part('c', 2, text('Justify that this value gives a minimum, and state the minimum surface area to 3 significant figures.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const x = v.a / 6;
      return [{ text: 'Shown' }, { text: `$x = ${x}$` }, { text: `${x * (v.a - 2 * x) ** 2} cm³` }];
    }
    if (v.level === 'core') {
      const vol = Q.of(v.k * v.A, 2 * (v.k + 1)).mul(v.x0).sub(Q.of(v.k * v.k, v.k + 1).mul(v.x0 ** 3));
      return [{ text: 'Shown' }, { text: `$x = ${v.x0}$` }, { text: `The second derivative is negative, so a maximum. $V = ${fracTex(vol)}$ cm³` }];
    }
    const r = CYL(v);
    return [{ text: 'Shown' }, { text: `$r = ${sf3(r)}$` }, { text: `The second derivative is positive, so a minimum. $S = ${sf3(2 * Math.PI * r * r + (2 * v.V) / r)}$ cm²` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const x = v.a / 6;
      return [
        [step('M1', `Base side $= ${v.a} - 2x$`, 'A square comes off at each end of every side.'), step('A1', `$V = x(${v.a} - 2x)^2$`, 'Height is x. This is the printed answer.')],
        [
          step('M1', `$V = ${polyTex([4, -4 * v.a, v.a * v.a, 0])}$, so $\\frac{\\mathrm{d}V}{\\mathrm{d}x} = ${polyTex([12, -8 * v.a, v.a * v.a])}$`, 'Expand first, then differentiate.'),
          step('M1', `$(2x - ${v.a})(6x - ${v.a}) = 0$`, 'Set the derivative to zero.'),
          step('A1', `$x = ${x}$`, `x = ${v.a / 2} would leave no base.`),
        ],
        [step('B1', `${x * (v.a - 2 * x) ** 2} cm³`, 'Substitute into V.')],
      ];
    }
    if (v.level === 'core') {
      const vol = Q.of(v.k * v.A, 2 * (v.k + 1)).mul(v.x0).sub(Q.of(v.k * v.k, v.k + 1).mul(v.x0 ** 3));
      const c1 = Q.of(v.k * v.A, 2 * (v.k + 1));
      const c3 = Q.of(v.k * v.k, v.k + 1);
      return [
        [
          step('M1', `$2(${v.k}x^2) + 2(xh) + 2(${v.k}xh) = ${v.A}$`, 'Six faces in three pairs.'),
          step('M1', `$h = \\frac{${v.A} - ${2 * v.k}x^2}{${2 * (v.k + 1)}x}$`, 'Make h the subject.'),
          step('A1', `$V = ${v.k}x^2h$ gives the result.`, 'Substitute h into the volume. This is the printed answer.'),
        ],
        [
          step('M1', `$\\frac{\\mathrm{d}V}{\\mathrm{d}x} = ${fracTex(c1)} - ${fracTex(c3.mul(3))}x^2$`, 'Differentiate.'),
          step('M1', `$x^2 = ${v.x0 * v.x0}$`, 'Set it to zero and rearrange.'),
          step('A1', `$x = ${v.x0}$`, 'A length is positive.'),
        ],
        [step('M1', `$\\frac{\\mathrm{d}^2V}{\\mathrm{d}x^2} = -${fracTex(c3.mul(6))}x < 0$`, 'Negative second derivative means a maximum.'), step('A1', `$V = ${fracTex(vol)}$ cm³`, `Substitute x = ${v.x0}.`)],
      ];
    }
    const r = CYL(v);
    const S = 2 * Math.PI * r * r + (2 * v.V) / r;
    return [
      [
        step('M1', `$\\pi r^2h = ${v.V}$, so $h = \\frac{${v.V}}{\\pi r^2}$`, 'Use the volume to remove h.'),
        step('M1', '$S = 2\\pi r^2 + 2\\pi rh$', 'Two circles and a curved surface.'),
        step('A1', `$S = 2\\pi r^2 + \\frac{${2 * v.V}}{r}$`, 'Substitute. This is the printed answer.'),
      ],
      [
        step('M1', `$\\frac{\\mathrm{d}S}{\\mathrm{d}r} = 4\\pi r - \\frac{${2 * v.V}}{r^2}$`, 'Write the fraction as a negative power to differentiate.'),
        step('M1', `$r^3 = \\frac{${v.V}}{2\\pi}$`, 'Set it to zero and rearrange.'),
        step('A1', `$r = ${sf3(r)}$`, 'Take the cube root.'),
      ],
      [step('M1', `$\\frac{\\mathrm{d}^2S}{\\mathrm{d}r^2} = 4\\pi + \\frac{${4 * v.V}}{r^3} > 0$`, 'Positive second derivative means a minimum.'), step('A1', `$S = ${sf3(S)}$ cm²`, 'Use the unrounded r.')],
    ];
  },

  check(v) {
    // Scan the formula for its turning point instead of using calculus.
    const scan = (f: (x: number) => number, lo: number, hi: number, wantMax: boolean) => {
      let best = lo;
      for (let i = 0; i <= 200000; i++) {
        const x = lo + ((hi - lo) * i) / 200000;
        if (wantMax ? f(x) > f(best) : f(x) < f(best)) best = x;
      }
      return best;
    };
    if (v.level === 'foundational') return Math.abs(scan((x) => x * (v.a - 2 * x) ** 2, 0, v.a / 2, true) - v.a / 6) < 0.01 ? [] : ['maximum'];
    if (v.level === 'core') {
      const f = (x: number) => (v.k * x * (v.A - 2 * v.k * x * x)) / (2 * (v.k + 1));
      return Math.abs(scan(f, 0.01, 2 * v.x0, true) - v.x0) < 0.01 ? [] : ['maximum'];
    }
    return Math.abs(scan((r) => 2 * Math.PI * r * r + (2 * v.V) / r, 0.5, 50, false) - CYL(v)) < 0.01 ? [] : ['minimum'];
  },

  key: (v) => `${v.a}|${v.k}|${v.x0}|${v.V}`,
});
