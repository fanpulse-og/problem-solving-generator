import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, int } from '../../engine/format';
import { terms } from '../../engine/pure';

/**
 * Modelled on 9MA0 sequences: terms from a recurrence relation with an unknown found
 * from a later term, a periodic sequence and a long sum, and sigma notation for an
 * arithmetic series that does not start at r = 1.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  u1: number;
  N: number;
  m: number;
  k: number;
}

export default defineTemplate<V>({
  id: 'y13-recurrence',
  title: 'Recurrence relations and sigma notation',
  strand: 'Pure',
  subtopic: 'Sequences & series',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, u1: 0, N: 0, m: 0, k: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 5);
      const b = rng.int(1, 9) * rng.pick([1, -1]);
      const u1 = rng.int(1, 6);
      ensure((a - 1) * u1 + b !== 0, 'not a constant sequence');
      return { ...base, a, b, u1 };
    }
    if (level === 'core') {
      const u1 = rng.int(2, 9);
      const k = u1 * rng.int(2, 9);
      ensure(k !== u1 * u1, 'not a constant sequence');
      return { ...base, u1, k, N: rng.pick([25, 41, 49, 75, 99, 101, 150, 200]) };
    }
    const a = rng.int(2, 9);
    const b = rng.int(-9, 15);
    const m = rng.int(3, 10);
    const N = m + rng.int(5, 40);
    ensure(b !== 0, 'all terms appear');
    return { ...base, a, b, m, N };
  },

  validate(v) {
    return v.level === 'stretch' && v.N <= v.m ? ['N must be larger than m'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('A sequence is defined by', `$u_{n+1} = ${v.a}u_n ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}$,   $u_1 = ${v.u1}$`),
        parts: [
          part('a', 2, text('Find the values of $u_2$, $u_3$ and $u_4$')),
          part('b', 2, text('Find the value of  $\\sum_{r=1}^{4} u_r$')),
          part('c', 1, text('State whether the sequence is increasing, decreasing or periodic.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines('A sequence is defined by', `$u_{n+1} = \\frac{${v.k}}{u_n}$,   $u_1 = ${v.u1}$`),
        parts: [
          part('a', 2, text('Find the value of $u_2$ and the value of $u_3$')),
          part('b', 1, text('State the order of this periodic sequence.')),
          part('c', 3, text(`Find the value of  $\\sum_{r=1}^{${v.N}} u_r$`)),
        ],
      };
    }
    const f = terms([[v.a, 1], [v.b, 0]], 'r');
    return {
      stem: [],
      parts: [
        part('a', 3, text(`Find the value of  $\\sum_{r=1}^{${v.N}} (${f})$`)),
        part('b', 3, text(`Hence find the value of  $\\sum_{r=${v.m}}^{${v.N}} (${f})$`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const u = [v.u1];
      for (let i = 0; i < 3; i++) u.push(v.a * u[i] + v.b);
      const trend = u[1] > u[0] ? 'Increasing' : u[1] < u[0] ? 'Decreasing' : 'Constant';
      return [{ text: `$${u[1]}$, $${u[2]}$, $${u[3]}$` }, { text: `$${u.reduce((s, x) => s + x, 0)}$` }, { text: trend }];
    }
    if (v.level === 'core') {
      const u2 = v.k / v.u1;
      const total = Math.floor(v.N / 2) * (v.u1 + u2) + (v.N % 2 ? v.u1 : 0);
      return [{ text: `$u_2 = ${u2}$, $u_3 = ${v.u1}$` }, { text: 'Order 2' }, { text: `$${int(total)}$`.replace(/ /g, '\\,') }];
    }
    const S = (n: number) => (v.a * n * (n + 1)) / 2 + v.b * n;
    return [{ text: `$${S(v.N)}$` }, { text: `$${S(v.N) - S(v.m - 1)}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const u = [v.u1];
      for (let i = 0; i < 3; i++) u.push(v.a * u[i] + v.b);
      const trend = u[1] > u[0] ? 'Increasing' : u[1] < u[0] ? 'Decreasing' : 'Constant';
      return [
        [step('M1', `$u_2 = ${v.a} \\times ${v.u1} ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)}$`, 'Each term comes from the one before.'), step('A1', `$${u[1]}$, $${u[2]}$, $${u[3]}$`, 'All three.')],
        [step('M1', `$${u.join(' + ').replace(/\+ -/g, '- ')}$`, 'The sum runs over the first four terms, including the first.'), step('A1', `$${u.reduce((s, x) => s + x, 0)}$`, 'Add them.')],
        [step('B1', trend, 'Compare neighbouring terms.')],
      ];
    }
    if (v.level === 'core') {
      const u2 = v.k / v.u1;
      const pairs = Math.floor(v.N / 2);
      const total = pairs * (v.u1 + u2) + (v.N % 2 ? v.u1 : 0);
      const last = v.N % 2 ? `+ ${v.u1}` : '';
      return [
        [step('M1', `$u_2 = \\frac{${v.k}}{${v.u1}}$`, 'Substitute the first term.'), step('A1', `$u_2 = ${u2}$, $u_3 = ${v.u1}$`, 'We are back at the first term.')],
        [step('B1', 'Order 2', 'The pattern repeats every 2 terms.')],
        [
          step('M1', `Each pair adds up to $${v.u1} + ${u2} = ${v.u1 + u2}$`, 'Group the terms in repeats.'),
          step('M1', `${pairs} pairs$${last ? ' \\text{ and one extra } ' + v.u1 : ''}$`, v.N % 2 ? 'An odd number of terms leaves one left over, which is the first value again.' : 'An even number of terms makes exact pairs.'),
          step('A1', `$${int(total)}$`.replace(/ /g, '\\,'), 'Multiply and add.'),
        ],
      ];
    }
    const S = (n: number) => (v.a * n * (n + 1)) / 2 + v.b * n;
    const f = terms([[v.a, 1], [v.b, 0]], 'r');
    return [
      [
        step('M1', `First term $${v.a + v.b}$, common difference $${v.a}$`, 'Substitute r = 1 and r = 2.'),
        step('M1', `$\\frac{${v.N}}{2}(2 \\times ${v.a + v.b < 0 ? `(${v.a + v.b})` : v.a + v.b} + ${v.N - 1} \\times ${v.a})$`, 'It is an arithmetic series.'),
        step('A1', `$${S(v.N)}$`, 'Work it out.'),
      ],
      [
        step('M1', `$\\sum_{r=1}^{${v.N}} (${f}) - \\sum_{r=1}^{${v.m - 1}} (${f})$`, `The sum starts at r = ${v.m}, so take away everything up to r = ${v.m - 1}, not ${v.m}.`),
        step('M1', `$\\sum_{r=1}^{${v.m - 1}} (${f}) = ${S(v.m - 1)}$`, 'The same formula.'),
        step('A1', `$${S(v.N) - S(v.m - 1)}$`, 'Subtract.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') return answers.length === 3 ? [] : ['parts'];
    if (v.level === 'core') {
      let [u, total] = [v.u1, 0];
      for (let i = 0; i < v.N; i++) {
        total += u;
        u = v.k / u;
      }
      return answers[2].text.replace(/[$\\, ]/g, '') === String(total) ? [] : [`sum ${total}`];
    }
    let total = 0;
    for (let r = v.m; r <= v.N; r++) total += v.a * r + v.b;
    return answers[1].text === `$${total}$` ? [] : ['sigma'];
  },

  key: (v) => `${v.a}|${v.b}|${v.u1}|${v.N}|${v.m}|${v.k}`,
});
