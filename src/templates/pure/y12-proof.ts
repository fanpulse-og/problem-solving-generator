import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';

/**
 * Modelled on 8MA0/01 proof questions: a counter-example, showing an expression
 * is always positive by completing the square, and a proof split into even and
 * odd cases. The papers give the marks for the structure and the conclusion.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  p: number; // foundational: prime constant
  h: number; // core: x² + 2hx + c
  c: number;
  a: number; // stretch: n² + an + c
}

export default defineTemplate<V>({
  id: 'y12-proof',
  title: 'Proof',
  strand: 'Pure',
  subtopic: 'Proof',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, p: 0, h: 0, c: 0, a: 0 };
    if (level === 'foundational') return { ...base, p: rng.pick([5, 7, 11, 13, 17, 19, 23]) };
    if (level === 'core') {
      const h = rng.int(1, 7) * rng.pick([1, -1]);
      const c = h * h + rng.int(1, 9);
      return { ...base, h, c };
    }
    const a = rng.pick([1, 3, 5, 7, 9]);
    const c = rng.pick([1, 3, 5, 7, 11, 13]);
    ensure(a !== c, 'different constants');
    return { ...base, a, c };
  },

  validate(v) {
    return v.level === 'core' && v.c <= v.h * v.h ? ['the minimum must be positive'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A student says that  $n^2 + n + ${v.p}$  is a prime number for all positive integers $n$.`),
        parts: [part('a', 2, text('Use a counter-example to prove that the student is wrong.')), part('b', 1, text(`State why your counter-example is not prime.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [],
        parts: [
          part('a', 3, text(`Prove that  $${polyTex([1, 2 * v.h, v.c])} > 0$  for all real values of $x$.`)),
          part('b', 1, text(`State the minimum value of  $${polyTex([1, 2 * v.h, v.c])}$`)),
        ],
      };
    }
    return { stem: [], parts: [single(4, text(`Prove that  $n^2 + ${v.a === 1 ? '' : v.a}n + ${v.c}$  is odd for all integers $n$.`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `For example, $n = ${v.p}$ gives $${v.p * v.p + 2 * v.p}$` }, { text: `$${v.p * v.p + 2 * v.p} = ${v.p} \\times ${v.p + 2}$` }];
    if (v.level === 'core') return [{ text: `Proof: $(x ${v.h < 0 ? '-' : '+'} ${Math.abs(v.h)})^2 + ${v.c - v.h * v.h} > 0$` }, { text: `$${v.c - v.h * v.h}$` }];
    return [{ text: 'Proof by cases' }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const t = v.p * v.p + 2 * v.p;
      return [
        [step('M1', `Try $n = ${v.p}$:  $${v.p}^2 + ${v.p} + ${v.p}$`, `Every term then has a factor of ${v.p}.`), step('A1', `$= ${t}$`, 'One counter-example is enough to prove the statement false.')],
        [step('B1', `$${t} = ${v.p} \\times ${v.p + 2}$`, 'Show the factors.')],
      ];
    }
    if (v.level === 'core') {
      const min = v.c - v.h * v.h;
      const sq = `(x ${v.h < 0 ? '-' : '+'} ${Math.abs(v.h)})^2`;
      return [
        [
          step('M1', `$${polyTex([1, 2 * v.h, v.c])} = ${sq} ${min < 0 ? '-' : '+'} ${Math.abs(min)}$`, 'Complete the square.'),
          step('M1', `$${sq} \\geqslant 0$ for all $x$`, 'A square is never negative. Say so.'),
          step('A1', `So  $${sq} + ${min} \\geqslant ${min} > 0$`, 'The conclusion: you must say it is positive for all x.'),
        ],
        [step('B1', `$${min}$`, 'It happens when the square is zero.')],
      ];
    }
    const a = v.a;
    return [
      [
        step('M1', `If $n = 2k$:  $(2k)^2 + ${a}(2k) + ${v.c} = 2(2k^2 + ${a}k) + ${v.c}$`, 'Even case: write n = 2k, for an integer k.'),
        step('A1', `Even + ${v.c} is odd.`, `2 times an integer is even, and ${v.c} is odd.`),
        step('M1', `If $n = 2k + 1$:  $(2k + 1)^2 + ${a}(2k + 1) + ${v.c} = 2(2k^2 + ${2 + a}k) + ${1 + a + v.c}$`, 'Odd case: write n = 2k + 1.'),
        step('A1', `$${1 + a + v.c}$ is odd, so this is odd. True for all integers $n$.`, 'Every integer is even or odd, so the two cases cover everything.'),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const t = v.p * v.p + v.p + v.p;
      return t % v.p === 0 && t > v.p ? [] : ['counter-example'];
    }
    if (v.level === 'core') {
      for (let i = -300; i <= 300; i++) {
        const x = i / 10;
        if (!(x * x + 2 * v.h * x + v.c > 0)) return [`x = ${x}`];
      }
      return [];
    }
    for (let n = -30; n <= 30; n++) if (Math.abs(n * n + v.a * n + v.c) % 2 !== 1) return [`n = ${n}`];
    return [];
  },

  key: (v) => `${v.p}|${v.h}|${v.c}|${v.a}`,
});
