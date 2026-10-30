import { defineTemplate } from '../../engine/types';
import { part, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';

/**
 * Modelled on Set 22 1H Q16 (write x² + 6x − 4 in the form (x + a)² + b),
 * Set 23 1H Q18 (hence the turning point of y = x² − 8x + 21; does the curve
 * cross the x-axis?) and Set 24 1H Q23 (2x² + 12x + 5 in the form
 * a(x + b)² + c). Built from a, p and q, so every form is exact.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  p: number; // a(x + p)² + q
  q: number;
}

const coeffs = (v: V): [number, number, number] => [v.a, 2 * v.a * v.p, v.a * v.p * v.p + v.q];
const sq = (p: number) => `(x ${p < 0 ? '-' : '+'} ${Math.abs(p)})^2`;
const formTex = (v: V) => `${v.a === 1 ? '' : v.a === -1 ? '-' : v.a}${sq(v.p)} ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)}`;
const tp = (v: V) => `(${-v.p}, ${v.q})`;

export default defineTemplate<V>({
  id: 'alg-completing-square',
  title: 'Completing the square and turning points',
  strand: 'Algebra',
  subtopic: 'Quadratic equations',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const a = level === 'stretch' ? rng.pick([2, 3, -1, -2]) : 1;
    const p = rng.int(-7, 7);
    const q = rng.int(-25, 25);
    ensure(p !== 0 && q !== 0, 'a real shift each way');
    const [, b, c] = coeffs({ level, a, p, q });
    ensure(c !== 0 && Math.abs(c) <= 60 && Math.abs(b) <= 30, 'friendly coefficients');
    return { level, a, p, q };
  },

  validate(v) {
    return v.a === 0 ? ['not a quadratic'] : [];
  },

  render(v) {
    const e = polyTex(coeffs(v));
    if (v.level === 'foundational') {
      return { stem: [], parts: [part('a', 2, text(`Write $${e}$ in the form $(x + p)^2 + q$, where $p$ and $q$ are integers.`)), part('b', 1, text(`Hence write down the coordinates of the turning point of the curve $y = ${e}$`))] };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`The curve $C$ has equation $y = ${e}$`)],
        parts: [
          part('a', 2, text('Find the coordinates of the turning point of $C$.')),
          part('b', 2, text('Does $C$ cross the $x$-axis?'), text('You must give a reason for your answer.')),
        ],
      };
    }
    return {
      stem: [],
      parts: [
        part('a', 3, text(`Write $${e}$ in the form $a(x + b)^2 + c$, where $a$, $b$ and $c$ are integers.`)),
        part('b', 2, text(`Hence find the coordinates of the turning point of the curve $y = ${e}$, and state whether it is a maximum or a minimum.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$${formTex(v)}$` }, { text: `$${tp(v)}$` }];
    if (v.level === 'core') {
      const crosses = v.q < 0;
      return [{ text: `$${tp(v)}$` }, { text: crosses ? `Yes: the minimum value of $y$ is $${v.q}$, which is below the $x$-axis` : `No: the minimum value of $y$ is $${v.q}$, which is above the $x$-axis` }];
    }
    return [{ text: `$${formTex(v)}$` }, { text: `$${tp(v)}$, a ${v.a > 0 ? 'minimum' : 'maximum'}` }];
  },

  markScheme(v) {
    const [, b, c] = coeffs(v);
    const half = b / (2 * v.a);
    const complete = [
      step('M1', `$${sq(v.p)} - ${v.p * v.p}$`, `Halve the coefficient of x (${b / v.a} ÷ 2 = ${half}), then subtract ${half < 0 ? `(${half})` : half}² = ${half * half} to cancel the extra term.`.replace(/-/g, '−')),
      step('A1', `$${sq(v.p)} - ${v.p * v.p} ${c < 0 ? '-' : '+'} ${Math.abs(c)} = ${formTex(v)}$`, 'Collect the numbers.'),
    ];
    if (v.level === 'foundational') {
      return [complete, [step('B1', `$${tp(v)}$`, `The bracket is smallest (zero) when x = ${-v.p}; then y = ${v.q}.`.replace(/-/g, '−'))]];
    }
    if (v.level === 'core') {
      return [
        [{ ...complete[0], code: 'M1' }, step('A1', `$${formTex(v)}$, so turning point $${tp(v)}$`, `x = ${-v.p} makes the bracket zero.`.replace(/-/g, '−'))],
        [step('M1', `Minimum value of $y$ is $${v.q}$`, 'The squared bracket is never negative, so the lowest y is the number on the end.'), step('C1', v.q < 0 ? 'Yes, because the minimum is below the x-axis' : 'No, because the minimum is above the x-axis', 'A clear reason using the turning point.')],
      ];
    }
    const inner = v.a === 1 ? '' : v.a === -1 ? '-' : `${v.a}`;
    return [
      [
        step('M1', `$${inner}\\left(${polyTex([1, b / v.a, 0])}\\right) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`, `Take out the factor ${v.a} from the x² and x terms only.`.replace(/-/g, '−')),
        step('M1', `$${inner}\\left(${sq(v.p)} - ${v.p * v.p}\\right) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`, 'Complete the square inside the bracket.'),
        step('A1', `$${formTex(v)}$`, `Multiply out: ${v.a} × (−${v.p * v.p}) = ${-v.a * v.p * v.p}, then collect.`.replace(/-/g, '−')),
      ],
      [step('B1', `$${tp(v)}$`, 'The bracket is zero at the turning point.'), step('B1', v.a > 0 ? 'Minimum' : 'Maximum', v.a > 0 ? 'Positive x² term: a ∪-shaped curve.' : 'Negative x² term: a ∩-shaped curve.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const [A, B, C] = coeffs(v);
    const f = (x: number) => A * x * x + B * x + C;
    if (v.level !== 'core') {
      // Read the completed-square form back and compare at several x.
      const m = /^\$(-?\d*)\(x ([+-]) (\d+)\)\^2 ([+-]) (\d+)\$$/.exec(answers[0].text);
      if (!m) return ['format'];
      const a = m[1] === '' ? 1 : m[1] === '-' ? -1 : Number(m[1]);
      const pp = (m[2] === '-' ? -1 : 1) * Number(m[3]);
      const qq = (m[4] === '-' ? -1 : 1) * Number(m[5]);
      for (let x = -5; x <= 5; x++) if (a * (x + pp) ** 2 + qq !== f(x)) p.push(`form wrong at x = ${x}`);
    }
    // Turning point: the vertex of a parabola is where f(x0 − 1) = f(x0 + 1).
    const tpText = answers[v.level === 'core' ? 0 : 1].text;
    const t = /\((-?\d+), (-?\d+)\)/.exec(tpText);
    if (!t) return [...p, 'turning point format'];
    const x0 = Number(t[1]);
    if (f(x0 - 1) !== f(x0 + 1) || f(x0) !== Number(t[2])) p.push('turning point');
    if (v.level === 'core') {
      // Crosses the x-axis iff the discriminant is positive.
      const crosses = B * B - 4 * A * C > 0;
      if (answers[1].text.startsWith('Yes') !== crosses) p.push('crossing');
    }
    if (v.level === 'stretch' && answers[1].text.includes('minimum') !== A > 0) p.push('max/min');
    return p.slice(0, 2);
  },

  key: (v) => `${v.a}|${v.p}|${v.q}`,
});
