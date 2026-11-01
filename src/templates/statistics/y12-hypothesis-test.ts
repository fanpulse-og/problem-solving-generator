import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { binomCdf } from '../../engine/distributions';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/21 hypothesis tests (June 2025 Q3b): hypotheses, a p-value and a
 * conclusion in context, then critical regions, including a two-tailed test and
 * the actual significance level.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  n: number;
  p: Q;
  x: number;
  up: boolean; // the claim is that the proportion has increased
  alpha: number; // percent
}

const CTX = [
  { who: 'A football coach', what: 'a player scores from a penalty', noun: 'penalties', hit: 'scored' },
  { who: 'A shop manager', what: 'a customer buys a loyalty card', noun: 'customers', hit: 'bought one' },
  { who: 'A doctor', what: 'a patient recovers within a week', noun: 'patients', hit: 'recovered' },
];

const upper = (n: number, p: number, x: number) => 1 - binomCdf(n, p, x - 1);
const pValue = (v: V) => (v.up ? upper(v.n, v.p.toNumber(), v.x) : binomCdf(v.n, v.p.toNumber(), v.x));

/** Two-tailed critical region at alpha/2 in each tail. */
function region(v: V) {
  const p = v.p.toNumber();
  const tail = v.alpha / 200;
  let lo = -1;
  while (binomCdf(v.n, p, lo + 1) <= tail) lo++;
  let hi = v.n + 1;
  while (upper(v.n, p, hi - 1) <= tail) hi--;
  return { lo, hi, actual: (lo >= 0 ? binomCdf(v.n, p, lo) : 0) + (hi <= v.n ? upper(v.n, p, hi) : 0) };
}

export default defineTemplate<V>({
  id: 'y12-hypothesis-test',
  title: 'Binomial hypothesis tests',
  strand: 'Statistics',
  subtopic: 'Hypothesis testing',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const n = rng.step(15, 50, 5);
    const p = Q.of(rng.pick([15, 20, 25, 30, 35, 40, 45]), 100);
    const up = rng.chance(0.5);
    const alpha = rng.pick([1, 5, 10]);
    const mean = n * p.toNumber();
    const sd = Math.sqrt(mean * (1 - p.toNumber()));
    if (level === 'stretch') {
      const v: V = { level, ctx, n, p, x: 0, up, alpha: rng.pick([5, 10]) };
      const { lo, hi } = region(v);
      ensure(lo >= 0 && hi <= n, 'a region in both tails');
      const x = rng.chance(0.5) ? lo - rng.int(0, 1) : hi + rng.int(0, 1);
      ensure(x >= 0 && x <= n, 'a possible count');
      return { ...v, x: rng.chance(0.5) ? x : Math.round(mean) + rng.int(1, 2) };
    }
    const x = Math.round(mean + (up ? 1 : -1) * sd * (rng.int(10, 26) / 10));
    ensure(x > 0 && x < n, 'a possible count');
    const v: V = { level, ctx, n, p, x, up, alpha };
    const pv = pValue(v);
    // A decision too close to the line is a poor question.
    ensure(Math.abs(pv - alpha / 100) > 0.002, 'a clear decision');
    return v;
  },

  validate(v) {
    return v.x >= 0 && v.x <= v.n ? [] : ['the count must be possible'];
  },

  render(v) {
    const c = CTX[v.ctx];
    const p = dec(v.p);
    const intro = lines(`In the past, the probability that ${c.what} has been ${p}`, `${c.who} believes that this probability is now ${v.up ? 'greater' : 'less'} than ${p}`, `In a random sample of ${v.n} ${c.noun}, ${v.x} ${c.hit}.`);
    if (v.level === 'foundational') {
      return {
        stem: intro,
        parts: [
          part('a', 1, text('Write down suitable hypotheses.')),
          part('b', 2, text('Find the $p$-value for this sample, giving your answer to 3 significant figures.')),
          part('c', 2, text(`Test the belief at the ${v.alpha}% level of significance, giving your conclusion in context.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: intro,
        parts: [
          part('a', 5, text(`Use a suitable test to assess this belief. You should state your hypotheses clearly, use a ${v.alpha}% level of significance, and state the $p$-value for the test to 3 significant figures.`)),
          part('b', 1, text('State one assumption you have made in carrying out this test.')),
        ],
      };
    }
    return {
      stem: lines(`In the past, the probability that ${c.what} has been ${p}`, `${c.who} wants to test whether this probability has changed, using a sample of ${v.n} ${c.noun}.`),
      parts: [
        part('a', 1, text('Write down suitable hypotheses.')),
        part('b', 3, text(`Using a ${v.alpha}% level of significance, with the probability in each tail as close as possible to but not more than ${dec(Q.of(v.alpha, 2))}%, find the critical region.`)),
        part('c', 1, text('Find the actual significance level of the test, giving your answer to 3 significant figures.')),
        part('d', 2, text(`In the sample, ${v.x} ${c.hit}. State, with a reason, the conclusion of the test.`)),
      ],
    };
  },

  answer(v) {
    const p = dec(v.p);
    const H1 = v.up ? '>' : '<';
    if (v.level === 'stretch') {
      const { lo, hi, actual } = region(v);
      const inRegion = v.x <= lo || v.x >= hi;
      return [
        { text: `$\\mathrm{H}_0: p = ${p}$, $\\mathrm{H}_1: p \\neq ${p}$` },
        { text: `$X \\leqslant ${lo}$ or $X \\geqslant ${hi}$` },
        { text: sf3(actual) },
        { text: inRegion ? 'In the critical region: reject $\\mathrm{H}_0$. There is evidence of a change.' : 'Not in the critical region: do not reject $\\mathrm{H}_0$. There is no evidence of a change.' },
      ];
    }
    const pv = pValue(v);
    const reject = pv < v.alpha / 100;
    const verdict = reject ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.';
    if (v.level === 'foundational') return [{ text: `$\\mathrm{H}_0: p = ${p}$, $\\mathrm{H}_1: p ${H1} ${p}$` }, { text: sf3(pv) }, { text: verdict }];
    return [{ text: `$\\mathrm{H}_0: p = ${p}$, $\\mathrm{H}_1: p ${H1} ${p}$; $p$-value ${sf3(pv)}. ${verdict}` }, { text: 'For example, the sample is random, so outcomes are independent.' }];
  },

  markScheme(v) {
    const p = dec(v.p);
    const H1 = v.up ? '>' : '<';
    const Hs = `$\\mathrm{H}_0: p = ${p}$, $\\mathrm{H}_1: p ${H1} ${p}$`;
    const sign = v.up ? `\\geqslant` : `\\leqslant`;
    if (v.level === 'stretch') {
      const { lo, hi, actual } = region(v);
      const pp = v.p.toNumber();
      const inRegion = v.x <= lo || v.x >= hi;
      return [
        [step('B1', `$\\mathrm{H}_0: p = ${p}$, $\\mathrm{H}_1: p \\neq ${p}$`, '"Changed" could mean up or down, so this test has two tails.')],
        [
          step('M1', `$X \\sim \\mathrm{B}(${v.n}, ${p})$`, 'Assume the null hypothesis is true.'),
          step('A1', `$\\mathrm{P}(X \\leqslant ${lo}) = ${sf3(Math.max(binomCdf(v.n, pp, lo), 1e-6))}$`, `Lower tail, as close as possible to ${dec(Q.of(v.alpha, 2))}% without going over.`),
          step('A1', `$\\mathrm{P}(X \\geqslant ${hi}) = ${sf3(Math.max(upper(v.n, pp, hi), 1e-6))}$`, 'Upper tail in the same way.'),
        ],
        [step('B1', sf3(actual), 'Add the two tail probabilities.')],
        [step('M1', `$${v.x}$ is ${inRegion ? '' : 'not '}in the critical region`, 'Compare the observed value with the region.'), step('A1', inRegion ? 'Reject $\\mathrm{H}_0$. There is evidence of a change.' : 'Do not reject $\\mathrm{H}_0$. There is no evidence of a change.', 'Say it in the context of the question.')],
      ];
    }
    const pv = pValue(v);
    const reject = pv < v.alpha / 100;
    const conclusion = reject ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.';
    if (v.level === 'foundational') {
      return [
        [step('B1', Hs, 'The belief goes in the alternative hypothesis.')],
        [step('M1', `$X \\sim \\mathrm{B}(${v.n}, ${p})$;  $\\mathrm{P}(X ${sign} ${v.x})$`, 'Include the observed value in the tail.'), step('A1', sf3(pv), v.up ? 'One minus the probability of a value up to one below it.' : 'Cumulative binomial.')],
        [step('M1', `$${sf3(pv)} ${reject ? '<' : '>'} ${dec(Q.of(v.alpha, 100))}$`, 'Compare the p-value with the significance level.'), step('A1', conclusion, 'Conclude in context, without claiming proof.')],
      ];
    }
    return [
      [
        step('B1', Hs, 'The belief goes in the alternative hypothesis.'),
        step('M1', `$X \\sim \\mathrm{B}(${v.n}, ${p})$`, 'The model if the null hypothesis is true.'),
        step('A1', `$\\mathrm{P}(X ${sign} ${v.x}) = ${sf3(pv)}$`, 'This is the p-value.'),
        step('M1', `$${sf3(pv)} ${reject ? '<' : '>'} ${dec(Q.of(v.alpha, 100))}$`, 'Compare with the level of significance.'),
        step('A1', conclusion, 'Conclude in context.'),
      ],
      [step('B1', 'For example, the sample is random, so outcomes are independent.', 'Or the probability is the same for each one.')],
    ];
  },

  check(v, answers) {
    const p = v.p.toNumber();
    if (v.level === 'stretch') {
      // Each tail keeps within its limit, and one step further would break it.
      const { lo, hi } = region(v);
      const t = v.alpha / 200;
      if (binomCdf(v.n, p, lo) > t || binomCdf(v.n, p, lo + 1) <= t) return ['lower tail'];
      if (upper(v.n, p, hi) > t || upper(v.n, p, hi - 1) <= t) return ['upper tail'];
      return [];
    }
    // Direct sum of the tail.
    let tail = 0;
    let term = (1 - p) ** v.n;
    for (let i = 0; i <= v.n; i++) {
      if (v.up ? i >= v.x : i <= v.x) tail += term;
      term = (term * (v.n - i) * p) / ((i + 1) * (1 - p));
    }
    return Math.abs(tail - pValue(v)) < 1e-9 && answers.length > 0 ? [] : ['tail'];
  },

  key: (v) => `${v.n}|${v.p}|${v.x}|${v.up}|${v.alpha}`,
});
