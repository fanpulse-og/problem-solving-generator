import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, MINUS } from '../../engine/blocks';
import { ensure } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 24 2H Q20 (Rutger's aces in 11 matches: IQR, then compare
 * with Kim's median and IQR) and Set 23 2H Q18 (runs scored by two cricket
 * teams). Lists have 7, 11 or 15 values so the quartiles are single values
 * ((n + 1)/4 th and 3(n + 1)/4 th).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof CONTEXTS)[number];
  a: string;
  b: string;
  listA: number[]; // as shown (sorted except stretch)
  listB: number[]; // stretch only
  medB: number; // core: given for B
  iqrB: number;
}

const CONTEXTS = [
  { what: 'numbers of aces', did: 'served in each of', events: 'tennis matches', higher: 'served more aces on average', max: 20 },
  { what: 'numbers of runs', did: 'scored in each of', events: 'cricket matches', higher: 'scored more runs on average', max: 80 },
  { what: 'numbers of goals', did: 'scored in each of', events: 'netball matches', higher: 'scored more goals on average', max: 35 },
  { what: 'quiz scores', did: 'got in each of', events: 'weekly quizzes', higher: 'got higher scores on average', max: 30 },
] as const;

const ord = (n: number) => `${n}${n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th'}`;
const sorted = (xs: number[]) => [...xs].sort((p, q) => p - q);
function stats(xs: number[]) {
  const s = sorted(xs);
  const n = s.length;
  return { med: s[(n + 1) / 2 - 1], lq: s[(n + 1) / 4 - 1], uq: s[(3 * (n + 1)) / 4 - 1], s };
}

export default defineTemplate<V>({
  id: 'stats-iqr-compare',
  title: 'Comparing distributions: median and interquartile range',
  strand: 'Statistics',
  subtopic: 'Grouped data & histograms',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'decide', stretch: 'decide' },
  calculator: 'either',

  generate({ rng, level }) {
    const ctx = rng.pick(CONTEXTS);
    const [a, b] = names(rng, 2);
    const n = rng.pick(level === 'stretch' ? [11, 15] : [11, 15, 7]);
    const make = (k: number, hi: number) => Array.from({ length: k }, () => rng.int(0, hi));
    const listA = sorted(make(n, ctx.max));
    const A = stats(listA);
    ensure(A.uq > A.lq, 'a spread to measure');
    const v: V = { level, ctx, a, b, listA, listB: [], medB: 0, iqrB: 0 };
    if (level === 'core') {
      v.medB = A.med + rng.pick([-1, 1]) * rng.int(2, 6);
      v.iqrB = A.uq - A.lq + rng.pick([-1, 1]) * rng.int(2, 6);
      ensure(v.medB > 0 && v.iqrB > 0 && v.medB <= ctx.max, 'realistic statistics');
    }
    if (level === 'stretch') {
      const listB = make(rng.pick([11, 15]), ctx.max);
      const B = stats(listB);
      ensure(B.med !== A.med && B.uq - B.lq !== A.uq - A.lq && B.uq > B.lq, 'clear differences');
      v.listA = rng.shuffle(listA);
      v.listB = listB;
    }
    return v;
  },

  validate(v) {
    return [7, 11, 15].includes(v.listA.length) ? [] : ['list length'];
  },

  render(v) {
    const { ctx } = v;
    const show = (xs: number[]) => xs.join(' ');
    if (v.level === 'foundational') {
      return {
        stem: [text(`Here are the ${ctx.what} that ${v.a} ${ctx.did} ${v.listA.length} ${ctx.events}.`), text(show(v.listA))],
        parts: [part('a', 1, text('Find the median.')), part('b', 2, text('Find the interquartile range.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`Here are the ${ctx.what} that ${v.a} ${ctx.did} ${v.listA.length} ${ctx.events}.`), text(show(v.listA)), ...lines(`${v.b} also plays in some ${ctx.events}.`, `For ${v.b}`, `the median is ${v.medB}`, `the interquartile range is ${v.iqrB}`)],
        parts: [
          part('a', 2, text(`Find the interquartile range of ${v.a}’s ${ctx.what}.`)),
          part('b(i)', 1, text(`State, giving a reason, whether ${v.a} or ${v.b} ${ctx.higher}.`)),
          part('b(ii)', 1, text(`State, giving a reason, whether ${v.a} or ${v.b} was more consistent.`)),
        ],
      };
    }
    return {
      stem: [text(`Here are the ${ctx.what} that ${v.a} ${ctx.did} ${v.listA.length} ${ctx.events}.`), text(show(v.listA)), text(`Here are the ${ctx.what} that ${v.b} ${ctx.did} ${v.listB.length} ${ctx.events}.`), text(show(v.listB))],
      parts: [single(5, text(`Compare the ${ctx.what} for ${v.a} and ${v.b}.`), text('You must use suitable averages and measures of spread, and show your working.'))],
    };
  },

  answer(v) {
    const A = stats(v.listA);
    if (v.level === 'foundational') return [{ text: `${A.med}` }, { text: `${A.uq - A.lq}` }];
    if (v.level === 'core') {
      const iqrA = A.uq - A.lq;
      return [
        { text: `${iqrA}` },
        { text: `${A.med > v.medB ? v.a : v.b}, because the median is higher (${A.med} compared with ${v.medB})` },
        { text: `${iqrA < v.iqrB ? v.a : v.b}, because the interquartile range is smaller (${iqrA} compared with ${v.iqrB})` },
      ];
    }
    const B = stats(v.listB);
    const iA = A.uq - A.lq;
    const iB = B.uq - B.lq;
    return [{ text: `Medians ${A.med} and ${B.med}: ${A.med > B.med ? v.a : v.b} ${v.ctx.higher}. IQRs ${iA} and ${iB}: ${iA < iB ? v.a : v.b} was more consistent.` }];
  },

  markScheme(v) {
    const A = stats(v.listA);
    const n = v.listA.length;
    const pos = `${ord((n + 1) / 4)} and ${ord((3 * (n + 1)) / 4)}`;
    if (v.level === 'foundational') {
      return [
        [step('B1', `Middle (${ord((n + 1) / 2)}) value = ${A.med}`, 'The list is in order, so take the middle value.')],
        [step('M1', `LQ = ${A.lq}, UQ = ${A.uq} (the ${pos} values)`, `With ${n} values the quartiles are the ${pos} values.`), step('A1', `${A.uq} ${MINUS} ${A.lq} = ${A.uq - A.lq}`, 'IQR = upper quartile − lower quartile.')],
      ];
    }
    if (v.level === 'core') {
      const iqrA = A.uq - A.lq;
      return [
        [step('M1', `LQ = ${A.lq}, UQ = ${A.uq}`, `The ${pos} values in the ordered list.`), step('A1', `${iqrA}`, 'IQR = UQ − LQ.')],
        [step('C1', `${A.med > v.medB ? v.a : v.b}: median ${Math.max(A.med, v.medB)} > ${Math.min(A.med, v.medB)}`, 'Use the median to compare averages, and quote the numbers.')],
        [step('C1', `${iqrA < v.iqrB ? v.a : v.b}: IQR ${Math.min(iqrA, v.iqrB)} < ${Math.max(iqrA, v.iqrB)}`, 'Smaller spread means more consistent.')],
      ];
    }
    const B = stats(v.listB);
    const m = v.listB.length;
    return [
      [
        step('M1', `${v.a} in order: ${A.s.join(', ')}`, 'Put each list in order first.'),
        step('A1', `${v.a}: median ${A.med}, IQR ${A.uq} ${MINUS} ${A.lq} = ${A.uq - A.lq}`, `${n} values: median is the ${ord((n + 1) / 2)}, quartiles the ${pos}.`),
        step('A1', `${v.b}: median ${B.med}, IQR ${B.uq} ${MINUS} ${B.lq} = ${B.uq - B.lq}`, `${m} values: median is the ${ord((m + 1) / 2)}, quartiles the ${ord((m + 1) / 4)} and ${ord((3 * (m + 1)) / 4)}.`),
        step('C1', `${A.med > B.med ? v.a : v.b} has the higher median, so ${v.ctx.higher}`, 'Compare an average, in context.'),
        step('C1', `${A.uq - A.lq < B.uq - B.lq ? v.a : v.b} has the smaller IQR, so was more consistent`, 'Compare a spread, in context.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Count-based definitions: the median has as many values below as above.
    const check1 = (xs: number[]) => {
      const s = sorted(xs);
      const n = s.length;
      const half = (n - 1) / 2;
      const lower = s.slice(0, half);
      const upper = s.slice(half + 1);
      return { med: s[half], lq: lower[(lower.length - 1) / 2], uq: upper[(upper.length - 1) / 2] };
    };
    const A = check1(v.listA);
    if (v.level === 'foundational' && (answers[0].text !== `${A.med}` || answers[1].text !== `${A.uq - A.lq}`)) p.push('median/IQR');
    if (v.level === 'core' && answers[0].text !== `${A.uq - A.lq}`) p.push('IQR');
    if (v.level === 'stretch') {
      const B = check1(v.listB);
      if (!answers[0].text.startsWith(`Medians ${A.med} and ${B.med}`) || !answers[0].text.includes(`IQRs ${A.uq - A.lq} and ${B.uq - B.lq}`)) p.push('stats');
    }
    return p;
  },

  key: (v) => `${v.listA}|${v.listB}|${v.medB}|${v.iqrB}`,
});
