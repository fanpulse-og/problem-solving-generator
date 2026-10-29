import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, MINUS } from '../../engine/blocks';
import { dec, ensure, roundDp } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2H Q18 (cumulative frequency graph of times: median and
 * interquartile range), Set 24 3H Q14 (estimate how many were more than a
 * value) and Set 23 3H Q17 (compare with a second group's median and IQR).
 * The graph joins the points with straight lines, so every reading is an
 * exact interpolation; answers carry the one-small-square tolerance that a
 * mark scheme would accept.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof CONTEXTS)[number];
  name: string;
  freqs: number[];
  X: number; // core: "more than X"
  other: { med: number; iqr: number }; // stretch: the second group
}

const CONTEXTS = [
  { about: 'the times, in minutes, that {n} students took to complete a cross-country run', who: 'students', axis: 'Time (minutes)', unit: 'minutes', start: 20, w: 5, more: 'took more than {x} minutes', other: 'teachers', higher: 'took longer on average' },
  { about: 'the heights, in cm, of {n} sunflowers', who: 'sunflowers', axis: 'Height (cm)', unit: 'cm', start: 100, w: 20, more: 'were taller than {x} cm', other: 'sunflowers grown in a second field', higher: 'were taller on average' },
  { about: 'the masses, in grams, of {n} apples', who: 'apples', axis: 'Mass (grams)', unit: 'grams', start: 80, w: 20, more: 'had a mass of more than {x} grams', other: 'apples from a second farm', higher: 'were heavier on average' },
  { about: 'the marks scored by {n} students in a test', who: 'students', axis: 'Mark', unit: 'marks', start: 0, w: 10, more: 'scored more than {x} marks', other: 'students in a second class', higher: 'scored higher marks on average' },
] as const;

const bounds = (v: V) => v.freqs.map((_, i) => v.ctx.start + (i + 1) * v.ctx.w);
const total = (v: V) => v.freqs.reduce((a, b) => a + b, 0);
/** Cumulative frequency at x on the straight-line graph. */
function cfAt(v: V, x: number): Q {
  let cum = 0;
  for (let i = 0; i < v.freqs.length; i++) {
    const lo = v.ctx.start + i * v.ctx.w;
    if (x <= lo + v.ctx.w) return Q.of(cum).add(Q.of(v.freqs[i] * (x - lo), v.ctx.w));
    cum += v.freqs[i];
  }
  return Q.of(cum);
}
/** The x where the graph reaches cumulative frequency c. */
function xAt(v: V, c: Q): Q {
  let cum = 0;
  for (let i = 0; i < v.freqs.length; i++) {
    const f = v.freqs[i];
    if (Q.of(cum + f).cmp(c) >= 0) return Q.of(v.ctx.start + i * v.ctx.w).add(c.sub(cum).mul(v.ctx.w).div(f));
    cum += f;
  }
  return Q.of(v.ctx.start + v.freqs.length * v.ctx.w);
}
const minorX = (v: V) => v.ctx.w / 5;
const minorY = (n: number) => (n <= 60 ? 2 : 4);
const rnd = (q: Q) => Number(roundDp(q, 0));
/** "34 minutes (accept 33 to 35)" */
const reading = (q: Q, tol: number, unit = '') => `${rnd(q)}${unit ? ` ${unit}` : ''} (accept ${dec(Q.of(Math.floor(q.sub(tol).toNumber() + 1e-9)))} to ${dec(Q.of(Math.ceil(q.add(tol).toNumber() - 1e-9)))})`;

function stats(v: V) {
  const n = total(v);
  const lq = xAt(v, Q.of(n, 4));
  const uq = xAt(v, Q.of(3 * n, 4));
  // The IQR as a student would get it: from the two rounded readings.
  return { n, med: xAt(v, Q.of(n, 2)), lq, uq, iqr: rnd(uq) - rnd(lq) };
}

export default defineTemplate<V>({
  id: 'stats-cumulative-frequency',
  title: 'Cumulative frequency graphs',
  strand: 'Statistics',
  subtopic: 'Cumulative frequency & box plots',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, level }) {
    const ctx = rng.pick(CONTEXTS);
    const [name] = names(rng, 1);
    const n = rng.pick([40, 60, 80, 100, 120]);
    const k = rng.pick([5, 6]);
    // A hump-shaped distribution.
    const weights = Array.from({ length: k }, (_, i) => (1 + Math.min(i, k - 1 - i) * rng.int(2, 4)) * rng.int(2, 5));
    const sum = weights.reduce((a, b) => a + b, 0);
    const freqs = weights.map((w) => Math.max(1, Math.round((w * n) / sum)));
    freqs[freqs.length - 1] += n - freqs.reduce((a, b) => a + b, 0);
    ensure(freqs.every((f) => f >= 1), 'every class has someone in it');
    const v: V = { level, ctx, name, freqs, X: 0, other: { med: 0, iqr: 0 } };
    const s = stats(v);
    ensure(s.uq.sub(s.lq).toNumber() >= 2 * ctx.w * 0.6, 'a spread worth measuring');
    if (level === 'core') {
      // X on a numbered gridline inside a class, where the graph meets a whole number.
      const cands = Array.from({ length: k * 5 - 1 }, (_, i) => ctx.start + (i + 1) * minorX(v)).filter((x) => x % ctx.w !== 0 && cfAt(v, x).isInt());
      ensure(cands.length > 0, 'a readable value');
      v.X = rng.pick(cands);
      const more = Q.of(n).sub(cfAt(v, v.X));
      ensure(more.toNumber() >= 0.15 * n && more.toNumber() <= 0.85 * n, 'a sensible count');
    }
    if (level === 'stretch') {
      const shift = rng.pick([-1, 1]) * rng.int(2, 4) * minorX(v);
      const med = rnd(s.med) + shift;
      const iqr = s.iqr + rng.pick([-1, 1]) * rng.int(2, 4) * minorX(v);
      ensure(iqr > 0 && med > ctx.start && med < ctx.start + k * ctx.w, 'a realistic second group');
      v.other = { med, iqr };
    }
    return v;
  },

  validate(v) {
    return total(v) % 4 === 0 ? [] : ['total must split into quarters'];
  },

  render(v) {
    const n = total(v);
    const hiX = v.ctx.start + v.freqs.length * v.ctx.w;
    const yTop = Math.ceil(n / 20) * 20;
    const pts: [number, number][] = [[v.ctx.start, 0], ...bounds(v).map((b, i) => [b, v.freqs.slice(0, i + 1).reduce((a, c) => a + c, 0)] as [number, number])];
    const graph = diagram({
      type: 'grid',
      x: [v.ctx.start, hiX],
      y: [0, yTop],
      xStep: minorX(v),
      yStep: minorY(n),
      xLabelEvery: v.ctx.w,
      yLabelEvery: n <= 60 ? 10 : 20,
      xLabel: v.ctx.axis,
      yLabel: 'Cumulative frequency',
      paths: [{ points: pts, dots: true }],
    });
    const intro = text(`The cumulative frequency graph shows information about ${v.ctx.about.replace('{n}', String(n))}.`);
    if (v.level === 'foundational') {
      return {
        stem: [intro, graph],
        parts: [part('a', 1, text('Use the graph to find an estimate for the median.')), part('b', 2, text('Use the graph to find an estimate for the interquartile range.'))],
      };
    }
    if (v.level === 'core') {
      return { stem: [intro, graph], parts: [single(3, text(`Use the graph to find an estimate for the percentage of the ${v.ctx.who} ${v.ctx.who === 'students' ? 'who' : 'that'} ${v.ctx.more.replace('{x}', String(v.X))}.`))] };
    }
    return {
      stem: [intro, graph, text(`For ${v.ctx.other}, the median is ${v.other.med} ${v.ctx.unit} and the interquartile range is ${v.other.iqr} ${v.ctx.unit}.`)],
      parts: [single(4, text(`Compare the distribution for the ${n} ${v.ctx.who} with the distribution for ${v.ctx.other}.`))],
    };
  },

  answer(v) {
    const s = stats(v);
    const tx = minorX(v);
    if (v.level === 'foundational') return [{ text: reading(s.med, tx) }, { text: `${s.iqr} (accept ${Math.floor(s.uq.sub(s.lq).toNumber() - tx + 1e-9)} to ${Math.ceil(s.uq.sub(s.lq).toNumber() + tx - 1e-9)})` }];
    if (v.level === 'core') {
      const pct = Q.of(s.n).sub(cfAt(v, v.X)).div(s.n).mul(100);
      const tol = Q.of(minorY(s.n) * 100, s.n);
      return [{ text: `${rnd(pct)}% (accept ${Math.floor(pct.sub(tol).toNumber() + 1e-9)}% to ${Math.ceil(pct.add(tol).toNumber() - 1e-9)}%)` }];
    }
    const higher = rnd(s.med) > v.other.med;
    const consistent = s.iqr < v.other.iqr;
    return [{ text: `Median ≈ ${rnd(s.med)}, IQR ≈ ${s.iqr}. The ${s.n} ${v.ctx.who} ${higher ? v.ctx.higher : lowerPhrase(v)}; their ${consistent ? 'smaller' : 'larger'} IQR means they were ${consistent ? 'more' : 'less'} consistent.` }];
  },

  markScheme(v) {
    const s = stats(v);
    const iqr = s.iqr;
    const lqRead = step('M1', `LQ ≈ ${rnd(s.lq)} (reading at ${dec(Q.of(s.n, 4))}), UQ ≈ ${rnd(s.uq)} (reading at ${dec(Q.of(3 * s.n, 4))})`, `Quartiles: go across from ¼ and ¾ of ${s.n}, then down to the axis.`);
    if (v.level === 'foundational') {
      return [
        [step('B1', `${rnd(s.med)} ${v.ctx.unit}`, `Go across from ${s.n} ÷ 2 = ${s.n / 2} to the graph, then down.`)],
        [lqRead, step('A1', `${rnd(s.uq)} ${MINUS} ${rnd(s.lq)} = ${iqr}`, 'IQR = upper quartile − lower quartile. Answers within a small square are fine.')],
      ];
    }
    if (v.level === 'core') {
      const cf = cfAt(v, v.X);
      const more = Q.of(s.n).sub(cf);
      return [
        [
          step('M1', `At ${v.X}, cumulative frequency ≈ ${dec(cf)}`, `Go up from ${v.X} to the graph, then across.`),
          step('M1', `${s.n} ${MINUS} ${dec(cf)} = ${dec(more)}`, 'The graph counts how many are LESS than the value, so subtract from the total.'),
          step('A1', `${dec(more)} ÷ ${s.n} × 100 = ${rnd(more.div(s.n).mul(100))}%`, 'Write it as a percentage of the total.'),
        ],
      ];
    }
    return [
      [
        step('M1', `Median ≈ ${rnd(s.med)} ${v.ctx.unit}`, `Read across from ${s.n / 2}.`),
        { ...lqRead, working: `${lqRead.working}, so IQR ≈ ${rnd(s.uq)} ${MINUS} ${rnd(s.lq)} = ${iqr}` },
        step('C1', `${rnd(s.med)} ${rnd(s.med) > v.other.med ? '>' : '<'} ${v.other.med}: the ${s.n} ${v.ctx.who} ${rnd(s.med) > v.other.med ? v.ctx.higher : lowerPhrase(v)}`, 'Compare the medians, in context.'),
        step('C1', `${iqr} ${iqr < v.other.iqr ? '<' : '>'} ${v.other.iqr}: the ${s.n} ${v.ctx.who} were ${iqr < v.other.iqr ? 'more' : 'less'} consistent`, 'Compare the interquartile ranges: a smaller IQR means more consistent.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Rebuild the ordered list of values the graph implies (values spread evenly in each class) and read off by counting.
    const n = total(v);
    const valueAt = (c: number) => {
      // Bisection on the cumulative graph rebuilt from running totals.
      let lo: number = v.ctx.start;
      let hi: number = v.ctx.start + v.freqs.length * v.ctx.w;
      const cum = (x: number) => {
        let s = 0;
        v.freqs.forEach((f, i) => {
          const a = v.ctx.start + i * v.ctx.w;
          s += f * Math.min(1, Math.max(0, (x - a) / v.ctx.w));
        });
        return s;
      };
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (cum(mid) < c) lo = mid;
        else hi = mid;
      }
      return { x: lo, cum };
    };
    const within = (ans: string, x: number) => {
      const m = /accept (-?[\d.]+)%? to (-?[\d.]+)/.exec(ans);
      return !!m && Number(m[1]) <= x + 1e-9 && x - 1e-9 <= Number(m[2]);
    };
    const med = valueAt(n / 2).x;
    const iqr = valueAt((3 * n) / 4).x - valueAt(n / 4).x;
    if (v.level === 'foundational') {
      if (!within(answers[0].text, med)) p.push('median');
      if (!within(answers[1].text, iqr)) p.push('IQR');
    } else if (v.level === 'core') {
      const { cum } = valueAt(0);
      const pct = ((n - cum(v.X)) / n) * 100;
      if (!within(answers[0].text, pct)) p.push('percentage');
    } else {
      const t = answers[0].text;
      const shown = Number(/Median ≈ (-?[\d.]+)/.exec(t)?.[1]);
      if (!(Math.abs(shown - med) <= 0.5 + 1e-6)) p.push('median');
      const consistent = Math.round(iqr) < v.other.iqr;
      if (!t.includes(consistent ? 'more consistent' : 'less consistent')) p.push('consistency');
    }
    return p;
  },

  key: (v) => `${v.ctx.start}|${v.freqs}|${v.X}|${v.other.med}|${v.other.iqr}`,
});

function lowerPhrase(v: V): string {
  return { 'took longer on average': 'were quicker on average', 'were taller on average': 'were shorter on average', 'were heavier on average': 'were lighter on average', 'scored higher marks on average': 'scored lower marks on average' }[v.ctx.higher];
}
