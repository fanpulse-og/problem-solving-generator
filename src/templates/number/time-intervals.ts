import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { clock, ensure, hoursMinutes, int } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1F Q15 (out for a walk from 16 35 to 20 15), Set 24 2F Q6
 * (three TV programmes from 10 50 am to 2 20 pm: how long was the third?) and
 * Set 22 2F Q15 (a machine makes a bolt every 8 seconds from 09 30 to 16 10).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  start: number; // minutes after midnight
  duration: number; // minutes
  start2: number; // foundational (b)
  programmes: [string, number][]; // core: known programmes
  unknown: string; // core
  seconds: number; // stretch: one item every `seconds`
  product: string;
}

const PROGRAMMES = ['a comedy programme', 'a sports programme', 'a cooking programme', 'a quiz show', 'a nature documentary', 'a film'];
const UNKNOWN = ['a history programme', 'a science programme', 'a music programme'];
const PRODUCTS = [
  ['A machine', 'bolt', 'bolts', 'produce'],
  ['A machine', 'bottle', 'bottles', 'fill'],
  ['A printer', 'poster', 'posters', 'print'],
  ['A robot', 'parcel', 'parcels', 'pack'],
] as const;

/** 12-hour clock in the style of the papers: "10 50 am", "2 20 pm". */
function clock12(m: number): string {
  const h24 = Math.floor(m / 60) % 24;
  const mm = String(m % 60).padStart(2, '0');
  const h = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h} ${mm} ${h24 < 12 ? 'am' : 'pm'}`;
}

export default defineTemplate<V>({
  id: 'num-time-intervals',
  title: 'Time intervals',
  strand: 'Number',
  subtopic: 'Measures, time & money',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, start: 0, duration: 0, start2: 0, programmes: [], unknown: '', seconds: 0, product: '' };
    if (level === 'foundational') {
      const start = rng.step(8 * 60, 17 * 60, 5);
      const duration = rng.step(65, 290, 5);
      ensure(start % 60 > (start + duration) % 60, 'crossing an hour boundary in the minutes makes it a real problem');
      const start2 = rng.step(8 * 60, 15 * 60, 5);
      return { ...base, start, duration, start2 };
    }
    if (level === 'core') {
      const start = rng.step(9 * 60, 11 * 60 + 45, 5);
      const n = 2;
      const progs = rng.sample(PROGRAMMES, n).map((p) => [p, rng.step(25, 95, 5)] as [string, number]);
      const third = rng.step(20, 90, 5);
      const duration = progs.reduce((s, [, d]) => s + d, 0) + third;
      ensure(start + duration > 12 * 60 + 10, 'finishes in the afternoon (crosses noon)');
      return { ...base, start, duration, programmes: progs, unknown: rng.pick(UNKNOWN) };
    }
    // Stretch: one item every `seconds`, whole number of items.
    const seconds = rng.pick(calc === 'non-calc' ? [5, 6, 8, 10, 12, 15, 20, 30] : [6, 7, 8, 9, 12, 15, 18, 24, 45]);
    const start = rng.step(7 * 60, 10 * 60, 5);
    const duration = rng.step(150, 480, 5);
    ensure((duration * 60) % seconds === 0, 'a whole number of items');
    ensure(start % 60 > (start + duration) % 60, 'minutes cross the hour, as in the paper');
    const p = rng.pick(PRODUCTS);
    return { ...base, start, duration, seconds, product: p.join('|') };
  },

  validate(v) {
    const p: string[] = [];
    if (v.duration <= 0) p.push('duration');
    if (v.start + v.duration >= 24 * 60) p.push('must finish the same day');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`${v.name} goes out for a walk.`, `${v.name} leaves home at ${clock(v.start)}`, `${v.name} arrives back home at ${clock(v.start + v.duration)} on the same day.`),
        parts: [
          part('a', 2, text(`Work out for how much time ${v.name} is out for the walk.`)),
          part('b', 1, text(`The next day, ${v.name} leaves home at ${clock(v.start2)} and is out for the same amount of time.`), text(`At what time does ${v.name} arrive back home?`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(
          `${v.name} started watching television at ${clock12(v.start)}.`,
          `${v.name} watched`,
          ...v.programmes.map(([p, d]) => `${p} lasting ${hoursMinutes(d)}`),
          v.unknown,
          'There were no breaks and no advertisements between the programmes.',
          `${v.name} finished watching television at ${clock12(v.start + v.duration)}.`,
        ),
        parts: [single(3, text(`How long did ${v.unknown.replace(/^a /, 'the ')} last?`), text('Give your answer in minutes.'))],
      };
    }
    const [who, one, many, verb] = v.product.split('|');
    return {
      stem: lines(`${who} takes ${v.seconds} seconds to ${verb} a ${one}.`, `Each day, the ${who.toLowerCase().replace(/^a /, '')} starts at ${clock(v.start)}`, `It works continuously, one ${one} every ${v.seconds} seconds, until it stops at ${clock(v.start + v.duration)} on the same day.`),
      parts: [single(4, text(`Work out how many ${many} it can ${verb} each day.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: hoursMinutes(v.duration) }, { text: clock(v.start2 + v.duration) }];
    if (v.level === 'core') {
      const known = v.programmes.reduce((s, [, d]) => s + d, 0);
      return [{ text: `${v.duration - known} minutes` }];
    }
    return [{ text: int((v.duration * 60) / v.seconds) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const toHour = 60 - (v.start % 60);
      return [
        [
          step('M1', `${clock(v.start)} to ${clock(v.start + toHour)} is ${toHour} minutes, then to ${clock(v.start + v.duration)} is ${hoursMinutes(v.duration - toHour)}`, 'Count on to the next whole hour, then on to the end time.'),
          step('A1', hoursMinutes(v.duration), 'Add the pieces together. Time is not decimal: 60 minutes make an hour.'),
        ],
        [step('B1', `${clock(v.start2)} + ${hoursMinutes(v.duration)} = ${clock(v.start2 + v.duration)}`, 'Add the same length of time to the new start time.')],
      ];
    }
    if (v.level === 'core') {
      const known = v.programmes.reduce((s, [, d]) => s + d, 0);
      return [
        [
          step('P1', `${clock12(v.start)} to ${clock12(v.start + v.duration)} is ${hoursMinutes(v.duration)} = ${v.duration} minutes`, 'Find the total time, counting through 12 noon.'),
          step('P1', `${v.programmes.map(([, d]) => d).join(' + ')} = ${known} minutes`, 'Add up the programmes you know (in minutes).'),
          step('A1', `${v.duration} ${MINUS} ${known} = ${v.duration - known} minutes`, 'The rest of the time is the missing programme.'),
        ],
      ];
    }
    const secs = v.duration * 60;
    return [
      [
        step('P1', `${clock(v.start)} to ${clock(v.start + v.duration)} = ${hoursMinutes(v.duration)}`, 'Find how long it works for.'),
        step('P1', `${hoursMinutes(v.duration)} = ${v.duration} minutes = ${v.duration} ${TIMES} 60 = ${int(secs)} seconds`, 'Change it to seconds, to match the rate.'),
        step('P1', `${int(secs)} ${DIV} ${v.seconds}`, `One item every ${v.seconds} seconds.`),
        step('A1', int(secs / v.seconds), 'A whole number of items.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Tick through the day second by second in steps.
      let t = v.start * 60;
      let n = 0;
      while (t + v.seconds <= (v.start + v.duration) * 60) {
        t += v.seconds;
        n++;
      }
      if (answers[0].text !== int(n)) p.push('count');
    } else if (v.level === 'core') {
      const known = v.programmes.reduce((s, [, d]) => s + d, 0);
      // Recompute the interval from the displayed 12-hour times.
      const parse = (s: string) => {
        const [h, m, ap] = s.split(' ');
        return ((Number(h) % 12) + (ap === 'pm' ? 12 : 0)) * 60 + Number(m);
      };
      const total = parse(clock12(v.start + v.duration)) - parse(clock12(v.start));
      if (answers[0].text !== `${total - known} minutes` || total - known <= 0) p.push('missing programme');
    } else {
      const parse = (s: string) => Number(s.slice(0, 2)) * 60 + Number(s.slice(3));
      const d = parse(clock(v.start + v.duration)) - parse(clock(v.start));
      if (answers[0].text !== hoursMinutes(d)) p.push('walk');
    }
    return p;
  },

  key: (v) => `${v.start}|${v.duration}|${v.start2}|${v.seconds}|${JSON.stringify(v.programmes)}`,
});
