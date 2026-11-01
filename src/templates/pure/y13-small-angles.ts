import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { fracTex, roundFloatDp } from '../../engine/format';
import { coef, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on the 9MA0 small angle approximations: write an expression as a
 * polynomial in θ, find a limiting value as θ tends to 0, and test the accuracy of
 * the approximation (with the reminder that θ must be in radians).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  d: number;
  deg: number;
}

export default defineTemplate<V>({
  id: 'y13-small-angles',
  title: 'Small angle approximations',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    return { level, a: rng.int(2, 6), b: rng.int(2, 5), c: rng.int(2, 5), d: rng.int(2, 5), deg: rng.pick([3, 4, 5, 6, 8]) };
  },

  validate(v) {
    return v.b > 0 && v.c > 0 ? [] : ['the multiples must be positive'];
  },

  render(v) {
    const small = 'Given that $\\theta$ is small and measured in radians,';
    if (v.level === 'foundational') {
      return {
        stem: lines(small),
        parts: [single(3, text(`show that  $${coef(v.a, `\\cos ${v.b}\\theta`)} + ${coef(v.c, `\\sin ${v.d}\\theta`)} \\approx A + B\\theta + C\\theta^2$`), text('where $A$, $B$ and $C$ are constants to be found.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [],
        parts: [
          part('a', 3, text('Show that, for small values of $\\theta$ in radians,'), text(`$\\frac{1 - \\cos ${v.b}\\theta}{\\theta\\tan ${v.c}\\theta} \\approx k$`), text('where $k$ is a constant to be found.')),
          part('b', 1, text(`Hence write down the limit of  $\\frac{1 - \\cos ${v.b}\\theta}{\\theta\\tan ${v.c}\\theta}$  as $\\theta \\to 0$`)),
        ],
      };
    }
    return {
      stem: lines(`A student uses the small angle approximation for $\\cos ${v.b}\\theta$ with  $\\theta = ${v.deg}^\\circ$`),
      parts: [
        part('a', 1, text(`Write down the small angle approximation for $\\cos ${v.b}\\theta$`)),
        part('b', 2, text('Explain the error in substituting  $\\theta = ' + v.deg + '$  directly, and state the value that should be used.')),
        part('c', 3, text('Find the percentage error in the approximation when the correct value is used, giving your answer to 2 significant figures.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${terms([[v.a, 0], [v.c * v.d, 1], [Q.of(-v.a * v.b * v.b, 2), 2]], '\\theta')}$` }];
    if (v.level === 'core') {
      const k = Q.of(v.b * v.b, 2 * v.c);
      return [{ text: `$k = ${fracTex(k)}$` }, { text: `$${fracTex(k)}$` }];
    }
    const r = (v.deg * Math.PI) / 180;
    const approx = 1 - (v.b * r) ** 2 / 2;
    const real = Math.cos(v.b * r);
    return [{ text: `$1 - ${fracTex(Q.of(v.b * v.b, 2))}\\theta^2$` }, { text: `$\\theta$ must be in radians: $\\theta = ${roundFloatDp(r, 4)}$` }, { text: `${Number(((Math.abs(approx - real) / real) * 100).toPrecision(2))}%` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `$\\cos ${v.b}\\theta \\approx 1 - \\frac{(${v.b}\\theta)^2}{2}$`, 'Replace θ by the whole of bθ.'),
          step('M1', `$\\sin ${v.d}\\theta \\approx ${v.d}\\theta$`, 'The sine of a small angle is about the angle.'),
          step('A1', `$${terms([[v.a, 0], [v.c * v.d, 1], [Q.of(-v.a * v.b * v.b, 2), 2]], '\\theta')}$`, 'Multiply out and collect.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const k = Q.of(v.b * v.b, 2 * v.c);
      return [
        [
          step('M1', `$1 - \\cos ${v.b}\\theta \\approx \\frac{${v.b * v.b}\\theta^2}{2}$`, 'The 1s cancel.'),
          step('M1', `$\\theta\\tan ${v.c}\\theta \\approx ${v.c}\\theta^2$`, 'tan of a small angle is about the angle.'),
          step('A1', `$k = ${fracTex(k)}$`, 'The θ² terms cancel.'),
        ],
        [step('B1', `$${fracTex(k)}$`, 'The approximation becomes exact as θ tends to 0.')],
      ];
    }
    const r = (v.deg * Math.PI) / 180;
    const approx = 1 - (v.b * r) ** 2 / 2;
    const real = Math.cos(v.b * r);
    return [
      [step('B1', `$1 - ${fracTex(Q.of(v.b * v.b, 2))}\\theta^2$`, 'Replace θ by bθ in 1 − θ²/2.')],
      [step('B1', 'The approximations only hold for angles in radians.', 'The formula comes from calculus, which needs radians.'), step('B1', `$\\theta = ${v.deg} \\times \\frac{\\pi}{180} = ${roundFloatDp(r, 4)}$`, 'Convert the angle.')],
      [
        step('M1', `Approximation $= ${roundFloatDp(approx, 5)}$`, 'Use the radian value in the approximation.'),
        step('M1', `True value $= ${roundFloatDp(real, 5)}$`, 'Find the cosine directly, in the right calculator mode.'),
        step('A1', `${Number(((Math.abs(approx - real) / real) * 100).toPrecision(2))}%`, 'Error over true value, as a percentage.'),
      ],
    ];
  },

  check(v, answers) {
    const t = 1e-3;
    if (v.level === 'foundational') {
      const exact = v.a * Math.cos(v.b * t) + v.c * Math.sin(v.d * t);
      const poly = v.a + v.c * v.d * t - (v.a * v.b * v.b * t * t) / 2;
      return Math.abs(exact - poly) < 1e-6 ? [] : ['approximation'];
    }
    if (v.level === 'core') {
      const value = (1 - Math.cos(v.b * t)) / (t * Math.tan(v.c * t));
      return Math.abs(value - (v.b * v.b) / (2 * v.c)) < 1e-3 ? [] : ['limit'];
    }
    return answers.length === 3 && Math.cos(v.b * ((v.deg * Math.PI) / 180)) > 0 ? [] : ['cosine must be positive'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.d}|${v.deg}`,
});
