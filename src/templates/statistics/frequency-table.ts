import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text, DIV } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 1F Q13 (goals scored in matches: mode, median and mean
 * from a frequency table), Set 22 2F Q17 (the mean is 2.4: find the missing
 * frequency x) and Set 24 2H Q7 (two missing frequencies from the total and
 * the mean).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof CONTEXTS)[number];
  values: number[];
  freqs: number[]; // with the unknown(s) included
  unknown: number[]; // indices of unknown frequencies
}

const CONTEXTS = [
  { head: 'Number of goals', what: 'the number of goals scored in each of {n} football matches', item: 'goals', many: 'matches' },
  { head: 'Number of pets', what: 'the number of pets owned by each of {n} students', item: 'pets', many: 'students' },
  { head: 'Number of brothers and sisters', what: 'the number of brothers and sisters of each of {n} people', item: 'brothers and sisters', many: 'people' },
  { head: 'Number of books read', what: 'the number of books read last month by each of {n} students', item: 'books', many: 'students' },
] as const;

const ord = (k: number) => `${k}${k % 100 >= 11 && k % 100 <= 13 ? 'th' : k % 10 === 1 ? 'st' : k % 10 === 2 ? 'nd' : k % 10 === 3 ? 'rd' : 'th'}`;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const fx = (v: V) => sum(v.values.map((x, i) => x * v.freqs[i]));
const n = (v: V) => sum(v.freqs);
const mean = (v: V) => Q.of(fx(v), n(v));

function median(v: V): Q {
  const list: number[] = [];
  v.values.forEach((x, i) => {
    for (let k = 0; k < v.freqs[i]; k++) list.push(x);
  });
  const m = list.length;
  return m % 2 ? Q.of(list[(m - 1) / 2]) : Q.of(list[m / 2 - 1] + list[m / 2], 2);
}

export default defineTemplate<V>({
  id: 'stats-frequency-table',
  title: 'Averages from a frequency table',
  strand: 'Statistics',
  subtopic: 'Averages & range',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'averages',
  styleByLevel: { core: 'backwards', stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, level }) {
    const ctx = rng.pick(CONTEXTS);
    const k = rng.int(5, 6);
    const values = Array.from({ length: k }, (_, i) => i);
    // A hump-shaped distribution.
    const shape = values.map((_, i) => Math.max(1, Math.round((3 + 6 * Math.sin(((i + 0.5) / k) * Math.PI)) * rng.int(6, 12) / 6)) + rng.int(0, 3));
    const tidy = (q: Q) => q.terminatesWithin(2) && !q.isInt();
    if (level === 'foundational') {
      // Scale to a friendly total, so the mean terminates.
      const N = rng.pick([20, 25, 40, 50]);
      const s0 = shape.reduce((a, b) => a + b, 0);
      const freqs = shape.map((f) => Math.max(1, Math.round((f * N) / s0)));
      const top = freqs.indexOf(Math.max(...freqs));
      freqs[top] += N - freqs.reduce((a, b) => a + b, 0);
      const v: V = { level, ctx, values, freqs, unknown: [] };
      ensure(freqs.every((f) => f >= 1) && freqs.filter((f) => f === Math.max(...freqs)).length === 1, 'a single mode');
      ensure(tidy(mean(v)) && median(v).isInt(), 'a mean worth working out; a whole-number median');
      return v;
    }
    // Search the unknown frequencies (1 to 25) for those that give a tidy mean.
    const unknown = level === 'core' ? [rng.int(1, k - 1)] : rng.sample(values.slice(1), 2).sort((a, b) => a - b);
    const options: number[][] = [];
    for (let a = 2; a <= 25; a++)
      for (let b = unknown.length === 2 ? 2 : 0; b <= (unknown.length === 2 ? 25 : 0); b++) {
        const freqs = [...shape];
        freqs[unknown[0]] = a;
        if (unknown.length === 2) freqs[unknown[1]] = b;
        const v: V = { level, ctx, values, freqs, unknown };
        if (tidy(mean(v)) && mean(v).terminatesWithin(1) && (unknown.length === 1 || a !== b)) options.push(freqs);
      }
    ensure(options.length > 0, 'a tidy mean is possible');
    const v: V = { level, ctx, values, freqs: rng.pick(options), unknown };
    ensure(!mean(v).eq(values[unknown[0]]), 'the unknown changes the mean');
    return v;
  },

  validate(v) {
    return v.freqs.every((f) => f >= 1) ? [] : ['empty row'];
  },

  render(v) {
    const names = ['x', 'y'];
    const rows = v.values.map((x, i) => [`${x}`, v.unknown.includes(i) ? `$${names[v.unknown.indexOf(i)]}$` : `${v.freqs[i]}`]);
    const t = table({ header: [v.ctx.head, 'Frequency'], rows });
    if (v.level === 'foundational') {
      return {
        stem: [text(`The table shows information about ${v.ctx.what.replace('{n}', String(n(v)))}.`), t],
        parts: [part('a', 1, text('Write down the mode.')), part('b', 1, text('Find the median.')), part('c', 3, text('Work out the mean.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`The table shows information about ${v.ctx.what.replace('each of {n}', 'some')}.`), t, text(`The mean number of ${v.ctx.item} is ${dec(mean(v))}`)],
        parts: [single(4, text('Work out the value of $x$.'))],
      };
    }
    return {
      stem: [text(`The table shows information about ${v.ctx.what.replace('{n}', String(n(v)))}.`), t, text(`The mean number of ${v.ctx.item} is ${dec(mean(v))}`)],
      parts: [single(5, text('Work out the value of $x$ and the value of $y$.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const mode = v.values[v.freqs.indexOf(Math.max(...v.freqs))];
      return [{ text: `${mode}` }, { text: dec(median(v)) }, { text: dec(mean(v)) }];
    }
    if (v.level === 'core') return [{ text: `$x = ${v.freqs[v.unknown[0]]}$` }];
    return [{ text: `$x = ${v.freqs[v.unknown[0]]}$, $y = ${v.freqs[v.unknown[1]]}$` }];
  },

  markScheme(v) {
    const parts = v.values.map((x, i) => (v.unknown.includes(i) ? `${x}${['x', 'y'][v.unknown.indexOf(i)]}` : `${x * v.freqs[i]}`));
    if (v.level === 'foundational') {
      const N = n(v);
      return [
        [step('B1', `${v.values[v.freqs.indexOf(Math.max(...v.freqs))]}`, 'The mode is the value with the highest FREQUENCY, not the highest frequency itself.')],
        [step('B1', dec(median(v)), `${N} values: the median is the ${N % 2 ? ord((N + 1) / 2) : `${ord(N / 2)} and ${ord(N / 2 + 1)}`} value. Count down the frequencies.`)],
        [
          step('M1', `${v.values.map((x, i) => `${x} × ${v.freqs[i]}`).join(' + ')} = ${fx(v)}`, 'Multiply each value by its frequency and add: this is the total.'),
          step('M1', `${fx(v)} ${DIV} ${N}`, `Divide by the total frequency (${N}), not by the number of rows.`),
          step('A1', dec(mean(v)), 'Check it sits between the smallest and largest values.'),
        ],
      ];
    }
    const N0 = sum(v.freqs.filter((_, i) => !v.unknown.includes(i)));
    const S0 = sum(v.values.map((x, i) => (v.unknown.includes(i) ? 0 : x * v.freqs[i])));
    const m = mean(v);
    if (v.level === 'core') {
      const i = v.unknown[0];
      const x = v.values[i];
      const xv = v.freqs[i];
      return [
        [
          step('M1', `Total = ${parts.filter((p) => !/x/.test(p)).join(' + ')} + ${x}x = ${S0} + ${x}x`, 'Total of all the values, with x for the missing frequency.'),
          step('M1', `Number of ${v.ctx.many} = ${N0} + x`, 'Total frequency, including x.'),
          step('M1', `$\\frac{${S0} + ${x}x}{${N0} + x} = ${dec(m)}$, so $${S0} + ${x}x = ${dec(m.mul(N0))} + ${dec(m)}x$`, 'Mean = total ÷ number. Multiply out.'),
          step('A1', `$${dec(Q.of(x).sub(m))}x = ${dec(m.mul(N0).sub(S0))}$, so $x = ${xv}$`, 'Collect the x terms and solve.'),
        ],
      ];
    }
    const [i, j] = v.unknown;
    const [a, b] = [v.freqs[i], v.freqs[j]];
    const N = n(v);
    return [
      [
        step('P1', `$x + y = ${N} - ${N0} = ${a + b}$`, `The frequencies add up to ${N}.`),
        step('P1', `$${S0} + ${v.values[i]}x + ${v.values[j]}y = ${dec(m)} \\times ${N} = ${dec(m.mul(N))}$`, 'Total of the values = mean × number.'),
        step('P1', `$${v.values[i]}x + ${v.values[j]}y = ${dec(m.mul(N).sub(S0))}$`, 'Take off the part of the total you already know.'),
        step('M1', `Solve $x + y = ${a + b}$ and $${v.values[i]}x + ${v.values[j]}y = ${dec(m.mul(N).sub(S0))}$ simultaneously`, `E.g. multiply the first by ${v.values[i]} and subtract.`),
        step('A1', `$x = ${a}$, $y = ${b}$`, 'Check both in the table: do they give the right total and mean?'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Mean from the raw list; mode by counting.
      const list: number[] = [];
      v.values.forEach((x, i) => {
        for (let k = 0; k < v.freqs[i]; k++) list.push(x);
      });
      const counts = new Map<number, number>();
      list.forEach((x) => counts.set(x, (counts.get(x) ?? 0) + 1));
      const mode = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      if (answers[0].text !== `${mode}`) p.push('mode');
      const sorted = [...list].sort((a, b) => a - b);
      const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
      if (Number(answers[1].text) !== mid) p.push('median');
      if (!Q.of(answers[2].text).eq(Q.of(sum(list), list.length))) p.push('mean');
      return p;
    }
    // Put the answered frequencies back into the table and recompute the mean.
    const got = (answers[0].text.match(/= (\d+)/g) ?? []).map((s) => Number(s.slice(2)));
    const freqs = [...v.freqs];
    v.unknown.forEach((idx, k) => (freqs[idx] = got[k]));
    const totalOk = v.level === 'core' || sum(freqs) === n(v);
    if (!totalOk || !Q.of(sum(v.values.map((x, i) => x * freqs[i])), sum(freqs)).eq(mean(v))) p.push('frequencies do not give the stated mean');
    return p;
  },

  key: (v) => `${v.freqs}|${v.unknown}`,
});
