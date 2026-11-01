import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on the discriminant questions in 8MA0/01 (a quadratic with an unknown
 * coefficient has two distinct roots: show an inequality, then solve it) and the
 * "line is a tangent to the curve" parts.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  alpha: number; // core: critical values of k
  beta: number;
  s: number; // stretch: c + 1 = s^2
}

const PAIRS: [number, number][] = [
  [1, 4],
  [1, 9],
  [4, 9],
  [2, 8],
  [1, 16],
  [3, 12],
  [2, 18],
  [4, 16],
  [9, 16],
];

export default defineTemplate<V>({
  id: 'y12-quadratic-roots',
  title: 'The discriminant',
  strand: 'Pure',
  subtopic: 'Quadratics',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 1, b: 0, c: 0, alpha: 0, beta: 0, s: 0 };
    if (level === 'foundational') {
      const a = rng.int(1, 5);
      const b = rng.int(2, 11) * rng.pick([1, -1]);
      const c = rng.int(1, 9) * rng.pick([1, -1]);
      ensure(b * b - 4 * a * c !== 0, 'the discriminant must not be zero');
      return { ...base, a, b, c };
    }
    if (level === 'core') {
      const [alpha, beta] = rng.pick(PAIRS);
      return { ...base, alpha, beta, b: Math.round(Math.sqrt(alpha * beta)) };
    }
    const s = rng.int(2, 5);
    const b = rng.int(1, 8) * rng.pick([1, -1]);
    ensure(b * b !== 4 * s * s, 'the constant term must not vanish');
    return { ...base, s, b, c: s * s - 1 };
  },

  validate(v) {
    return v.level === 'core' && v.alpha * v.beta !== v.b * v.b ? ['b squared must equal the product of the critical values'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const f = polyTex([v.a, v.b, v.c]);
      return {
        stem: lines(`$\\mathrm{f}(x) = ${f}$`),
        parts: [
          part('a', 2, text('Find the value of the discriminant of $\\mathrm{f}(x)$')),
          part('b', 2, text('State the number of distinct real roots of the equation $\\mathrm{f}(x) = 0$, giving a reason for your answer.')),
          part('c', 2, text(`The equation $\\mathrm{f}(x) + q = 0$, where $q$ is a constant, has equal roots.`), text('Find the value of $q$')),
        ],
      };
    }
    if (v.level === 'core') {
      const c = v.alpha + v.beta;
      return {
        stem: lines(`The equation  $kx^2 + ${2 * v.b}x + (${c} - k) = 0$,  where $k$ is a positive constant, has two distinct real roots.`),
        parts: [
          part('a', 3, text(`Show that  $${polyTex([1, -c, v.b * v.b], 'k')} > 0$`)),
          part('b', 3, text('Hence find the range of possible values of $k$')),
        ],
      };
    }
    return {
      stem: lines(`A curve $C$ has equation  $y = ${polyTex([1, v.b, v.c])}$`, 'A line $l$ has equation  $y = kx - 1$,  where $k$ is a constant.', 'Given that $l$ is a tangent to $C$,'),
      parts: [
        part('a', 3, text(`show that  $${polyTex([1, -2 * v.b, v.b * v.b - 4 * v.s * v.s], 'k')} = 0$`)),
        part('b', 2, text('find the two possible values of $k$')),
        part('c', 2, text('For the larger value of $k$, find the coordinates of the point where $l$ touches $C$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const d = v.b * v.b - 4 * v.a * v.c;
      return [{ text: `$${d}$` }, { text: d > 0 ? '2 (the discriminant is positive)' : '0 (the discriminant is negative)' }, { text: `$q = ${fracTex(Q.of(d, 4 * v.a))}$` }];
    }
    if (v.level === 'core') return [{ text: 'Shown' }, { text: `$0 < k < ${v.alpha}$ or $k > ${v.beta}$` }];
    const k = v.b + 2 * v.s;
    return [{ text: 'Shown' }, { text: `$k = ${v.b - 2 * v.s}$ or $k = ${k}$` }, { text: `$(${v.s}, ${k * v.s - 1})$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const d = v.b * v.b - 4 * v.a * v.c;
      const q = Q.of(d, 4 * v.a);
      return [
        [step('M1', `$b^2 - 4ac = (${v.b})^2 - 4 \\times ${v.a} \\times (${v.c})$`, 'Pick out a, b and c, keeping their signs.'), step('A1', `$= ${d}$`, 'Take care with the two minus signs.')],
        [step('B1', d > 0 ? `$${d} > 0$` : `$${d} < 0$`, 'Compare the discriminant with zero.'), step('B1', d > 0 ? '2 distinct real roots' : 'No real roots', 'A positive discriminant gives 2 roots; a negative one gives none.')],
        [step('M1', `$(${v.b})^2 - 4 \\times ${v.a} \\times (${v.c} + q) = 0$`, 'Equal roots means the discriminant is zero. Adding q changes the constant term only.'), step('A1', `$q = ${fracTex(q)}$`, 'Solve the linear equation for q.')],
      ];
    }
    if (v.level === 'core') {
      const c = v.alpha + v.beta;
      return [
        [
          step('M1', `$b^2 - 4ac = ${2 * v.b}^2 - 4k(${c} - k)$`, 'Here a = k, b is the number and c is the whole bracket.'),
          step('M1', `$${4 * v.b * v.b} - 4k(${c} - k) > 0$`, 'Two distinct real roots needs a positive discriminant.'),
          step('A1', `$${polyTex([1, -c, v.b * v.b], 'k')} > 0$`, 'Expand, then divide by 4. This is the printed answer, so show every step.'),
        ],
        [
          step('M1', `$(k - ${v.alpha})(k - ${v.beta}) = 0$, so $k = ${v.alpha}, ${v.beta}$`, 'Find the critical values.'),
          step('M1', `$k < ${v.alpha}$ or $k > ${v.beta}$`, 'The quadratic is positive outside its roots.'),
          step('A1', `$0 < k < ${v.alpha}$ or $k > ${v.beta}$`, 'k is positive, so the lower region stops at 0.'),
        ],
      ];
    }
    const k = v.b + 2 * v.s;
    return [
      [
        step('M1', `$${polyTex([1, v.b, v.c])} = kx - 1$`, 'Set the curve equal to the line.'),
        step('M1', `$x^2 + (${v.b} - k)x + ${v.c + 1} = 0$, so $(${v.b} - k)^2 - 4 \\times ${v.c + 1} = 0$`, 'A tangent meets the curve once, so the discriminant is zero.'),
        step('A1', `$${polyTex([1, -2 * v.b, v.b * v.b - 4 * v.s * v.s], 'k')} = 0$`, 'Expand and collect the terms. This is the printed answer, so show every step.'),
      ],
      [step('M1', `$(k - ${v.b})^2 = ${4 * v.s * v.s}$`, 'Solve the quadratic in k by factorising or completing the square.'), step('A1', `$k = ${v.b - 2 * v.s}$ or $k = ${k}$`, 'Keep both values.')],
      [step('M1', `$x = \\frac{k - ${v.b < 0 ? `(${v.b})` : v.b}}{2} = ${v.s}$`, 'Equal roots: x = −b ÷ 2a in the quadratic from part (a).'), step('A1', `$(${v.s}, ${k * v.s - 1})$`, 'Use the line to find y.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // q from the repeated root: at x = -b/2a, f(x) + q = 0.
      const x = Q.of(-v.b, 2 * v.a);
      const q = x.mul(x).mul(v.a).add(x.mul(v.b)).add(v.c).neg();
      return answers[2].text === `$q = ${fracTex(q)}$` ? [] : ['q'];
    }
    if (v.level === 'core') {
      // Brute force: two distinct roots exactly in the stated range, for positive k.
      const c = v.alpha + v.beta;
      for (let i = 1; i < 400; i++) {
        const k = i / 8 + 0.03;
        const two = 4 * v.b * v.b - 4 * k * (c - k) > 0;
        if (two !== (k < v.alpha || k > v.beta)) return [`k = ${k}`];
      }
      return [];
    }
    const k = v.b + 2 * v.s;
    // The contact point lies on both, and the quadratic has a repeated root there.
    const x = v.s;
    const onCurve = x * x + v.b * x + v.c;
    const onLine = k * x - 1;
    const slope = 2 * x + v.b;
    return onCurve === onLine && slope === k ? [] : ['contact'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.alpha}|${v.beta}|${v.s}`,
});
