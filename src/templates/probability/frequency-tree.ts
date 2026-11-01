import { defineTemplate, type Tier } from '../../engine/types';
import { diagram, part, step, text, MINUS } from '../../engine/blocks';
import { ensure, frac } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on June 2022 1F Q17 (72 people did a test; 20 of the 32 adults
 * passed; 6 of the children failed: complete the frequency tree, then the
 * probability of an adult who failed). The examiner report notes that some
 * students used 32 (the adults) instead of 72 (everyone) as the denominator;
 * the notes stress which total to use.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier?: Tier;
  ctx: number;
  a: number; // group 1 size
  b: number; // group 2 size
  a1: number; // group 1 with outcome 1
  b1: number; // group 2 with outcome 1
  fa: Q; // core: fraction of everyone in group 1
  pa: number; // core: % of group 1 with outcome 1
  k: number; // stretch: group-2 outcome-1 = k × group-1 outcome-2
}

const CONTEXTS = [
  { intro: '{n} people did a test.', g: ['adult', 'child'], gs: ['adults', 'children'], o: ['passed', 'failed'], who: 'person' },
  { intro: '{n} students in Year 10 and Year 11 were asked if they have a part-time job.', g: ['Year 10', 'Year 11'], gs: ['Year 10 students', 'Year 11 students'], o: ['job', 'no job'], who: 'student' },
  { intro: '{n} cars had an MOT test.', g: ['petrol', 'diesel'], gs: ['petrol cars', 'diesel cars'], o: ['passed', 'failed'], who: 'car' },
];

const nodeText = (v: V) => {
  const c = CONTEXTS[v.ctx];
  return `${c.g[0]} ${v.a} (${c.o[0]} ${v.a1}, ${c.o[1]} ${v.a - v.a1}); ${c.g[1]} ${v.b} (${c.o[0]} ${v.b1}, ${c.o[1]} ${v.b - v.b1})`;
};
const outcomeVerb = (c: (typeof CONTEXTS)[number], i: number, plural: boolean) =>
  c.o[0] === 'job' ? (i === 0 ? (plural ? 'have a part-time job' : 'has a part-time job') : plural ? 'do not have a part-time job' : 'does not have a part-time job') : c.o[i];

/** "an adult", "a Year 10 student", "a diesel car" */
const noun = (c: (typeof CONTEXTS)[number], i: number) => {
  const n = c.who === 'person' ? c.g[i] : `${c.g[i]} ${c.who}`;
  return `${/^[aeiou]/i.test(n) ? 'an' : 'a'} ${n}`;
};
const rel = (c: (typeof CONTEXTS)[number]) => (c.who === 'car' ? 'that' : 'who');

/** Conditional probability (out of one part of the tree) is Higher only (P9). */
const conditional = (v: V) => v.level === 'stretch' && v.tier === 'H';

export default defineTemplate<V>({
  id: 'prob-frequency-tree',
  title: 'Frequency trees',
  strand: 'Probability',
  subtopic: 'Probability tables',
  tiers: ['F', 'H'],
  // Frequency trees are GCSE content, not KS3; old KS3 links still open.
  formerTiers: ['KS3'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const ctx = rng.int(0, CONTEXTS.length - 1);
    const base: V = { level, tier, ctx, a: 0, b: 0, a1: 0, b1: 0, fa: Q.of(0), pa: 0, k: 0 };
    if (level === 'core') {
      const fa = rng.pick([Q.of(1, 4), Q.of(3, 8), Q.of(2, 5), Q.of(3, 5), Q.of(1, 3), Q.of(5, 8)]);
      const pa = rng.pick([20, 25, 40, 60, 75, 80]);
      const N = rng.step(40, 200, 4);
      const a = fa.mul(N);
      ensure(a.isInt() && Q.of(a.toInt() * pa, 100).isInt(), 'whole numbers');
      const b = N - a.toInt();
      const b1 = rng.int(Math.ceil(b * 0.3), Math.floor(b * 0.9));
      return { ...base, ctx, a: a.toInt(), b, a1: (a.toInt() * pa) / 100, b1, fa, pa };
    }
    const a = rng.int(12, 60);
    const b = rng.int(12, 60);
    const a1 = rng.int(Math.ceil(a * 0.3), Math.floor(a * 0.9));
    const b1 = rng.int(Math.ceil(b * 0.3), Math.floor(b * 0.9));
    ensure(a !== b && a1 !== b1, 'different groups');
    if (level === 'stretch') {
      // Group-2 outcome-1 is k times group-1 outcome-2.
      const k = rng.int(2, 4);
      const sb1 = k * (a - a1);
      return { ...base, ctx, a, a1, k, b1: sb1, b: sb1 + rng.int(3, 25) };
    }
    return { ...base, ctx, a, b, a1, b1 };
  },

  validate(v) {
    return v.a1 < v.a && v.b1 < v.b && v.a1 > 0 && v.b1 > 0 ? [] : ['every branch must have someone'];
  },

  render(v) {
    const c = CONTEXTS[v.ctx];
    const N = v.a + v.b;
    const blank = '……';
    const tree = diagram({
      type: 'tree',
      frequencies: true,
      root: `${N}`,
      first: [
        { label: `${c.g[0]} ${blank}`, p: '' },
        { label: `${c.g[1]} ${blank}`, p: '' },
      ],
      second: [
        [
          { label: `${c.o[0]} ${blank}`, p: '' },
          { label: `${c.o[1]} ${blank}`, p: '' },
        ],
        [
          { label: `${c.o[0]} ${blank}`, p: '' },
          { label: `${c.o[1]} ${blank}`, p: '' },
        ],
      ],
    });
    const intro = text(c.intro.replace('{n}', String(N)));
    if (v.level === 'foundational') {
      return {
        stem: [intro, text(`${v.a1} of the ${v.a} ${c.gs[0]} ${outcomeVerb(c, 0, true)}.`), text(`${v.b - v.b1} of the ${c.gs[1]} ${outcomeVerb(c, 1, true)}.`)],
        parts: [
          part('a', 3, text('Use this information to complete the frequency tree.'), tree),
          part('b', 2, text(`One of the ${N} is picked at random.`), text(`Find the probability that this ${c.who} is ${noun(c, 0)} ${rel(c)} ${outcomeVerb(c, 1, false)}.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [intro, text(`${frac(v.fa)} of them are ${c.gs[0]}.`), text(`${v.pa}% of the ${c.gs[0]} ${outcomeVerb(c, 0, true)}.`), text(`${v.b1} of the ${c.gs[1]} ${outcomeVerb(c, 0, true)}.`)],
        parts: [part('a', 3, text('Use this information to complete the frequency tree.'), tree), part('b', 2, text(`One of the ${N} is picked at random.`), text(`Find the probability that this ${c.who} ${outcomeVerb(c, 0, false)}.`))],
      };
    }
    return {
      stem: [
        intro,
        text(`There are ${v.a} ${c.gs[0]}.`),
        text(`The number of ${c.gs[1]} ${rel(c)} ${outcomeVerb(c, 0, true)} is ${v.k} times the number of ${c.gs[0]} ${rel(c)} ${outcomeVerb(c, 1, true)}.`),
        text(`Altogether, ${v.a1 + v.b1} ${outcomeVerb(c, 0, true)}.`),
      ],
      parts: [
        part('a', 3, text('Complete the frequency tree.'), tree),
        conditional(v)
          ? part('b', 2, text(`A ${c.who} ${rel(c)} ${outcomeVerb(c, 0, false)} is picked at random.`), text(`Find the probability that this ${c.who} is ${noun(c, 1)}.`))
          : part('b', 2, text(`One of the ${N} is picked at random.`), text(`Find the probability that this ${c.who} is ${noun(c, 1)} ${rel(c)} ${outcomeVerb(c, 0, false)}.`)),
      ],
    };
  },

  answer(v) {
    const N = v.a + v.b;
    if (v.level === 'foundational') return [{ text: nodeText(v) }, { text: frac(Q.of(v.a - v.a1, N)) }];
    if (v.level === 'core') return [{ text: nodeText(v) }, { text: frac(Q.of(v.a1 + v.b1, N)) }];
    return [{ text: nodeText(v) }, { text: frac(Q.of(v.b1, conditional(v) ? v.a1 + v.b1 : N)) }];
  },

  markScheme(v) {
    const c = CONTEXTS[v.ctx];
    const N = v.a + v.b;
    if (v.level === 'foundational') {
      return [
        [
          step('B1', `${c.gs[1]}: ${N} ${MINUS} ${v.a} = ${v.b}`, 'The two groups add up to the total.'),
          step('B1', `${c.gs[0]} ${c.o[1]}: ${v.a} ${MINUS} ${v.a1} = ${v.a - v.a1}`, 'Each pair of branches adds up to the number before them.'),
          step('B1', `${c.gs[1]} ${c.o[0]}: ${v.b} ${MINUS} ${v.b - v.b1} = ${v.b1}`, 'Fill in the last box the same way.'),
        ],
        [step('M1', `$\\frac{${v.a - v.a1}}{${N}}$`, `Out of EVERYONE (${N}), not just the ${v.a} ${c.gs[0]}.`), step('A1', frac(Q.of(v.a - v.a1, N)), 'Give a fraction (or an equivalent decimal or percentage), not a ratio.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('B1', `${c.gs[0]}: ${frac(v.fa)} × ${N} = ${v.a}; ${c.gs[1]}: ${v.b}`, 'Find the size of each group first.'),
          step('B1', `${v.pa}% of ${v.a} = ${v.a1}; ${v.a} ${MINUS} ${v.a1} = ${v.a - v.a1}`, `The percentage is of the ${c.gs[0]}, not of everyone.`),
          step('B1', `${v.b} ${MINUS} ${v.b1} = ${v.b - v.b1}`, 'The last box.'),
        ],
        [step('M1', `${v.a1} + ${v.b1} = ${v.a1 + v.b1} out of ${N}`, 'Add the two branches that match.'), step('A1', frac(Q.of(v.a1 + v.b1, N)), 'Probability = how many match ÷ total.')],
      ];
    }
    return [
      [
        step('B1', `${c.gs[1]}: ${N} ${MINUS} ${v.a} = ${v.b}`, 'The groups add up to the total.'),
        step('M1', `${c.gs[0]} ${c.o[1]} = x: ${v.a} ${MINUS} x + ${v.k}x = ${v.a1 + v.b1}, so x = ${v.a - v.a1}`, `Let x be the ${c.gs[0]} who ${outcomeVerb(c, 1, true)}; then ${v.k}x of the ${c.gs[1]} ${outcomeVerb(c, 0, true)}.`),
        step('A1', nodeText(v), 'Check every pair of branches adds up.'),
      ],
      conditional(v) ? [step('M1', `$\\frac{${v.b1}}{${v.a1 + v.b1}}$`, `Only look at the ${v.a1 + v.b1} who ${outcomeVerb(c, 0, true)}: that is the new total.`), step('A1', frac(Q.of(v.b1, v.a1 + v.b1)), 'Simplify if you can.')] : [step('M1', `$\\frac{${v.b1}}{${N}}$`, `Out of EVERYONE (${N}): one branch of the tree.`), step('A1', frac(Q.of(v.b1, N)), 'Simplify if you can.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Read the eight numbers back from the tree and test every given fact.
    const vals = answers[0].text.replace(/Year 1[01] /g, '').match(/\d+/g)!.map(Number);
    const [A, A1, A2, B, B1, B2] = vals;
    if (A1 + A2 !== A || B1 + B2 !== B) p.push('branches do not add up');
    const N = v.a + v.b;
    if (A + B !== N) p.push('groups do not add to the total');
    if (v.level === 'foundational' && (A1 !== v.a1 || A !== v.a || B2 !== v.b - v.b1)) p.push('given facts');
    if (v.level === 'core' && (!v.fa.mul(N).eq(A) || A1 * 100 !== A * v.pa || B1 !== v.b1)) p.push('given facts');
    if (v.level === 'stretch' && (A !== v.a || B1 !== v.k * A2 || A1 + B1 !== v.a1 + v.b1)) p.push('given facts');
    const want = v.level === 'foundational' ? Q.of(A2, N) : v.level === 'core' ? Q.of(A1 + B1, N) : conditional(v) ? Q.of(B1, A1 + B1) : Q.of(B1, N);
    if (answers[1].text !== frac(want)) p.push('probability');
    return p;
  },

  key: (v) => `${v.ctx}|${v.a}|${v.b}|${v.a1}|${v.b1}|${v.fa}|${v.pa}|${v.k}`,
});
