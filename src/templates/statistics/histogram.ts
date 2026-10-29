import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 2H Q16 (histogram, then an estimate above a value) and
 * Set 22 2H Q21 (histogram with no scale: the number in one class is 8 fewer
 * than in another; estimate how many are above 500 cm). Frequencies are
 * frequency density × class width; bar heights are whole numbers of grid
 * squares so they can be read exactly.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof CONTEXTS)[number];
  bounds: number[]; // class boundaries
  k: number[]; // bar heights in grid squares
  s: Q; // frequency density per grid square
  ask: number; // foundational: class index
  X: number; // core / stretch: estimate how many are above X
  pair: [number, number]; // stretch: class p has D more than class q
}

// unitW: base class width; start: first boundary.
const CONTEXTS = [
  { axis: 'Height (h cm)', sym: 'h', unit: 'cm', thing: 'trees in part of a forest', what: 'height', about: 'the heights of {n} trees in part of a forest', unitW: 100, start: 200 },
  { axis: 'Time (t minutes)', sym: 't', unit: 'minutes', thing: 'students who completed a homework task', what: 'time taken', about: 'the times taken by {n} students to complete a homework task', unitW: 5, start: 10 },
  { axis: 'Weight (w kg)', sym: 'w', unit: 'kg', thing: 'parcels delivered on Monday', what: 'weight', about: 'the weights of {n} parcels delivered on Monday', unitW: 2, start: 0 },
  { axis: 'Age (a years)', sym: 'a', unit: 'years', thing: 'people at a gym', what: 'age', about: 'the ages of {n} people at a gym', unitW: 5, start: 15 },
] as const;

const width = (v: V, i: number) => v.bounds[i + 1] - v.bounds[i];
const fd = (v: V, i: number) => v.s.mul(v.k[i]);
const freq = (v: V, i: number) => fd(v, i).mul(width(v, i));
const classOf = (v: V, x: number) => v.bounds.findIndex((b, i) => i < v.bounds.length - 1 && x > b && x < v.bounds[i + 1]);

/** Estimated number above x, assuming values are spread evenly within a class. */
function above(v: V, x: number): Q {
  let total = Q.of(0);
  for (let i = 0; i < v.k.length; i++) {
    const lo = Math.max(v.bounds[i], x);
    const hi = v.bounds[i + 1];
    if (hi > lo) total = total.add(fd(v, i).mul(hi - lo));
  }
  return total;
}

export default defineTemplate<V>({
  id: 'stats-histogram',
  title: 'Histograms with unequal class widths',
  strand: 'Statistics',
  subtopic: 'Grouped data & histograms',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.pick(CONTEXTS);
    const unitW = ctx.unitW;
    const widths = rng.shuffle([1, 1, 2, 2, 4, 3]).slice(0, 5).map((w) => w * unitW);
    const start = ctx.start;
    const bounds: number[] = [start];
    widths.forEach((w) => bounds.push(bounds[bounds.length - 1] + w));
    ensure(new Set(widths).size >= 3, 'clearly unequal widths');
    const s = rng.pick([Q.of(1, 10), Q.of(1, 5), Q.of(1, 2), Q.of(1), Q.of(2), Q.of(5)]);
    const k = widths.map(() => rng.int(2, 14));
    const v: V = { level, ctx, bounds, k, s, ask: rng.int(0, 4), X: 0, pair: [0, 1] };
    ensure(k.every((_, i) => freq(v, i).isInt() && freq(v, i).toInt() >= 2), 'whole-number frequencies');
    ensure(k.reduce((a, b) => a + b, 0) / k.length >= 5, 'bars tall enough to read');
    const total = k.reduce((t, _, i) => t.add(freq(v, i)), Q.of(0)).toNumber();
    ensure(total >= 30 && total <= 400, 'a realistic number of things');
    if (level !== 'foundational') {
      // X strictly inside a class, giving a whole-number estimate.
      const j = rng.int(1, 4);
      ensure(bounds[j + 1] - bounds[j] >= 2, 'room for a value inside the class');
      const X = rng.int(bounds[j] + 1, bounds[j + 1] - 1);
      ensure(X > bounds[j] && X < bounds[j + 1], 'inside a class');
      v.X = X;
      ensure(above(v, X).isInt(), 'whole-number estimate');
    }
    if (level === 'stretch') {
      const [p, q] = rng.sample([0, 1, 2, 3, 4], 2);
      v.pair = [p, q];
      ensure(freq(v, p).gt(freq(v, q)), 'p has more');
      ensure(!s.eq(1), 'a scale worth finding');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.k.some((x) => x <= 0)) p.push('bars');
    return p;
  },

  render(v) {
    const n = v.k.reduce((s, _, i) => s.add(freq(v, i)), Q.of(0));
    const h = diagram({
      type: 'histogram',
      classes: v.k.map((_, i) => [v.bounds[i], v.bounds[i + 1]] as [number, number]),
      densities: v.k.map((_, i) => fd(v, i).toNumber()),
      xLabel: v.ctx.axis,
      yLabel: 'Frequency density',
      gridStep: v.s.toNumber(),
      hideScale: v.level === 'stretch',
    });
    const cls = (i: number) => `${v.bounds[i]} < $${v.ctx.sym}$ ≤ ${v.bounds[i + 1]}`;
    if (v.level === 'foundational') {
      return {
        stem: [text(`The histogram gives information about ${v.ctx.about.replace('{n}', 'some')}.`), h],
        parts: [part('a', 2, text(`Work out the number of ${v.ctx.thing.split(' ')[0]} with ${cls(v.ask)}`)), part('b', 2, text(`Work out the total number of ${v.ctx.thing.split(' ')[0]}.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`The histogram gives information about ${v.ctx.about.replace('{n}', int(n.toInt()))}.`), h],
        parts: [single(3, text(`Work out an estimate for the number of ${v.ctx.thing.split(' ')[0]} with ${/^[aeiou]/.test(v.ctx.what) ? 'an' : 'a'} ${v.ctx.what} of more than ${v.X} ${v.ctx.unit}.`))],
      };
    }
    const [p, q] = v.pair;
    const D = freq(v, p).sub(freq(v, q));
    return {
      stem: [
        text(`The histogram gives information about ${v.ctx.about.replace('{n}', 'some')}.`),
        h,
        text(`There are no values for which $${v.ctx.sym}$ ≤ ${v.bounds[0]} or $${v.ctx.sym}$ > ${v.bounds[v.bounds.length - 1]}`),
        text(`The number of ${v.ctx.thing.split(' ')[0]} with ${cls(q)} is ${int(D.toInt())} fewer than the number with ${cls(p)}`),
      ],
      parts: [single(4, text(`Work out an estimate for the number of ${v.ctx.thing.split(' ')[0]} with ${/^[aeiou]/.test(v.ctx.what) ? 'an' : 'a'} ${v.ctx.what} of more than ${v.X} ${v.ctx.unit}.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const n = v.k.reduce((s, _, i) => s.add(freq(v, i)), Q.of(0));
      return [{ text: int(freq(v, v.ask).toInt()) }, { text: int(n.toInt()) }];
    }
    return [{ text: int(above(v, v.X).toInt()) }];
  },

  markScheme(v) {
    const n = v.k.reduce((s, _, i) => s.add(freq(v, i)), Q.of(0));
    if (v.level === 'foundational') {
      const i = v.ask;
      return [
        [step('M1', `${dec(fd(v, i))} ${TIMES} ${width(v, i)}`, 'Frequency = frequency density × class width.'), step('A1', int(freq(v, i).toInt()), 'Read the height carefully from the scale.')],
        [step('M1', v.k.map((_, j) => `${dec(fd(v, j))} × ${width(v, j)}`).join(' + '), 'Find the frequency of every bar.'), step('A1', int(n.toInt()), 'Add them up.')],
      ];
    }
    const j = classOf(v, v.X);
    const part_ = fd(v, j).mul(v.bounds[j + 1] - v.X);
    const fulls = v.k.map((_, i) => i).filter((i) => i > j);
    const full = fulls.reduce((s, i) => s.add(freq(v, i)), Q.of(0));
    const estimate = [
      step('M1', `Part of the ${v.bounds[j]}–${v.bounds[j + 1]} class: ${dec(fd(v, j))} ${TIMES} (${v.bounds[j + 1]} ${MINUS} ${v.X}) = ${dec(part_)}`, `Only the part of this bar above ${v.X} counts: assume values are spread evenly.`),
      step('M1', `Whole classes above: ${fulls.map((i) => `${dec(fd(v, i))} × ${width(v, i)}`).join(' + ') || '0'} = ${dec(full)}`, 'Add the frequencies of the bars to the right.'),
      step('A1', `${dec(part_)} + ${dec(full)} = ${int(above(v, v.X).toInt())}`, 'This is an estimate.'),
    ];
    if (v.level === 'core') return [estimate];
    const [p, q] = v.pair;
    const sq = (i: number) => v.k[i] * width(v, i);
    const unitsAbove = v.k[j] * (v.bounds[j + 1] - v.X) + fulls.reduce((t, i) => t + sq(i), 0);
    return [
      [
        step('P1', `Areas in grid units: ${v.bounds[p]}–${v.bounds[p + 1]}: ${v.k[p]} × ${width(v, p)} = ${sq(p)}; ${v.bounds[q]}–${v.bounds[q + 1]}: ${v.k[q]} × ${width(v, q)} = ${sq(q)}`, 'Frequency is proportional to the AREA of each bar (height in grid squares × class width).'),
        step('P1', `${sq(p)} ${MINUS} ${sq(q)} = ${sq(p) - sq(q)} units = ${int(freq(v, p).sub(freq(v, q)).toInt())}, so 1 unit = ${dec(v.s)}`, 'Use the difference to find what one unit of area represents.'),
        step('P1', `Area above ${v.X}: ${v.k[j]} × (${v.bounds[j + 1]} ${MINUS} ${v.X})${fulls.map((i) => ` + ${sq(i)}`).join('')} = ${unitsAbove} units`, `Only the part of the bar above ${v.X} counts, plus every bar to the right.`),
        step('A1', `${unitsAbove} × ${dec(v.s)} = ${int(above(v, v.X).toInt())}`, `Convert units to a number of ${v.ctx.thing.split(' ')[0]}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Count with frequency-per-unit-width, integrating in steps of 1.
    if (v.level === 'foundational') {
      let n = Q.of(0);
      for (let i = 0; i < v.k.length; i++) for (let x = v.bounds[i]; x < v.bounds[i + 1]; x++) n = n.add(fd(v, i));
      if (answers[1].text !== int(n.toInt())) p.push('total');
      return p;
    }
    let est = Q.of(0);
    for (let i = 0; i < v.k.length; i++) for (let x = v.bounds[i]; x < v.bounds[i + 1]; x++) if (x >= v.X) est = est.add(fd(v, i));
    if (answers[0].text !== int(est.toInt())) p.push('estimate');
    if (v.level === 'stretch') {
      // The relationship must pin down the scale: units difference ≠ 0.
      const [a, b] = v.pair;
      if (v.k[a] * width(v, a) === v.k[b] * width(v, b)) p.push('scale not determined');
    }
    return p;
  },

  key: (v) => `${v.bounds}|${v.k}|${v.s}|${v.ask}|${v.X}|${v.pair}`,
});
