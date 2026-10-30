import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text, DIV, TIMES } from '../../engine/blocks';
import { ensure, frac } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1F Q15 (a biased spinner spun 80 times: relative
 * frequency, then an estimate for 200 more spins), June 2022 2F Q18 ("is the
 * dice fair?": 120 rolls with 32 sixes; whose results are more reliable?) and
 * Set 24 1H Q9 (combine two people's results for the best estimate, then the
 * probability of two in a row). check() recounts from the tables.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  names: string[];
  colour: number; // which colour is asked about
  freq: number[]; // foundational: frequencies of the four colours
  more: number; // foundational: further spins
  rolls: number; // core: rolls of the dice, and sixes seen
  sixes: number;
  small: [number, number]; // core: a smaller trial (rolls, sixes)
  trials: [number, number][]; // stretch: [spins, reds] for two people
}

const COLOURS = ['red', 'blue', 'green', 'yellow'];
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);

export default defineTemplate<V>({
  id: 'prob-relative-frequency',
  title: 'Relative frequency and fairness',
  strand: 'Probability',
  subtopic: 'Experimental probability',
  tiers: ['KS3', 'F', 'H'],
  // Two independent events (multiplying probabilities) is GCSE content, not KS3.
  levelsByTier: { KS3: ['foundational', 'core'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, names: names(rng, 2), colour: rng.int(0, 3), freq: [], more: 0, rolls: 0, sixes: 0, small: [0, 0], trials: [] };
    if (level === 'foundational') {
      const N = rng.pick([40, 50, 80, 100, 200]);
      const cuts = rng.sample(Array.from({ length: N - 1 }, (_, i) => i + 1), 3).sort((a, b) => a - b);
      const freq = [cuts[0], cuts[1] - cuts[0], cuts[2] - cuts[1], N - cuts[2]];
      ensure(freq.every((f) => f >= N / 10), 'every colour turns up');
      const more = rng.pick([200, 300, 400, 500, 1000]);
      ensure(more !== N && ((freq[base.colour] * more) / N) % 1 === 0, 'a whole-number estimate for a different number of spins');
      return { ...base, freq, more };
    }
    if (level === 'core') {
      const rolls = rng.pick([60, 90, 120, 150, 180, 240, 300]);
      const sixes = Math.round((rolls / 6) * (rng.pick([1.6, 1.75, 2]) as number));
      const small: [number, number] = [rng.pick([12, 18, 24, 30]), 0];
      small[1] = rng.int(Math.floor(small[0] / 6) - 1, Math.floor(small[0] / 6) + 2);
      return { ...base, rolls, sixes, small };
    }
    const trials: [number, number][] = [
      [rng.pick([20, 30, 40, 50]), 0],
      [rng.pick([60, 80, 100, 150]), 0],
    ];
    const p = rng.pick([Q.of(1, 5), Q.of(3, 10), Q.of(2, 5), Q.of(1, 4)]);
    const total = trials[0][0] + trials[1][0];
    const reds = p.mul(total);
    ensure(reds.isInt(), 'combined estimate is p');
    trials[0][1] = rng.int(Math.round(trials[0][0] * p.toNumber()) - 3, Math.round(trials[0][0] * p.toNumber()) + 3);
    trials[1][1] = reds.toNumber() - trials[0][1];
    ensure(trials.every(([n, r]) => r > 0 && r < n), 'sensible counts');
    ensure(!Q.of(trials[0][1], trials[0][0]).eq(p), 'the small trial alone gives a different estimate');
    return { ...base, trials };
  },

  validate(v) {
    return v.level === 'core' && v.sixes <= v.rolls / 6 ? ['sixes must stand out'] : [];
  },

  render(v) {
    const [a, b] = v.names;
    const col = COLOURS[v.colour];
    if (v.level === 'foundational') {
      const N = v.freq.reduce((s, f) => s + f, 0);
      return {
        stem: [text(`${a} spins a biased four-sided spinner ${N} times.`), text('The table shows the results.'), table({ header: ['Colour', ...COLOURS.map(cap)], rows: [['Frequency', ...v.freq.map(String)]], rowHeaders: true })],
        parts: [part('a', 1, text(`Work out the relative frequency of the spinner landing on ${col}.`)), part('b', 2, text(`${a} is going to spin the spinner another ${v.more} times.`), text(`Estimate the number of times it will land on ${col}.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`${a} rolls an ordinary six-sided dice ${v.rolls} times.`), text(`The dice lands on 6 a total of ${v.sixes} times.`)],
        parts: [
          part('a', 2, text('Do you think the dice is fair?'), text('You must give a reason for your answer.')),
          part('b', 1, text(`${b} rolls the same dice ${v.small[0]} times and gets ${v.small[1]} sixes.`), text(`Whose results give the better estimate of the probability of getting a 6? Give a reason.`)),
        ],
      };
    }
    return {
      stem: [text(`${a} and ${b} each spin the same biased spinner.`), text(`The table shows the number of times the spinner landed on ${col}.`), table({ header: ['', 'Number of spins', `Landed on ${col}`], rows: v.names.map((n, i) => [n, String(v.trials[i][0]), String(v.trials[i][1])]), rowHeaders: true })],
      parts: [single(4, text('The spinner is spun two more times.'), text(`Use all the results to estimate the probability that it lands on ${col} both times.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const N = v.freq.reduce((s, f) => s + f, 0);
      return [{ text: frac(Q.of(v.freq[v.colour], N)) }, { text: `${(v.freq[v.colour] * v.more) / N}` }];
    }
    if (v.level === 'core') {
      return [{ text: `Probably not: you would expect about ${v.rolls / 6} sixes, but there were ${v.sixes}` }, { text: `${v.names[0]}’s, because ${v.names[0]} rolled the dice more times` }];
    }
    const p = Q.of(v.trials[0][1] + v.trials[1][1], v.trials[0][0] + v.trials[1][0]);
    return [{ text: frac(p.mul(p)) }];
  },

  markScheme(v) {
    const col = COLOURS[v.colour];
    if (v.level === 'foundational') {
      const N = v.freq.reduce((s, f) => s + f, 0);
      const rf = Q.of(v.freq[v.colour], N);
      return [
        [step('B1', `$\\frac{${v.freq[v.colour]}}{${N}}$ = ${frac(rf)}`, `Relative frequency = times it landed on ${col} ÷ total spins (add the frequencies: ${N}).`)],
        [step('M1', `${frac(rf)} ${TIMES} ${v.more}`, 'Estimate = relative frequency × number of spins.'), step('A1', `${(v.freq[v.colour] * v.more) / N}`, 'An estimate, so it will not be exact.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', `${v.rolls} ${DIV} 6 = ${v.rolls / 6} sixes expected`, 'A fair dice gives a 6 one time in six.'), step('C1', `${v.sixes} is much more than ${v.rolls / 6}, so probably biased`, `Compare: the relative frequency ${frac(Q.of(v.sixes, v.rolls))} is much more than $\\frac{1}{6}$.`)],
        [step('C1', `${v.names[0]}: ${v.rolls} rolls, more than ${v.small[0]}`, 'More trials give a more reliable estimate.')],
      ];
    }
    const [[n1, r1], [n2, r2]] = v.trials;
    const p = Q.of(r1 + r2, n1 + n2);
    return [
      [
        step('M1', `${r1} + ${r2} = ${r1 + r2} out of ${n1} + ${n2} = ${n1 + n2}`, 'Use ALL the results together: more spins give a better estimate.'),
        step('A1', `P(${col}) = $\\frac{${r1 + r2}}{${n1 + n2}}$ = ${frac(p)}`, 'Simplify the relative frequency.'),
        step('M1', `${frac(p)} ${TIMES} ${frac(p)}`, 'Two spins are independent: multiply the probabilities.'),
        step('A1', frac(p.mul(p)), 'Multiply the numerators and the denominators.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      let N = 0;
      v.freq.forEach((f) => (N += f));
      if (answers[0].text !== frac(Q.of(v.freq[v.colour], N))) p.push('relative frequency');
      if (Number(answers[1].text) * N !== v.freq[v.colour] * v.more) p.push('estimate');
    } else if (v.level === 'core') {
      if (!(Q.of(v.sixes, v.rolls).gt(Q.of(1, 4)) && answers[0].text.startsWith('Probably not'))) p.push('fairness');
      if (!(v.rolls > v.small[0] && answers[1].text.startsWith(v.names[0]))) p.push('reliability');
    } else {
      const pooled = Q.of(v.trials[0][1], 1).add(v.trials[1][1]).div(v.trials[0][0] + v.trials[1][0]);
      if (answers[0].text !== frac(pooled.pow(2))) p.push('two in a row');
    }
    return p;
  },

  key: (v) => `${v.colour}|${v.freq}|${v.more}|${v.rolls}|${v.sixes}|${v.small}|${v.trials}`,
});
