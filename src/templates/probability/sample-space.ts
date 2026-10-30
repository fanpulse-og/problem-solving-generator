import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text, MINUS, TIMES } from '../../engine/blocks';
import { ensure, frac, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 1F Q20 (two fair spinners, scores added: probability of
 * a total), June 2022 1F Q23 ("Sam wins if the product is even: is the game
 * fair?") and the fun-fair stall questions (Set 24 2F Q21: 50p a go, how
 * much profit should the stall expect?). check() lists every outcome.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  names: string[];
  a: number[]; // spinner A
  b: number[]; // spinner B or dice
  dice: boolean;
  target: number; // foundational: total asked about; stretch: win if total ≥ target
  plays: number; // stretch
  costP: number; // stretch: pence per go
  prizeP: number; // stretch: pence won
}

const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const outcomes = (v: V, f: (x: number, y: number) => number) => v.a.flatMap((x) => v.b.map((y) => f(x, y)));
const sum = (x: number, y: number) => x + y;
const prod = (x: number, y: number) => x * y;
const count = (xs: number[], ok: (n: number) => boolean) => xs.filter(ok).length;

function modes(xs: number[]): number[] {
  const freq = new Map<number, number>();
  xs.forEach((x) => freq.set(x, (freq.get(x) ?? 0) + 1));
  const top = Math.max(...freq.values());
  return [...freq.keys()].filter((k) => freq.get(k) === top).sort((p, q) => p - q);
}

export default defineTemplate<V>({
  id: 'prob-sample-space',
  title: 'Sample spaces: two spinners',
  strand: 'Probability',
  subtopic: 'Sample spaces',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const dice = tier !== 'KS3' && rng.chance(0.4);
    const v: V = { level, names: names(rng, 2), a: range(rng.int(3, tier === 'KS3' ? 4 : 5)), b: dice ? range(6) : range(rng.int(3, 4)), dice, target: 0, plays: 0, costP: 0, prizeP: 0 };
    const totals = outcomes(v, sum);
    if (level === 'foundational') {
      ensure(modes(totals).length === 1, 'one most likely total');
      v.target = rng.pick([...new Set(totals)].filter((t) => t !== modes(totals)[0] && count(totals, (x) => x === t) > 1));
      return v;
    }
    if (level === 'core') {
      const even = count(outcomes(v, prod), (n) => n % 2 === 0);
      ensure(even * 2 !== v.a.length * v.b.length, 'not fair, so there is something to show');
      return v;
    }
    const n = totals.length;
    v.target = rng.int(Math.max(...totals) - 3, Math.max(...totals) - 1);
    const wins = count(totals, (t) => t >= v.target);
    v.plays = rng.pick([60, 80, 100, 120, 150, 200]);
    ensure((v.plays * wins) % n === 0, 'a whole number of expected wins');
    v.costP = rng.pick([50, 100]);
    v.prizeP = rng.pick([200, 250, 300, 400, 500]);
    const profit = v.plays * v.costP - ((v.plays * wins) / n) * v.prizeP;
    ensure(profit > 0, 'the stall makes a profit');
    return v;
  },

  validate(v) {
    return v.a.length * v.b.length > 0 ? [] : ['no outcomes'];
  },

  render(v) {
    const [p, q] = v.names;
    // Edexcel style: a line ending in a number has no full stop, so the numbers come last.
    const kit = [text(`Spinner A is a fair spinner numbered ${v.a.join(', ')}`), ...(v.dice ? [] : [text(`Spinner B is a fair spinner numbered ${v.b.join(', ')}`)])];
    const intro = [...kit, text(`${p} spins spinner A and ${v.dice ? 'rolls a fair six-sided dice' : 'spins spinner B'}.`)];
    const grid = (sym: string) => table({ header: [sym, ...v.b.map(String)], rows: v.a.map((x) => [String(x), ...v.b.map(() => '')]), rowHeaders: true });
    if (v.level === 'foundational') {
      return {
        stem: [...intro, text(`${p} adds the two numbers to get a total.`), grid('+')],
        parts: [part('a', 2, text('You may use the grid to help you.'), text(`Work out the probability that the total is ${v.target}`)), part('b', 1, text('Which total is most likely?'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [...intro, text(`${p} multiplies the two numbers.`), text(`${p} wins if the answer is even. ${q} wins if the answer is odd.`), grid(TIMES)],
        parts: [single(3, text('Is this game fair?'), text('You must show how you get your answer.'))],
      };
    }
    return {
      stem: [
        text(`At a school fair, ${p} runs a game with ${v.dice ? 'a spinner and a dice' : 'two spinners'}.`),
        ...kit,
        text(`Each player spins spinner A and ${v.dice ? 'rolls a fair six-sided dice' : 'spins spinner B'}, and adds the numbers.`),
        text(`Each go costs ${money(v.costP)}`),
        text(`A player wins ${money(v.prizeP)} if the total is ${v.target} or more.`),
      ],
      parts: [single(4, text(`The game is played ${v.plays} times.`), text(`Work out how much profit ${p} should expect to make.`))],
    };
  },

  answer(v) {
    const n = v.a.length * v.b.length;
    const totals = outcomes(v, sum);
    if (v.level === 'foundational') return [{ text: frac(Q.of(count(totals, (t) => t === v.target), n)) }, { text: `${modes(totals)[0]}` }];
    if (v.level === 'core') {
      const even = count(outcomes(v, prod), (x) => x % 2 === 0);
      return [{ text: `No: P(even) = ${frac(Q.of(even, n))} but P(odd) = ${frac(Q.of(n - even, n))}, so ${even > n - even ? v.names[0] : v.names[1]} is more likely to win` }];
    }
    const wins = (v.plays * count(totals, (t) => t >= v.target)) / n;
    return [{ text: money(v.plays * v.costP - wins * v.prizeP) }];
  },

  markScheme(v) {
    const n = v.a.length * v.b.length;
    const totals = outcomes(v, sum);
    if (v.level === 'foundational') {
      const k = count(totals, (t) => t === v.target);
      const pairs = v.a.flatMap((x) => v.b.filter((y) => x + y === v.target).map((y) => `(${x}, ${y})`));
      return [
        [step('M1', `${pairs.join(', ')}: ${k} of the ${n} outcomes`, `Fill in the grid: there are ${v.a.length} ${TIMES} ${v.b.length} = ${n} equally likely outcomes.`), step('A1', frac(Q.of(k, n)), 'Probability = number of ways ÷ total number of outcomes.')],
        [step('B1', `${modes(totals)[0]}`, 'The total that appears most often in the grid.')],
      ];
    }
    if (v.level === 'core') {
      const even = count(outcomes(v, prod), (x) => x % 2 === 0);
      return [
        [
          step('M1', `${n} outcomes; ${even} even, ${n - even} odd`, 'Complete the grid of products and count. A product is odd only when BOTH numbers are odd.'),
          step('M1', `P(even) = ${frac(Q.of(even, n))}, P(odd) = ${frac(Q.of(n - even, n))}`, 'Compare the two probabilities.'),
          step('C1', `Not fair: ${even > n - even ? v.names[0] : v.names[1]} is more likely to win`, 'A game is fair only if each player has the same chance.'),
        ],
      ];
    }
    const k = count(totals, (t) => t >= v.target);
    const wins = (v.plays * k) / n;
    return [
      [
        step('P1', `P(win) = ${frac(Q.of(k, n))}`, `Totals of ${v.target} or more: ${k} of the ${n} outcomes in the grid.`),
        step('P1', `${frac(Q.of(k, n))} ${TIMES} ${v.plays} = ${wins} wins`, 'Expected number = probability × number of goes.'),
        step('P1', `Takings ${v.plays} ${TIMES} ${money(v.costP)} = ${money(v.plays * v.costP)}; prizes ${wins} ${TIMES} ${money(v.prizeP)} = ${money(wins * v.prizeP)}`, 'Money in, and money paid out.'),
        step('A1', `${money(v.plays * v.costP)} ${MINUS} ${money(wins * v.prizeP)} = ${money(v.plays * v.costP - wins * v.prizeP)}`, 'Profit = money in − money out.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Walk through every pair of numbers one at a time.
    let n = 0;
    const tally = new Map<number, number>();
    let even = 0;
    for (const x of v.a)
      for (const y of v.b) {
        n++;
        tally.set(x + y, (tally.get(x + y) ?? 0) + 1);
        if ((x * y) % 2 === 0) even++;
      }
    if (v.level === 'foundational') {
      if (answers[0].text !== frac(Q.of(tally.get(v.target) ?? 0, n))) p.push('probability');
      const best = [...tally.entries()].sort((s, t) => t[1] - s[1] || s[0] - t[0])[0][0];
      if (answers[1].text !== `${best}`) p.push('most likely');
    } else if (v.level === 'core') {
      if (!answers[0].text.startsWith('No') || even * 2 === n) p.push('fairness');
    } else {
      let winsN = 0;
      tally.forEach((c, t) => (winsN += t >= v.target ? c : 0));
      const pence = v.plays * v.costP - Q.of(v.plays * winsN, n).mul(v.prizeP).toNumber();
      if (answers[0].text !== money(pence)) p.push('profit');
    }
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.target}|${v.plays}|${v.costP}|${v.prizeP}`,
});
