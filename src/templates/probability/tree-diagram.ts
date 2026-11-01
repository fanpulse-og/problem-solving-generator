import { defineTemplate, type Tier } from '../../engine/types';
import { diagram, part, single, step, text, TIMES } from '../../engine/blocks';
import { dec, ensure, frac, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2F Q22 / 2H Q8 (bus and train late, independent: complete
 * the tree diagram), Set 23 2H Q14 (counters taken without replacement:
 * probability of the same colour) and Set 24 1H Q20 (n sweets, 6 orange,
 * P(both orange) = 1/3: show that n² − n − 90 = 0).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: Tier;
  name: string;
  ctx: number;
  p: Q; // independent: P(first event)
  q: Q; // independent: P(second event)
  r: number; // counters: red (or the special colour)
  b: number; // counters: other colour
}

const INDEP = [
  { first: 'bus', second: 'train', yes: 'Late', no: 'Not late', s1: (n: string, p: string) => `The probability that ${n}’s bus is late is ${p}`, s2: (p: string) => `The probability that the train is late is ${p}`, lead: (n: string) => `${n} catches a bus and then a train to work.`, event: 'late', indep: 'Whether the train is late doesn’t depend on the bus', both: 'both the bus and the train are late', neither: 'neither the bus nor the train is late', least: 'at least one of them is late' },
  { first: 'Saturday', second: 'Sunday', yes: 'Win', no: 'Not win', s1: (n: string, p: string) => `The probability that ${n}’s team wins on Saturday is ${p}`, s2: (p: string) => `The probability that the team wins on Sunday is ${p}`, lead: (n: string) => `${n}’s netball team plays a match on Saturday and a match on Sunday.`, event: 'win', indep: 'Sunday’s result doesn’t depend on Saturday’s', both: 'the team wins both matches', neither: 'the team does not win either match', least: 'the team wins at least one match' },
] as const;

const COLOURS = [
  ['red', 'blue'],
  ['green', 'yellow'],
  ['black', 'white'],
] as const;

const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
const tree = (v: V, fill: boolean) => {
  if (v.level === 'foundational' || (v.level === 'stretch' && v.tier !== 'H')) {
    const c = INDEP[v.ctx];
    const P = dec(v.p);
    const Pn = dec(Q.of(1).sub(v.p));
    const Qy = dec(v.q);
    const Qn = dec(Q.of(1).sub(v.q));
    const second = (show: boolean) => [
      { label: c.yes, p: show ? Qy : '' },
      { label: c.no, p: fill ? Qn : '' },
    ];
    return diagram({
      type: 'tree',
      stages: [cap(c.first), cap(c.second)],
      first: [
        { label: c.yes, p: P },
        { label: c.no, p: fill ? Pn : '' },
      ],
      second: [second(true), second(fill)],
    });
  }
  const [c1, c2] = COLOURS[v.ctx];
  const n = v.r + v.b;
  const f = (a: number, d: number) => `${a}/${d}`;
  return diagram({
    type: 'tree',
    stages: ['First counter', 'Second counter'],
    first: [
      { label: cap(c1), p: f(v.r, n) },
      { label: cap(c2), p: f(v.b, n) },
    ],
    second: [
      [
        { label: cap(c1), p: fill ? f(v.r - 1, n - 1) : '' },
        { label: cap(c2), p: fill ? f(v.b, n - 1) : '' },
      ],
      [
        { label: cap(c1), p: fill ? f(v.r, n - 1) : '' },
        { label: cap(c2), p: fill ? f(v.b - 1, n - 1) : '' },
      ],
    ],
  });
};

export default defineTemplate<V>({
  id: 'prob-tree-diagram',
  title: 'Probability tree diagrams',
  strand: 'Probability',
  subtopic: 'Tree diagrams',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, tier, name, ctx: 0, p: Q.of(0), q: Q.of(0), r: 0, b: 0 };
    if (level === 'foundational' || (level === 'stretch' && tier !== 'H')) {
      const p = Q.of(rng.int(1, 19) * 5, 100);
      const q = Q.of(rng.int(1, 19) * 5, 100);
      ensure(!p.eq(q) && !p.eq(Q.of(1, 2)) && !q.eq(Q.of(1, 2)), 'different, non-trivial probabilities');
      const least = Q.of(1).sub(Q.of(1).sub(p).mul(Q.of(1).sub(q)));
      ensure(Math.abs(least.toNumber() - 0.5) >= 0.05, 'a clear decision');
      return { ...base, ctx: rng.int(0, INDEP.length - 1), p, q };
    }
    if (level === 'core') {
      const r = rng.int(3, 9);
      const b = rng.int(3, 9);
      ensure(r !== b, 'different numbers of each colour');
      return { ...base, ctx: rng.int(0, COLOURS.length - 1), r, b };
    }
    // H stretch: n sweets, r orange; P(both orange) given; find n.
    const n = rng.int(8, 30);
    const r = rng.int(3, n - 3);
    const P = Q.of(r * (r - 1), n * (n - 1));
    ensure(P.d <= 40n && P.n <= 10n, 'a friendly probability');
    return { ...base, r, b: n - r };
  },

  validate(v) {
    return v.level === 'core' && (v.r < 2 || v.b < 2) ? ['counters'] : [];
  },

  render(v) {
    if (v.level === 'foundational' || (v.level === 'stretch' && v.tier !== 'H')) {
      const c = INDEP[v.ctx];
      const stem = [text(c.lead(v.name)), text(c.s1(v.name, dec(v.p))), text(c.s2(dec(v.q))), text(`Whether the ${c.event === 'late' ? 'train is late' : 'team wins on Sunday'} does not depend on what happened ${c.event === 'late' ? 'to the bus' : 'on Saturday'}.`)];
      if (v.level === 'foundational') {
        return { stem, parts: [part('a', 2, text('Complete the probability tree diagram.'), tree(v, false)), part('b', 2, text(`Work out the probability that ${c.neither}.`))] };
      }
      return { stem: [...stem, tree(v, false)], parts: [single(4, text(`${v.name} says, “It is more likely than not that ${c.least}.”`), text(`Is ${v.name} right?`), text('You must show your working.'))] };
    }
    if (v.level === 'core') {
      const [c1, c2] = COLOURS[v.ctx];
      return {
        stem: [text(`There are ${v.r} ${c1} counters and ${v.b} ${c2} counters in a bag.`), text(`${v.name} takes at random a counter from the bag.`), text(`${v.name} does not put the counter back in the bag.`), text(`${v.name} then takes at random a second counter from the bag.`)],
        parts: [part('a', 2, text('Complete the probability tree diagram.'), tree(v, false)), part('b', 3, text('Work out the probability that the two counters are the same colour.'))],
      };
    }
    const n = v.r + v.b;
    const P = Q.of(v.r * (v.r - 1), n * (n - 1));
    return {
      stem: [text('There are $n$ sweets in a bag.'), text(`${v.r} of the sweets are orange.`), text('The rest of the sweets are yellow.'), text(`${v.name} takes at random a sweet from the bag and eats it.`), text(`${v.name} then takes at random another sweet from the bag and eats it.`), text(`The probability that ${v.name} eats two orange sweets is ${frac(P)}`)],
      parts: [part('a', 3, text(`Show that $n^2 - n - ${n * (n - 1)} = 0$`)), part('b', 2, text('Find the value of $n$.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational' || (v.level === 'stretch' && v.tier !== 'H')) {
      const c = INDEP[v.ctx];
      const np = Q.of(1).sub(v.p);
      const nq = Q.of(1).sub(v.q);
      if (v.level === 'foundational') return [{ text: `${cap(c.first)}: ${c.no.toLowerCase()} ${dec(np)}. ${cap(c.second)}: ${c.yes.toLowerCase()} ${dec(v.q)}, ${c.no.toLowerCase()} ${dec(nq)} on both pairs of branches` }, { text: dec(np.mul(nq)) }];
      const least = Q.of(1).sub(np.mul(nq));
      return [{ text: `${least.gt(Q.of(1, 2)) ? 'Yes' : 'No'}: P(${c.least}) = 1 − ${dec(np)} × ${dec(nq)} = ${dec(least)}, which is ${least.gt(Q.of(1, 2)) ? 'more' : 'less'} than 0.5` }];
    }
    const n = v.r + v.b;
    if (v.level === 'core') {
      const [c1, c2] = COLOURS[v.ctx];
      const same = Q.of(v.r * (v.r - 1) + v.b * (v.b - 1), n * (n - 1));
      return [{ text: `After ${c1}: ${c1} $\\frac{${v.r - 1}}{${n - 1}}$, ${c2} $\\frac{${v.b}}{${n - 1}}$. After ${c2}: ${c1} $\\frac{${v.r}}{${n - 1}}$, ${c2} $\\frac{${v.b - 1}}{${n - 1}}$` }, { text: frac(same) }];
    }
    return [{ text: `$\\frac{${v.r}}{n} \\times \\frac{${v.r - 1}}{n - 1} = ${fracTex(Q.of(v.r * (v.r - 1), n * (n - 1)))}$, so $n^2 - n - ${n * (n - 1)} = 0$` }, { text: `$n = ${n}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational' || (v.level === 'stretch' && v.tier !== 'H')) {
      const c = INDEP[v.ctx];
      const np = Q.of(1).sub(v.p);
      const nq = Q.of(1).sub(v.q);
      if (v.level === 'foundational') {
        return [
          [step('B1', `${c.no}: 1 − ${dec(v.p)} = ${dec(np)}`, 'The branches from one point add up to 1.'), step('B1', `${cap(c.second)}: ${dec(v.q)} and ${dec(nq)} on BOTH pairs`, `${c.indep}, so both pairs of branches are the same.`)],
          [step('M1', `${dec(np)} ${TIMES} ${dec(nq)}`, 'Follow the path “not … then not …”: multiply along the branches.'), step('A1', dec(np.mul(nq)), 'Check it is between 0 and 1.')],
        ];
      }
      const least = Q.of(1).sub(np.mul(nq));
      return [
        [
          step('P1', `P(${c.neither}) = ${dec(np)} ${TIMES} ${dec(nq)} = ${dec(np.mul(nq))}`, 'Fill in the missing branches, then find the one path that is NOT wanted.'),
          step('P1', `1 − ${dec(np.mul(nq))}`, `“At least one” is everything except “neither” (or add the other three paths).`),
          step('A1', dec(least), `Check: ${dec(v.p.mul(v.q))} + ${dec(v.p.mul(nq))} + ${dec(np.mul(v.q))} = ${dec(least)}`),
          step('C1', `${least.gt(Q.of(1, 2)) ? 'Yes' : 'No'}, ${dec(least)} ${least.gt(Q.of(1, 2)) ? '>' : '<'} 0.5`, '“More likely than not” means a probability greater than 0.5'),
        ],
      ];
    }
    const n = v.r + v.b;
    if (v.level === 'core') {
      const [c1, c2] = COLOURS[v.ctx];
      const rr = Q.of(v.r * (v.r - 1), n * (n - 1));
      const bb = Q.of(v.b * (v.b - 1), n * (n - 1));
      return [
        [step('B1', `After ${c1}: $\\frac{${v.r - 1}}{${n - 1}}$ and $\\frac{${v.b}}{${n - 1}}$`, `One ${c1} counter has gone: ${n - 1} counters are left, ${v.r - 1} of them ${c1}.`), step('B1', `After ${c2}: $\\frac{${v.r}}{${n - 1}}$ and $\\frac{${v.b - 1}}{${n - 1}}$`, `One ${c2} counter has gone.`)],
        [
          step('M1', `$\\frac{${v.r}}{${n}} \\times \\frac{${v.r - 1}}{${n - 1}} = \\frac{${v.r * (v.r - 1)}}{${n * (n - 1)}}$ or $\\frac{${v.b}}{${n}} \\times \\frac{${v.b - 1}}{${n - 1}} = \\frac{${v.b * (v.b - 1)}}{${n * (n - 1)}}$`, `Multiply along a path: ${c1} then ${c1}, or ${c2} then ${c2}.`),
          step('M1', `$\\frac{${v.r * (v.r - 1)}}{${n * (n - 1)}} + \\frac{${v.b * (v.b - 1)}}{${n * (n - 1)}}$`, 'Same colour = both paths: add them.'),
          step('A1', `${frac(rr.add(bb))}`, 'You can leave it unsimplified.'),
        ],
      ];
    }
    const nn = n * (n - 1);
    const P = Q.of(v.r * (v.r - 1), nn);
    return [
      [
        step('M1', `$\\frac{${v.r}}{n} \\times \\frac{${v.r - 1}}{n - 1}$`, 'After the first orange sweet is eaten there are n − 1 sweets left, and one fewer orange.'),
        step('M1', `$\\frac{${v.r * (v.r - 1)}}{n(n - 1)} = ${fracTex(P)}$`, 'Set it equal to the probability given.'),
        step('A1', `$${P.d}${'\\times'} ${v.r * (v.r - 1)} = ${P.n === 1n ? '' : P.n}n(n - 1)$ → $n^2 - n = ${nn}$ → $n^2 - n - ${nn} = 0$`, 'Cross-multiply, expand and rearrange.'),
      ],
      [step('M1', `$(n - ${n})(n + ${n - 1}) = 0$`, 'Factorise (two numbers that multiply to give −' + nn + ' and add to −1).'), step('A1', `$n = ${n}$`, `n can’t be negative, so reject n = −${n - 1}.`)],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational' || (v.level === 'stretch' && v.tier !== 'H')) {
      // Count outcomes out of 400 equally likely (p and q are multiples of 0.05).
      const P = v.p.mul(20).toInt();
      const Qq = v.q.mul(20).toInt();
      let neither = 0;
      for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) if (i >= P && j >= Qq) neither++;
      const pNeither = Q.of(neither, 400);
      if (v.level === 'foundational') {
        if (answers[1].text !== dec(pNeither)) p.push('neither');
      } else if (answers[0].text.startsWith('Yes') !== pNeither.lt(Q.of(1, 2))) p.push('decision');
      return p;
    }
    const n = v.r + v.b;
    if (v.level === 'core') {
      // Enumerate every ordered pair of different counters.
      let same = 0;
      let all = 0;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          all++;
          if (i < v.r === j < v.r) same++;
        }
      if (answers[1].text !== frac(Q.of(same, all))) p.push('same colour');
      return p;
    }
    // Search n for the bag that gives the stated probability.
    const P = Q.of(v.r * (v.r - 1), n * (n - 1));
    const hits: number[] = [];
    for (let m = v.r; m <= 200; m++) if (Q.of(v.r * (v.r - 1), m * (m - 1)).eq(P)) hits.push(m);
    if (hits.length !== 1 || answers[1].text !== `$n = ${hits[0]}$`) p.push('n');
    return p;
  },

  key: (v) => `${v.tier === 'H' && v.level === 'stretch' ? 'H' : ''}|${v.ctx}|${v.p}|${v.q}|${v.r}|${v.b}`,
});
