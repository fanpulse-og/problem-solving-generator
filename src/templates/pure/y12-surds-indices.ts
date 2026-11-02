import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 surds and indices: simplifying, rationalising a denominator
 * to the form p + q√d, a power equation in base 2, and an equation whose answer
 * must be given in surd form.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  d: number;
  m: number;
  n: number;
  a: number;
  b: number;
  c: number;
  e: number;
  x: number;
}

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13];
/** p + q√d */
const surdForm = (p: Q, q: Q, d: number) => {
  const part2 = q.eq(1) ? `\\sqrt{${d}}` : q.eq(-1) ? `-\\sqrt{${d}}` : `${fracTex(q)}\\sqrt{${d}}`;
  if (p.eq(0)) return part2;
  return `${fracTex(p)} ${q.isPositive() ? '+' : '-'} ${(q.isPositive() ? q : q.neg()).eq(1) ? '' : fracTex(q.isPositive() ? q : q.neg())}\\sqrt{${d}}`;
};

export default defineTemplate<V>({
  id: 'y12-surds-indices',
  title: 'Surds and indices',
  strand: 'Pure',
  subtopic: 'Surds & indices',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const d = rng.pick(SQUAREFREE);
    const base: V = { level, d, m: 0, n: 0, a: 0, b: 0, c: 0, e: 0, x: 0 };
    if (level === 'foundational') {
      const m = rng.int(2, 7);
      const n = rng.int(2, 7);
      ensure(m !== n, 'two different surds');
      return { ...base, m, n, a: rng.int(2, 12) };
    }
    if (level === 'core') {
      const a = rng.int(1, 7);
      const b = rng.int(1, 7);
      ensure(b * b !== d && a !== b, 'a real rationalised form');
      const n = rng.pick([1, 3, 4, 5]);
      return { ...base, a, b, m: rng.int(1, 4), n, x: rng.int(-5, 8) };
    }
    const c = rng.int(1, 5);
    const e = rng.int(1, 9);
    ensure(c * c !== d, 'a non-zero denominator');
    return { ...base, c, e };
  },

  validate(v) {
    return v.d > 1 ? [] : ['d must be a surd'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const [A, B] = [v.d * v.m * v.m, v.d * v.n * v.n];
      return {
        stem: [],
        parts: [
          part('a', 2, text(`Write  $\\sqrt{${A}} + \\sqrt{${B}}$  in the form  $k\\sqrt{${v.d}}$  where $k$ is an integer.`)),
          part('b', 2, text(`Write  $\\frac{${v.a}}{\\sqrt{${v.d}}}$  in the form  $r\\sqrt{${v.d}}$  where $r$ is a rational number.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [],
        parts: [
          part('a', 3, text(`Write  $\\frac{${v.a} + \\sqrt{${v.d}}}{${v.b} - \\sqrt{${v.d}}}$  in the form  $p + q\\sqrt{${v.d}}$  where $p$ and $q$ are rational numbers.`)),
          part('b', 3, text(`Solve  $4^{x + ${v.m}} = 2^{${terms([[v.n, 1], [2 * v.m + v.x * (2 - v.n), 0]])}}$`)),
        ],
      };
    }
    return {
      stem: lines('In this question you must show all stages of your working.', 'Solutions relying entirely on calculator technology are not acceptable.'),
      parts: [part('a', 4, text(`Solve  $x\\sqrt{${v.d}} = ${v.c === 1 ? '' : v.c}x + ${v.e}$`), text(`giving your answer in the form  $p + q\\sqrt{${v.d}}$  where $p$ and $q$ are rational numbers.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${v.m + v.n}\\sqrt{${v.d}}$` }, { text: `$${fracTex(Q.of(v.a, v.d))}\\sqrt{${v.d}}$` }];
    if (v.level === 'core') {
      const D = v.b * v.b - v.d;
      return [{ text: `$${surdForm(Q.of(v.a * v.b + v.d, D), Q.of(v.a + v.b, D), v.d)}$` }, { text: `$x = ${v.x}$` }];
    }
    const D = v.d - v.c * v.c;
    return [{ text: `$x = ${surdForm(Q.of(v.e * v.c, D), Q.of(v.e, D), v.d)}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [A, B] = [v.d * v.m * v.m, v.d * v.n * v.n];
      return [
        [step('M1', `$\\sqrt{${A}} = ${v.m}\\sqrt{${v.d}}$ and $\\sqrt{${B}} = ${v.n}\\sqrt{${v.d}}$`, 'Look for the largest square factor of each number.'), step('A1', `$${v.m + v.n}\\sqrt{${v.d}}$`, 'Add the like surds.')],
        [step('M1', `$\\frac{${v.a}}{\\sqrt{${v.d}}} \\times \\frac{\\sqrt{${v.d}}}{\\sqrt{${v.d}}}$`, 'Multiply top and bottom by the surd.'), step('A1', `$${fracTex(Q.of(v.a, v.d))}\\sqrt{${v.d}}$`, 'Simplify the fraction if you can.')],
      ];
    }
    if (v.level === 'core') {
      const D = v.b * v.b - v.d;
      const c2 = v.n;
      const k2 = 2 * v.m + v.x * (2 - v.n);
      return [
        [
          step('M1', `$\\times \\frac{${v.b} + \\sqrt{${v.d}}}{${v.b} + \\sqrt{${v.d}}}$`, 'Multiply by the conjugate: the bottom becomes a difference of two squares.'),
          step('A1', `$\\frac{${v.a * v.b + v.d} + ${v.a + v.b}\\sqrt{${v.d}}}{${D}}$`, 'Expand the top and the bottom.'),
          step('A1', `$${surdForm(Q.of(v.a * v.b + v.d, D), Q.of(v.a + v.b, D), v.d)}$`, 'Split into the two parts asked for.'),
        ],
        [
          step('M1', `$4^{x + ${v.m}} = 2^{2x + ${2 * v.m}}$`, 'Write both sides with base 2.'),
          step('M1', `$2x + ${2 * v.m} = ${terms([[c2, 1], [k2, 0]])}$`, 'The bases match, so the powers must match.'),
          step('A1', `$x = ${v.x}$`, 'Solve the linear equation.'),
        ],
      ];
    }
    const D = v.d - v.c * v.c;
    return [
      [
        step('M1', `$x(\\sqrt{${v.d}} - ${v.c}) = ${v.e}$`, 'Collect the x terms and factorise.'),
        step('A1', `$x = \\frac{${v.e}}{\\sqrt{${v.d}} - ${v.c}}$`, 'Divide.'),
        step('M1', `$\\times \\frac{\\sqrt{${v.d}} + ${v.c}}{\\sqrt{${v.d}} + ${v.c}}$`, 'Rationalise using the conjugate.'),
        step('A1', `$x = ${surdForm(Q.of(v.e * v.c, D), Q.of(v.e, D), v.d)}$`, `The bottom becomes ${v.d} − ${v.c * v.c}.`),
      ],
    ];
  },

  check(v) {
    const r = Math.sqrt(v.d);
    if (v.level === 'foundational') return Math.abs(Math.sqrt(v.d * v.m * v.m) + Math.sqrt(v.d * v.n * v.n) - (v.m + v.n) * r) < 1e-9 ? [] : ['sum'];
    if (v.level === 'core') {
      const D = v.b * v.b - v.d;
      if (Math.abs((v.a + r) / (v.b - r) - ((v.a * v.b + v.d) / D + ((v.a + v.b) / D) * r)) > 1e-9) return ['rationalised'];
      const k2 = 2 * v.m + v.x * (2 - v.n);
      if (v.n === 2) return ['powers cancel'];
      return 2 * (v.x + v.m) === v.n * v.x + k2 ? [] : ['power equation'];
    }
    const D = v.d - v.c * v.c;
    const x = (v.e * v.c) / D + (v.e / D) * r;
    return Math.abs(x * r - (v.c * x + v.e)) < 1e-9 ? [] : ['root'];
  },

  key: (v) => `${v.d}|${v.m}|${v.n}|${v.a}|${v.b}|${v.c}|${v.e}|${v.x}`,
});
