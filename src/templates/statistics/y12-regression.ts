import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/21 regression and correlation: using and interpreting a
 * regression line, finding it from two statements about the model (June 2025 Q4),
 * and a test on the product moment correlation coefficient. Critical values are
 * printed in the question because they come from the formula booklet tables.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  a: Q;
  b: Q;
  x1: number;
  lo: number;
  hi: number;
  far: number;
  step: number;
  drop: Q;
  y1: Q;
  n: number;
  r: Q;
  crit: Q;
}

/** Each context has believable ranges, and a direction: a tree does not shrink as it ages. */
const CTX = [
  { x: 'the age of a tree, $m$ years', y: 'its height, $c$ metres', xn: 'age', yn: 'height', a: [10, 50], b: [2, 6], lo: [5, 12], width: [15, 30], up: true },
  { x: 'the daily temperature, $m\\,^\\circ$C', y: 'the number of ice creams sold, $c$', xn: 'temperature', yn: 'number sold', a: [100, 500], b: [10, 60], lo: [8, 14], width: [8, 16], up: true },
  { x: 'the hours of revision, $m$', y: 'the test score, $c$', xn: 'hours of revision', yn: 'test score', a: [200, 400], b: [10, 20], lo: [2, 6], width: [10, 20], up: true },
  { x: 'the age of a car, $m$ years', y: 'its value, £$c$ thousand', xn: 'age', yn: 'value', a: [150, 250], b: [2, 9], lo: [1, 2], width: [8, 11], up: false },
];
/** Where more of one thing means less of the other, measured in hundreds. */
const FALLING = [
  { x: 'the mass of a car, $m$ kg', y: 'its fuel consumption, $c$ miles per gallon' },
  { x: 'the height above sea level, $m$ metres', y: 'the air temperature, $c\\,^\\circ$C' },
];
// One-tailed 5% critical values for the product moment correlation coefficient.
const CRIT: [number, string][] = [
  [10, '0.5494'],
  [12, '0.4973'],
  [15, '0.4409'],
  [20, '0.3783'],
  [25, '0.3365'],
  [30, '0.3061'],
];

export default defineTemplate<V>({
  id: 'y12-regression',
  title: 'Regression and correlation',
  strand: 'Statistics',
  subtopic: 'Regression & correlation',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'backwards', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const base: V = { level, ctx, a: Q.of(0), b: Q.of(0), x1: 0, lo: 0, hi: 0, far: 0, step: 0, drop: Q.of(0), y1: Q.of(0), n: 0, r: Q.of(0), crit: Q.of(0) };
    if (level === 'foundational') {
      const c = CTX[ctx];
      const a = Q.of(rng.int(c.a[0], c.a[1]), 10);
      const b = Q.of(rng.int(c.b[0], c.b[1]), 10).mul(c.up ? 1 : -1);
      const lo = rng.int(c.lo[0], c.lo[1]);
      const hi = lo + rng.int(c.width[0], c.width[1]);
      const x1 = rng.int(lo + 1, hi - 1);
      const far = hi + rng.int(15, 40);
      ensure(a.add(b.mul(x1)).isPositive(), 'a positive prediction');
      return { ...base, a, b, lo, hi, x1, far };
    }
    if (level === 'core') {
      const step = rng.pick([100, 200, 500]);
      const drop = Q.of(rng.int(5, 40), 10);
      const x1 = step * rng.int(3, 8);
      const y1 = Q.of(rng.int(50, 400), 10);
      const b = drop.neg().div(step);
      ensure(b.terminatesWithin(4), 'a tidy gradient');
      const a = y1.sub(b.mul(x1));
      return { ...base, step, drop, x1, y1, a, b };
    }
    const [n, crit] = rng.pick(CRIT);
    const r = Q.of(rng.int(20, 85), 100).mul(CTX[ctx].up ? 1 : -1);
    ensure(Math.abs(Math.abs(r.toNumber()) - Number(crit)) > 0.02, 'a clear decision');
    return { ...base, n, r, crit: Q.of(crit) };
  },

  validate(v) {
    return v.level === 'stretch' && Math.abs(v.r.toNumber()) >= 1 ? ['a correlation coefficient is between −1 and 1'] : [];
  },

  render(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const sign = v.b.isPositive() ? '+' : '-';
      return {
        stem: lines(`A student investigates ${c.x}, and ${c.y}.`, `Using data with values of $m$ from ${v.lo} to ${v.hi}, the regression line of $c$ on $m$ is`, `$c = ${dec(v.a)} ${sign} ${dec(v.b.isPositive() ? v.b : v.b.neg())}m$`),
        parts: [
          part('a', 1, text(`Give an interpretation of the gradient of this regression line.`)),
          part('b', 2, text(`Estimate the value of $c$ when  $m = ${v.x1}$`)),
          part('c', 1, text(`Explain why the line should not be used to estimate $c$ when  $m = ${v.far}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      const f = FALLING[v.ctx % FALLING.length];
      return {
        stem: lines(`A student investigates ${f.x}, and ${f.y}.`, 'Using $m$ as the explanatory variable, the student creates the linear regression model', '$c = a + bm$', 'where $a$ and $b$ are constants. The student concludes that, on average,', `$c$ is ${dec(v.drop)} lower for each additional ${v.step} in $m$, and  $c = ${dec(v.y1)}$  when  $m = ${v.x1}$`),
        parts: [
          part('a', 2, text('Find the value of $b$')),
          part('b', 2, text('Find the value of $a$')),
          part('c', 1, text(`Explain why $a$ may not have a sensible meaning in this context.`)),
        ],
      };
    }
    const dir = v.r.isPositive() ? 'positive' : 'negative';
    return {
      stem: lines(`A researcher investigates ${c.x}, and ${c.y}.`, `For a random sample of ${v.n} pairs of values, the product moment correlation coefficient is ${dec(v.r)}`, `The one-tailed critical value at the 5% level of significance is ${dec(v.crit)}`),
      parts: [
        part('a', 4, text(`Test, at the 5% level of significance, whether there is evidence of a ${dir} correlation in the population. State your hypotheses clearly.`)),
        part('b', 1, text('Interpret the value of the correlation coefficient in context, without referring to the test.')),
      ],
    };
  },

  answer(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const size = dec(v.b.isPositive() ? v.b : v.b.neg());
      return [
        { text: `For each increase of 1 in the ${c.xn}, the ${c.yn} ${v.b.isPositive() ? 'increases' : 'decreases'} by ${size} on average.` },
        { text: `$${dec(v.a.add(v.b.mul(v.x1)))}$` },
        { text: `${v.far} is outside the range of the data (extrapolation).` },
      ];
    }
    if (v.level === 'core') return [{ text: `$b = ${dec(v.b)}$` }, { text: `$a = ${dec(v.a)}$` }, { text: '$m = 0$ is outside the range of the data.' }];
    const reject = Math.abs(v.r.toNumber()) > v.crit.toNumber();
    const dir = v.r.isPositive() ? 'positive' : 'negative';
    return [
      { text: `$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho ${v.r.isPositive() ? '>' : '<'} 0$. ${reject ? `Reject $\\mathrm{H}_0$: evidence of a ${dir} correlation.` : `Do not reject $\\mathrm{H}_0$: no evidence of a ${dir} correlation.`}` },
      { text: `As the ${c.xn} increases, the ${c.yn} tends to ${v.r.isPositive() ? 'increase' : 'decrease'}.` },
    ];
  },

  markScheme(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const size = dec(v.b.isPositive() ? v.b : v.b.neg());
      return [
        [step('B1', `For each increase of 1 in the ${c.xn}, the ${c.yn} ${v.b.isPositive() ? 'increases' : 'decreases'} by ${size} on average.`, 'Use the context and say "on average".')],
        [step('M1', `$${dec(v.a)} ${v.b.isPositive() ? '+' : '-'} ${size} \\times ${v.x1}$`, 'Substitute into the line.'), step('A1', `$${dec(v.a.add(v.b.mul(v.x1)))}$`, 'This is interpolation, so it should be reliable.')],
        [step('B1', `${v.far} is outside the range of the data (extrapolation).`, 'The pattern may not continue beyond the data.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', `$b = \\frac{-${dec(v.drop)}}{${v.step}}$`, 'The gradient is the change in the response per unit of the explanatory variable.'), step('A1', `$b = ${dec(v.b)}$`, 'Negative: the value goes down.')],
        [step('M1', `$${dec(v.y1)} = a + (${dec(v.b)}) \\times ${v.x1}$`, 'Substitute the known point.'), step('A1', `$a = ${dec(v.a)}$`, 'Solve for a.')],
        [step('B1', '$m = 0$ is outside the range of the data.', 'The intercept can be an extrapolation.')],
      ];
    }
    const reject = Math.abs(v.r.toNumber()) > v.crit.toNumber();
    const dir = v.r.isPositive() ? 'positive' : 'negative';
    return [
      [
        step('B1', `$\\mathrm{H}_0: \\rho = 0$, $\\mathrm{H}_1: \\rho ${v.r.isPositive() ? '>' : '<'} 0$`, 'Use the Greek letter ρ: this is about the population.'),
        step('M1', `Compare the size of ${dec(v.r)} with ${dec(v.crit)}`, 'A negative test looks at the critical value with a minus sign.'),
        step('A1', `$${dec(v.r.isPositive() ? v.r : v.r.neg())} ${reject ? '>' : '<'} ${dec(v.crit)}$`, 'Show the comparison.'),
        step('A1', reject ? `Reject $\\mathrm{H}_0$: evidence of a ${dir} correlation.` : `Do not reject $\\mathrm{H}_0$: no evidence of a ${dir} correlation.`, 'Conclude in context.'),
      ],
      [step('B1', `As the ${c.xn} increases, the ${c.yn} tends to ${v.r.isPositive() ? 'increase' : 'decrease'}.`, 'Use "tends to": a correlation is not a rule.')],
    ];
  },

  check(v) {
    if (v.level === 'core') {
      // Two points on the line must give the stated drop.
      const y = (x: number) => v.a.add(v.b.mul(x));
      return y(v.x1).eq(v.y1) && y(v.x1).sub(y(v.x1 + v.step)).eq(v.drop) ? [] : ['line'];
    }
    if (v.level === 'foundational') return v.x1 > v.lo && v.x1 < v.hi && v.far > v.hi ? [] : ['range'];
    return CRIT.some(([n, c]) => n === v.n && Q.of(c).eq(v.crit)) ? [] : ['critical value'];
  },

  key: (v) => `${v.a}|${v.b}|${v.x1}|${v.far}|${v.step}|${v.drop}|${v.y1}|${v.n}|${v.r}`,
});
