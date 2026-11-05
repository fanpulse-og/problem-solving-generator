import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/31 correlation (June 2025 Q4 without the large data set): a test
 * from a p-value naming the sample and population, a power law found from a log-log
 * regression, and a two-tailed test of the correlation coefficient.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  r: Q;
  pv: Q;
  n: number;
  alpha: number;
  c: Q;
  m: Q;
  x: number;
  crit: Q;
}

const CTX = [
  { x: 'hours of sunshine', y: 'ice creams sold', where: 'at a seaside kiosk', pop: 'all days at the kiosk', unit: 'days', up: true },
  { x: 'the age of a car', y: 'its price', where: 'in one town', pop: 'all cars for sale in the town', unit: 'cars', up: false },
  { x: 'hours of revision', y: 'test score', where: 'at one school', pop: 'all students at the school', unit: 'students', up: true },
];
// Two-tailed 5% critical values (0.025 in each tail) for the product moment correlation coefficient.
const CRIT: [number, string][] = [
  [10, '0.6319'],
  [12, '0.5760'],
  [15, '0.5140'],
  [20, '0.4438'],
  [25, '0.3961'],
  [30, '0.3610'],
];

export default defineTemplate<V>({
  id: 'y13-correlation',
  title: 'Correlation and non-linear regression',
  strand: 'Statistics',
  subtopic: 'Regression & correlation',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { foundational: 'decide', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const base: V = { level, ctx, r: Q.of(0), pv: Q.of(0), n: 0, alpha: 5, c: Q.of(0), m: Q.of(0), x: 0, crit: Q.of(0) };
    if (level === 'foundational') {
      const r = Q.of(rng.int(15, 85), 100).mul(CTX[ctx].up ? 1 : -1);
      const pv = Q.of(rng.int(1, 200), 1000);
      const alpha = rng.pick([1, 5, 10]);
      ensure(!pv.eq(Q.of(alpha, 100)), 'a clear decision');
      return { ...base, r, pv, alpha, n: rng.step(20, 60, 5) };
    }
    if (level === 'core') {
      const c = Q.of(rng.int(15, 22), 10);
      const m = Q.of(rng.int(25, 34), 10);
      const x = rng.int(10, 50);
      ensure(!m.isInt(), 'a power that is not a whole number');
      return { ...base, c, m, x };
    }
    const [n, crit] = rng.pick(CRIT);
    const r = Q.of(rng.int(20, 85), 100).mul(CTX[ctx].up ? 1 : -1);
    ensure(Math.abs(Math.abs(r.toNumber()) - Number(crit)) > 0.02, 'a clear decision');
    return { ...base, n, r, crit: Q.of(crit) };
  },

  validate(v) {
    return Math.abs(v.r.toNumber()) < 1 ? [] : ['a correlation coefficient is between −1 and 1'];
  },

  render(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const dir = v.r.isPositive() ? 'positive' : 'negative';
      return {
        stem: lines(`A researcher studies ${c.x} and ${c.y} ${c.where}, using a random sample of ${v.n} ${c.unit}.`, `The product moment correlation coefficient is ${dec(v.r)}`, `In a test for ${dir} correlation in the population, the $p$-value is ${dec(v.pv)}`),
        parts: [
          part('a', 2, text(`State the hypotheses and the conclusion of the test, at the ${v.alpha}% level of significance.`)),
          part('b', 2, text('For this test, describe the sample and a possible population.')),
          part('c', 1, text('Explain why a correlation between the two variables does not show that one causes the other.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines('A biologist believes that the mass, $y$ g, of a fish is related to its length, $x$ cm, by the model  $y = ax^n$  where $a$ and $n$ are constants.', `A straight line is fitted to a plot of $\\log_{10} y$ against $\\log_{10} x$. Its equation is`, `$\\log_{10} y = ${dec(v.m)}\\log_{10} x - ${dec(v.c)}$`),
        parts: [
          part('a', 2, text('Show that the model gives a straight line when $\\log_{10} y$ is plotted against $\\log_{10} x$.')),
          part('b', 3, text('Find the value of $n$ and the value of $a$, giving $a$ to 3 significant figures.')),
          part('c', 2, text(`Use the model to estimate the mass of a fish of length ${v.x} cm, giving your answer to 3 significant figures.`)),
        ],
      };
    }
    return {
      stem: lines(`A researcher takes a random sample of ${v.n} ${c.unit} ${c.where} and records ${c.x} and ${c.y}.`, `The product moment correlation coefficient is ${dec(v.r)}`, `The critical value for a two-tailed test at the 5% level of significance is ${dec(v.crit)}`),
      parts: [
        part('a', 4, text('Test, at the 5% level of significance, whether there is evidence of a correlation between the variables in the population. State your hypotheses clearly.')),
        part('b', 1, text('State one assumption needed for this test to be valid.')),
      ],
    };
  },

  answer(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const reject = v.pv.lt(Q.of(v.alpha, 100));
      const dir = v.r.isPositive() ? 'positive' : 'negative';
      return [
        { text: `$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho ${v.r.isPositive() ? '>' : '<'} 0$. ${reject ? `Reject $\\mathrm{H}_0$: evidence of a ${dir} correlation.` : `Do not reject $\\mathrm{H}_0$: no evidence of a ${dir} correlation.`}` },
        { text: `Sample: the ${v.n} ${c.unit} chosen. Population: ${c.pop}.` },
        { text: 'For example, a third variable may affect both.' },
      ];
    }
    if (v.level === 'core') {
      const a = 10 ** -v.c.toNumber();
      return [{ text: 'Shown' }, { text: `$n = ${dec(v.m)}$, $a = ${sf3(a)}$` }, { text: `${sf3(a * v.x ** v.m.toNumber())} g` }];
    }
    const reject = Math.abs(v.r.toNumber()) > v.crit.toNumber();
    return [{ text: `$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho \\neq 0$. ${reject ? 'Reject $\\mathrm{H}_0$: evidence of a correlation.' : 'Do not reject $\\mathrm{H}_0$: no evidence of a correlation.'}` }, { text: 'The data come from a bivariate normal distribution.' }];
  },

  markScheme(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const reject = v.pv.lt(Q.of(v.alpha, 100));
      const dir = v.r.isPositive() ? 'positive' : 'negative';
      return [
        [step('B1', `$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho ${v.r.isPositive() ? '>' : '<'} 0$`, 'Use ρ for the population.'), step('B1', `$${dec(v.pv)} ${reject ? '<' : '>'} ${dec(Q.of(v.alpha, 100))}$: ${reject ? `evidence of a ${dir} correlation.` : `no evidence of a ${dir} correlation.`}`, 'Compare the p-value with the level of significance.')],
        [step('B1', `Sample: the ${v.n} ${c.unit} chosen.`, 'The ones actually measured.'), step('B1', `Population: ${c.pop}.`, 'Everything the sample represents.')],
        [step('B1', 'For example, a third variable may affect both.', 'Correlation does not mean causation.')],
      ];
    }
    if (v.level === 'core') {
      const a = 10 ** -v.c.toNumber();
      return [
        [step('M1', '$\\log_{10} y = \\log_{10} a + n\\log_{10} x$', 'Take logs and use the laws.'), step('A1', 'This has the form  $Y = mX + c$,  with $Y = \\log_{10} y$ and $X = \\log_{10} x$', 'State what plays each role.')],
        [step('B1', `$n = ${dec(v.m)}$`, 'The gradient of the line.'), step('M1', `$\\log_{10} a = -${dec(v.c)}$`, 'The intercept of the line.'), step('A1', `$a = 10^{-${dec(v.c)}} = ${sf3(a)}$`, 'Undo the log.')],
        [step('M1', `$${sf3(a)} \\times ${v.x}^{${dec(v.m)}}$`, 'Substitute into the model.'), step('A1', `${sf3(a * v.x ** v.m.toNumber())} g`, 'Use the unrounded value of a.')],
      ];
    }
    const reject = Math.abs(v.r.toNumber()) > v.crit.toNumber();
    return [
      [
        step('B1', '$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho \\neq 0$', '"A correlation" could be either sign, so the test is two-tailed.'),
        step('M1', `Compare the size of ${dec(v.r)} with ${dec(v.crit)}`, 'In a two-tailed test, use the size of r.'),
        step('A1', `$${dec(v.r.isPositive() ? v.r : v.r.neg())} ${reject ? '>' : '<'} ${dec(v.crit)}$`, 'Show the comparison.'),
        step('A1', reject ? 'Reject $\\mathrm{H}_0$: evidence of a correlation.' : 'Do not reject $\\mathrm{H}_0$: no evidence of a correlation.', 'Conclude in context.'),
      ],
      [step('B1', 'The data come from a bivariate normal distribution.', 'The assumption behind the table of critical values.')],
    ];
  },

  check(v) {
    if (v.level === 'core') {
      // Two points on the line give the same power law.
      const a = 10 ** -v.c.toNumber();
      for (const x of [2, 10, 30]) {
        const logy = v.m.toNumber() * Math.log10(x) - v.c.toNumber();
        if (Math.abs(10 ** logy - a * x ** v.m.toNumber()) > 1e-6 * (a * x ** v.m.toNumber())) return ['power law'];
      }
      return [];
    }
    if (v.level === 'stretch') return CRIT.some(([n, s]) => n === v.n && Q.of(s).eq(v.crit)) ? [] : ['critical value'];
    return v.pv.isPositive() ? [] : ['p-value'];
  },

  key: (v) => `${v.r}|${v.pv}|${v.n}|${v.alpha}|${v.c}|${v.m}|${v.x}`,
});
