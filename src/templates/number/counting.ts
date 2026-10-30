import { defineTemplate } from '../../engine/types';
import { part, sentence, single, step, text, TIMES } from '../../engine/blocks';
import { ensure, int } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1F Q20 (starters, mains and desserts: how many different
 * meals?), Set 22 1H Q5 (4-digit codes: first digit not 0, last digit even)
 * and Set 24 1H Q8 (each team plays every other team twice: 90 matches, how
 * many teams?). check() counts by listing every possibility.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  counts: number[]; // foundational: s, m, d
  L: number; // core: code length
  rule: 'evenEnd' | 'oddEnd' | 'noRepeat' | 'allOdd' | 'zeroEnd';
  teams: number; // stretch
  twice: boolean;
}

const MENUS = [
  { intro: 'A café has a lunch menu.', a: 'starters', b: 'main courses', c: 'desserts', whole: 'three-course meals', ask: 'a main course and either a starter or a dessert, but not both' },
  { intro: '{name} is choosing an outfit.', a: 'hats', b: 'jackets', c: 'scarves', whole: 'outfits of a hat, a jacket and a scarf', ask: 'a jacket and either a hat or a scarf, but not both' },
];
const RULES = {
  evenEnd: { words: 'The first digit cannot be 0. The last digit must be even. Digits can be repeated.' },
  oddEnd: { words: 'The first digit cannot be 0. The last digit must be odd. Digits can be repeated.' },
  noRepeat: { words: 'The first digit cannot be 0. No digit can be used more than once.' },
  allOdd: { words: 'Every digit must be odd. No digit can be used more than once.' },
  zeroEnd: { words: 'The last digit must be 0. No digit can be used more than once.' },
};

/** Choices for each position, left to right, with the reason for each. */
function choices(v: V): [number, string][] {
  const L = v.L;
  const mid = (k: number) => Array.from({ length: k }, () => [10, 'any digit'] as [number, string]);
  switch (v.rule) {
    case 'evenEnd':
      return [[9, 'not 0'], ...mid(L - 2), [5, '0, 2, 4, 6 or 8']];
    case 'oddEnd':
      return [[9, 'not 0'], ...mid(L - 2), [5, '1, 3, 5, 7 or 9']];
    case 'noRepeat':
      return Array.from({ length: L }, (_, i) => (i === 0 ? [9, 'not 0'] : [10 - i, `${i} digit${i > 1 ? 's' : ''} already used`]) as [number, string]);
    case 'allOdd':
      return Array.from({ length: L }, (_, i) => [5 - i, i === 0 ? '1, 3, 5, 7 or 9' : `odd, not already used`] as [number, string]);
    case 'zeroEnd':
      // Fill the last digit first (0), then the rest from the 9 non-zero digits.
      return [...Array.from({ length: L - 1 }, (_, i) => [9 - i, i === 0 ? 'not 0 (0 is at the end)' : 'not already used'] as [number, string]), [1, 'must be 0']];
  }
}
const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);

export default defineTemplate<V>({
  id: 'num-counting',
  title: 'Counting with the product rule',
  strand: 'Number',
  subtopic: 'Listing & counting',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, ctx: 0, counts: [], L: 4, rule: 'evenEnd', teams: 0, twice: false };
    if (level === 'foundational') {
      const counts = [rng.int(2, 6), rng.int(3, 8), rng.int(2, 6)];
      ensure(new Set(counts).size === 3, 'different numbers of each');
      return { ...base, ctx: rng.int(0, MENUS.length - 1), counts };
    }
    if (level === 'core') {
      const rule = rng.pick(['evenEnd', 'oddEnd', 'noRepeat', 'allOdd', 'zeroEnd'] as const);
      const L = tier === 'KS3' ? 3 : rng.pick([3, 4]);
      return { ...base, rule, L };
    }
    const twice = tier !== 'KS3' && rng.chance(0.5);
    const teams = rng.int(5, tier === 'KS3' ? 12 : 20);
    return { ...base, teams, twice, ctx: rng.int(0, 1) };
  },

  validate(v) {
    return v.level === 'core' && v.rule === 'allOdd' && v.L > 5 ? ['too long'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const m = MENUS[v.ctx];
      const [a, b, c] = v.counts;
      return {
        stem: [text(m.intro.replace('{name}', v.name)), text(`There are ${a} ${m.a}, ${b} ${m.b} and ${c} ${m.c}.`)],
        parts: [part('a', 2, text(`How many different ${m.whole} are possible?`)), part('b', 2, text(`How many different ways are there to choose ${m.ask}?`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`${v.name} is choosing a ${v.L}-digit code for a lock.`), text("Each digit is a number from 0 to 9"), ...RULES[v.rule].words.replace(/\.$/, '').split('. ').map((s) => text(sentence(s)))],
        parts: [single(3, text(`How many different codes can ${v.name} choose?`))],
      };
    }
    const M = matches(v);
    const sport = v.ctx === 0 ? ['football league', 'team', 'teams'] : ['netball league', 'team', 'teams'];
    return {
      stem: [text(`In a ${sport[0]}, each ${sport[1]} plays every other ${sport[1]} ${v.twice ? 'twice, once at home and once away' : 'once'}.`), text(`Altogether, ${int(M)} matches are played.`)],
      parts: [single(3, text(`How many ${sport[2]} are in the league?`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const [a, b, c] = v.counts;
      return [{ text: int(a * b * c) }, { text: int(b * (a + c)) }];
    }
    if (v.level === 'core') return [{ text: int(product(choices(v).map((c) => c[0]))) }];
    return [{ text: `${v.teams}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const m = MENUS[v.ctx];
      const [a, b, c] = v.counts;
      return [
        [step('M1', `${a} ${TIMES} ${b} ${TIMES} ${c}`, `Each of the ${a} ${m.a} can go with each of the ${b} ${m.b}, and so on: multiply.`), step('A1', int(a * b * c), 'Every possible combination is counted once.')],
        [step('M1', `${b} ${TIMES} ${a} + ${b} ${TIMES} ${c}`, `Two separate cases: with one of the ${m.a}, or with one of the ${m.c}. Add the cases.`), step('A1', int(b * (a + c)), `Not ${b} × ${a} × ${c}: you only choose one of the two.`)],
      ];
    }
    if (v.level === 'core') {
      const ch = choices(v);
      return [
        [
          step('M1', ch.map(([n, why]) => `${n} (${why})`).join(', '), 'Work out how many choices there are for each digit in turn.'),
          step('M1', ch.map((c) => c[0]).join(` ${TIMES} `), 'Product rule: multiply the numbers of choices.'),
          step('A1', int(product(ch.map((c) => c[0]))), v.rule === 'zeroEnd' ? 'Deal with the fixed digit first.' : 'Check the restriction on every digit.'),
        ],
      ];
    }
    const M = matches(v);
    const n = v.teams;
    return [
      [
        step('P1', v.twice ? `$n(n - 1) = ${M}$` : `$\\frac{n(n - 1)}{2} = ${M}$, so $n(n - 1) = ${2 * M}$`, v.twice ? 'Each of the n teams plays n − 1 others, at home: n(n − 1) matches.' : 'Each of the n teams plays n − 1 others, but that counts every match twice: halve it.'),
        step('P1', `$${n} \\times ${n - 1} = ${n * (n - 1)}$`, 'Find two consecutive numbers that multiply to give this (trial and improvement is fine).'),
        step('A1', `${n} teams`, `Check: ${v.twice ? `${n} × ${n - 1}` : `${n} × ${n - 1} ÷ 2`} = ${M} matches.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      const [a, b, c] = v.counts;
      // List every meal.
      let all = 0;
      let either = 0;
      for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) for (let k = 0; k < c; k++) all++;
      for (let j = 0; j < b; j++) {
        for (let i = 0; i < a; i++) either++;
        for (let k = 0; k < c; k++) either++;
      }
      if (answers[0].text !== int(all) || answers[1].text !== int(either)) p.push('counts');
      return p;
    }
    if (v.level === 'core') {
      // Try every code from 0…0 to 9…9.
      let count = 0;
      for (let code = 0; code < 10 ** v.L; code++) {
        const d = String(code).padStart(v.L, '0').split('').map(Number);
        const distinct = new Set(d).size === d.length;
        const ok =
          v.rule === 'evenEnd' ? d[0] !== 0 && d[v.L - 1] % 2 === 0 :
          v.rule === 'oddEnd' ? d[0] !== 0 && d[v.L - 1] % 2 === 1 :
          v.rule === 'noRepeat' ? d[0] !== 0 && distinct :
          v.rule === 'allOdd' ? d.every((x) => x % 2 === 1) && distinct :
          d[v.L - 1] === 0 && distinct;
        if (ok) count++;
      }
      if (answers[0].text !== int(count)) p.push(`expected ${count}`);
      return p;
    }
    // Simulate the fixtures for each possible number of teams.
    const M = matches(v);
    const fits: number[] = [];
    for (let n = 2; n <= 60; n++) {
      let games = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && (v.twice || i < j)) games++;
      if (games === M) fits.push(n);
    }
    if (fits.length !== 1 || answers[0].text !== `${fits[0]}`) p.push('teams');
    return p;
  },

  key: (v) => `${v.counts}|${v.L}|${v.rule}|${v.teams}|${v.twice}|${v.level === 'foundational' ? v.ctx : ''}`,
});

function matches(v: V) {
  return (v.teams * (v.teams - 1)) / (v.twice ? 1 : 2);
}
