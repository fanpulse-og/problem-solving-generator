import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 1F Q15 (which test did she do better in?), Set 24 2F
 * Q20 (40% of the members are juniors, 35% of the juniors are girls) and
 * Set 23 2H Q4 (percentages of two groups combined). Totals are built first,
 * so every group is a whole number of people.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  scores: [number, number, number, number]; // foundational: a/b and c/d
  total: number; // core / stretch: number of people altogether
  p: number; // % in the first group
  q: number; // core: % of that group; stretch: % of group 1 who did it
  r: number; // stretch: % of group 2 who did it
}

const SUBJECTS = [
  ['maths', 'science'],
  ['French', 'history'],
  ['geography', 'English'],
  ['music', 'computing'],
] as const;

const CORE = [
  { place: 'a sports club', whole: 'members', group: 'juniors', act: 'play netball' },
  { place: 'a school', whole: 'students', group: 'in Year 11', act: 'walk to school', of: 'students in Year 11' },
  { place: 'a choir', whole: 'singers', group: 'adults', act: 'sing in the soprano section' },
] as const;

const STRETCH = [
  { intro: 'people at a concert', g1: 'adults', g2: 'children', n1: 'adults', n2: 'children', act: 'bought a programme', unit: 'people', where: 'at the concert' },
  { intro: 'visitors to a museum on Saturday', g1: 'adults', g2: 'children', n1: 'adults', n2: 'children', act: 'bought a guidebook', unit: 'visitors', where: 'at the museum on Saturday' },
  { intro: 'passengers on a train', g1: 'travelling to work', g2: 'not travelling to work', n1: 'passengers travelling to work', n2: 'other passengers', act: 'had a season ticket', unit: 'passengers', where: 'on the train' },
] as const;

const pctOf = (pct: number, n: number) => Q.of(pct * n, 100);

export default defineTemplate<V>({
  id: 'num-percentage-of-percentage',
  title: 'Comparing and combining percentages',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { foundational: 'decide', core: 'backwards', stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const nice = calc === 'non-calc';
    const base: V = { level, name, ctx: 0, scores: [0, 0, 0, 0], total: 0, p: 0, q: 0, r: 0 };
    if (level === 'foundational') {
      const outOf = nice ? [20, 25, 50, 40] : [20, 25, 40, 50, 60, 80, 75];
      const [b, d] = rng.sample(outOf, 2);
      const a = rng.int(Math.ceil(b * 0.45), b - 2);
      const c = rng.int(Math.ceil(d * 0.45), d - 2);
      const pa = Q.of(100 * a, b);
      const pc = Q.of(100 * c, d);
      ensure(pa.terminatesWithin(1) && pc.terminatesWithin(1), 'percentages to at most 1 dp');
      ensure(pa.sub(pc).toNumber() ** 2 >= 4, 'percentages differ by at least 2');
      // The trap: the higher raw score is in the test with the lower percentage.
      ensure(a !== c && (a > c) !== pa.gt(pc), 'raw scores mislead');
      return { ...base, ctx: rng.int(0, SUBJECTS.length - 1), scores: [a, b, c, d] };
    }
    const pcts = nice ? [10, 20, 25, 30, 40, 50, 60, 75, 80] : [12, 15, 24, 35, 36, 45, 55, 64, 65, 72, 85];
    if (level === 'core') {
      const [p, q] = [rng.pick(pcts), rng.pick(pcts)];
      const ok = (T: number) => pctOf(p, T).isInt() && pctOf(q, pctOf(p, T).toInt()).isInt();
      const total = rng.int(1, 60) * smallest(ok);
      ensure(total >= 80 && total <= (nice ? 800 : 2000), 'a sensible number of people');
      ensure(ok(total), 'whole numbers of people');
      ensure(pctOf(q, pctOf(p, total).toInt()).toInt() >= 6, 'enough people');
      return { ...base, ctx: rng.int(0, CORE.length - 1), total, p, q };
    }
    const p = rng.pick(nice ? [40, 60, 75, 80, 70, 30] : [35, 45, 55, 65, 62, 58, 72]);
    const [q, r] = rng.sample(nice ? [10, 20, 25, 40, 50, 30] : [12, 15, 18, 22, 35, 42, 28], 2);
    const ok = (T: number) => pctOf(p, T).isInt() && pctOf(q, pctOf(p, T).toInt()).isInt() && pctOf(r, T - pctOf(p, T).toInt()).isInt();
    const total = rng.int(1, 40) * smallest(ok);
    ensure(total >= 100 && total <= (nice ? 2000 : 5000), 'a sensible number of people');
    const g1 = pctOf(p, total);
    const g2 = Q.of(total).sub(g1);
    ensure(g1.isInt() && pctOf(q, g1.toInt()).isInt() && pctOf(r, g2.toInt()).isInt(), 'whole numbers of people');
    return { ...base, ctx: rng.int(0, STRETCH.length - 1), total, p, q, r };
  },

  validate(v) {
    return v.level !== 'foundational' && v.total <= 0 ? ['total'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const [s1, s2] = SUBJECTS[v.ctx];
      const [a, b, c, d] = v.scores;
      return {
        stem: lines(`${v.name} took a ${s1} test and a ${s2} test.`, `In the ${s1} test, ${v.name} scored ${a} out of ${b}`, `In the ${s2} test, ${v.name} scored ${c} out of ${d}`),
        parts: [single(3, text(`In which test did ${v.name} get the higher percentage?`), text('You must show your working.'))],
      };
    }
    if (v.level === 'core') {
      const c = CORE[v.ctx];
      const n = pctOf(v.q, pctOf(v.p, v.total).toInt()).toInt();
      const of = 'of' in c ? c.of : c.group;
      return {
        stem: lines(`At ${c.place}, ${v.p}% of the ${c.whole} are ${c.group}.`, `${v.q}% of the ${of} ${c.act}.`, `${int(n)} of the ${of} ${c.act}.`),
        parts: [single(3, text(`Work out the number of ${c.whole} at ${c.place.replace(/^a /, 'the ')}.`))],
      };
    }
    const c = STRETCH[v.ctx];
    return {
      stem: lines(`Of the ${c.intro}, ${v.p}% were ${c.g1} and the rest were ${c.g2}.`, `${v.q}% of the ${c.n1} ${c.act}.`, `${v.r}% of the ${c.n2} ${c.act}.`, `Altogether, ${int(did(v))} ${c.unit} ${c.act}.`),
      parts: [single(4, text(`Work out the number of ${c.unit} ${c.where}.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.scores;
      const [s1, s2] = SUBJECTS[v.ctx];
      const p1 = Q.of(100 * a, b);
      const p2 = Q.of(100 * c, d);
      return [{ text: `${cap(p1.gt(p2) ? s1 : s2)} (${s1} ${dec(p1)}%, ${s2} ${dec(p2)}%)` }];
    }
    return [{ text: int(v.total) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.scores;
      const [s1, s2] = SUBJECTS[v.ctx];
      const p1 = Q.of(100 * a, b);
      const p2 = Q.of(100 * c, d);
      return [
        [
          step('M1', `${a} ${DIV} ${b} ${TIMES} 100 = ${dec(p1)}%`, `Change the ${s1} score to a percentage.`),
          step('M1', `${c} ${DIV} ${d} ${TIMES} 100 = ${dec(p2)}%`, 'Do the same for the other test.'),
          step('C1', `${cap(p1.gt(p2) ? s1 : s2)}, because ${dec(p1.gt(p2) ? p1 : p2)}% > ${dec(p1.gt(p2) ? p2 : p1)}%`, `The higher score (${Math.max(a, c)}) is not the higher percentage: the tests are out of different totals.`),
        ],
      ];
    }
    if (v.level === 'core') {
      const g = pctOf(v.p, v.total).toInt();
      const n = pctOf(v.q, g).toInt();
      return [
        [
          step('P1', `${int(n)} ${DIV} ${dec(Q.of(v.q, 100))} = ${int(g)}`, `${int(n)} is ${v.q}% of the group, so divide by ${dec(Q.of(v.q, 100))} to find the whole group.`),
          step('P1', `${int(g)} ${DIV} ${dec(Q.of(v.p, 100))}`, `Now ${int(g)} is ${v.p}% of all the ${CORE[v.ctx].whole}: work backwards again.`),
          step('A1', int(v.total), `Check: ${v.p}% of ${int(v.total)} = ${int(g)}, and ${v.q}% of ${int(g)} = ${int(n)}`),
        ],
      ];
    }
    const c = STRETCH[v.ctx];
    const share = Q.of(v.p * v.q + (100 - v.p) * v.r, 100); // % of everyone
    return [
      [
        step('P1', `${dec(Q.of(v.p, 100))} ${TIMES} ${dec(Q.of(v.q, 100))} = ${dec(Q.of(v.p * v.q, 10000))}`, `Fraction of everyone who were ${c.g1} and ${c.act}.`),
        step('P1', `${dec(Q.of(100 - v.p, 100))} ${TIMES} ${dec(Q.of(v.r, 100))} = ${dec(Q.of((100 - v.p) * v.r, 10000))}`, `${100 - v.p}% were ${c.g2}: fraction of everyone who were ${c.g2} and ${c.act}.`),
        step('P1', `${dec(Q.of(v.p * v.q, 10000))} + ${dec(Q.of((100 - v.p) * v.r, 10000))} = ${dec(share.div(100))}, so ${int(did(v))} ${DIV} ${dec(share.div(100))}`, `Altogether ${dec(share)}% ${c.act}: ${int(did(v))} ${c.unit} is ${dec(share)}% of the total.`),
        step('A1', int(v.total), 'Check by working forwards from your answer.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      const [a, b, c, d] = v.scores;
      // Cross-multiply instead of using percentages: a/b > c/d ⇔ ad > cb.
      const first = a * d > c * b;
      if (!answers[0].text.toLowerCase().startsWith(SUBJECTS[v.ctx][first ? 0 : 1].toLowerCase())) p.push('decision');
      return p;
    }
    // Work forwards from the answer and compare with the numbers given.
    const T = Number(answers[0].text.replace(/\s/g, ''));
    if (v.level === 'core') {
      const g = (T * v.p) / 100;
      if ((g * v.q) / 100 !== pctOf(v.q, pctOf(v.p, v.total).toInt()).toInt()) p.push('core forwards');
    } else {
      const g1 = (T * v.p) / 100;
      if ((g1 * v.q) / 100 + ((T - g1) * v.r) / 100 !== did(v)) p.push('stretch forwards');
    }
    return p;
  },

  key: (v) => `${v.scores}|${v.total}|${v.p}|${v.q}|${v.r}`,
});

/** Smallest total that makes every group whole; every multiple of it works too. */
function smallest(ok: (T: number) => boolean): number {
  for (let T = 1; T <= 10000; T++) if (ok(T)) return T;
  return 10001;
}

function did(v: V) {
  const g1 = pctOf(v.p, v.total).toInt();
  return pctOf(v.q, g1).toInt() + pctOf(v.r, v.total - g1).toInt();
}
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
