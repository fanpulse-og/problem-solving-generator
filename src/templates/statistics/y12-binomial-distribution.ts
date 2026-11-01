import { defineTemplate } from '../../engine/types';
import { lines, part, step, table, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { between, binomCdf, binomPdf } from '../../engine/distributions';
import { nCr, sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/21 binomial questions (June 2025 Q1 and Q3a): probabilities from
 * B(n, p), a binomial built on another binomial probability, and proportions in
 * a table that must first be solved to find p.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  n: number;
  p: Q;
  k: number;
  low: number;
  m: number; // core: number of boxes
  j: number;
  mult: number; // stretch: colour proportions p, c, mult × p
  c: Q;
}

const ITEMS = [
  { thing: 'a seed', event: 'germinates', group: 'packet', groups: 'packets', many: 'seeds', big: 'tray' },
  { thing: 'a bulb', event: 'is faulty', group: 'box', groups: 'boxes', many: 'bulbs', big: 'crate' },
  { thing: 'an email', event: 'is opened', group: 'batch', groups: 'batches', many: 'emails', big: 'campaign' },
];

export default defineTemplate<V>({
  id: 'y12-binomial-distribution',
  title: 'The binomial distribution',
  strand: 'Statistics',
  subtopic: 'Binomial distribution',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, ctx: rng.int(0, ITEMS.length - 1), n: 0, p: Q.of(0), k: 0, low: 0, m: 0, j: 0, mult: 0, c: Q.of(0) };
    if (level === 'stretch') {
      const denom = rng.pick([10, 20]);
      const pn = rng.int(1, denom === 10 ? 2 : 4);
      const p = Q.of(pn, denom);
      const mult = rng.int(2, 5);
      const c = Q.of(1).sub(p.mul(1 + mult));
      ensure(c.isPositive() && c.terminatesWithin(2), 'a real third proportion');
      const n = rng.step(20, 50, 5);
      const mean = n * p.toNumber();
      const low = Math.max(1, Math.round(mean) - rng.int(1, 3));
      const k = Math.round(mean) + rng.int(1, 3);
      ensure(between(binomCdf(n, p.toNumber(), k) - binomCdf(n, p.toNumber(), low)), 'a sensible probability');
      return { ...base, p, mult, c, n, low, k };
    }
    const n = rng.step(10, 40, 5);
    const p = Q.of(rng.int(5, 45), 100);
    const k = Math.round(n * p.toNumber()) + rng.int(-1, 2);
    ensure(k >= 1 && k < n, 'a value within range');
    const pp = p.toNumber();
    ensure(between(binomPdf(n, pp, k), 0.01) && between(binomCdf(n, pp, k), 0.02, 0.98), 'sensible probabilities');
    if (level === 'foundational') return { ...base, n, p, k, low: Math.max(0, k - rng.int(2, 4)) };
    const m = rng.int(4, 12);
    const j = rng.int(1, 3);
    const q = binomCdf(n, pp, k);
    ensure(between(binomPdf(m, q, j), 0.01), 'a sensible probability');
    return { ...base, n, p, k, m, j };
  },

  validate(v) {
    return v.k <= v.n ? [] : ['k must be possible'];
  },

  render(v) {
    const p = dec(v.p);
    if (v.level === 'foundational') {
      return {
        stem: lines(`The random variable  $X \\sim \\mathrm{B}(${v.n}, ${p})$`, 'Give your answers to 3 significant figures.'),
        parts: [
          part('a', 1, text(`Find  $\\mathrm{P}(X = ${v.k})$`)),
          part('b', 1, text(`Find  $\\mathrm{P}(X \\leqslant ${v.k})$`)),
          part('c', 2, text(`Find  $\\mathrm{P}(${v.low} < X \\leqslant ${v.k})$`)),
        ],
      };
    }
    if (v.level === 'core') {
      const it = ITEMS[v.ctx];
      return {
        stem: lines(`The probability that ${it.thing} ${it.event} is ${p}`, `A ${it.group} contains ${v.n} ${it.many}. The random variable $X$ is the number of ${it.many} in the ${it.group} for which this happens.`, 'Give your answers to 3 significant figures.'),
        parts: [
          part('a', 2, text(`State one assumption needed for $X$ to be modelled by a binomial distribution, and write down the distribution of $X$.`)),
          part('b', 1, text(`Find  $\\mathrm{P}(X = ${v.k})$`)),
          part('c', 3, text(`A ${it.big} holds ${v.m} of these ${it.groups}, independently of each other. A ${it.group} is called "low" when  $X \\leqslant ${v.k}$`), text(`Find the probability that exactly ${v.j} of the ${it.groups} in a ${it.big} are low.`)),
        ],
      };
    }
    return {
      stem: [...lines('A bag contains red, green and white counters only.', 'The table shows the proportion of each colour.'), table({ header: ['Colour', 'red', 'green', 'white'], rows: [['Proportion', '$p$', dec(v.c), `$${v.mult}p$`]] }), ...lines(`A counter is taken at random and replaced, ${v.n} times. $X$ is the number of red counters taken.`, 'Give probabilities to 3 significant figures.')],
      parts: [
        part('a', 3, text('Find the distribution of $X$.')),
        part('b', 2, text(`Find  $\\mathrm{P}(${v.low} < X \\leqslant ${v.k})$`)),
        part('c', 2, text('Find the smallest value of $a$ for which  $\\mathrm{P}(X \\leqslant a) > 0.9$')),
      ],
    };
  },

  answer(v) {
    const pp = v.p.toNumber();
    if (v.level === 'foundational') return [{ text: sf3(binomPdf(v.n, pp, v.k)) }, { text: sf3(binomCdf(v.n, pp, v.k)) }, { text: sf3(binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.low)) }];
    if (v.level === 'core') {
      const q = binomCdf(v.n, pp, v.k);
      return [{ text: `Independent outcomes, say; $X \\sim \\mathrm{B}(${v.n}, ${dec(v.p)})$` }, { text: sf3(binomPdf(v.n, pp, v.k)) }, { text: sf3(binomPdf(v.m, q, v.j)) }];
    }
    let a = 0;
    while (binomCdf(v.n, pp, a) <= 0.9) a++;
    return [{ text: `$X \\sim \\mathrm{B}(${v.n}, ${dec(v.p)})$` }, { text: sf3(binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.low)) }, { text: `$a = ${a}$` }];
  },

  markScheme(v) {
    const pp = v.p.toNumber();
    const p = dec(v.p);
    if (v.level === 'foundational') {
      return [
        [step('B1', sf3(binomPdf(v.n, pp, v.k)), `Binomial probability on your calculator, or use C(${v.n}, ${v.k}) × ${p}^${v.k} × ${dec(Q.of(1).sub(v.p))}^${v.n - v.k}.`)],
        [step('B1', sf3(binomCdf(v.n, pp, v.k)), 'Cumulative binomial on your calculator.')],
        [step('M1', `$\\mathrm{P}(X \\leqslant ${v.k}) - \\mathrm{P}(X \\leqslant ${v.low})$`, `X is more than ${v.low}, so X = ${v.low} must be taken away.`), step('A1', sf3(binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.low)), 'Use the unrounded values.')],
      ];
    }
    if (v.level === 'core') {
      const q = binomCdf(v.n, pp, v.k);
      return [
        [step('B1', 'For example, the outcomes are independent.', 'Or: the probability is constant for each one.'), step('B1', `$X \\sim \\mathrm{B}(${v.n}, ${p})$`, 'Give both n and p.')],
        [step('B1', sf3(binomPdf(v.n, pp, v.k)), 'Binomial probability.')],
        [
          step('M1', `$\\mathrm{P}(\\text{low}) = \\mathrm{P}(X \\leqslant ${v.k}) = ${sf3(q)}$`, 'First find the chance of one being low.'),
          step('M1', `$Y \\sim \\mathrm{B}(${v.m}, ${sf3(q)})$`, 'A second binomial: each one is low or not.'),
          step('A1', sf3(binomPdf(v.m, q, v.j)), 'Use the unrounded probability.'),
        ],
      ];
    }
    let a = 0;
    while (binomCdf(v.n, pp, a) <= 0.9) a++;
    return [
      [
        step('M1', `$p + ${dec(v.c)} + ${v.mult}p = 1$`, 'The proportions add up to 1.'),
        step('A1', `$p = ${p}$`, 'Solve the equation.'),
        step('A1', `$X \\sim \\mathrm{B}(${v.n}, ${p})$`, 'Taking with replacement keeps the probability constant.'),
      ],
      [step('M1', `$\\mathrm{P}(X \\leqslant ${v.k}) - \\mathrm{P}(X \\leqslant ${v.low})$`, 'Take care with which end is included.'), step('A1', sf3(binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.low)), 'Use the unrounded values.')],
      [step('M1', `$\\mathrm{P}(X \\leqslant ${a - 1}) = ${sf3(binomCdf(v.n, pp, a - 1))}$, $\\mathrm{P}(X \\leqslant ${a}) = ${sf3(binomCdf(v.n, pp, a))}$`, 'Try values either side of 0.9.'), step('A1', `$a = ${a}$`, 'The first value to pass 0.9.')],
    ];
  },

  check(v, answers) {
    // Simulate nothing: sum the whole distribution by repeated multiplication instead of nCr.
    const p = v.p.toNumber();
    const dist = [1];
    for (let i = 0; i < v.n; i++) {
      const next = new Array(dist.length + 1).fill(0);
      dist.forEach((d, j) => {
        next[j] += d * (1 - p);
        next[j + 1] += d * p;
      });
      dist.splice(0, dist.length, ...next);
    }
    if (Math.abs(dist.reduce((s, x) => s + x, 0) - 1) > 1e-9) return ['total'];
    if (Math.abs(dist[v.k] - binomPdf(v.n, p, v.k)) > 1e-9) return ['pdf'];
    if (Math.abs(nCr(v.n, v.k) * p ** v.k * (1 - p) ** (v.n - v.k) - dist[v.k]) > 1e-9) return ['nCr'];
    return answers.length ? [] : ['answers'];
  },

  key: (v) => `${v.n}|${v.p}|${v.k}|${v.low}|${v.m}|${v.j}|${v.mult}`,
});
