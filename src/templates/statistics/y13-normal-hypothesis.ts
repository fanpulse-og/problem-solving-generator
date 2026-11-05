import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { invPhi, normCdf, phi } from '../../engine/distributions';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/31 tests for a normal mean: the distribution of the sample mean,
 * a one-tailed test with a p-value, a critical region, and the smallest sample that
 * would make the same result significant.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  mu: number;
  sigma: number;
  n: number;
  xbar: Q;
  up: boolean;
  alpha: number;
}

const CTX = [
  { what: 'A machine fills bottles', noun: 'the volume of juice in a bottle', unit: 'ml', mean: [300, 500], sd: [4, 12], claim: 'bottles' },
  { what: 'A factory makes batteries', noun: 'the lifetime of a battery', unit: 'hours', mean: [60, 120], sd: [4, 10], claim: 'batteries' },
  { what: 'A bakery makes loaves', noun: 'the mass of a loaf', unit: 'g', mean: [400, 800], sd: [6, 15], claim: 'loaves' },
];
const zOf = (v: V) => (v.xbar.toNumber() - v.mu) / (v.sigma / Math.sqrt(v.n));
const pValue = (v: V) => (v.up ? 1 - phi(zOf(v)) : phi(zOf(v)));

export default defineTemplate<V>({
  id: 'y13-normal-hypothesis',
  title: 'Hypothesis tests for a normal mean',
  strand: 'Statistics',
  subtopic: 'Hypothesis testing',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  styleByLevel: { foundational: 'multi-step' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const c = CTX[ctx];
    const mu = rng.step(c.mean[0], c.mean[1], 10);
    const sigma = rng.int(c.sd[0], c.sd[1]);
    const n = rng.pick([16, 20, 25, 30, 36, 40, 50, 64]);
    const up = rng.chance(0.5);
    const alpha = rng.pick([1, 5, 10]);
    const se = sigma / Math.sqrt(n);
    const shift = se * (rng.int(8, 30) / 10) * (up ? 1 : -1);
    const xbar = Q.of(Math.round((mu + shift) * 10), 10);
    ensure(!xbar.eq(mu), 'the sample mean must differ from the old mean');
    const v: V = { level, ctx, mu, sigma, n, xbar, up, alpha };
    ensure(Math.abs(pValue(v) - alpha / 100) > 0.002, 'a clear decision');
    return v;
  },

  validate(v) {
    return v.sigma > 0 ? [] : ['the standard deviation must be positive'];
  },

  render(v) {
    const c = CTX[v.ctx];
    const xb = dec(v.xbar);
    const intro = lines(`${c.what}. The random variable $X$ is ${c.noun}, in ${c.unit}, and  $X \\sim \\mathrm{N}(${v.mu}, ${v.sigma}^2)$`);
    const after = `After a change to the process, the manager believes that the mean has ${v.up ? 'increased' : 'decreased'}. The standard deviation is unchanged.`;
    if (v.level === 'foundational') {
      return {
        stem: [...intro, ...lines(`A random sample of ${v.n} ${c.claim} is taken. $\\overline{X}$ is the sample mean.`)],
        parts: [
          part('a', 2, text('Write down the distribution of $\\overline{X}$')),
          part('b', 2, text(`Find  $\\mathrm{P}(\\overline{X} ${v.up ? '>' : '<'} ${xb})$,  giving your answer to 3 significant figures.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [...intro, ...lines(after, `A random sample of ${v.n} ${c.claim} has a mean of ${xb} ${c.unit}.`)],
        parts: [part('a', 5, text(`Test the manager’s belief at the ${v.alpha}% level of significance, stating your hypotheses clearly and giving the $p$-value to 3 significant figures.`))],
      };
    }
    return {
      stem: [...intro, ...lines(after, `A random sample of ${v.n} ${c.claim} is taken.`)],
      parts: [
        part('a', 1, text('Write down suitable hypotheses.')),
        part('b', 3, text(`Find the critical region for the sample mean, at the ${v.alpha}% level of significance, giving the limit to 2 decimal places.`)),
        part('c', 2, text(`The sample mean is ${xb} ${c.unit}. State, with a reason, the conclusion of the test.`)),
      ],
    };
  },

  answer(v) {
    const xb = v.xbar.toNumber();
    const H = `$\\mathrm{H}_0: \\mu = ${v.mu}$, $\\mathrm{H}_1: \\mu ${v.up ? '>' : '<'} ${v.mu}$`;
    if (v.level === 'foundational') {
      return [{ text: `$\\overline{X} \\sim \\mathrm{N}\\left(${v.mu}, \\frac{${v.sigma * v.sigma}}{${v.n}}\\right)$` }, { text: sf3(pValue(v)) }];
    }
    if (v.level === 'core') {
      const p = pValue(v);
      return [{ text: `${H}; $p$-value ${sf3(p)}. ${p < v.alpha / 100 ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.'}` }];
    }
    const z = invPhi(1 - v.alpha / 100);
    const se = v.sigma / Math.sqrt(v.n);
    const lim = v.up ? v.mu + z * se : v.mu - z * se;
    const inside = v.up ? xb > lim : xb < lim;
    return [{ text: H }, { text: `$\\overline{X} ${v.up ? '>' : '<'} ${roundFloatDp(lim, 2)}$` }, { text: inside ? 'In the critical region: reject $\\mathrm{H}_0$. There is evidence to support the belief.' : 'Not in the critical region: do not reject $\\mathrm{H}_0$. There is not enough evidence to support the belief.' }];
  },

  markScheme(v) {
    const xb = v.xbar.toNumber();
    const H = `$\\mathrm{H}_0: \\mu = ${v.mu}$, $\\mathrm{H}_1: \\mu ${v.up ? '>' : '<'} ${v.mu}$`;
    if (v.level === 'foundational') {
      return [
        [step('M1', 'The mean stays the same; the variance is divided by $n$', 'Averages vary less than single values.'), step('A1', `$\\overline{X} \\sim \\mathrm{N}\\left(${v.mu}, \\frac{${v.sigma * v.sigma}}{${v.n}}\\right)$`, 'Give the variance, not the standard deviation.')],
        [step('M1', `Standard deviation of $\\overline{X}$ $= \\frac{${v.sigma}}{\\sqrt{${v.n}}}$`, 'Use this in your calculator, not the original value.'), step('A1', sf3(pValue(v)), 'To 3 significant figures.')],
      ];
    }
    if (v.level === 'core') {
      const p = pValue(v);
      const reject = p < v.alpha / 100;
      return [
        [
          step('B1', H, 'μ is the population mean.'),
          step('M1', `$\\overline{X} \\sim \\mathrm{N}\\left(${v.mu}, \\frac{${v.sigma * v.sigma}}{${v.n}}\\right)$`, 'The sample mean under the null hypothesis.'),
          step('A1', `$\\mathrm{P}(\\overline{X} ${v.up ? '>' : '<'} ${dec(v.xbar)}) = ${sf3(p)}$`, 'This is the p-value.'),
          step('M1', `$${sf3(p)} ${reject ? '<' : '>'} ${dec(Q.of(v.alpha, 100))}$`, 'Compare with the level of significance.'),
          step('A1', reject ? 'Reject $\\mathrm{H}_0$: there is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$: there is not enough evidence to support the belief.', 'Conclude in context.'),
        ],
      ];
    }
    const z = invPhi(1 - v.alpha / 100);
    const se = v.sigma / Math.sqrt(v.n);
    const lim = v.up ? v.mu + z * se : v.mu - z * se;
    const inside = v.up ? xb > lim : xb < lim;
    return [
      [step('B1', H, 'The belief goes in the alternative hypothesis.')],
      [
        step('M1', `$\\overline{X} \\sim \\mathrm{N}\\left(${v.mu}, \\frac{${v.sigma * v.sigma}}{${v.n}}\\right)$`, 'The sample mean under the null hypothesis.'),
        step('M1', `$z = ${v.up ? '' : '-'}${roundFloatDp(z, 4)}$`, 'The percentage points table gives this, or use the inverse normal.'),
        step('A1', `$\\overline{X} ${v.up ? '>' : '<'} ${roundFloatDp(lim, 2)}$`, 'Multiply by the standard error, then add to the mean.'),
      ],
      [step('M1', `$${dec(v.xbar)}$ is ${inside ? '' : 'not '}in the critical region`, 'Compare.'), step('A1', inside ? 'Reject $\\mathrm{H}_0$. There is evidence to support the belief.' : 'Do not reject $\\mathrm{H}_0$. There is not enough evidence to support the belief.', 'Conclude in context.')],
    ];
  },

  check(v) {
    const se = v.sigma / Math.sqrt(v.n);
    const z = invPhi(1 - v.alpha / 100);
    // The critical value leaves exactly alpha in the tail.
    const tail = 1 - normCdf(v.mu, se, v.mu + z * se);
    return Math.abs(tail - v.alpha / 100) < 1e-6 ? [] : ['critical value'];
  },

  key: (v) => `${v.mu}|${v.sigma}|${v.n}|${v.xbar}|${v.up}|${v.alpha}`,
});
