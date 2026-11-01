import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundDp } from '../../engine/format';
import { nCr, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 binomial questions: first terms of (a + bx)^n in ascending
 * powers, using the expansion to estimate a power, and a coefficient in a product
 * that leads back to an unknown constant.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  n: number;
  a: number;
  b: number;
  k: number;
  c: number;
  d: number;
}

const series = (v: V) => [v.a ** v.n, v.n * v.a ** (v.n - 1) * v.b, nCr(v.n, 2) * v.a ** (v.n - 2) * v.b ** 2];
const ascending = (co: number[]) => terms(co.map((c, i) => [c, i] as [number, number]));

export default defineTemplate<V>({
  id: 'y12-binomial',
  title: 'Binomial expansion',
  strand: 'Pure',
  subtopic: 'Binomial expansion',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, n: 0, a: 1, b: 0, k: 0, c: 0, d: 0 };
    if (level === 'foundational') return { ...base, n: rng.int(4, 8), b: rng.int(2, 5) * rng.pick([1, -1]) };
    if (level === 'core') {
      const a = rng.pick([2, 3]);
      return { ...base, n: a === 2 ? rng.int(5, 8) : rng.int(4, 6), a, b: rng.int(1, 4) * rng.pick([1, -1]) };
    }
    const k = rng.int(2, 4) * rng.pick([1, -1]);
    const c = rng.int(2, 5);
    const d = rng.int(1, 5) * rng.pick([1, -1]);
    const n = rng.int(5, 8);
    ensure(c * n * k + d !== 0, 'the coefficient of x must not vanish');
    return { ...base, n, k, c, d };
  },

  validate(v) {
    return v.n >= 4 ? [] : ['n is too small'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          part('a', 3, text(`Find the first 3 terms, in ascending powers of $x$, of the binomial expansion of  $(1 ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}x)^${v.n}$`), text('giving each term in its simplest form.')),
          part('b', 2, text(`Find the coefficient of $x^3$ in this expansion.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [],
        parts: [
          part('a', 4, text(`Find the first 3 terms, in ascending powers of $x$, of the binomial expansion of  $(${v.a} ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}x)^${v.n}$`), text('giving each term in its simplest form.')),
          part('b', 2, text(`Use your expansion, with a suitable value of $x$, to estimate the value of  $${dec(Q.of(v.a).add(Q.of(v.b, 100)))}^${v.n}$  Give your answer to 2 decimal places.`)),
        ],
      };
    }
    return {
      stem: lines(`$(1 + kx)^${v.n}$  where $k$ is a non-zero constant.`),
      parts: [
        part('a', 2, text(`Find the first 3 terms, in ascending powers of $x$, of the expansion of $(1 + kx)^${v.n}$, giving each coefficient in terms of $k$.`)),
        part('b', 2, text(`Given that the coefficient of $x$ in the expansion of  $(${v.c} ${v.d < 0 ? '-' : '+'} ${Math.abs(v.d)}x)(1 + kx)^${v.n}$  is $${v.c * v.n * v.k + v.d}$, find the value of $k$.`)),
        part('c', 2, text('Hence find the coefficient of $x^2$ in this expansion.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${ascending(series(v))}$` }, { text: `$${nCr(v.n, 3) * v.b ** 3}$` }];
    if (v.level === 'core') {
      const [t0, t1, t2] = series(v);
      return [{ text: `$${ascending([t0, t1, t2])}$` }, { text: `$${roundDp(Q.of(t0).add(Q.of(t1, 100)).add(Q.of(t2, 10000)), 2)}$` }];
    }
    const C2 = nCr(v.n, 2);
    return [{ text: `$1 + ${v.n}kx + ${C2}k^2x^2$` }, { text: `$k = ${v.k}$` }, { text: `$${v.c * C2 * v.k * v.k + v.d * v.n * v.k}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [, t1, t2] = series(v);
      return [
        [
          step('B1', `$1 ${t1 < 0 ? '-' : '+'} ${Math.abs(t1)}x$`, `The first two terms: 1, then ${v.n} × ${v.b}x.`),
          step('M1', `$\\binom{${v.n}}{2}(${v.b}x)^2 = ${nCr(v.n, 2)} \\times ${v.b * v.b}x^2$`, 'Square the whole of the second term, coefficient included.'),
          step('A1', `$${t2}x^2$`, 'Multiply out.'),
        ],
        [step('M1', `$\\binom{${v.n}}{3}(${v.b})^3 = ${nCr(v.n, 3)} \\times ${v.b ** 3 < 0 ? `(${v.b ** 3})` : v.b ** 3}$`, 'The general term with r = 3.'), step('A1', `$${nCr(v.n, 3) * v.b ** 3}$`, 'Keep the sign: odd powers of a negative number are negative.')],
      ];
    }
    if (v.level === 'core') {
      const [t0, t1, t2] = series(v);
      return [
        [
          step('B1', `$${v.a}^${v.n} = ${t0}$`, 'The first term is the first number to the power n.'),
          step('M1', `$\\binom{${v.n}}{1}${v.a}^${v.n - 1}(${v.b}x) + \\binom{${v.n}}{2}${v.a}^${v.n - 2}(${v.b}x)^2$`, 'Powers of the first number fall as powers of the second rise. They always add up to n.'),
          step('A1', `$${t1 < 0 ? '-' : '+'} ${Math.abs(t1)}x$`, 'Second term.'),
          step('A1', `$+ ${t2}x^2$`, 'Third term.'),
        ],
        [step('M1', `$x = 0.01$:  $${t0} ${t1 < 0 ? '-' : '+'} ${Math.abs(t1)}(0.01) + ${t2}(0.01)^2$`, `The bracket becomes ${dec(Q.of(v.a).add(Q.of(v.b, 100)))} when x = 0.01.`), step('A1', `$${roundDp(Q.of(t0).add(Q.of(t1, 100)).add(Q.of(t2, 10000)), 2)}$`, 'Work it out from your expansion rather than directly on your calculator.')],
      ];
    }
    const C2 = nCr(v.n, 2);
    const coef = v.c * v.n * v.k + v.d;
    return [
      [step('M1', `$1 + \\binom{${v.n}}{1}kx + \\binom{${v.n}}{2}(kx)^2$`, 'Use the binomial expansion with k kept as a letter.'), step('A1', `$1 + ${v.n}kx + ${C2}k^2x^2$`, 'Remember to square k too.')],
      [step('M1', `$${v.c} \\times ${v.n}k ${v.d < 0 ? '-' : '+'} ${Math.abs(v.d)} = ${coef}$`, `Two ways to make x: ${v.c} times the x term, and ${v.d}x times the 1.`), step('A1', `$k = ${v.k}$`, 'Solve the linear equation.')],
      [
        step('M1', `$${v.c} \\times ${C2}k^2 ${v.d < 0 ? '-' : '+'} ${Math.abs(v.d)} \\times ${v.n}k$`, `Two ways to make x²: ${v.c} times the x² term, and ${v.d}x times the x term.`),
        step('A1', `$${v.c * C2 * v.k * v.k + v.d * v.n * v.k}$`, `Use k = ${v.k}.`),
      ],
    ];
  },

  check(v, answers) {
    // Multiply the brackets out one at a time instead of using nCr.
    const power = (a: number, b: number, n: number) => {
      let p = [1];
      for (let i = 0; i < n; i++) {
        const next = new Array(p.length + 1).fill(0);
        p.forEach((c, j) => {
          next[j] += c * a;
          next[j + 1] += c * b;
        });
        p = next;
      }
      return p;
    };
    if (v.level === 'stretch') {
      const p = power(1, v.k, v.n);
      const x2 = v.c * p[2] + v.d * p[1];
      return answers[2].text === `$${x2}$` ? [] : ['x^2'];
    }
    const p = power(v.a, v.b, v.n);
    if (p[0] !== series(v)[0] || p[1] !== series(v)[1] || p[2] !== series(v)[2]) return ['series'];
    if (v.level === 'foundational') return answers[1].text === `$${p[3]}$` ? [] : ['x^3'];
    const est = Q.of(p[0]).add(Q.of(p[1], 100)).add(Q.of(p[2], 10000));
    return answers[1].text === `$${roundDp(est, 2)}$` ? [] : ['estimate'];
  },

  key: (v) => `${v.n}|${v.a}|${v.b}|${v.k}|${v.c}|${v.d}`,
});
