import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { sf3 } from '../../engine/pure';

/**
 * Modelled on 8MA0/01 logarithm questions: the laws of logs written in terms of
 * p and q, an equation that needs an invalid root rejecting, and a disguised
 * quadratic in 3^x where the reason for dropping a value earns a mark.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  base: number;
  i: number;
  j: number;
  r: number; // core root
  d: number;
  n: number;
  e: number[]; // foundational powers
  x: number; // foundational: solve base^x = x
  p: number; // stretch: roots of the quadratic are p and −q
  q: number;
}

export default defineTemplate<V>({
  id: 'y12-logs',
  title: 'Laws of logarithms',
  strand: 'Pure',
  subtopic: 'Exponentials & logarithms',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, base: 2, i: 0, j: 0, r: 0, d: 0, n: 0, e: [], x: 0, p: 0, q: 0 };
    if (level === 'foundational') {
      const b = rng.pick([3, 5, 7]);
      const x = rng.int(11, 90);
      ensure(Math.round(Math.log(x) / Math.log(b)) !== Math.log(x) / Math.log(b), 'the answer is not a whole number');
      return { ...base, base: b, e: [rng.int(2, 4), rng.int(2, 3)], x };
    }
    if (level === 'core') {
      const b = rng.pick([2, 3]);
      const i = rng.int(1, 3);
      const j = i + rng.int(1, 3);
      return { ...base, base: b, i, j, r: b ** i, d: b ** j - b ** i, n: i + j };
    }
    const b = rng.pick([2, 3, 5]);
    const p = rng.int(2, 15);
    const q = rng.int(1, 9);
    ensure(p !== q && p !== b && p !== b * b && p !== b * b * b, 'p is not a power of the base');
    sf3(Math.log(p) / Math.log(b));
    return { ...base, base: b, p, q };
  },

  validate(v) {
    return v.level === 'core' && v.r * (v.r + v.d) !== v.base ** v.n ? ['the root must satisfy the equation'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('Given that  $\\log_a x = p$  and  $\\log_a y = q$,  where $a$ is a positive constant,'),
        parts: [
          part('a', 2, text(`write  $\\log_a(x^{${v.e[0]}}y)$  in terms of $p$ and $q$,`)),
          part('b', 2, text(`write  $\\log_a\\left(\\frac{x}{y^{${v.e[1]}}}\\right)$  in terms of $p$ and $q$.`)),
          part('c', 2, text(`Solve  $${v.base}^w = ${v.x}$,  giving your answer to 3 significant figures.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [],
        parts: [
          single(5, text(`Solve  $\\log_{${v.base}} x + \\log_{${v.base}}(x + ${v.d}) = ${v.n}$,  explaining why any other values of $x$ must be rejected.`)),
        ],
      };
    }
    const sum = v.p - v.q;
    const product = v.p * v.q;
    return {
      stem: lines(`$${v.base}^{2x} ${sum > 0 ? '-' : '+'} ${Math.abs(sum)} \\times ${v.base}^x - ${product} = 0$`),
      parts: [
        part('a', 1, text(`Write this equation as a quadratic in $y$, where  $y = ${v.base}^x$`)),
        part('b', 4, text('Hence solve the equation, giving your answer to 3 significant figures and explaining why there is only one solution.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: `$${v.e[0]}p + q$` }, { text: `$p - ${v.e[1]}q$` }, { text: `$w = ${sf3(Math.log(v.x) / Math.log(v.base))}$` }];
    }
    if (v.level === 'core') return [{ text: `$x = ${v.r}$ (logs of negative numbers are not defined)` }];
    return [{ text: `$${polyTex([1, -(v.p - v.q), -v.p * v.q], 'y')} = 0$` }, { text: `$x = ${sf3(Math.log(v.p) / Math.log(v.base))}$ ($${v.base}^x = -${v.q}$ has no solutions)` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('M1', `$\\log_a x^{${v.e[0]}} + \\log_a y$`, 'The log of a product is the sum of the logs.'), step('A1', `$${v.e[0]}p + q$`, 'The power comes down in front.')],
        [step('M1', `$\\log_a x - \\log_a y^{${v.e[1]}}$`, 'The log of a quotient is the difference of the logs.'), step('A1', `$p - ${v.e[1]}q$`, 'The power comes down in front.')],
        [step('M1', `$w = \\frac{\\ln ${v.x}}{\\ln ${v.base}}$`, 'Take logs of both sides.'), step('A1', `$w = ${sf3(Math.log(v.x) / Math.log(v.base))}$`, 'Check by raising the base to this power.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\log_{${v.base}} x(x + ${v.d}) = ${v.n}$`, 'Use the product law to combine the logs.'),
          step('M1', `$x(x + ${v.d}) = ${v.base}^${v.n}$`, 'Undo the log.'),
          step('M1', `$${polyTex([1, v.d, -(v.base ** v.n)])} = 0$`, 'Expand and collect into a quadratic.'),
          step('A1', `$(x - ${v.r})(x + ${v.r + v.d}) = 0$`, 'Factorise.'),
          step('B1', `$x = ${v.r}$, since $x = -${v.r + v.d}$ would need the log of a negative number.`, 'State the reason for rejecting the other root.'),
        ],
      ];
    }
    const sum = v.p - v.q;
    return [
      [step('B1', `$${polyTex([1, -sum, -v.p * v.q], 'y')} = 0$`, `${v.base}^{2x} is the square of ${v.base}^x.`)],
      [
        step('M1', `$(y - ${v.p})(y + ${v.q}) = 0$`, 'Factorise the quadratic in y.'),
        step('A1', `$${v.base}^x = ${v.p}$ or $${v.base}^x = -${v.q}$`, 'Replace y.'),
        step('M1', `$x = \\frac{\\ln ${v.p}}{\\ln ${v.base}}$`, 'Take logs of the positive value.'),
        step('A1', `$x = ${sf3(Math.log(v.p) / Math.log(v.base))}$; $${v.base}^x$ is always positive, so $${v.base}^x = -${v.q}$ has no solutions.`, 'Both the value and the reason are needed.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // Try the laws with real numbers: a = 2, x = 8, y = 32 gives p = 3, q = 5.
      const [p, q] = [3, 5];
      const left = Math.log2(8 ** v.e[0] * 32);
      if (Math.abs(left - (v.e[0] * p + q)) > 1e-9) return ['product law'];
      if (Math.abs(Math.log2(8 / 32 ** v.e[1]) - (p - v.e[1] * q)) > 1e-9) return ['quotient law'];
      const w = Number(answers[2].text.match(/= ([\d.]+)/)![1]);
      return Math.abs(v.base ** w - v.x) / v.x < 0.02 ? [] : ['power'];
    }
    if (v.level === 'core') {
      const lhs = Math.log(v.r) / Math.log(v.base) + Math.log(v.r + v.d) / Math.log(v.base);
      return Math.abs(lhs - v.n) < 1e-9 ? [] : ['root'];
    }
    const x = Number(answers[1].text.match(/x = ([\d.]+)/)![1]);
    const y = v.base ** x;
    const value = y * y - (v.p - v.q) * y - v.p * v.q;
    return Math.abs(value) / (v.p * v.q + y * y) < 0.05 ? [] : ['substitute back'];
  },

  key: (v) => `${v.base}|${v.r}|${v.d}|${v.n}|${v.e}|${v.x}|${v.p}|${v.q}`,
});
