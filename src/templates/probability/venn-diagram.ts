import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, MINUS } from '../../engine/blocks';
import { ensure, frac } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 22 1F Q18 (50 students, French and Spanish: complete the
 * Venn diagram, then a probability), Set 23 1H Q6 (ξ = {1, …, 15}, A =
 * multiples of 3, B = factors of 12) and Set 24 2H Q17 (the number who drink
 * only tea is 3 times the number who drink both: a conditional probability).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: 'KS3' | 'F' | 'H';
  ctx: number;
  // foundational / stretch: region counts
  aOnly: number;
  both: number;
  bOnly: number;
  neither: number;
  ask: 'aOnly' | 'neither' | 'one';
  k: number; // stretch: A only = k × both
  // core: number sets
  N: number;
  a: number; // A = multiples of a
  setB: number; // index into NUMBER_SETS
}

const SURVEYS = [
  { who: 'students', asked: 'whether they have a dog or a cat', A: 'D', B: 'C', a: 'have a dog', b: 'have a cat', ab: 'have a dog and a cat', aNotB: 'have a dog but not a cat', none: 'have neither a dog nor a cat', a1: 'has a dog', aOnly1: 'has a dog but not a cat', none1: 'has neither a dog nor a cat', one1: 'has a dog or a cat but not both' },
  { who: 'students', asked: 'whether they study French or Spanish', A: 'F', B: 'S', a: 'study French', b: 'study Spanish', ab: 'study French and Spanish', aNotB: 'study French but not Spanish', none: 'study neither French nor Spanish', a1: 'studies French', aOnly1: 'studies French but not Spanish', none1: 'studies neither French nor Spanish', one1: 'studies French or Spanish but not both' },
  { who: 'people', asked: 'whether they drink tea or coffee', A: 'T', B: 'C', a: 'drink tea', b: 'drink coffee', ab: 'drink tea and coffee', aNotB: 'drink tea but not coffee', none: 'drink neither tea nor coffee', a1: 'drinks tea', aOnly1: 'drinks tea but not coffee', none1: 'drinks neither tea nor coffee', one1: 'drinks tea or coffee but not both' },
  { who: 'club members', asked: 'whether they play football or tennis', A: 'F', B: 'T', a: 'play football', b: 'play tennis', ab: 'play football and tennis', aNotB: 'play football but not tennis', none: 'play neither football nor tennis', a1: 'plays football', aOnly1: 'plays football but not tennis', none1: 'plays neither football nor tennis', one1: 'plays football or tennis but not both' },
] as const;

const NUMBER_SETS: { name: (N: number) => string; has: (x: number) => boolean }[] = [
  { name: () => 'odd numbers', has: (x) => x % 2 === 1 },
  { name: () => 'factors of 24', has: (x) => 24 % x === 0 },
  { name: () => 'factors of 36', has: (x) => 36 % x === 0 },
  { name: () => 'prime numbers', has: (x) => x > 1 && Array.from({ length: x - 2 }, (_, i) => i + 2).every((d) => x % d !== 0) },
  { name: () => 'square numbers', has: (x) => Number.isInteger(Math.sqrt(x)) },
];

const sets = (v: V) => {
  const all = Array.from({ length: v.N }, (_, i) => i + 1);
  const inA = (x: number) => x % v.a === 0;
  const inB = NUMBER_SETS[v.setB].has;
  return { aOnly: all.filter((x) => inA(x) && !inB(x)), both: all.filter((x) => inA(x) && inB(x)), bOnly: all.filter((x) => !inA(x) && inB(x)), neither: all.filter((x) => !inA(x) && !inB(x)) };
};
const list = (xs: number[]) => xs.join(', ');
const total = (v: V) => v.aOnly + v.both + v.bOnly + v.neither;

export default defineTemplate<V>({
  id: 'prob-venn-diagram',
  title: 'Venn diagrams and probability',
  strand: 'Probability',
  subtopic: 'Tree diagrams & Venn diagrams',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, ctx: rng.int(0, SURVEYS.length - 1), aOnly: 0, both: 0, bOnly: 0, neither: 0, ask: 'aOnly', k: 0, N: 0, a: 0, setB: 0 };
    if (level === 'core') {
      const N = rng.pick([12, 15, 16, 18, 20]);
      const a = rng.pick([2, 3, 4, 5]);
      const setB = rng.int(0, NUMBER_SETS.length - 1);
      const v = { ...base, N, a, setB };
      const s = sets(v);
      ensure(Object.values(s).every((r) => r.length >= 1), 'every region has a number');
      ensure(s.neither.length <= 9 && s.bOnly.length <= 9, 'regions small enough to write in');
      return v;
    }
    const both = rng.int(3, 14);
    if (level === 'foundational') {
      const aOnly = rng.int(4, 25);
      const bOnly = rng.int(4, 25);
      const neither = rng.int(2, 12);
      ensure(new Set([aOnly, both, bOnly, neither]).size === 4, 'all regions different');
      return { ...base, aOnly, both, bOnly, neither, ask: rng.pick(['aOnly', 'neither', 'one'] as const) };
    }
    const k = rng.int(2, 4);
    const bOnly = rng.int(4, 30);
    const neither = rng.int(3, 15);
    return { ...base, both, aOnly: k * both, bOnly, neither, k };
  },

  validate(v) {
    if (v.level === 'core') return [];
    return [v.aOnly, v.both, v.bOnly, v.neither].every((x) => x > 0) ? [] : ['empty region'];
  },

  render(v) {
    if (v.level === 'core') {
      const blank = diagram({ type: 'venn', sets: ['A', 'B'], regions: { a: '', both: '', b: '', neither: '' } });
      return {
        stem: [text(`ξ = {${Array.from({ length: v.N }, (_, i) => i + 1).join(', ')}}`), text(`A = {multiples of ${v.a}}`), text(`B = {${NUMBER_SETS[v.setB].name(v.N)}}`)],
        parts: [part('a', 4, text('Complete the Venn diagram for this information.'), blank), part('b', 2, text('A number is chosen at random from ξ.'), text(v.tier === 'KS3' ? 'Find the probability that the number is in A or B or both.' : 'Find the probability that the number is in $A \\cup B$'))],
      };
    }
    const c = SURVEYS[v.ctx];
    const n = total(v);
    const blank = diagram({ type: 'venn', sets: [c.A, c.B], regions: { a: '', both: '', b: '', neither: '' } });
    if (v.level === 'foundational') {
      const asks = { aOnly: c.aOnly1, neither: c.none1, one: c.one1 };
      return {
        stem: [text(`${n} ${c.who} were asked ${c.asked}.`), text(`${v.aOnly + v.both} ${c.a}.`), text(`${v.bOnly + v.both} ${c.b}.`), text(`${v.both} ${c.ab}.`)],
        parts: [part('a', 3, text('Complete the Venn diagram for this information.'), blank), part('b', 2, text(`One of the ${c.who} is chosen at random.`), text(`Find the probability that this person ${asks[v.ask]}.`))],
      };
    }
    return {
      stem: [
        text(`${n} ${c.who} were asked ${c.asked}.`),
        text(`The number who ${c.aNotB} is ${v.k} times the number who ${c.ab}.`),
        text(`${v.bOnly + v.both} ${c.b}.`),
        text(`${v.neither} ${c.none}.`),
        blank,
      ],
      parts: [
        v.tier === 'H'
          ? single(4, text(`One of the ${c.who} who ${c.b} is chosen at random.`), text(`Work out the probability that this person also ${c.a1}.`))
          : single(4, text(`One of the ${c.who} is chosen at random.`), text(`Work out the probability that this person ${c.one1}.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'core') {
      const s = sets(v);
      return [{ text: `A only: ${list(s.aOnly)}; A and B: ${list(s.both)}; B only: ${list(s.bOnly)}; outside: ${list(s.neither)}` }, { text: frac(Q.of(v.N - s.neither.length, v.N)) }];
    }
    const c = SURVEYS[v.ctx];
    const n = total(v);
    if (v.level === 'foundational') {
      const want = v.ask === 'aOnly' ? v.aOnly : v.ask === 'neither' ? v.neither : v.aOnly + v.bOnly;
      return [{ text: `${c.A} only ${v.aOnly}, both ${v.both}, ${c.B} only ${v.bOnly}, neither ${v.neither}` }, { text: frac(Q.of(want, n)) }];
    }
    return [{ text: v.tier === 'H' ? frac(Q.of(v.both, v.both + v.bOnly)) : frac(Q.of(v.aOnly + v.bOnly, n)) }];
  },

  markScheme(v) {
    if (v.level === 'core') {
      const s = sets(v);
      const inU = v.N - s.neither.length;
      return [
        [
          step('B1', `Middle (in A and B): ${list(s.both)}`, 'Start with the numbers that are in BOTH sets.'),
          step('B1', `A only: ${list(s.aOnly)}`, `The rest of the multiples of ${v.a}.`),
          step('B1', `B only: ${list(s.bOnly)}`, `The rest of the ${NUMBER_SETS[v.setB].name(v.N)}.`),
          step('B1', `Outside both circles: ${list(s.neither)}`, `Every number from 1 to ${v.N} goes somewhere, exactly once.`),
        ],
        [step('M1', `${s.aOnly.length} + ${s.both.length} + ${s.bOnly.length} = ${inU} numbers in $A \\cup B$`, '$A \\cup B$ means in A or B or both: everything inside the circles.'), step('A1', frac(Q.of(inU, v.N)), `Out of the ${v.N} numbers in ξ.`)],
      ];
    }
    const c = SURVEYS[v.ctx];
    const n = total(v);
    if (v.level === 'foundational') {
      const want = v.ask === 'aOnly' ? v.aOnly : v.ask === 'neither' ? v.neither : v.aOnly + v.bOnly;
      return [
        [
          step('B1', `Both: ${v.both}`, 'Put the number in both groups in the middle first.'),
          step('B1', `${c.A} only: ${v.aOnly + v.both} ${MINUS} ${v.both} = ${v.aOnly},  ${c.B} only: ${v.bOnly + v.both} ${MINUS} ${v.both} = ${v.bOnly}`, 'Take the middle away from each total.'),
          step('B1', `Neither: ${n} ${MINUS} ${v.aOnly} ${MINUS} ${v.both} ${MINUS} ${v.bOnly} = ${v.neither}`, `All four numbers must add up to ${n}.`),
        ],
        [step('M1', `${v.ask === 'one' ? `${v.aOnly} + ${v.bOnly} = ${want}` : want} out of ${n}`, v.ask === 'one' ? 'Exactly one: the two outer parts of the circles, not the middle.' : 'Find the right region on your diagram.'), step('A1', frac(Q.of(want, n)), 'Probability = number in the region ÷ total.')],
      ];
    }
    const B = v.bOnly + v.both;
    return [
      [
        step('P1', `Let $x$ = number in both: ${c.A} only $= ${v.k}x$, ${c.B} only $= ${B} - x$`, 'Put x in the middle and write the other regions in terms of x.'),
        step('P1', `$${v.k}x + x + (${B} - x) + ${v.neither} = ${n}$, so $${v.k}x = ${n - B - v.neither}$`, `All four regions add up to ${n}.`),
        step('P1', `$x = ${v.both}$: ${c.A} only ${v.aOnly}, both ${v.both}, ${c.B} only ${v.bOnly}, neither ${v.neither}`, 'Fill in the Venn diagram with numbers.'),
        v.tier === 'H'
          ? step('A1', `${v.both} out of the ${B} who ${c.b}: ${frac(Q.of(v.both, B))}`, `“Given that” they ${c.b}: only look inside the ${c.B} circle.`)
          : step('A1', `(${v.aOnly} + ${v.bOnly}) out of ${n}: ${frac(Q.of(v.aOnly + v.bOnly, n))}`, 'Exactly one: the two outer parts of the circles.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'core') {
      // Count A ∪ B directly from the definitions.
      let inU = 0;
      for (let x = 1; x <= v.N; x++) if (x % v.a === 0 || NUMBER_SETS[v.setB].has(x)) inU++;
      if (answers[1].text !== frac(Q.of(inU, v.N))) p.push('A ∪ B');
      const listed = answers[0].text.match(/\d+/g)!.map(Number).filter((x) => x <= v.N);
      if (listed.length !== v.N || new Set(listed).size !== v.N) p.push('every number exactly once');
      return p;
    }
    const n = total(v);
    if (v.level === 'stretch') {
      // Solve for x by search, from the facts in the question only.
      const B = v.bOnly + v.both;
      const xs = Array.from({ length: n }, (_, i) => i + 1).filter((x) => v.k * x + x + (B - x) + v.neither === n);
      if (xs.length !== 1 || xs[0] !== v.both) p.push('x');
      const want = v.tier === 'H' ? Q.of(xs[0], B) : Q.of(v.k * xs[0] + B - xs[0], n);
      if (answers[0].text !== frac(want)) p.push('probability');
      return p;
    }
    const want = v.ask === 'aOnly' ? v.aOnly : v.ask === 'neither' ? n - (v.aOnly + v.both) - v.bOnly : n - v.both - v.neither;
    if (answers[1].text !== frac(Q.of(want, n))) p.push('probability');
    return p;
  },

  key: (v) => `${v.tier === 'H' ? 'H' : ''}|${v.aOnly}|${v.both}|${v.bOnly}|${v.neither}|${v.ask}|${v.N}|${v.a}|${v.setB}`,
});

