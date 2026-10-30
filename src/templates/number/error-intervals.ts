import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, MINUS } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 1F Q14 (a length rounded to 1 decimal place: write
 * down the error interval), the truncation questions in Set 23 1F and the
 * "number of people to the nearest 100" questions, where the greatest
 * possible whole number is one less than the upper bound. Stretch combines
 * two roundings of the same whole number. check() searches whole numbers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  // foundational: a measurement rounded to `unit`, and another truncated to 1 d.p.
  value: Q;
  unit: Q;
  what: number;
  trunc: Q;
  // core: a count to the nearest `unitN`; the weight limit decision
  count: number;
  unitN: number;
  // stretch: N to the nearest s1 is a, and to the nearest s2 is b
  s: [number, number];
  ab: [number, number];
}

const MEASURES = [
  { noun: 'length', of: 'a piece of wood', sym: 'L', unit: 'cm' },
  { noun: 'mass', of: 'a bag of potatoes', sym: 'M', unit: 'kg' },
  { noun: 'height', of: 'a sunflower', sym: 'h', unit: 'cm' },
  { noun: 'time', of: 'a race', sym: 't', unit: 'seconds' },
];
const COUNTS = [
  { what: 'people at a concert', noun: 'people' },
  { what: 'people at a football match', noun: 'people' },
  { what: 'visitors to a museum on one day', noun: 'visitors' },
  { what: 'runners in a fun run', noun: 'runners' },
];

/** Nearest multiple of s (halves round up), for whole numbers. */
const roundTo = (n: number, s: number) => Math.floor((n + s / 2) / s) * s;
const interval = (lo: string, sym: string, hi: string) => `$${lo} \\le ${sym} < ${hi}$`;
const unitWords = (u: Q) => (u.eq(1) ? 'the nearest whole number' : u.eq(Q.of(1, 10)) ? '1 decimal place' : u.eq(Q.of(1, 100)) ? '2 decimal places' : `the nearest ${dec(u)}`);

/** n ÷ 2, e.g. a bound such as 352.5 */
const half = (n: number) => dec(Q.of(n, 2));

function combined(v: V): number[] {
  const out: number[] = [];
  const [s1, s2] = v.s;
  for (let n = v.ab[1] - s2; n <= v.ab[1] + s2; n++) if (n >= 0 && roundTo(n, s1) === v.ab[0] && roundTo(n, s2) === v.ab[1]) out.push(n);
  return out;
}

export default defineTemplate<V>({
  id: 'num-error-intervals',
  title: 'Error intervals and rounding',
  strand: 'Number',
  subtopic: 'Bounds & accuracy',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'backwards' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, value: Q.of(0), unit: Q.of(1), what: 0, trunc: Q.of(0), count: 0, unitN: 0, s: [10, 100], ab: [0, 0] };
    if (level === 'foundational') {
      const what = rng.int(0, MEASURES.length - 1);
      const unit = rng.pick([Q.of(1), Q.of(10), Q.of(1, 10), ...(tier === 'KS3' ? [] : [Q.of(1, 100)])]);
      const steps = unit.gt(1) ? rng.int(3, 40) : unit.eq(1) ? rng.int(12, 95) : unit.eq(Q.of(1, 10)) ? rng.int(12, 950) : rng.int(120, 999);
      const value = unit.mul(steps);
      // A decimal answer ends in a non-zero digit, so the accuracy is visible (7.4, not 7.0).
      ensure(!unit.lt(1) || steps % 10 !== 0, 'last decimal digit not zero');
      const trunc = Q.of(rng.int(12, 99), 10);
      ensure(!trunc.isInt(), 'truncated value has a decimal');
      return { ...base, what, value, unit, trunc };
    }
    if (level === 'core') {
      const unitN = rng.pick([100, 1000]);
      const count = unitN * rng.int(tier === 'KS3' ? 3 : 12, tier === 'KS3' ? 20 : 60);
      const value = Q.of(rng.int(150, 249), 10);
      ensure(!value.isInt(), 'mass shows its decimal place');
      return { ...base, count, unitN, what: rng.int(0, COUNTS.length - 1), value };
    }
    const s: [number, number] = tier === 'KS3' ? [10, 100] : rng.pick([[10, 100], [5, 10]] as [number, number][]);
    const n = rng.int(s[1] * 2, s[1] * (tier === 'KS3' ? 9 : 40));
    const v = { ...base, s, ab: [roundTo(n, s[0]), roundTo(n, s[1])] as [number, number] };
    const sols = combined(v);
    // The intervals overlap only partly: more than one value, but not all of the narrower interval.
    ensure(sols.length >= 2 && sols.length < s[0], 'a partial overlap');
    return v;
  },

  validate(v) {
    return v.level === 'stretch' && combined(v).length < 2 ? ['needs at least two values'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const m = MEASURES[v.what];
      return {
        stem: [],
        parts: [
          part('a', 2, text(`The ${m.noun} of ${m.of} is ${m.sym} ${m.unit}.`), text(`${m.sym} rounded to ${unitWords(v.unit)} is ${dec(v.value)}`), text(`Write down the error interval for ${m.sym}.`)),
          part('b', 2, text(`${v.name} truncates a number, $y$, to 1 decimal place.`), text(`The result is ${dec(v.trunc)}`), text('Write down the error interval for $y$.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`The number of ${COUNTS[v.what].what} was ${int(v.count)}, correct to the nearest ${int(v.unitN)}`),
        parts: [
          part('a', 1, text(`Write down the least possible number of ${COUNTS[v.what].noun}.`)),
          part('b', 1, text(`Write down the greatest possible number of ${COUNTS[v.what].noun}.`)),
          part('c', 1, text(`The mass of a suitcase is ${dec(v.value, 1)} kg, correct to 1 decimal place.`), text(`${v.name} says, “The greatest possible mass of the suitcase is ${dec(v.value.add(Q.of(4, 100)), 2)} kg.”`), text(`Is ${v.name} right? Give a reason for your answer.`)),
        ],
      };
    }
    const [s1, s2] = v.s;
    return {
      stem: lines(`$N$ is a whole number.`, `$N$ rounded to the nearest ${int(s1)} is ${int(v.ab[0])}`, `$N$ rounded to the nearest ${int(s2)} is ${int(v.ab[1])}`),
      parts: [single(3, text('Work out all the possible values of $N$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const h = v.unit.div(2);
      return [{ text: interval(dec(v.value.sub(h)), MEASURES[v.what].sym, dec(v.value.add(h))) }, { text: interval(dec(v.trunc), 'y', dec(v.trunc.add(Q.of(1, 10)))) }];
    }
    if (v.level === 'core') {
      const h = v.unitN / 2;
      return [{ text: int(v.count - h) }, { text: int(v.count + h - 1) }, { text: `No: the mass could be anything up to (but not including) ${dec(v.value.add(Q.of(5, 100)), 2)} kg, e.g. ${dec(v.value.add(Q.of(45, 1000)), 3)} kg` }];
    }
    return [{ text: combined(v).join(', ') }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const m = MEASURES[v.what];
      const h = v.unit.div(2);
      return [
        [
          step('B1', `${dec(v.value)} ${MINUS} ${dec(h)} = ${dec(v.value.sub(h))}`, `Half of ${dec(v.unit)} either side. The lower bound is included (it rounds up to ${dec(v.value)}).`),
          step('B1', interval(dec(v.value.sub(h)), m.sym, dec(v.value.add(h))), `${dec(v.value.add(h))} would round up to ${dec(v.value.add(v.unit))}, so use < at the top.`),
        ],
        [
          step('B1', `$y \\ge ${dec(v.trunc)}$`, 'Truncating chops off digits: the number cannot be less than the result.'),
          step('B1', interval(dec(v.trunc), 'y', dec(v.trunc.add(Q.of(1, 10)))), `Anything from ${dec(v.trunc)} up to (not including) ${dec(v.trunc.add(Q.of(1, 10)))} truncates to ${dec(v.trunc)}.`),
        ],
      ];
    }
    if (v.level === 'core') {
      const h = v.unitN / 2;
      return [
        [step('B1', `${int(v.count)} ${MINUS} ${int(h)} = ${int(v.count - h)}`, `Half of ${int(v.unitN)} below: ${int(v.count - h)} rounds up to ${int(v.count)}.`)],
        [step('B1', `${int(v.count + h)} ${MINUS} 1 = ${int(v.count + h - 1)}`, `${int(v.count + h)} would round up, and ${COUNTS[v.what].noun} come in whole numbers, so one less.`)],
        [step('C1', `Upper bound ${dec(v.value.add(Q.of(5, 100)), 2)} kg; ${dec(v.value.add(Q.of(4, 100)), 2)} is not the greatest`, `Masses are not whole numbers: ${dec(v.value.add(Q.of(45, 1000)), 3)} kg also rounds to ${dec(v.value, 1)} kg.`)],
      ];
    }
    const [s1, s2] = v.s;
    const sols = combined(v);
    return [
      [
        step('M1', `${half(2 * v.ab[0] - s1)} ≤ N < ${half(2 * v.ab[0] + s1)}`, `The error interval for the nearest ${int(s1)}.`),
        step('M1', `${half(2 * v.ab[1] - s2)} ≤ N < ${half(2 * v.ab[1] + s2)}`, `The error interval for the nearest ${int(s2)}. N must be in both.`),
        step('A1', sols.join(', '), 'Whole numbers in both intervals: the overlap.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Search a fine grid of values for the smallest and largest that round to the value.
      const fine = v.unit.div(1000);
      const rounds = (x: Q) => x.div(v.unit).add(Q.of(1, 2)).floor() === v.value.div(v.unit).floor();
      let lo = v.value;
      while (rounds(lo.sub(fine))) lo = lo.sub(fine);
      if (!answers[0].text.startsWith(`$${dec(lo)} \\le`)) p.push('lower bound');
      if (!answers[1].text.includes(`${dec(v.trunc)} \\le y < ${dec(v.trunc.add(Q.of(1, 10)))}`)) p.push('truncation');
      return p;
    }
    if (v.level === 'core') {
      const ok: number[] = [];
      for (let n = v.count - v.unitN; n <= v.count + v.unitN; n++) if (Math.floor((n + v.unitN / 2) / v.unitN) * v.unitN === v.count) ok.push(n);
      if (answers[0].text !== int(ok[0]) || answers[1].text !== int(ok[ok.length - 1])) p.push('least / greatest');
      return p;
    }
    const want: number[] = [];
    for (let n = 0; n < 50000; n++) if (Math.round(n / v.s[0] + 1e-9) * v.s[0] === v.ab[0] && Math.round(n / v.s[1] + 1e-9) * v.s[1] === v.ab[1]) want.push(n);
    if (answers[0].text !== want.join(', ')) p.push('values');
    return p;
  },

  key: (v) => `${v.value}|${v.unit}|${v.trunc}|${v.count}|${v.unitN}|${v.s}|${v.ab}`,
});
