import { defineTemplate } from '../../engine/types';
import { lines, part, step, table, text } from '../../engine/blocks';
import { dec, ensure, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/31 conditional probability (June 2025 Q1 uses a tree and
 * P(W | X)): a two-way table, a two-stage tree worked backwards, and a Venn-style
 * set of statements including P(A′ | B′).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  t: number[];
  p: Q;
  q1: Q;
  q2: Q;
  pa: Q;
  pb: Q;
  given: Q;
}

const TABLE = [
  { row: ['Year 12', 'Year 13'], col: ['Walks', 'Drives'], who: 'student', rowWord: 'is in Year 12', colWord: 'walks' },
  { row: ['Adult', 'Child'], col: ['Swims', 'Does not swim'], who: 'club member', rowWord: 'is an adult', colWord: 'swims' },
];
const TREE = [
  { first: 'it rains', firstNot: 'it does not rain', second: 'a train is late' },
  { first: 'a machine is new', firstNot: 'a machine is old', second: 'it breaks down' },
];

export default defineTemplate<V>({
  id: 'y13-conditional-probability',
  title: 'Conditional probability',
  strand: 'Statistics',
  subtopic: 'Probability',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, ctx: rng.int(0, 1), t: [], p: Q.of(0), q1: Q.of(0), q2: Q.of(0), pa: Q.of(0), pb: Q.of(0), given: Q.of(0) };
    if (level === 'foundational') {
      const t = [rng.int(8, 60), rng.int(8, 60), rng.int(8, 60), rng.int(8, 60)];
      ensure(t[0] * t[3] !== t[1] * t[2], 'not independent, so that part (c) has a clear answer');
      return { ...base, t };
    }
    if (level === 'core') {
      return { ...base, p: Q.of(rng.int(1, 8), 10), q1: Q.of(rng.int(1, 9), 10), q2: Q.of(rng.int(1, 9), 10) };
    }
    const pa = Q.of(rng.int(2, 7), 10);
    const pb = Q.of(rng.int(2, 7), 10);
    const given = Q.of(rng.int(1, 9), 10);
    // P(A ∩ B) must fit inside both events.
    const both = given.mul(pb);
    ensure(both.lt(pa) && pa.add(pb).sub(both).lt(1) && !given.eq(pa), 'possible probabilities, and the events are not independent');
    return { ...base, pa, pb, given };
  },

  validate(v) {
    return v.level === 'core' && v.q1.eq(v.q2) ? ['the two branches must differ'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const T = TABLE[v.ctx];
      return {
        stem: [...lines(`The table shows information about the members of a group.`), table({ header: ['', ...T.col], rows: [[T.row[0], String(v.t[0]), String(v.t[1])], [T.row[1], String(v.t[2]), String(v.t[3])]], rowHeaders: true }), ...lines(`A ${T.who} is chosen at random.`, `$A$ is the event that the ${T.who} ${T.rowWord}. $B$ is the event that the ${T.who} ${T.colWord}.`)],
        parts: [
          part('a', 1, text('Find  $\\mathrm{P}(A)$')),
          part('b', 2, text('Find  $\\mathrm{P}(A \\mid B)$')),
          part('c', 2, text('Determine whether $A$ and $B$ are independent, giving a reason.')),
        ],
      };
    }
    if (v.level === 'core') {
      const T = TREE[v.ctx];
      return {
        stem: lines(`The probability that ${T.first} is ${dec(v.p)}`, `If ${T.first}, the probability that ${T.second} is ${dec(v.q1)}`, `If ${T.firstNot}, the probability that ${T.second} is ${dec(v.q2)}`),
        parts: [
          part('a', 3, text(`Find the probability that ${T.second}.`)),
          part('b', 3, text(`Given that ${T.second}, find the probability that ${T.first}, giving your answer as a fraction in its simplest form.`)),
        ],
      };
    }
    return {
      stem: lines(`$\\mathrm{P}(A) = ${dec(v.pa)}$,   $\\mathrm{P}(B) = ${dec(v.pb)}$,   $\\mathrm{P}(A \\mid B) = ${dec(v.given)}$`),
      parts: [
        part('a', 2, text('Find  $\\mathrm{P}(A \\cap B)$')),
        part('b', 2, text('Find  $\\mathrm{P}(A \\cup B)$')),
        part('c', 3, text("Find  $\\mathrm{P}(A' \\mid B')$,  giving your answer as a fraction in its simplest form.")),
        part('d', 1, text('State, with a reason, whether $A$ and $B$ are independent.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.t;
      const N = a + b + c + d;
      const [pa, pAgivenB] = [Q.of(a + b, N), Q.of(a, a + c)];
      return [{ text: `$${fracTex(pa)}$` }, { text: `$${fracTex(pAgivenB)}$` }, { text: `Not independent: $\\mathrm{P}(A \\mid B) \\neq \\mathrm{P}(A)$` }];
    }
    if (v.level === 'core') {
      const pB = v.p.mul(v.q1).add(Q.of(1).sub(v.p).mul(v.q2));
      return [{ text: dec(pB) }, { text: `$${fracTex(v.p.mul(v.q1).div(pB))}$` }];
    }
    const both = v.given.mul(v.pb);
    const either = v.pa.add(v.pb).sub(both);
    return [{ text: dec(both) }, { text: dec(either) }, { text: `$${fracTex(Q.of(1).sub(either).div(Q.of(1).sub(v.pb)))}$` }, { text: `Not independent: $\\mathrm{P}(A \\mid B) \\neq \\mathrm{P}(A)$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.t;
      const N = a + b + c + d;
      const [pa, pAgivenB] = [Q.of(a + b, N), Q.of(a, a + c)];
      return [
        [step('B1', `$\\frac{${a + b}}{${N}} = ${fracTex(pa)}$`, 'The row total over the grand total.')],
        [step('M1', `Only the $${a + c}$ in the column for $B$ count`, 'The given condition shrinks the group you are choosing from.'), step('A1', `$\\frac{${a}}{${a + c}} = ${fracTex(pAgivenB)}$`, 'Part of that column.')],
        [step('M1', `Compare $${fracTex(pAgivenB)}$ with $${fracTex(pa)}$`, 'Independent events have P(A | B) = P(A).'), step('A1', 'They are different, so $A$ and $B$ are not independent.', 'State the reason.')],
      ];
    }
    if (v.level === 'core') {
      const pB = v.p.mul(v.q1).add(Q.of(1).sub(v.p).mul(v.q2));
      const both = v.p.mul(v.q1);
      return [
        [
          step('M1', `$${dec(v.p)} \\times ${dec(v.q1)}$`, 'Multiply along the first branch.'),
          step('M1', `$${dec(Q.of(1).sub(v.p))} \\times ${dec(v.q2)}$`, 'The second branch: there are two ways it can happen.'),
          step('A1', dec(pB), 'Add them.'),
        ],
        [
          step('M1', '$\\mathrm{P}(A \\mid B) = \\frac{\\mathrm{P}(A \\cap B)}{\\mathrm{P}(B)}$', 'The formula is in the booklet.'),
          step('M1', `$\\frac{${dec(both)}}{${dec(pB)}}$`, 'The top is the one branch; the bottom is part (a).'),
          step('A1', `$${fracTex(both.div(pB))}$`, 'Simplify.'),
        ],
      ];
    }
    const both = v.given.mul(v.pb);
    const either = v.pa.add(v.pb).sub(both);
    return [
      [step('M1', `$\\mathrm{P}(A \\cap B) = ${dec(v.given)} \\times ${dec(v.pb)}$`, 'Rearrange the conditional probability formula.'), step('A1', dec(both), 'Work it out.')],
      [step('M1', `$${dec(v.pa)} + ${dec(v.pb)} - ${dec(both)}$`, 'The addition rule.'), step('A1', dec(either), 'Work it out.')],
      [
        step('M1', `$\\mathrm{P}(A' \\cap B') = 1 - ${dec(either)} = ${dec(Q.of(1).sub(either))}$`, 'Neither A nor B is everything outside the union.'),
        step('M1', `$\\mathrm{P}(B') = ${dec(Q.of(1).sub(v.pb))}$`, 'The bottom of the fraction.'),
        step('A1', `$${fracTex(Q.of(1).sub(either).div(Q.of(1).sub(v.pb)))}$`, 'Divide and simplify.'),
      ],
      [step('B1', `$\\mathrm{P}(A \\mid B) = ${dec(v.given)} \\neq ${dec(v.pa)} = \\mathrm{P}(A)$`, 'Give the two values as your reason.')],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.t;
      const N = a + b + c + d;
      return !Q.of(a, N).eq(Q.of(a + b, N).mul(Q.of(a + c, N))) ? [] : ['independence'];
    }
    if (v.level === 'core') {
      // Bayes on a population of 10 000, counted exactly.
      const N = 10000;
      const a = v.p.mul(N).toInt();
      const hitsA = v.q1.mul(a).toInt();
      const hitsB = v.q2.mul(N - a).toInt();
      const pB = v.p.mul(v.q1).add(Q.of(1).sub(v.p).mul(v.q2));
      return Q.of(hitsA, hitsA + hitsB).eq(v.p.mul(v.q1).div(pB)) ? [] : ['Bayes'];
    }
    const both = v.given.mul(v.pb);
    const region = [v.pa.sub(both), both, v.pb.sub(both), Q.of(1).sub(v.pa).sub(v.pb).add(both)];
    return region.every((r) => !r.lt(0)) ? [] : ['regions'];
  },

  key: (v) => `${v.t}|${v.p}|${v.q1}|${v.q2}|${v.pa}|${v.pb}|${v.given}`,
});
