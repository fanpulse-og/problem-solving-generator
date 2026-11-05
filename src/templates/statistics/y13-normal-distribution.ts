import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { between, invPhi, normCdf } from '../../engine/distributions';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/31 normal distribution (June 2025 Q5): probabilities and an
 * inverse, a missing standard deviation with a conditional probability, and both
 * parameters from two percentages, solved as simultaneous equations.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  mu: number;
  sigma: Q;
  a: number;
  b: number;
  p: Q;
  c: number;
  p2: Q;
}

const CTX = [
  { what: 'the heights of the men in a sports club', one: 'a man', adj: 'height', unit: 'cm', mu: [170, 190], sd: [4, 9], w: 1 },
  { what: 'the masses of apples from an orchard', one: 'an apple', adj: 'mass', unit: 'g', mu: [120, 180], sd: [8, 15], w: 2 },
  { what: 'the times taken by runners to finish a race', one: 'a runner', adj: 'time', unit: 'minutes', mu: [40, 70], sd: [4, 9], w: 1 },
];

export default defineTemplate<V>({
  id: 'y13-normal-distribution',
  title: 'The normal distribution',
  strand: 'Statistics',
  subtopic: 'Normal distribution',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const c = CTX[ctx];
    const mu = rng.int(c.mu[0], c.mu[1]);
    const base: V = { level, ctx, mu, sigma: Q.of(0), a: 0, b: 0, p: Q.of(0), c: 0, p2: Q.of(0) };
    if (level === 'foundational') {
      const sigma = Q.of(rng.int(c.sd[0] * 10, c.sd[1] * 10), 10);
      const s = sigma.toNumber();
      const a = Math.round(mu + s * (rng.int(3, 15) / 10));
      const b = Math.round(mu - s * (rng.int(3, 15) / 10));
      ensure(a > b, 'a real interval');
      return { ...base, sigma, a, b, p: Q.of(rng.pick([10, 15, 20, 25, 30, 70, 75, 80, 85, 90]), 100) };
    }
    if (level === 'core') {
      const p = Q.of(rng.pick([5, 10, 15, 20, 25, 30, 35, 40]), 100);
      const a = mu + rng.int(2, 15);
      const sd = (a - mu) / invPhi(1 - p.toNumber());
      ensure(sd > 1 && sd < 40, 'a believable spread');
      const b = a + Math.max(1, Math.round(sd * (rng.int(3, 10) / 10)));
      return { ...base, a, b, p };
    }
    const p = Q.of(rng.pick([10, 15, 20, 25, 30, 40]), 100);
    const p2 = Q.of(rng.pick([10, 15, 20, 25, 30, 40]), 100);
    const a = mu - rng.int(2, 10);
    const b = a + rng.int(4, 25);
    const za = invPhi(p.toNumber());
    const zb = invPhi(1 - p2.toNumber());
    ensure(zb > za, 'the two values are in order');
    return { ...base, a, b, p, p2 };
  },

  validate(v) {
    return v.level === 'foundational' && !v.sigma.isPositive() ? ['the standard deviation must be positive'] : [];
  },

  render(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      return {
        stem: lines(`The random variable $X$ represents ${c.what}, in ${c.unit}.`, `$X \\sim \\mathrm{N}(${v.mu}, ${dec(v.sigma)}^2)$`, 'Give your answers to 3 significant figures.'),
        parts: [
          part('a', 1, text(`Find  $\\mathrm{P}(X > ${v.a})$`)),
          part('b', 2, text(`Find  $\\mathrm{P}(${v.b} < X < ${v.a})$`)),
          part('c', 2, text(`Find the value of $k$ such that  $\\mathrm{P}(X < k) = ${dec(v.p)}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`The random variable $X$ represents ${c.what}, in ${c.unit}.`, `$X$ is normally distributed with mean ${v.mu} and standard deviation $\\sigma$`, 'Give your answers to 3 significant figures.', `Given that  $\\mathrm{P}(X > ${v.a}) = ${dec(v.p)}$,`),
        parts: [
          part('a', 3, text('find the value of $\\sigma$')),
          part('b', 3, text(`find  $\\mathrm{P}(X > ${v.b} \\mid X > ${v.a})$`)),
        ],
      };
    }
    return {
      stem: lines(`The random variable $X$ represents ${c.what}, in ${c.unit}, and is normally distributed.`, `${dec(v.p.mul(100))}% of values are less than ${v.a} and ${dec(v.p2.mul(100))}% of values are greater than ${v.b}`, 'Give your answers to 3 significant figures.'),
      parts: [
        part('a', 5, text('Find the mean and the standard deviation of $X$. Show your working clearly.')),
        part('b', 3, text(`Two values of $X$ are chosen at random, independently. Find the probability that both lie between ${v.a} and ${v.b}.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const s = v.sigma.toNumber();
      return [{ text: sf3(1 - normCdf(v.mu, s, v.a)) }, { text: sf3(normCdf(v.mu, s, v.a) - normCdf(v.mu, s, v.b)) }, { text: `$k = ${sf3(v.mu + invPhi(v.p.toNumber()) * s)}$` }];
    }
    if (v.level === 'core') {
      const s = (v.a - v.mu) / invPhi(1 - v.p.toNumber());
      const cond = (1 - normCdf(v.mu, s, v.b)) / v.p.toNumber();
      ensure(between(cond), 'a sensible conditional probability');
      return [{ text: `$\\sigma = ${sf3(s)}$` }, { text: sf3(cond) }];
    }
    const [za, zb] = [invPhi(v.p.toNumber()), invPhi(1 - v.p2.toNumber())];
    const s = (v.b - v.a) / (zb - za);
    const mu = v.a - za * s;
    const inside = 1 - v.p.toNumber() - v.p2.toNumber();
    return [{ text: `Mean ${sf3(mu)}, standard deviation ${sf3(s)}` }, { text: sf3(inside * inside) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const s = v.sigma.toNumber();
      return [
        [step('B1', sf3(1 - normCdf(v.mu, s, v.a)), 'Use the normal distribution on your calculator.')],
        [step('M1', `$\\mathrm{P}(X < ${v.a}) - \\mathrm{P}(X < ${v.b})$`, 'Or enter both limits directly.'), step('A1', sf3(normCdf(v.mu, s, v.a) - normCdf(v.mu, s, v.b)), 'Between the two values.')],
        [step('M1', `$\\frac{k - ${v.mu}}{${dec(v.sigma)}} = ${roundFloatDp(invPhi(v.p.toNumber()), 4)}$`, 'Inverse normal, or the percentage points table.'), step('A1', `$k = ${sf3(v.mu + invPhi(v.p.toNumber()) * s)}$`, 'A check: below the mean if the probability is under 0.5.')],
      ];
    }
    if (v.level === 'core') {
      const z = invPhi(1 - v.p.toNumber());
      const s = (v.a - v.mu) / z;
      const top = 1 - normCdf(v.mu, s, v.b);
      return [
        [step('M1', `$z = ${roundFloatDp(z, 4)}$`, `Use the inverse normal for ${dec(Q.of(1).sub(v.p))}.`), step('M1', `$\\frac{${v.a} - ${v.mu}}{\\sigma} = ${roundFloatDp(z, 4)}$`, 'Standardise.'), step('A1', `$\\sigma = ${sf3(s)}$`, 'Rearrange.')],
        [
          step('M1', `$\\frac{\\mathrm{P}(X > ${v.b} \\cap X > ${v.a})}{\\mathrm{P}(X > ${v.a})}$`, 'The formula for conditional probability.'),
          step('M1', `$\\frac{\\mathrm{P}(X > ${v.b})}{${dec(v.p)}} = \\frac{${sf3(top)}}{${dec(v.p)}}$`, `Anything above ${v.b} is already above ${v.a}, so the top simplifies.`),
          step('A1', sf3(top / v.p.toNumber()), 'Use the unrounded value of σ.'),
        ],
      ];
    }
    const [za, zb] = [invPhi(v.p.toNumber()), invPhi(1 - v.p2.toNumber())];
    const s = (v.b - v.a) / (zb - za);
    const mu = v.a - za * s;
    const inside = 1 - v.p.toNumber() - v.p2.toNumber();
    return [
      [
        step('M1', `$\\frac{${v.a} - \\mu}{\\sigma} = ${roundFloatDp(za, 4)}$`, 'Standardise using the first percentage.'),
        step('M1', `$\\frac{${v.b} - \\mu}{\\sigma} = ${roundFloatDp(zb, 4)}$`, `For the second, use ${dec(Q.of(1).sub(v.p2))} in the inverse normal, as it is an upper tail.`),
        step('M1', `$${v.b} - ${v.a} = (${roundFloatDp(zb, 4)} - (${roundFloatDp(za, 4)}))\\sigma$`, 'Subtract to remove μ.'),
        step('A1', `$\\sigma = ${sf3(s)}$`, 'Solve.'),
        step('A1', `$\\mu = ${sf3(mu)}$`, 'Substitute back, using the unrounded σ.'),
      ],
      [
        step('M1', `$1 - ${dec(v.p)} - ${dec(v.p2)} = ${dec(Q.of(1).sub(v.p).sub(v.p2))}$`, 'You can get this straight from the percentages given.'),
        step('M1', `$${dec(Q.of(1).sub(v.p).sub(v.p2))}^2$`, 'Independent, so multiply.'),
        step('A1', sf3(inside * inside), 'To 3 significant figures.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'stretch') {
      const shown = answers[0].text.match(/Mean ([\d.]+), standard deviation ([\d.]+)/)!;
      const [za, zb] = [invPhi(v.p.toNumber()), invPhi(1 - v.p2.toNumber())];
      const s = (v.b - v.a) / (zb - za);
      const mu = v.a - za * s;
      // Both percentages must come back from the model.
      if (Math.abs(normCdf(mu, s, v.a) - v.p.toNumber()) > 1e-6 || Math.abs(1 - normCdf(mu, s, v.b) - v.p2.toNumber()) > 1e-6) return ['percentages'];
      return shown ? [] : ['format'];
    }
    if (v.level === 'core') {
      const s = (v.a - v.mu) / invPhi(1 - v.p.toNumber());
      return Math.abs(1 - normCdf(v.mu, s, v.a) - v.p.toNumber()) < 1e-6 ? [] : ['sigma'];
    }
    // Numerical integration of the density between the limits.
    const s = v.sigma.toNumber();
    const pdf = (x: number) => Math.exp(-(((x - v.mu) / s) ** 2) / 2) / (s * Math.sqrt(2 * Math.PI));
    let area = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) area += pdf(v.b + ((v.a - v.b) * (i + 0.5)) / n) * ((v.a - v.b) / n);
    return Math.abs(area - (normCdf(v.mu, s, v.a) - normCdf(v.mu, s, v.b))) < 1e-6 ? [] : ['area'];
  },

  key: (v) => `${v.mu}|${v.sigma}|${v.a}|${v.b}|${v.p}|${v.p2}`,
});
