import { defineTemplate } from '../../engine/types';
import { lines, part, step, table, text } from '../../engine/blocks';
import { dec, ensure, int, roundFloatDp } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/21 data questions: mean and standard deviation from summary
 * statistics, a grouped table with linear interpolation (June 2019 Q4, using made
 * up data rather than the large data set), and coding.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  n: number;
  sx: number;
  sxx: number;
  test: number;
  edges: number[];
  freq: number[];
  a: number;
  b: number;
}

const CTX = [
  { what: 'the time taken', unit: 'minutes', sym: 't', who: 'runners', lo: 25, hi: 60, spread: 8, start: [20, 40] },
  { what: 'the mass', unit: 'g', sym: 'm', who: 'apples', lo: 110, hi: 190, spread: 15, start: [100, 130] },
  { what: 'the length', unit: 'cm', sym: 'l', who: 'fish', lo: 20, hi: 50, spread: 6, start: [10, 30] },
];

const mids = (v: V) => v.freq.map((_, i) => (v.edges[i] + v.edges[i + 1]) / 2);
const total = (v: V) => v.freq.reduce((s, f) => s + f, 0);
const fx = (v: V) => mids(v).reduce((s, m, i) => s + m * v.freq[i], 0);
const fxx = (v: V) => mids(v).reduce((s, m, i) => s + m * m * v.freq[i], 0);
const sdFrom = (n: number, sx: number, sxx: number) => Math.sqrt(sxx / n - (sx / n) ** 2);

function median(v: V) {
  const half = total(v) / 2;
  let run = 0;
  for (let i = 0; i < v.freq.length; i++) {
    if (run + v.freq[i] >= half) return { i, before: run, value: v.edges[i] + ((half - run) / v.freq[i]) * (v.edges[i + 1] - v.edges[i]) };
    run += v.freq[i];
  }
  throw new Error('median');
}

export default defineTemplate<V>({
  id: 'y12-data-measures',
  title: 'Mean, standard deviation and interpolation',
  strand: 'Statistics',
  subtopic: 'Data & measures',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const c = CTX[ctx];
    const base: V = { level, ctx, n: 0, sx: 0, sxx: 0, test: 0, edges: [], freq: [], a: 0, b: 0 };
    if (level === 'core') {
      const start = rng.step(c.start[0], c.start[1], 5);
      const widths = [rng.pick([5, 10]), rng.pick([5, 10]), rng.pick([10, 20]), rng.pick([10, 20]), rng.pick([10, 20])];
      const edges = [start];
      widths.forEach((w) => edges.push(edges[edges.length - 1] + w));
      const freq = [rng.int(3, 12), rng.int(8, 20), rng.int(10, 25), rng.int(6, 18), rng.int(2, 10)];
      return { ...base, edges, freq };
    }
    const n = rng.pick([20, 25, 40, 50]);
    // Coded values are small; the raw values follow the context.
    const coded = level === 'stretch';
    const meanT = coded ? rng.int(2, 12) : rng.int(c.lo, c.hi);
    const spread = coded ? rng.int(1, 4) : rng.int(Math.ceil(c.spread / 2), c.spread);
    const sx = n * meanT + rng.int(-9, 9);
    const sxx = Math.round(sx ** 2 / n + n * spread * spread + rng.int(0, 40));
    ensure(sxx * n > sx * sx, 'a positive variance');
    const sd = sdFrom(n, sx, sxx);
    if (level === 'foundational') return { ...base, n, sx, sxx, test: Math.round(sx / n + sd * (rng.chance(0.5) ? rng.int(25, 40) / 10 : rng.int(5, 15) / 10)) };
    const a = rng.int(c.lo - 10, c.lo + 10);
    const b = rng.pick([2, 4, 5]);
    return { ...base, n, sx, sxx, a, b };
  },

  validate(v) {
    return v.level === 'core' ? (v.freq.length === v.edges.length - 1 ? [] : ['the table must match']) : v.n > 0 ? [] : ['n must be positive'];
  },

  render(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      return {
        stem: lines(`A student records ${c.what}, $x$ ${c.unit}, of ${v.n} ${c.who}.`, `The results are summarised by  $\\sum x = ${int(v.sx)}$  and  $\\sum x^2 = ${int(v.sxx)}$`),
        parts: [
          part('a', 1, text('Find the mean.')),
          part('b', 2, text('Find the standard deviation, giving your answer to 3 significant figures.')),
          part('c', 2, text('An outlier is defined as a value more than 2 standard deviations from the mean.'), text(`Determine whether a value of ${v.test} ${c.unit} would be an outlier.`)),
        ],
      };
    }
    if (v.level === 'core') {
      const rows = v.freq.map((f, i) => [`$${v.edges[i]} \\leqslant x < ${v.edges[i + 1]}$`, String(f)]);
      return {
        stem: [...lines(`The table shows ${c.what}, $x$ ${c.unit}, of a sample of ${total(v)} ${c.who}.`), table({ header: [`${c.what[4].toUpperCase()}${c.what.slice(5)} ($x$ ${c.unit})`, 'Frequency'], rows }), ...lines(`You may use  $\\sum fx = ${dec(Q.of(Math.round(fx(v) * 2), 2))}$  and  $\\sum fx^2 = ${dec(Q.of(Math.round(fxx(v) * 4), 4))}$`)],
        parts: [
          part('a', 2, text('Use linear interpolation to estimate the median.')),
          part('b', 1, text('Calculate an estimate for the mean.')),
          part('c', 2, text('Calculate an estimate for the standard deviation, giving your answer to 3 significant figures.')),
          part('d', 1, text('State the assumption involved in using class midpoints to estimate a mean.')),
        ],
      };
    }
    return {
      stem: lines(`A manager records ${c.what}, $x$ ${c.unit}, of ${v.n} ${c.who}.`, `The data are coded using  $y = \\frac{x - ${v.a}}{${v.b}}$`, `The coded values are summarised by  $\\sum y = ${int(v.sx)}$  and  $\\sum y^2 = ${int(v.sxx)}$`),
      parts: [
        part('a', 2, text('Find the mean and the standard deviation of $y$, giving the standard deviation to 3 significant figures.')),
        part('b', 3, text('Hence find the mean and the standard deviation of $x$.')),
      ],
    };
  },

  answer(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const mean = v.sx / v.n;
      const sd = sdFrom(v.n, v.sx, v.sxx);
      return [{ text: `${dec(Q.of(v.sx, v.n))} ${c.unit}` }, { text: `${sf3(sd)} ${c.unit}` }, { text: Math.abs(v.test - mean) > 2 * sd ? 'Yes, it is an outlier.' : 'No, it is not an outlier.' }];
    }
    if (v.level === 'core') {
      const n = total(v);
      return [{ text: `${roundFloatDp(median(v).value, 2)} ${c.unit}` }, { text: `${sf3(fx(v) / n)} ${c.unit}` }, { text: `${sf3(sdFrom(n, fx(v), fxx(v)))} ${c.unit}` }, { text: 'The data are evenly spread within each class.' }];
    }
    const my = Q.of(v.sx, v.n);
    const sy = sdFrom(v.n, v.sx, v.sxx);
    return [{ text: `Mean ${dec(my)}, standard deviation ${sf3(sy)}` }, { text: `Mean ${dec(my.mul(v.b).add(v.a))} ${c.unit}, standard deviation ${sf3(sy * v.b)} ${c.unit}` }];
  },

  markScheme(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const mean = v.sx / v.n;
      const sd = sdFrom(v.n, v.sx, v.sxx);
      const out = Math.abs(v.test - mean) > 2 * sd;
      return [
        [step('B1', `$\\frac{${int(v.sx)}}{${v.n}} = ${dec(Q.of(v.sx, v.n))}$`, 'Total divided by how many.')],
        [step('M1', `$\\sqrt{\\frac{${int(v.sxx)}}{${v.n}} - (${dec(Q.of(v.sx, v.n))})^2}$`, 'Mean of the squares minus the square of the mean, then square root.'), step('A1', `${sf3(sd)} ${c.unit}`, 'To 3 significant figures.')],
        [step('M1', `Limits: $${roundFloatDp(mean - 2 * sd, 2)}$ and $${roundFloatDp(mean + 2 * sd, 2)}$`, 'Mean ± 2 standard deviations.'), step('A1', out ? 'Yes: it is outside the limits.' : 'No: it is inside the limits.', 'Compare and state your conclusion.')],
      ];
    }
    if (v.level === 'core') {
      const n = total(v);
      const m = median(v);
      return [
        [step('M1', `$${v.edges[m.i]} + \\frac{${n / 2} - ${m.before}}{${v.freq[m.i]}} \\times ${v.edges[m.i + 1] - v.edges[m.i]}$`, `The median is the ${n / 2}th value, which falls in this class.`.replace(/(\d)th/, '$1th')), step('A1', `${roundFloatDp(m.value, 2)} ${c.unit}`, 'Take care with the class width.')],
        [step('B1', `${sf3(fx(v) / n)} ${c.unit}`, `Σfx ÷ ${n}.`)],
        [step('M1', `$\\sqrt{\\frac{\\sum fx^2}{${n}} - (\\text{mean})^2}$`, 'The same formula as for raw data.'), step('A1', `${sf3(sdFrom(n, fx(v), fxx(v)))} ${c.unit}`, 'Keep the unrounded mean.')],
        [step('B1', 'The data are evenly spread within each class.', 'So the midpoint represents each class fairly.')],
      ];
    }
    const my = Q.of(v.sx, v.n);
    const sy = sdFrom(v.n, v.sx, v.sxx);
    return [
      [step('B1', `Mean of $y$ $= ${dec(my)}$`, 'Total divided by how many.'), step('B1', `Standard deviation of $y$ $= ${sf3(sy)}$`, 'The usual formula with the y values.')],
      [
        step('M1', `$x = ${v.b}y + ${v.a}$`, 'Rearrange the coding.'),
        step('A1', `Mean $= ${v.b} \\times ${dec(my)} + ${v.a} = ${dec(my.mul(v.b).add(v.a))}$`, 'The mean is affected by multiplying and by adding.'),
        step('A1', `Standard deviation $= ${v.b} \\times ${sf3(sy)} = ${sf3(sy * v.b)}$`, 'Adding a constant does not change the spread; multiplying does.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'core') {
      // Build the data set explicitly, spread evenly through each class.
      const data: number[] = [];
      v.freq.forEach((f, i) => {
        for (let j = 0; j < f; j++) data.push((v.edges[i] + v.edges[i + 1]) / 2);
      });
      const mean = data.reduce((s, x) => s + x, 0) / data.length;
      const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / data.length;
      return Math.abs(mean - fx(v) / total(v)) < 1e-9 && Math.abs(variance - sdFrom(total(v), fx(v), fxx(v)) ** 2) < 1e-6 ? [] : ['measures'];
    }
    // Variance is never negative, and scaling by b scales the sd by b.
    const sd = sdFrom(v.n, v.sx, v.sxx);
    return sd > 0 && answers.length > 0 ? [] : ['variance'];
  },

  key: (v) => `${v.n}|${v.sx}|${v.sxx}|${v.test}|${v.edges}|${v.freq}|${v.a}|${v.b}`,
});
