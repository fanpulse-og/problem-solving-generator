import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Reading an ordered stem and leaf diagram: median and range (Practice), median
 * and a percentage (Apply), and working out a value that was added from how the
 * range changed (Extend). check() works from the raw list of values.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  values: number[]; // sorted
  cut: number; // core: "more than cut"
  rise: number; // stretch: the range increases by this much
  low: boolean; // stretch: the new value is below the median
}

/** `more` finishes "the percentage of …"; `measure` names one value, as in "the time for this person". */
const CTX: { what: string; unit: string; one: string; more: string; measure: string; lo: number; hi: number }[] = [
  { what: 'the times, in minutes, {n} people took to finish a puzzle', unit: 'minutes', one: 'person', more: 'people who took more than {x} minutes', measure: 'time', lo: 12, hi: 58 },
  { what: 'the ages, in years, of the {n} members of a walking club', unit: 'years', one: 'member', more: 'members who are more than {x} years old', measure: 'age', lo: 21, hi: 78 },
  { what: 'the marks {n} students scored in a test', unit: 'marks', one: 'student', more: 'students who scored more than {x} marks', measure: 'mark', lo: 14, hi: 59 },
  { what: 'the heights, in cm, of {n} tomato plants', unit: 'cm', one: 'plant', more: 'plants that are more than {x} cm high', measure: 'height', lo: 23, hi: 69 },
  { what: 'the number of pages in each of {n} magazines', unit: 'pages', one: 'magazine', more: 'magazines that have more than {x} pages', measure: 'number of pages', lo: 31, hi: 87 },
];
const median = (xs: number[]) => Q.of(xs[Math.floor((xs.length - 1) / 2)] + xs[Math.ceil((xs.length - 1) / 2)], 2);
const range = (xs: number[]) => xs[xs.length - 1] - xs[0];
const more = (v: V) => v.values.filter((x) => x > v.cut).length;
const added = (v: V) => (v.low ? v.values[0] - v.rise : v.values[v.values.length - 1] + v.rise);

function diagramRows(xs: number[]): string[][] {
  const rows: string[][] = [];
  for (let s = Math.floor(xs[0] / 10); s <= Math.floor(xs[xs.length - 1] / 10); s++) {
    rows.push([`${s}`, xs.filter((x) => Math.floor(x / 10) === s).map((x) => x % 10).join(' ')]);
  }
  return rows;
}

export default defineTemplate<V>({
  id: 'stats-stem-leaf',
  title: 'Stem and leaf diagrams',
  strand: 'Statistics',
  subtopic: 'Charts & diagrams',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, CTX.length - 1);
    const c = CTX[ctx];
    const n = level === 'core' ? 20 : rng.pick([11, 13, 15]);
    const start = Math.floor(rng.int(c.lo, c.hi - 32) / 10) * 10;
    const values = Array.from({ length: n }, () => rng.int(start + 1, start + 38)).sort((a, b) => a - b);
    // Every stem has at least one leaf, and the ends are not on a stem boundary.
    const stems = new Set(values.map((x) => Math.floor(x / 10)));
    ensure(stems.size === Math.floor(values[n - 1] / 10) - Math.floor(values[0] / 10) + 1 && stems.size >= 3, 'no empty rows');
    const v: V = { level, ctx, values, cut: 0, rise: 0, low: rng.chance(0.5) };
    if (level === 'core') {
      v.cut = rng.pick([...stems].slice(1)) * 10;
      ensure(more(v) >= 3 && more(v) <= 17, 'a sensible share');
      ensure(!values.includes(v.cut), 'no value exactly on the boundary');
    }
    if (level === 'stretch') {
      v.rise = rng.int(3, 9);
      ensure(added(v) > 0 && values[0] !== values[1] && values[n - 1] !== values[n - 2], 'a clear smallest and largest value');
    }
    return v;
  },

  validate(v) {
    return v.values.every((x, i) => i === 0 || v.values[i - 1] <= x) ? [] : ['values must be in order'];
  },

  render(v) {
    const c = CTX[v.ctx];
    const n = v.values.length;
    const first = v.values[0];
    const stem = [
      text(`The stem and leaf diagram shows ${c.what.replace('{n}', `${n}`)}.`),
      table({ rows: diagramRows(v.values), rowHeaders: true, leftAlign: true }),
      text(`Key: ${Math.floor(first / 10)} | ${first % 10} means ${first} ${c.unit}`),
    ];
    if (v.level === 'foundational') return { stem, parts: [part('a', 2, text('Find the median.')), part('b', 2, text('Work out the range.'))] };
    if (v.level === 'core') {
      return { stem, parts: [part('a', 2, text('Find the median.')), part('b', 2, text(`Work out the percentage of the ${c.more.replace('{x}', `${v.cut}`)}.`))] };
    }
    return {
      stem: [...stem, text(`One more ${c.one} is added to the diagram.`), text(`The ${c.measure} for this ${c.one} is ${v.low ? 'less' : 'greater'} than the median.`), text(`The range increases by ${v.rise} ${c.unit}.`)],
      parts: [single(3, text(`Work out the ${c.measure} for this ${c.one}.`))],
    };
  },

  answer(v) {
    const c = CTX[v.ctx];
    const med = { text: `${dec(median(v.values))} ${c.unit}` };
    if (v.level === 'foundational') return [med, { text: `${range(v.values)} ${c.unit}` }];
    if (v.level === 'core') return [med, { text: `${more(v) * 5}%` }];
    return [{ text: `${added(v)} ${c.unit}` }];
  },

  markScheme(v) {
    const c = CTX[v.ctx];
    const n = v.values.length;
    const [lo, hi] = [v.values[0], v.values[n - 1]];
    const pos = n % 2 ? `the ${(n + 1) / 2}th value` : `halfway between the ${n / 2}th and ${n / 2 + 1}th values`;
    const med = [
      step('M1', `(${n} + 1) ÷ 2 = ${dec(Q.of(n + 1, 2))}, so the median is ${pos}`, 'The diagram is already in order. Count along the leaves, row by row.'),
      step('A1', `${dec(median(v.values))} ${c.unit}`, n % 2 ? 'Remember to put the stem back in front of the leaf.' : `The two middle values are ${v.values[n / 2 - 1]} and ${v.values[n / 2]}.`),
    ];
    if (v.level === 'foundational') return [med, [step('M1', `${hi} − ${lo}`, 'Range = largest value − smallest value: the last leaf and the first leaf.'), step('A1', `${range(v.values)} ${c.unit}`, 'Use the key to read each value in full.')]];
    if (v.level === 'core') {
      return [med, [step('M1', `$\\frac{${more(v)}}{20}$`, `Count the values greater than ${v.cut}: every leaf in the rows from stem ${v.cut / 10} onwards.`), step('A1', `${more(v) * 5}%`, 'Multiply the top and bottom by 5 to get a fraction out of 100.')]];
    }
    return [
      [
        step('M1', `${hi} − ${lo} = ${range(v.values)}, so the new range is ${range(v.values) + v.rise}`, 'Find the range now, then add the increase.'),
        step('M1', `The new value is the ${v.low ? 'smallest' : 'largest'}`, `The range changed, so the new value is outside the old values. It is ${v.low ? 'less' : 'greater'} than the median, so it is at the ${v.low ? 'bottom' : 'top'}.`),
        step('A1', v.low ? `${hi} − ${range(v.values) + v.rise} = ${added(v)} ${c.unit}` : `${lo} + ${range(v.values) + v.rise} = ${added(v)} ${c.unit}`, 'Check: work out the range with your value included.'),
      ],
    ];
  },

  check(v, answers) {
    const num = (s: string) => Number(/[\d.]+/.exec(s)?.[0]);
    const xs = [...v.values].sort((a, b) => a - b);
    // Median by removing the smallest and largest in turn.
    const mid = [...xs];
    while (mid.length > 2) {
      mid.shift();
      mid.pop();
    }
    const med = mid.reduce((s, x) => s + x, 0) / mid.length;
    if (v.level === 'stretch') {
      // Try every possible value on the stated side of the median.
      const fits = [];
      for (let x = 1; x <= 200; x++) {
        if (v.low ? x >= med : x <= med) continue;
        if (Math.max(...xs, x) - Math.min(...xs, x) === Math.max(...xs) - Math.min(...xs) + v.rise) fits.push(x);
      }
      return fits.length === 1 && fits[0] === num(answers[0].text) ? [] : ['added value'];
    }
    if (num(answers[0].text) !== med) return ['median'];
    if (v.level === 'foundational') return num(answers[1].text) === Math.max(...xs) - Math.min(...xs) ? [] : ['range'];
    let count = 0;
    for (const x of xs) if (x > v.cut) count++;
    return num(answers[1].text) * xs.length === count * 100 ? [] : ['percentage'];
  },

  key: (v) => `${v.level}|${v.values}|${v.cut}|${v.rise}|${v.low}`,
});
