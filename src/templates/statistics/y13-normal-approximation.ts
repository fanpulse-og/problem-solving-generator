import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { between, binomCdf, normCdf } from '../../engine/distributions';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on the 9MA0/31 normal approximation to the binomial: the conditions,
 * a continuity correction, a percentage error against the exact binomial, and a
 * test for a proportion with a large sample.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  n: number;
  p: Q;
  k: number;
  j: number;
  alpha: number;
}

const CTX = [
  { thing: 'a seed', event: 'germinates', many: 'seeds', hit: 'germinated' },
  { thing: 'a customer', event: 'buys a drink', many: 'customers', hit: 'bought a drink' },
  { thing: 'a component', event: 'is faulty', many: 'components', hit: 'were faulty' },
];
const mean = (v: V) => v.n * v.p.toNumber();
const sd = (v: V) => Math.sqrt(mean(v) * (1 - v.p.toNumber()));
const upper = (v: V) => 1 - normCdf(mean(v), sd(v), v.k - 0.5);

export default defineTemplate<V>({
  id: 'y13-normal-approximation',
  title: 'Normal approximation to the binomial',
  strand: 'Statistics',
  subtopic: 'Normal distribution',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const n = rng.step(60, 300, 20);
    const p = Q.of(rng.pick([35, 40, 45, 50, 55, 60, 65]), 100);
    const v0: V = { level, ctx, n, p, k: 0, j: 0, alpha: 0 };
    const [m, s] = [mean(v0), sd(v0)];
    if (level === 'stretch') {
      const alpha = rng.pick([1, 5, 10]);
      const k = Math.round(m + s * (rng.int(10, 28) / 10));
      const v: V = { ...v0, k, alpha };
      ensure(Math.abs(upper(v) - alpha / 100) > 0.002, 'a clear decision');
      return v;
    }
    const k = Math.round(m + s * (rng.int(3, 15) / 10));
    const j = Math.round(m - s * (rng.int(3, 15) / 10));
    ensure(between(normCdf(m, s, k + 0.5) - normCdf(m, s, j - 0.5), 0.05, 0.98), 'a sensible probability');
    return { ...v0, k, j };
  },

  validate(v) {
    return mean(v) > 5 && v.n * (1 - v.p.toNumber()) > 5 ? [] : ['n must be large and p near a half'];
  },

  render(v) {
    const c = CTX[v.ctx];
    const p = dec(v.p);
    if (v.level === 'stretch') {
      return {
        stem: lines(`In the past, the probability that ${c.thing} ${c.event} has been ${p}`, 'A manager believes this probability has increased.', `In a random sample of ${v.n} ${c.many}, ${v.k} ${c.hit}.`),
        parts: [part('a', 6, text(`Using a suitable normal approximation, test the manager’s belief at the ${v.alpha}% level of significance. State your hypotheses clearly and give the $p$-value to 3 significant figures.`))],
      };
    }
    const stem = lines(`The probability that ${c.thing} ${c.event} is ${p}`, `$X$ is the number in a random sample of ${v.n} ${c.many} for which this happens.`);
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 1, text('Explain why $X$ can be approximated by a normal distribution.')),
          part('b', 2, text('Write down the mean and the variance of this normal distribution.')),
          part('c', 3, text(`Use the approximation, with a continuity correction, to estimate  $\\mathrm{P}(X \\geqslant ${v.k})$,  giving your answer to 3 significant figures.`)),
        ],
      };
    }
    return {
      stem,
      parts: [
        part('a', 3, text(`Use a normal approximation to estimate  $\\mathrm{P}(${v.j} \\leqslant X \\leqslant ${v.k})$,  giving your answer to 3 significant figures.`)),
        part('b', 1, text(`Find the exact value of  $\\mathrm{P}(${v.j} \\leqslant X \\leqslant ${v.k})$  from the binomial distribution, giving your answer to 3 significant figures.`)),
        part('c', 2, text('Find the percentage error in using the approximation, giving your answer to 2 significant figures.')),
      ],
    };
  },

  answer(v) {
    const [m, s] = [mean(v), sd(v)];
    const pp = v.p.toNumber();
    if (v.level === 'foundational') {
      return [{ text: '$n$ is large and $p$ is close to 0.5.' }, { text: `Mean ${dec(Q.of(v.n).mul(v.p))}, variance ${dec(Q.of(v.n).mul(v.p).mul(Q.of(1).sub(v.p)))}` }, { text: sf3(upper(v)) }];
    }
    if (v.level === 'core') {
      const approx = normCdf(m, s, v.k + 0.5) - normCdf(m, s, v.j - 0.5);
      const exact = binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.j - 1);
      const err = (Math.abs(approx - exact) / exact) * 100;
      ensure(err > 0.001, 'an error large enough to state');
      return [{ text: sf3(approx) }, { text: sf3(exact) }, { text: `${Number(err.toPrecision(2))}%` }];
    }
    const pv = upper(v);
    return [{ text: `$\\mathrm{H}_0: p = ${dec(v.p)}$, $\\mathrm{H}_1: p > ${dec(v.p)}$; $p$-value ${sf3(pv)}. ${pv < v.alpha / 100 ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.'}` }];
  },

  markScheme(v) {
    const [m, s] = [mean(v), sd(v)];
    const pp = v.p.toNumber();
    const M = dec(Q.of(v.n).mul(v.p));
    const VAR = dec(Q.of(v.n).mul(v.p).mul(Q.of(1).sub(v.p)));
    if (v.level === 'foundational') {
      return [
        [step('B1', '$n$ is large and $p$ is close to 0.5.', 'Both conditions are needed.')],
        [step('B1', `Mean $= np = ${M}$`, 'n times p.'), step('B1', `Variance $= np(1 - p) = ${VAR}$`, 'Variance, not the standard deviation.')],
        [step('M1', `$Y \\sim \\mathrm{N}(${M}, ${VAR})$`, 'The approximating distribution.'), step('M1', `$\\mathrm{P}(Y > ${v.k - 0.5})$`, `X = ${v.k} is included, so the boundary is half a unit below it.`), step('A1', sf3(upper(v)), 'To 3 significant figures.')],
      ];
    }
    if (v.level === 'core') {
      const approx = normCdf(m, s, v.k + 0.5) - normCdf(m, s, v.j - 0.5);
      const exact = binomCdf(v.n, pp, v.k) - binomCdf(v.n, pp, v.j - 1);
      const err = (Math.abs(approx - exact) / exact) * 100;
      return [
        [step('M1', `$Y \\sim \\mathrm{N}(${M}, ${VAR})$`, 'Mean np, variance np(1 − p).'), step('M1', `$\\mathrm{P}(${v.j - 0.5} < Y < ${v.k + 0.5})$`, 'Continuity correction: extend half a unit at each end.'), step('A1', sf3(approx), 'To 3 significant figures.')],
        [step('B1', sf3(exact), `P(X ≤ ${v.k}) − P(X ≤ ${v.j - 1}).`)],
        [step('M1', `$\\frac{${roundFloatDp(approx, 4)} - ${roundFloatDp(exact, 4)}}{${roundFloatDp(exact, 4)}} \\times 100$`, 'Error over the exact value.'), step('A1', `${Number(err.toPrecision(2))}%`, 'The size of the error, to 2 significant figures.')],
      ];
    }
    const pv = upper(v);
    const reject = pv < v.alpha / 100;
    return [
      [
        step('B1', `$\\mathrm{H}_0: p = ${dec(v.p)}$, $\\mathrm{H}_1: p > ${dec(v.p)}$`, 'The belief goes in the alternative hypothesis.'),
        step('M1', `$Y \\sim \\mathrm{N}(${M}, ${VAR})$`, 'Normal approximation under the null hypothesis.'),
        step('M1', `$\\mathrm{P}(Y > ${v.k - 0.5})$`, 'Continuity correction.'),
        step('A1', sf3(pv), 'This is the p-value.'),
        step('M1', `$${sf3(pv)} ${reject ? '<' : '>'} ${dec(Q.of(v.alpha, 100))}$`, 'Compare with the level of significance.'),
        step('A1', reject ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.', 'Conclude in context.'),
      ],
    ];
  },

  check(v) {
    // With these n and p the approximation should be close to the exact binomial.
    const pp = v.p.toNumber();
    const exact = 1 - binomCdf(v.n, pp, v.k - 1);
    return Math.abs(exact - upper(v)) < 0.02 ? [] : ['approximation far from exact'];
  },

  key: (v) => `${v.n}|${v.p}|${v.k}|${v.j}|${v.alpha}`,
});
