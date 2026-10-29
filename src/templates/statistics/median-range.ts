import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names, possessive } from '../../contexts/names';
import { MEASURE_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 22 2F Q22 (four friends: two heights known, median 160 cm,
 * range 21 cm; find the other two) and Set 24 1F Q26 (x 5 y z 10 12 with a
 * given range, median and mode). Uniqueness of the answer is checked by brute
 * force in check().
 */
type Ctx = (typeof MEASURE_CONTEXTS)[number];
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: Ctx;
  people: string[];
  values: number[]; // per person (foundational/core), or the sorted list (stretch)
  unknown: number[]; // indices of unknown values
}

const median = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = s.length / 2;
  return s.length % 2 ? Q.of(s[Math.floor(m)]) : Q.of(s[m - 1] + s[m], 2);
};
const range = (xs: number[]) => Math.max(...xs) - Math.min(...xs);
function mode(xs: number[]): number | null {
  const c = new Map<number, number>();
  xs.forEach((x) => c.set(x, (c.get(x) ?? 0) + 1));
  const best = Math.max(...c.values());
  const modes = [...c].filter(([, n]) => n === best).map(([x]) => x);
  return best > 1 && modes.length === 1 ? modes[0] : null;
}

/** All (C, D) with C > D giving this median and range, with the known values fixed. */
function solutions4(known: number[], med: Q, R: number, lo: number, hi: number): [number, number][] {
  const out: [number, number][] = [];
  for (let d = lo; d <= hi; d++) for (let c = d + 1; c <= hi; c++) {
    const xs = [...known, c, d];
    if (median(xs).eq(med) && range(xs) === R) out.push([c, d]);
  }
  return out;
}

/** All fillings of the unknown positions keeping the list in order, matching range, median and mode. */
function solutions6(list: number[], unknown: number[], R: number, med: Q, md: number, lo: number, hi: number): number[][] {
  const out: number[][] = [];
  const rec = (k: number, cur: number[]) => {
    if (k === unknown.length) {
      const xs = list.map((x, i) => (unknown.includes(i) ? cur[unknown.indexOf(i)] : x));
      for (let i = 1; i < xs.length; i++) if (xs[i] < xs[i - 1]) return;
      if (range(xs) === R && median(xs).eq(med) && mode(xs) === md) out.push([...cur]);
      return;
    }
    for (let x = lo; x <= hi; x++) rec(k + 1, [...cur, x]);
  };
  rec(0, []);
  return out;
}

export default defineTemplate<V>({
  id: 'stats-median-range',
  title: 'Find the values from the median and range',
  strand: 'Statistics',
  subtopic: 'Averages & range',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'averages',
  calculator: 'either',

  generate({ rng, level }) {
    const ctx = rng.pick(MEASURE_CONTEXTS);
    if (level === 'stretch') {
      // Six numbers in order, one value repeated (the mode).
      const base = rng.sample(Array.from({ length: 20 }, (_, i) => i + 1), 5).sort((a, b) => a - b);
      const dupIdx = rng.int(0, 4);
      const list = [...base.slice(0, dupIdx + 1), base[dupIdx], ...base.slice(dupIdx + 1)];
      const unknown = rng.pick([[0, 2, 3], [0, 3, 4], [1, 2, 5], [0, 2, 5], [2, 3, 5]]);
      ensure(mode(list) !== null, 'needs a single mode');
      const sols = solutions6(list, unknown, range(list), median(list), mode(list)!, 0, 30);
      ensure(sols.length === 1, 'answer must be unique');
      return { level, ctx, people: [], values: list, unknown };
    }
    const n = level === 'foundational' ? 3 : 4;
    const people = names(rng, n);
    const values = rng.sample(Array.from({ length: ctx.hi - ctx.lo + 1 }, (_, i) => ctx.lo + i), n);
    if (level === 'foundational') {
      // The unknown is the largest; the mean must be whole.
      values.sort((a, b) => a - b);
      ensure((values[0] + values[1] + values[2]) % 3 === 0, 'whole-number mean');
      return { level, ctx, people, values: [values[0], values[1], values[2]], unknown: [2] };
    }
    // Core: people 0, 1 known; 2 > 3 unknown.
    const [k1, k2, c, d] = values;
    const v = { level, ctx, people, values: [k1, k2, Math.max(c, d), Math.min(c, d)], unknown: [2, 3] };
    ensure(median(v.values).isInt(), 'whole-number median');
    const sols = solutions4([k1, k2], median(v.values), range(v.values), ctx.lo - 40, ctx.hi + 40);
    ensure(sols.length === 1, 'answer must be unique');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.values.some((x) => x < 0)) p.push('negative value');
    if (v.level === 'core' && v.values[2] <= v.values[3]) p.push('C must be greater than D');
    return p;
  },

  render(v) {
    const { ctx } = v;
    if (v.level === 'stretch') {
      const letters = ['$x$', '$y$', '$z$'];
      const shown = v.values.map((x, i) => (v.unknown.includes(i) ? letters[v.unknown.indexOf(i)] : int(x)));
      return {
        stem: [
          text('Here is a list of six numbers written in order of size.'),
          text(shown.join('\u2003\u2003')),
          ...lines('The numbers have', `a range of ${range(v.values)}`, `a median of ${dec(median(v.values))}`, `a mode of ${mode(v.values)}`),
        ],
        parts: [single(3, text('Find the value of $x$, the value of $y$ and the value of $z$'))],
      };
    }
    const unit = ctx.unit;
    if (v.level === 'foundational') {
      const [a, b, c] = v.people;
      return {
        stem: lines(
          `${a}, ${b} and ${c} are three ${ctx.people}.`,
          `${possessive(a)} ${ctx.measure} is ${v.values[0]} ${unit}.`,
          `${possessive(b)} ${ctx.measure} is ${v.values[1]} ${unit}.`,
          `${c} has the greatest ${ctx.measure}.`,
          `The range of the three ${ctx.plural} is ${range(v.values)} ${unit}.`,
        ),
        parts: [part('a', 2, text(`Work out ${possessive(c)} ${ctx.measure}.`)), part('b', 2, text(`Work out the mean ${ctx.measure} of the three ${ctx.people}.`))],
      };
    }
    const [a, b, c, d] = v.people;
    return {
      stem: lines(
        `${a}, ${b}, ${c} and ${d} are four ${ctx.people}.`,
        `Here is some information about the ${ctx.plural} of these ${ctx.people}.`,
        `${possessive(a)} ${ctx.measure} is ${v.values[0]} ${unit}.`,
        `${possessive(b)} ${ctx.measure} is ${v.values[1]} ${unit}.`,
        `${possessive(c)} ${ctx.measure} is greater than ${possessive(d)} ${ctx.measure}.`,
        `The median ${ctx.measure} of these four ${ctx.people} is ${dec(median(v.values))} ${unit}.`,
        `The range of the ${ctx.plural} of these four ${ctx.people} is ${range(v.values)} ${unit}.`,
      ),
      parts: [single(3, text(`Work out ${possessive(c)} ${ctx.measure} and ${possessive(d)} ${ctx.measure}.`))],
    };
  },

  answer(v) {
    const u = v.ctx.unit;
    if (v.level === 'stretch') {
      const [x, y, z] = v.unknown.map((i) => v.values[i]);
      return [{ text: `$x$ = ${x}, $y$ = ${y}, $z$ = ${z}` }];
    }
    if (v.level === 'foundational') return [{ text: `${v.values[2]} ${u}` }, { text: `${dec(Q.of(v.values[0] + v.values[1] + v.values[2], 3))} ${u}` }];
    return [{ text: `${v.people[2]}: ${v.values[2]} ${u}, ${v.people[3]}: ${v.values[3]} ${u}` }];
  },

  markScheme(v) {
    const R = range(v.values);
    if (v.level === 'stretch') {
      const md = mode(v.values)!;
      const med = median(v.values);
      const steps = v.unknown.map((i) => {
        const letter = ['$x$', '$y$', '$z$'][v.unknown.indexOf(i)];
        const val = v.values[i];
        let why: string;
        if (i === 0) why = `Range ${R}: smallest = largest ${MINUS} ${R} = ${val}`;
        else if (i === 5) why = `Range ${R}: largest = smallest + ${R} = ${val}`;
        else if (i === 2 || i === 3) why = `Median ${dec(med)} is halfway between the 3rd and 4th numbers, so ${letter} = ${val}`;
        else why = `Mode ${md}: ${letter} = ${val}`;
        if (val === md && (i === 2 || i === 3) && v.values[i === 2 ? 3 : 2] !== md) why = `${why} (it is also the mode)`;
        return step('B1', `${letter} = ${val}`, why);
      });
      return [steps];
    }
    const u = v.ctx.unit;
    if (v.level === 'foundational') {
      const sum = v.values[0] + v.values[1] + v.values[2];
      return [
        [step('M1', `${Math.min(v.values[0], v.values[1])} + ${R}`, 'Range = greatest − smallest, so greatest = smallest + range.'), step('A1', `${v.values[2]} ${u}`, '')].map((s) => (s.note ? s : { ...s, note: 'Make sure it really is the greatest.' })),
        [step('M1', `(${v.values.join(' + ')}) ${DIV} 3`, 'Add them up and divide by how many there are.'), step('A1', `= ${dec(Q.of(sum, 3))} ${u}`, '')].map((s) => (s.note ? s : { ...s, note: 'Remember the units.' })),
      ];
    }
    const [k1, k2, c, d] = v.values;
    const sorted = [...v.values].sort((a, b) => a - b);
    const med = median(v.values);
    // Uniqueness (checked in generate) means exactly one unknown is an extreme.
    const dIsMin = d < Math.min(k1, k2);
    const midKnown = dIsMin ? Math.min(k1, k2) : Math.max(k1, k2);
    const [C, D] = [v.people[2], v.people[3]];
    return [
      [
        step('P1', dIsMin ? `Range ${R}: smallest = ${Math.max(k1, k2)} ${MINUS} ${R} = ${d}, so ${D} = ${d}` : `Range ${R}: largest = ${Math.min(k1, k2)} + ${R} = ${c}, so ${C} = ${c}`, 'Use the range to find the unknown at one end of the list.'),
        step('P1', `Median ${dec(med)}: the middle two add up to ${dec(med.mul(2))}, so ${dIsMin ? C : D} = ${dec(med.mul(2))} ${MINUS} ${midKnown} = ${dIsMin ? c : d}`, 'With four values, the median is halfway between the 2nd and 3rd in order.'),
        step('A1', `${C} ${c} ${u}, ${D} ${d} ${u}`, `Check in order: ${sorted.join(', ')}. ${C} must be greater than ${D}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      const sols = solutions6(v.values, v.unknown, range(v.values), median(v.values), mode(v.values)!, 0, 40);
      if (sols.length !== 1) p.push(`${sols.length} solutions`);
      else if (answers[0].text !== `$x$ = ${sols[0][0]}, $y$ = ${sols[0][1]}, $z$ = ${sols[0][2]}`) p.push('answer');
      return p;
    }
    if (v.level === 'foundational') {
      const c = Math.min(v.values[0], v.values[1]) + range(v.values);
      if (c !== v.values[2] || c <= Math.max(v.values[0], v.values[1])) p.push('greatest');
      return p;
    }
    const sols = solutions4([v.values[0], v.values[1]], median(v.values), range(v.values), v.ctx.lo - 60, v.ctx.hi + 60);
    if (sols.length !== 1) p.push(`${sols.length} solutions`);
    else if (answers[0].text !== `${v.people[2]}: ${sols[0][0]} ${v.ctx.unit}, ${v.people[3]}: ${sols[0][1]} ${v.ctx.unit}`) p.push('answer');
    return p;
  },

  key: (v) => `${v.values.join(',')}|${v.unknown.join(',')}`,
});
