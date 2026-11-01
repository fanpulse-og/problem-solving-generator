import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, int, money } from '../../engine/format';
import { sf3, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 sequences and series: an arithmetic series, a geometric model
 * in context with an inequality solved by logs, and the 9MA0/01 June 2024 style
 * of three algebraic terms in a geometric sequence leading to a sum to infinity.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  d: number;
  n: number;
  S: number; // foundational: series total reached
  start: number; // core
  pct: number;
  years: number;
  target: number;
  t: Q[]; // stretch terms
  k: number;
  co: [number, number][]; // stretch: terms as αk + β
}

const ap = (a: number, d: number, n: number) => (n * (2 * a + (n - 1) * d)) / 2;
const expr = ([p, q]: [number, number]) => terms([[p, 1], [q, 0]], 'k');

export default defineTemplate<V>({
  id: 'y13-series',
  title: 'Arithmetic and geometric series',
  strand: 'Pure',
  subtopic: 'Sequences & series',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'measures', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, d: 0, n: 0, S: 0, start: 0, pct: 0, years: 0, target: 0, t: [], k: 0, co: [] };
    if (level === 'foundational') {
      const a = rng.int(3, 30);
      const d = rng.int(2, 9);
      const n = rng.int(12, 40);
      return { ...base, a, d, n, S: ap(a, d, rng.int(n + 3, n + 25)) };
    }
    if (level === 'core') {
      const start = rng.step(20000, 45000, 1000);
      const pct = rng.pick([2, 3, 4, 5, 6]);
      const years = rng.int(6, 15);
      const target = Math.round((start * rng.pick([1.5, 1.6, 1.8, 2])) / 1000) * 1000;
      const need = Math.log(target / start) / Math.log(1 + pct / 100) + 1;
      ensure(Math.abs(need - Math.round(need)) > 0.01, 'the crossing is not on a whole year');
      sf3((start * ((1 + pct / 100) ** years - 1)) / (pct / 100));
      return { ...base, start, pct, years, target };
    }
    const r = rng.pick([Q.of(1, 2), Q.of(1, 3), Q.of(2, 3), Q.of(3, 4), Q.of(-1, 2), Q.of(1, 4)]);
    const u = rng.pick([16, 18, 24, 36, 48, 54, 72, 81, 96, 144]);
    const t = [Q.of(u), Q.of(u).mul(r), Q.of(u).mul(r).mul(r)];
    ensure(t.every((x) => x.isInt()), 'whole-number terms');
    const k = rng.int(2, 7);
    const alphas = rng.sample([1, 2, 3, 4, 5], 3);
    const co = t.map((x, i) => [alphas[i], x.toInt() - alphas[i] * k] as [number, number]);
    ensure(co.every(([, q]) => q !== 0), 'each term has a constant');
    // (α₂k + β₂)² = (α₁k + β₁)(α₃k + β₃). The other root must be excluded by "k is a positive integer".
    const [A, B] = [co[1][0] ** 2 - co[0][0] * co[2][0], 2 * co[1][0] * co[1][1] - co[0][0] * co[2][1] - co[0][1] * co[2][0]];
    ensure(A !== 0, 'a true quadratic in k');
    const other = -B / A - k;
    ensure(!(Number.isInteger(other) && other > 0), 'only one positive integer value');
    return { ...base, t, k, co };
  },

  validate(v) {
    return v.level === 'stretch' && !v.t[1].mul(v.t[1]).eq(v.t[0].mul(v.t[2])) ? ['the terms must be geometric'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`An arithmetic series has first term ${v.a} and common difference ${v.d}`),
        parts: [
          part('a', 2, text(`Find term number ${v.n} of the series.`)),
          part('b', 2, text(`Find the sum of the first ${v.n} terms of the series.`)),
          part('c', 3, text(`The sum of the first $m$ terms is ${int(v.S)}`), text('Find the value of $m$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A company makes a profit of ${money(v.start * 100)} in its first year.`, `The profit is modelled as increasing by ${v.pct}% each year.`),
        parts: [
          part('a', 2, text(`Find, according to the model, the profit in Year ${v.years}, to the nearest pound.`)),
          part('b', 3, text(`Find the first year in which the profit exceeds ${money(v.target * 100)}`)),
          part('c', 2, text(`Find, according to the model, the total profit over the first ${v.years} years. Give your answer to 3 significant figures.`)),
        ],
      };
    }
    const [a, b, c] = v.co;
    return {
      stem: lines('The first 3 terms of a geometric sequence are', `$${expr(a)}$,   $${expr(b)}$,   $${expr(c)}$`, 'where $k$ is a positive integer.'),
      parts: [
        part('a', 3, text(`Using algebra, show that  $k = ${v.k}$`)),
        part('b', 3, text('Hence find the sum to infinity of the sequence.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const m = Math.round((-(2 * v.a - v.d) + Math.sqrt((2 * v.a - v.d) ** 2 + 8 * v.d * v.S)) / (2 * v.d));
      return [{ text: int(v.a + (v.n - 1) * v.d) }, { text: int(ap(v.a, v.d, v.n)) }, { text: `$m = ${m}$` }];
    }
    if (v.level === 'core') {
      const r = 1 + v.pct / 100;
      const y = Math.floor(Math.log(v.target / v.start) / Math.log(r)) + 2;
      return [{ text: money(Math.round(v.start * r ** (v.years - 1)) * 100) }, { text: `Year ${y}` }, { text: `£${sf3((v.start * (r ** v.years - 1)) / (r - 1))}` }];
    }
    const r = v.t[1].div(v.t[0]);
    return [{ text: 'Shown' }, { text: `$${fracTex(v.t[0].div(Q.of(1).sub(r)))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const u = v.a + (v.n - 1) * v.d;
      const m = Math.round((-(2 * v.a - v.d) + Math.sqrt((2 * v.a - v.d) ** 2 + 8 * v.d * v.S)) / (2 * v.d));
      return [
        [step('M1', `$${v.a} + (${v.n} - 1) \\times ${v.d}$`, 'Use a + (n − 1)d.'), step('A1', int(u), 'There are n − 1 differences between the first term and term n.')],
        [step('M1', `$\\frac{${v.n}}{2}(2 \\times ${v.a} + ${v.n - 1} \\times ${v.d})$`, 'Use the sum formula from the booklet.'), step('A1', int(ap(v.a, v.d, v.n)), 'Work it out.')],
        [
          step('M1', `$\\frac{m}{2}(${2 * v.a} + (m - 1) \\times ${v.d}) = ${v.S}$`, 'The same formula, with m unknown.'),
          step('M1', `$${terms([[v.d, 2], [2 * v.a - v.d, 1], [-2 * v.S, 0]], 'm')} = 0$`, 'Multiply by 2 and expand to get a quadratic.'),
          step('A1', `$m = ${m}$`, 'Reject the negative root: m counts terms.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const r = 1 + v.pct / 100;
      const y = Math.floor(Math.log(v.target / v.start) / Math.log(r)) + 2;
      return [
        [step('M1', `$${v.start} \\times ${r.toFixed(2)}^{${v.years - 1}}$`, 'The first year is the first term, so Year n has power n − 1.'), step('A1', money(Math.round(v.start * r ** (v.years - 1)) * 100), 'To the nearest pound.')],
        [
          step('M1', `$${v.start} \\times ${r.toFixed(2)}^{n - 1} > ${v.target}$`, 'Set up the inequality.'),
          step('M1', `$n - 1 > \\frac{\\log(${v.target} \\div ${v.start})}{\\log ${r.toFixed(2)}}$`, 'Take logs: log of a power brings the power down.'),
          step('A1', `Year ${y}`, 'Round up to the next whole year.'),
        ],
        [step('M1', `$\\frac{${v.start}(${r.toFixed(2)}^{${v.years}} - 1)}{${r.toFixed(2)} - 1}$`, 'Sum of a geometric series.'), step('A1', `£${sf3((v.start * (r ** v.years - 1)) / (r - 1))}`, 'To 3 significant figures, as asked.')],
      ];
    }
    const [a, b, c] = v.co;
    const r = v.t[1].div(v.t[0]);
    return [
      [
        step('M1', `$\\frac{${expr(b)}}{${expr(a)}} = \\frac{${expr(c)}}{${expr(b)}}$`, 'The ratio of neighbouring terms is constant.'),
        step('M1', `$(${expr(b)})^2 = (${expr(a)})(${expr(c)})$`, 'Cross-multiply, then expand.'),
        step('A1', `$k = ${v.k}$`, 'Solve the equation. k is a positive integer, so reject any other root.'),
      ],
      [
        step('M1', `Terms: $${v.t[0]}$, $${v.t[1]}$, $${v.t[2]}$, so $r = ${fracTex(r)}$`, 'Substitute k, then divide two terms.'),
        step('M1', `$\\frac{${v.t[0]}}{1 - (${fracTex(r)})}$`, 'The series converges because |r| < 1.'),
        step('A1', `$${fracTex(v.t[0].div(Q.of(1).sub(r)))}$`, 'Work it out exactly.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // Add the terms up one at a time until the total reaches S.
      let total = 0;
      for (let i = 0; i < 400; i++) {
        total += v.a + i * v.d;
        if (total === v.S) return answers[2].text === `$m = ${i + 1}$` ? [] : ['m'];
      }
      return ['S never reached'];
    }
    if (v.level === 'core') {
      let p = v.start;
      let y = 1;
      while (p <= v.target) {
        p *= 1 + v.pct / 100;
        y++;
      }
      return answers[1].text === `Year ${y}` ? [] : ['year'];
    }
    // Partial sums approach the sum to infinity.
    const r = v.t[1].toNumber() / v.t[0].toNumber();
    let s = 0;
    let term = v.t[0].toNumber();
    for (let i = 0; i < 400; i++) {
      s += term;
      term *= r;
    }
    return Math.abs(s - v.t[0].div(Q.of(1).sub(v.t[1].div(v.t[0]))).toNumber()) < 1e-6 ? [] : ['limit'];
  },

  key: (v) => `${v.a}|${v.d}|${v.n}|${v.S}|${v.start}|${v.pct}|${v.years}|${v.target}|${v.k}|${v.co}`,
});
