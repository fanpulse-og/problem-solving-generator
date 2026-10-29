import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int, roundDp } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 2F Q17 (80 dancers: estimate the mean time) and Set 24
 * 2F Q16 (bicycle frame sizes: modal class, estimate of the mean). Core works
 * backwards from a given mean to a missing frequency; stretch adds a
 * decide-and-justify claim about the data.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof CONTEXTS)[number];
  start: number;
  width: number;
  freqs: number[];
  missing: number; // core: index of the missing frequency
  claimPct: number; // stretch
  claimFrom: number; // stretch: class boundary in the claim
}

const CONTEXTS = [
  { what: 'the length of time, in minutes, that each of', who: 'students spent dancing in a competition', sym: 'm', unit: 'minutes', name: 'Time' },
  { what: 'the frame size, in cm, of each of', who: 'bicycles sold in a shop', sym: 'S', unit: 'cm', name: 'Frame size' },
  { what: 'the time, in minutes, that each of', who: 'patients waited to see a doctor', sym: 'W', unit: 'minutes', name: 'Time' },
  { what: 'the weight, in grams, of each of', who: 'apples in a box', sym: 'w', unit: 'grams', name: 'Weight' },
] as const;

const mids = (v: V) => v.freqs.map((_, i) => Q.of(2 * v.start + (2 * i + 1) * v.width, 2));
const mean = (v: V) => mids(v).reduce((s, m, i) => s.add(m.mul(v.freqs[i])), Q.of(0)).div(v.freqs.reduce((a, b) => a + b, 0));
const label = (v: V, i: number) => `${v.start + i * v.width} < $${v.ctx.sym}$ ≤ ${v.start + (i + 1) * v.width}`;
const showMean = (q: Q) => (q.terminatesWithin(1) ? dec(q) : roundDp(q, 1));

export default defineTemplate<V>({
  id: 'stats-grouped-mean',
  title: 'Estimating the mean from grouped data',
  strand: 'Statistics',
  subtopic: 'Grouped data & histograms',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'backwards', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.pick(CONTEXTS);
    const width = rng.pick([5, 6, 10, 12, 20]);
    const start = ctx.unit === 'grams' ? rng.step(80, 120, 10) : ctx.unit === 'cm' ? rng.step(30, 40, 2) : 0;
    const freqs = Array.from({ length: 5 }, () => rng.int(2, 30));
    const v: V = { level, ctx, start, width, freqs, missing: rng.int(0, 4), claimPct: 0, claimFrom: 0 };
    const top = Math.max(...freqs);
    ensure(freqs.filter((f) => f === top).length === 1, 'a single modal class');
    const m = mean(v);
    if (level === 'core') {
      ensure(m.terminatesWithin(1), 'the given mean must be exact');
      // If the missing class's midpoint equals the mean, every f works: no unique answer.
      ensure(!mids(v)[v.missing].eq(m), 'f must be determined by the mean');
    }
    else if (!m.terminatesWithin(1)) {
      const r = m.mul(10).sub(Q.of(m.mul(10).floor()));
      ensure(Math.abs(r.toNumber() - 0.5) > 0.01, 'not a rounding boundary');
      ensure(!roundDp(m, 1).endsWith('.0'), 'avoid answers like 26.0');
    }
    if (level === 'stretch') {
      const cut = rng.int(2, 4);
      v.claimFrom = start + cut * width;
      const above = freqs.slice(cut).reduce((a, b) => a + b, 0);
      const pct = Q.of(above * 100, freqs.reduce((a, b) => a + b, 0));
      // Claim is close to the truth but clearly on one side of it.
      const claim = rng.pick([20, 25, 30, 35, 40, 45, 50, 60]);
      ensure(Math.abs(pct.toNumber() - claim) >= 2 && Math.abs(pct.toNumber() - claim) <= 15, 'a close call');
      ensure(pct.terminatesWithin(1) || !roundDp(pct, 1).endsWith('.0'), 'avoid percentages like 43.0%');
      ensure(freqs.length - cut >= 2, 'the claim covers at least two classes');
      v.claimPct = claim;
    }
    return v;
  },

  validate(v) {
    return v.freqs.every((f) => f > 0) ? [] : ['frequencies positive'];
  },

  render(v) {
    const n = v.freqs.reduce((a, b) => a + b, 0);
    const header = [`${v.ctx.name} ($${v.ctx.sym}$ ${v.ctx.unit})`, 'Frequency'];
    const rows = v.freqs.map((f, i) => [label(v, i), v.level === 'core' && i === v.missing ? '$f$' : `${f}`]);
    const stem = [text(`The table gives information about ${v.ctx.what} ${v.level === 'core' ? 'some' : int(n)} ${v.ctx.who}.`), table({ header, rows })];
    if (v.level === 'foundational') {
      return { stem, parts: [part('a', 1, text('Write down the modal class.')), part('b', 4, text(`Work out an estimate for the mean ${v.ctx.name.toLowerCase()}.`), ...(mean(v).terminatesWithin(1) ? [] : [text('Give your answer correct to 1 decimal place.')]))] };
    }
    if (v.level === 'core') {
      return { stem: [...stem, text(`An estimate for the mean ${v.ctx.name.toLowerCase()} is ${dec(mean(v))} ${v.ctx.unit}.`)], parts: [single(4, text('Work out the value of $f$'))] };
    }
    return {
      stem,
      parts: [
        part('a', 4, text(`Work out an estimate for the mean ${v.ctx.name.toLowerCase()}.`), ...(mean(v).terminatesWithin(1) ? [] : [text('Give your answer correct to 1 decimal place.')])),
        part('b', 2, text(`Sam says, “More than ${v.claimPct}% of the ${v.ctx.who.split(' ')[0]} had a ${v.ctx.name.toLowerCase()} of more than ${v.claimFrom} ${v.ctx.unit}.”`), text('Is Sam correct? You must show how you get your answer.')),
      ],
    };
  },

  answer(v) {
    const modal = v.freqs.indexOf(Math.max(...v.freqs));
    if (v.level === 'foundational') return [{ text: label(v, modal) }, { text: `${showMean(mean(v))} ${v.ctx.unit}` }];
    if (v.level === 'core') return [{ text: `$f$ = ${v.freqs[v.missing]}` }];
    const n = v.freqs.reduce((a, b) => a + b, 0);
    const cut = (v.claimFrom - v.start) / v.width;
    const above = v.freqs.slice(cut).reduce((a, b) => a + b, 0);
    const pct = Q.of(above * 100, n);
    return [{ text: `${showMean(mean(v))} ${v.ctx.unit}` }, { text: `${pct.gt(v.claimPct) ? 'Yes' : 'No'}: ${above} out of ${n} is ${pct.terminatesWithin(1) ? dec(pct) : roundDp(pct, 1)}%, which is ${pct.gt(v.claimPct) ? 'more' : 'less'} than ${v.claimPct}%` }];
  },

  markScheme(v) {
    const ms = mids(v);
    const n = v.freqs.reduce((a, b) => a + b, 0);
    const fx = ms.map((m, i) => m.mul(v.freqs[i]));
    const sum = fx.reduce((a, b) => a.add(b), Q.of(0));
    const meanSteps = [
      step('M1', `Midpoints: ${ms.map((m) => dec(m)).join(', ')}`, 'Use the middle of each class as an estimate for every value in it.'),
      step('M1', `${ms.map((m, i) => `${v.freqs[i]} ${TIMES} ${dec(m)}`).join(' + ')} = ${dec(sum)}`, 'Multiply each midpoint by its frequency and add.'),
      step('M1', `${dec(sum)} ${DIV} ${n}`, 'Divide by the total frequency, not by the number of classes.'),
      step('A1', `${showMean(mean(v))} ${v.ctx.unit}`, 'It is an estimate, because we don’t know the exact values.'),
    ];
    if (v.level === 'foundational') {
      const modal = v.freqs.indexOf(Math.max(...v.freqs));
      return [[step('B1', label(v, modal), 'The class with the highest frequency.')], meanSteps];
    }
    if (v.level === 'core') {
      const others = ms.reduce((s, m, i) => (i === v.missing ? s : s.add(m.mul(v.freqs[i]))), Q.of(0));
      const fOthers = v.freqs.reduce((s, f, i) => (i === v.missing ? s : s + f), 0);
      const mm = ms[v.missing];
      return [
        [
          step('P1', `Σfx = ${dec(others)} + ${dec(mm)}$f$, Σf = ${fOthers} + $f$`, 'Write the total of f × midpoint and the total frequency, with f in them.'),
          step('P1', `(${dec(others)} + ${dec(mm)}$f$) ${DIV} (${fOthers} + $f$) = ${dec(mean(v))}`, 'Set the estimate of the mean equal to the value given.'),
          step('P1', `${dec(others)} + ${dec(mm)}$f$ = ${dec(mean(v).mul(fOthers))} + ${dec(mean(v))}$f$, so ${dec(mm.sub(mean(v)).gt(0) ? mm.sub(mean(v)) : mean(v).sub(mm))}$f$ = ${dec(mm.sub(mean(v)).gt(0) ? mean(v).mul(fOthers).sub(others) : others.sub(mean(v).mul(fOthers)))}`, 'Multiply out, then collect the f terms.'),
          step('A1', `$f$ = ${v.freqs[v.missing]}`, 'Check: it must be a whole number.'),
        ],
      ];
    }
    const cut = (v.claimFrom - v.start) / v.width;
    const above = v.freqs.slice(cut).reduce((a, b) => a + b, 0);
    const pct = Q.of(above * 100, n);
    return [
      meanSteps,
      [step('M1', `${v.freqs.slice(cut).join(' + ')} = ${above}; ${above} ${DIV} ${n} ${TIMES} 100 = ${pct.terminatesWithin(1) ? dec(pct) : roundDp(pct, 1)}%`, `Count the values above ${v.claimFrom} (a class boundary), as a percentage of the total.`), step('C1', `${pct.gt(v.claimPct) ? 'Yes' : 'No'}, because it is ${pct.gt(v.claimPct) ? 'more' : 'less'} than ${v.claimPct}%`, 'Compare and conclude.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Mean from the class ends: (lower + upper) / 2 written differently.
    let sx = Q.of(0);
    let sf = 0;
    v.freqs.forEach((f, i) => {
      const lo = v.start + i * v.width;
      sx = sx.add(Q.of((lo + lo + v.width) * f, 2));
      sf += f;
    });
    const m = sx.div(sf);
    if (v.level === 'core') {
      // Try every possible missing frequency.
      const sols: number[] = [];
      for (let f = 1; f <= 200; f++) {
        const fr = v.freqs.map((x, i) => (i === v.missing ? f : x));
        if (mean({ ...v, freqs: fr }).eq(m)) sols.push(f);
      }
      if (sols.length !== 1 || answers[0].text !== `$f$ = ${sols[0]}`) p.push('f');
    } else if (!answers[v.level === 'foundational' ? 1 : 0].text.startsWith(showMean(m) + ' ')) p.push('mean');
    return p;
  },

  key: (v) => `${v.start}|${v.width}|${v.freqs}|${v.missing}|${v.claimPct}|${v.claimFrom}`,
});
