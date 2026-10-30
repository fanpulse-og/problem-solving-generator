import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, frac, hoursMinutes } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 2H Q11 (6 workers take 14½ days: show that 13 workers
 * can finish in less than 7 days) and November 2022 2F Q16 (4 pipes fill a lake
 * in 12 hours: how long for 6 pipes to fill a quarter of it?). The examiner
 * reports say most errors come from treating these as DIRECT proportion, so the
 * notes ask "should the answer be bigger or smaller?".
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  n1: number; // workers / pipes
  t1: Q; // time for n1
  n2: number;
  part: Q; // core: fraction of the job
  limit: number; // stretch: deadline
}

const JOBS = [
  { who: 'builders', job: 'build a wall', unit: 'days' },
  { who: 'painters', job: 'paint all the classrooms in a school', unit: 'days' },
  { who: 'workers', job: 'pick all the apples in an orchard', unit: 'hours' },
];
const TANKS = [
  { what: 'pipes', job: 'fill a swimming pool', partJob: (f: string) => `fill ${f} of the swimming pool` },
  { what: 'pumps', job: 'empty a flooded car park', partJob: (f: string) => `empty ${f} of the car park` },
  { what: 'hoses', job: 'fill a garden pond', partJob: (f: string) => `fill ${f} of the pond` },
];

/** "14½ days" style: show halves and quarters as fractions. */
const timeText = (t: Q, unit: string) => (t.isInt() ? `${t.toInt()} ${unit}` : `${dec(t)} ${unit}`);

export default defineTemplate<V>({
  id: 'ratio-inverse-work',
  title: 'Inverse proportion: workers and time',
  strand: 'Ratio & Proportion',
  subtopic: 'Direct & inverse proportion',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, ctx: 0, n1: 0, t1: Q.of(0), n2: 0, part: Q.of(1), limit: 0 };
    if (level === 'foundational') {
      const n1 = rng.int(2, 12);
      const n2 = rng.int(2, 15);
      const t1 = Q.of(rng.int(2, 30));
      ensure(n1 !== n2, 'a different number of workers');
      const t2 = t1.mul(n1).div(n2);
      ensure(t2.terminatesWithin(calc === 'calc' ? 2 : 1) && t2.mul(2).isInt(), 'the new time is a whole or half number');
      return { ...base, ctx: rng.int(0, JOBS.length - 1), n1, n2, t1 };
    }
    if (level === 'core') {
      const n1 = rng.int(2, 8);
      const n2 = rng.int(2, 10);
      const t1 = Q.of(rng.int(3, 24));
      const part = rng.pick([Q.of(1, 2), Q.of(1, 4), Q.of(3, 4), Q.of(1, 3), Q.of(2, 3)]);
      ensure(n1 !== n2, 'different numbers of pipes');
      const t2 = t1.mul(n1).div(n2).mul(part);
      // Whole minutes.
      ensure(t2.mul(60).isInt() && t2.toNumber() >= 0.5, 'a time in whole minutes');
      return { ...base, ctx: rng.int(0, TANKS.length - 1), n1, n2, t1, part };
    }
    // Stretch: the fewest workers needed to finish within a deadline.
    const n1 = rng.int(3, 10);
    const t1 = Q.of(rng.int(8, 40) * 2 + 1, 2); // e.g. 14½
    const total = t1.mul(n1); // worker-days
    const limit = rng.int(3, Math.max(4, Math.floor(t1.toNumber()) - 1));
    const need = Math.ceil(total.div(limit).toNumber() - 1e-9);
    ensure(!total.div(limit).isInt() && need > n1 && need <= 40, 'a deadline that needs more workers, not a whole number');
    return { ...base, ctx: rng.int(0, JOBS.length - 1), n1, t1, limit };
  },

  validate(v) {
    return v.n1 > 0 ? [] : ['workers'];
  },

  render(v) {
    if (v.level === 'core') {
      const c = TANKS[v.ctx];
      return {
        stem: lines(`It takes ${v.n1} ${c.what} ${timeText(v.t1, 'hours')} to ${c.job}.`, `The ${c.what} all work at the same rate.`),
        parts: [single(3, text(`How long would it take ${v.n2} ${c.what} to ${c.partJob(frac(v.part))}?`), text('Give your answer in hours and minutes.'))],
      };
    }
    const c = JOBS[v.ctx];
    if (v.level === 'foundational') {
      return {
        stem: lines(`It takes ${v.n1} ${c.who} ${timeText(v.t1, c.unit)} to ${c.job}.`, `All the ${c.who} work at the same rate.`),
        parts: [single(3, text(`How long would it take ${v.n2} ${c.who} to ${c.job.replace(' a ', ' the ')}?`))],
      };
    }
    return {
      stem: lines(`It takes ${v.n1} ${c.who} ${timeText(v.t1, c.unit)} to ${c.job}.`, `All the ${c.who} work at the same rate.`, `${v.name} wants the job done in ${v.limit} ${c.unit} or less.`),
      parts: [single(3, text(`What is the least number of ${c.who} ${v.name} needs?`), text('You must show how you get your answer.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: timeText(v.t1.mul(v.n1).div(v.n2), JOBS[v.ctx].unit) }];
    if (v.level === 'core') return [{ text: hoursMinutes(v.t1.mul(v.n1).div(v.n2).mul(v.part).mul(60).toInt()) }];
    const need = Math.ceil(v.t1.mul(v.n1).div(v.limit).toNumber() - 1e-9);
    return [{ text: `${need} ${JOBS[v.ctx].who}` }];
  },

  markScheme(v) {
    const total = v.t1.mul(v.n1);
    if (v.level === 'foundational') {
      const c = JOBS[v.ctx];
      const t2 = total.div(v.n2);
      return [
        [
          step('M1', `${v.n1} ${TIMES} ${dec(v.t1)} = ${dec(total)} ${c.unit} for 1 ${c.who.replace(/s$/, '')}`, `One worker on their own would take ${v.n1} times as long.`),
          step('M1', `${dec(total)} ${DIV} ${v.n2}`, `More ${c.who} means LESS time: divide, don't multiply.`),
          step('A1', timeText(t2, c.unit), v.n2 > v.n1 ? 'More workers, so the answer should be smaller: check it is.' : 'Fewer workers, so the answer should be bigger: check it is.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const c = TANKS[v.ctx];
      const whole = total.div(v.n2);
      const t = whole.mul(v.part);
      return [
        [
          step('P1', `${v.n1} ${TIMES} ${dec(v.t1)} = ${dec(total)} hours with 1 ${c.what.replace(/s$/, '')}; ${dec(total)} ${DIV} ${v.n2} = ${approx(whole)} hours with ${v.n2}`, `Inverse proportion: more ${c.what}, less time. Should your answer be bigger or smaller? Check it is.`),
          step('P1', `${frac(v.part)} ${TIMES} ${approx(whole)}`, `Only ${frac(v.part)} of the job is needed.`),
          step('A1', hoursMinutes(t.mul(60).toInt()), `${dec(t.mul(60))} minutes, written in hours and minutes.`),
        ],
      ];
    }
    const c = JOBS[v.ctx];
    const need = Math.ceil(total.div(v.limit).toNumber() - 1e-9);
    return [
      [
        step('P1', `${v.n1} ${TIMES} ${dec(v.t1)} = ${dec(total)} ${c.unit} for 1 ${c.who.replace(/s$/, '')}`, 'Find the total amount of work: number of workers × time.'),
        step('P1', `${dec(total)} ${DIV} ${v.limit} = ${approx(total.div(v.limit))}`, `Number of ${c.who} needed to finish in ${v.limit} ${c.unit}.`),
        step('A1', `${need} ${c.who}`, `Round UP: ${need - 1} ${c.who} would take ${approx(total.div(need - 1))} ${c.unit}, which is too long.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Work rate per worker per unit time = 1 / (n1 × t1). Simulate the job.
    const rate = Q.of(1).div(v.t1.mul(v.n1));
    if (v.level === 'foundational') {
      const t = Q.of(1).div(rate.mul(v.n2));
      if (answers[0].text !== timeText(t, JOBS[v.ctx].unit)) p.push('time');
      return p;
    }
    if (v.level === 'core') {
      const t = v.part.div(rate.mul(v.n2));
      const m = /(?:(\d+) hours?)?\s*(?:(\d+) minutes?)?/.exec(answers[0].text)!;
      const mins = Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0);
      if (!t.mul(60).eq(mins)) p.push('time');
      return p;
    }
    let n = 1;
    while (rate.mul(n).mul(v.limit).lt(1)) n++;
    if (answers[0].text !== `${n} ${JOBS[v.ctx].who}`) p.push(`expected ${n}`);
    return p;
  },

  key: (v) => `${v.ctx}|${v.n1}|${v.t1}|${v.n2}|${v.part}|${v.limit}`,
});
