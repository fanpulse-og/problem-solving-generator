import { defineTemplate, type DiagramSpec } from '../../engine/types';
import { diagram, part, step, text, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 1F Q19 / Set 23 2F Q15 (scatter graph with a line of
 * best fit: type of correlation, the outlier, an estimate) and the examiner
 * reports' "explain why this estimate may not be reliable" (extrapolation).
 * The line of best fit is drawn from a chosen line; check() fits a least-
 * squares line to the points independently and compares.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  pts: [number, number][]; // data points (the outlier, if any, is last)
  outlier: boolean;
  m: Q; // drawn line of best fit: y = m(x − X0) + c
  c: Q;
  x0: number; // estimate y at x0 (foundational), or x for y = L(x0) (core)
  xFar: number; // core / stretch: outside the data
}

const CTX = [
  { about: 'the number of hours {n} students spent revising and their marks in a test', who: 'student', xLabel: 'Hours of revision', yLabel: 'Test mark', x: [0, 12], xs: 1, xl: 2, y: [0, 100], ys: 5, yl: 10, m: [5, 6, 7], c: [15, 20, 25, 30], xUnit: (k: string) => `${k} hours of revision`, yUnit: (k: string) => `a mark of ${k}`, per: 'for each extra hour of revision', ything: 'the test mark', xName: 'number of hours of revision' },
  { about: 'the temperature and the number of ice creams a café sold on each of {n} days', who: 'day', xLabel: 'Temperature (°C)', yLabel: 'Ice creams sold', x: [10, 30], xs: 1, xl: 2, y: [0, 200], ys: 10, yl: 20, m: [6, 8], c: [30, 40, 50], xUnit: (k: string) => `a temperature of ${k}°C`, yUnit: (k: string) => `${k} ice creams`, per: 'for each 1°C rise in temperature', ything: 'the number of ice creams sold', xName: 'temperature' },
  { about: 'the number of hours of TV {n} students watched in a week and their marks in a test', who: 'student', xLabel: 'Hours of TV', yLabel: 'Test mark', x: [0, 20], xs: 1, xl: 2, y: [0, 100], ys: 5, yl: 10, m: [-3, -4], c: [85, 90, 95], xUnit: (k: string) => `${k} hours of TV`, yUnit: (k: string) => `a mark of ${k}`, per: 'for each extra hour of TV', ything: 'the test mark', xName: 'number of hours of TV' },
  { about: 'the ages and the prices of {n} second-hand phones', who: 'phone', xLabel: 'Age (months)', yLabel: 'Price (£)', x: [0, 24], xs: 1, xl: 4, y: [0, 600], ys: 20, yl: 100, m: [-15, -20], c: [520, 540, 560, 580], xUnit: (k: string) => `an age of ${k} months`, yUnit: (k: string) => `a price of £${k}`, per: 'for each extra month of age', ything: 'the price', xName: 'age' },
];

const line = (v: V, x: number) => v.m.mul(x - CTX[v.ctx].x[0]).add(v.c);
const data = (v: V) => (v.outlier ? v.pts.slice(0, -1) : v.pts);

/** Least-squares line through the points (independent of the drawn line). */
function lsq(pts: [number, number][]) {
  const n = pts.length;
  const mx = pts.reduce((s, p) => s + p[0], 0) / n;
  const my = pts.reduce((s, p) => s + p[1], 0) / n;
  const b = pts.reduce((s, p) => s + (p[0] - mx) * (p[1] - my), 0) / pts.reduce((s, p) => s + (p[0] - mx) ** 2, 0);
  return { b, at: (x: number) => my + b * (x - mx) };
}

/** Readings from a drawn line are accepted to within one small square. */
const tolY = (v: V) => CTX[v.ctx].ys;
const tolM = (v: V) => {
  const c = CTX[v.ctx];
  return Q.of(Math.max(1, Math.floor((20 * c.ys) / (c.x[1] - c.x[0]))), 10);
};
const accept = (mid: Q, tol: Q | number) => `accept ${dec(mid.sub(tol))} to ${dec(mid.add(tol))}`;

export default defineTemplate<V>({
  id: 'stats-scatter-graph',
  title: 'Scatter graphs and lines of best fit',
  strand: 'Statistics',
  subtopic: 'Scatter graphs',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const c = CTX[ctx];
    const v: V = { level, name: names(rng, 1)[0], ctx, pts: [], outlier: level === 'foundational', m: Q.of(rng.pick(c.m)), c: Q.of(rng.pick(c.c)), x0: 0, xFar: 0 };
    const xs = rng.sample(Array.from({ length: (c.x[1] - c.x[0]) / c.xs - 1 }, (_, i) => c.x[0] + (i + 1) * c.xs), 10).sort((a, b) => a - b);
    for (const x of xs) {
      const y = line(v, x).add(rng.int(-2, 2) * c.ys);
      // Snap to the grid so every point can be read exactly.
      const snapped = Math.round(y.toNumber() / c.ys) * c.ys;
      ensure(snapped > c.y[0] && snapped < c.y[1], 'point inside the graph');
      v.pts.push([x, snapped]);
    }
    // The drawn line really is a line of best fit: close to the least-squares line across the data.
    const fit = lsq(v.pts);
    ensure([xs[0], xs[xs.length - 1]].every((x) => Math.abs(fit.at(x) - line(v, x).toNumber()) <= c.ys), 'drawn line fits the points');
    if (v.outlier) {
      const mid = xs.slice(3, 7);
      const gaps = Array.from({ length: (c.x[1] - c.x[0]) / c.xs - 1 }, (_, i) => c.x[0] + (i + 1) * c.xs).filter((x) => !xs.includes(x) && x > mid[0] && x < mid[3]);
      ensure(gaps.length > 0, 'room for an outlier in the middle');
      const x = rng.pick(gaps);
      const y = line(v, x).toNumber() + rng.pick([-1, 1]) * rng.int(8, 11) * c.ys;
      const snapped = Math.round(y / c.ys) * c.ys;
      ensure(snapped > c.y[0] && snapped < c.y[1], 'outlier inside the graph');
      v.pts.push([x, snapped]);
    }
    // Estimate inside the data, at a reading that lands on a half-square at least.
    v.x0 = rng.pick(Array.from({ length: (c.x[1] - c.x[0]) / c.xs - 1 }, (_, i) => c.x[0] + (i + 1) * c.xs).filter((x) => x >= xs[1] && x <= xs[8]));
    ensure(line(v, v.x0).mul(2).div(c.ys).isInt(), 'reading on a half-square');
    v.xFar = c.x[1] + rng.int(2, 4) * c.xl;
    return v;
  },

  validate(v) {
    const c = CTX[v.ctx];
    const p: string[] = [];
    if (new Set(v.pts.map((q) => q[0])).size !== v.pts.length) p.push('one point per x');
    for (const x of [c.x[0], c.x[1]]) if (line(v, x).toNumber() < c.y[0] || line(v, x).toNumber() > c.y[1]) p.push('line of best fit leaves the graph');
    return p;
  },

  render(v) {
    const c = CTX[v.ctx];
    const graph = diagram({
      type: 'grid',
      x: c.x as [number, number],
      y: c.y as [number, number],
      xStep: c.xs,
      yStep: c.ys,
      xLabelEvery: c.xl,
      yLabelEvery: c.yl,
      xLabel: c.xLabel,
      yLabel: c.yLabel,
      paths: [
        ...v.pts.map((p) => ({ points: [p], dots: true })),
        { points: [c.x[0], c.x[1]].map((x) => [x, line(v, x).toNumber()] as [number, number]) },
      ],
    } as DiagramSpec);
    const intro = [text(`The scatter graph shows information about ${c.about.replace('{n}', String(v.pts.length))}.`), text('A line of best fit has been drawn.'), graph];
    if (v.level === 'foundational') {
      return {
        stem: intro,
        parts: [
          part('a', 1, text('Write down the type of correlation shown by the scatter graph.')),
          part('b', 1, text('One of the points is an outlier.'), text('Write down the coordinates of the outlier.')),
          part('c', 2, text(`Use the line of best fit to estimate ${c.ything} for ${c.xUnit(String(v.x0))}.`)),
        ],
      };
    }
    if (v.level === 'core') {
      const y1 = line(v, v.x0);
      return {
        stem: intro,
        parts: [
          part('a', 2, text(`Use the line of best fit to estimate the ${c.xName} for ${c.yUnit(dec(y1))}.`)),
          part('b', 1, text(`${v.name} uses the line of best fit to estimate ${c.ything} for ${c.xUnit(String(v.xFar))}.`), text(`Explain why ${v.name}’s estimate may not be reliable.`)),
        ],
      };
    }
    return {
      stem: intro,
      parts: [
        part('a', 3, text(`Use the line of best fit to estimate how much ${c.ything} ${v.m.isPositive() ? 'increases' : 'decreases'} ${c.per}.`)),
        part('b', 1, text(`${v.name} says, “The scatter graph shows that a ${v.m.isPositive() ? 'higher' : 'lower'} ${c.xName} causes ${c.ything} to ${v.m.isPositive() ? 'go up' : 'go down'}.”`), text(`Is ${v.name} right? Give a reason for your answer.`)),
      ],
    };
  },

  answer(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const o = v.pts[v.pts.length - 1];
      return [{ text: v.m.isPositive() ? 'Positive correlation' : 'Negative correlation' }, { text: `(${o[0]}, ${o[1]})` }, { text: `${dec(line(v, v.x0))} (${accept(line(v, v.x0), tolY(v))})` }];
    }
    if (v.level === 'core') {
      return [{ text: `${v.x0} (${accept(Q.of(v.x0), c.xs)})` }, { text: `${cap(c.xUnit(String(v.xFar)))} is outside the range of the data, so the pattern may not continue` }];
    }
    const mag = v.m.isPositive() ? v.m : v.m.neg();
    return [{ text: `${dec(mag)} (${accept(mag, tolM(v))})` }, { text: 'No: correlation does not show that one thing causes the other' }];
  },

  markScheme(v) {
    const c = CTX[v.ctx];
    if (v.level === 'foundational') {
      const o = v.pts[v.pts.length - 1];
      return [
        [step('B1', v.m.isPositive() ? 'Positive' : 'Negative', v.m.isPositive() ? 'As one goes up, the other tends to go up.' : 'As one goes up, the other tends to go down.')],
        [step('B1', `(${o[0]}, ${o[1]})`, 'The point far away from the pattern of the others. Read across first, then up.')],
        [
          step('M1', `Up from ${v.x0} on the ${c.xName} axis to the line`, 'Draw a line up to the line of best fit, then across to the other axis.'),
          step('A1', `${dec(line(v, v.x0))}`, `Read the scale carefully: each small square is ${c.ys}.`),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', `Across from ${dec(line(v, v.x0))} to the line, then down`, 'Start on the axis you are given, go to the line of best fit, then to the other axis.'), step('A1', `${v.x0}`, `Each small square on this axis is ${c.xs}.`)],
        [step('C1', `${v.xFar} is beyond the data (which goes up to ${Math.max(...v.pts.map((p) => p[0]))})`, 'Using the line outside the data is called extrapolation: the pattern might not continue.')],
      ];
    }
    const [xa, xb] = [c.x[0] + 2 * c.xl, c.x[1] - c.xl];
    const [ya, yb] = [line(v, xa), line(v, xb)];
    const mag = v.m.isPositive() ? v.m : v.m.neg();
    return [
      [
        step('M1', `Two points on the line: (${xa}, ${dec(ya)}) and (${xb}, ${dec(yb)})`, 'Choose points far apart on the LINE (not data points), where the line crosses grid lines.'),
        step('M1', `(${dec(yb)} ${MINUS} ${dec(ya)}) ${DIV} (${xb} ${MINUS} ${xa})`, 'Gradient = change in y ÷ change in x.'),
        step('A1', `${dec(mag)} ${v.m.isPositive() ? 'more' : 'less'} ${c.per}`, 'The gradient tells you the rate of change.'),
      ],
      [step('C1', 'No: correlation is not causation', 'A scatter graph shows a relationship, not that one thing causes the other.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const c = CTX[v.ctx];
    const fit = lsq(data(v));
    const first = (t: string) => Number(t.replace(/ /g, '').match(/-?\d+(\.\d+)?/)![0]);
    if (v.level === 'foundational') {
      if ((fit.b > 0) !== answers[0].text.startsWith('Positive')) p.push('correlation');
      // The outlier is the point furthest from the least-squares line through all the points.
      const all = lsq(v.pts);
      const far = v.pts.reduce((best, q) => (Math.abs(q[1] - all.at(q[0])) > Math.abs(best[1] - all.at(best[0])) ? q : best));
      if (answers[1].text !== `(${far[0]}, ${far[1]})`) p.push('outlier');
      if (Math.abs(first(answers[2].text) - fit.at(v.x0)) > 2 * c.ys) p.push('estimate');
    } else if (v.level === 'core') {
      const y1 = line(v, v.x0).toNumber();
      const x = fit.b === 0 ? NaN : v.pts[0][0] + (y1 - fit.at(v.pts[0][0])) / fit.b;
      if (!(Math.abs(first(answers[0].text) - x) <= 2 * c.xs + Math.abs((2 * c.ys) / fit.b))) p.push('reverse estimate');
      if (v.xFar <= Math.max(...v.pts.map((q) => q[0]))) p.push('not extrapolation');
    } else if (Math.abs(first(answers[0].text) - Math.abs(fit.b)) > tolM(v).toNumber() + Math.abs(v.m.toNumber()) * 0.25) p.push('gradient');
    return p;
  },

  key: (v) => `${v.ctx}|${v.pts}|${v.m}|${v.c}|${v.x0}`,
});

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}
