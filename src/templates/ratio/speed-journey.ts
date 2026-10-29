import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { clock, dec, ensure, hoursMinutes, roundDp } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 2H Q8 (90 km/h in m/s), Set 22 2H Q18 (average speeds
 * of two journeys) and the time questions in the Foundation papers. Core asks
 * for an arrival time; stretch combines two stages into one average speed.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  mode: (typeof MODES)[number];
  speed: number; // foundational/core: average speed
  minutes: number; // foundational (a) / core: travel time in minutes
  minutes2: number; // foundational (b)
  start: number; // core: minutes after midnight
  stop: number; // core: minutes stopped
  // stretch: two stages
  s1: number;
  t1: number;
  s2: number;
  t2: number;
}

const MODES = [
  { verb: 'cycles', noun: 'bike ride', unit: 'km', speedUnit: 'km/h', lo: 12, hi: 24 },
  { verb: 'drives', noun: 'car journey', unit: 'miles', speedUnit: 'mph', lo: 30, hi: 65 },
  { verb: 'travels by train', noun: 'train journey', unit: 'km', speedUnit: 'km/h', lo: 60, hi: 120 },
  { verb: 'walks', noun: 'walk', unit: 'km', speedUnit: 'km/h', lo: 3, hi: 6 },
] as const;

const dist = (speed: number, minutes: number) => Q.of(speed * minutes, 60);

export default defineTemplate<V>({
  id: 'ratio-speed-journey',
  title: 'Speed, distance and time journeys',
  strand: 'Ratio & Proportion',
  subtopic: 'Compound measures & best buys',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const mode = rng.pick(MODES);
    const friendly = calc === 'non-calc';
    const base: V = { level, name, mode, speed: 0, minutes: 0, minutes2: 0, start: 0, stop: 0, s1: 0, t1: 0, s2: 0, t2: 0 };
    const minuteStep = friendly ? 15 : 5;
    if (level === 'stretch' && friendly) {
      // Non-calculator: whole-number average built first, then split into two stages.
      const avg = rng.int(mode.lo, mode.hi);
      const T = rng.pick([120, 180, 240]);
      const t1 = rng.step(30, T - 30, 15);
      const t2 = T - t1;
      const s1 = rng.int(mode.lo, mode.hi);
      ensure(t1 !== t2 && s1 !== avg, 'different times and speeds');
      ensure(dist(s1, t1).isInt(), 'stage 1 distance whole');
      const d2 = dist(avg, T).sub(dist(s1, t1));
      const s2q = d2.mul(60).div(t2);
      ensure(s2q.isInt() && s2q.toInt() >= mode.lo && s2q.toInt() <= mode.hi, 'stage 2 speed realistic and whole');
      return { ...base, s1, t1, s2: s2q.toInt(), t2 };
    }
    if (level === 'stretch') {
      const s1 = rng.int(mode.lo, mode.hi);
      const s2 = rng.int(mode.lo, mode.hi);
      const t1 = rng.step(20, 150, minuteStep);
      const t2 = rng.step(20, 150, minuteStep);
      ensure(s1 !== s2, 'different speeds');
      ensure(t1 !== t2, 'different times, so averaging the two speeds gives the wrong answer');
      const v = { ...base, s1, t1, s2, t2 };
      ensure(dist(s1, t1).isInt() && dist(s2, t2).isInt(), 'whole-number distances');
      const avg = dist(s1, t1).add(dist(s2, t2)).div(Q.of(t1 + t2, 60));
      if (friendly) ensure(avg.isInt(), 'whole-number average for non-calculator');
      else ensure(avg.terminatesWithin(1) || Math.abs(avg.mul(10).sub(Q.of(avg.mul(10).floor())).toNumber() - 0.5) > 0.01, 'not a rounding boundary');
      if (!avg.terminatesWithin(1)) ensure(!roundDp(avg, 1).endsWith('.0'), 'avoid answers like 45.0');
      return v;
    }
    const speed = rng.int(mode.lo, mode.hi);
    const minutes = rng.step(30, 240, minuteStep);
    ensure(dist(speed, minutes).isInt(), 'whole-number distance');
    if (level === 'foundational') {
      const minutes2 = rng.step(30, 240, minuteStep);
      ensure(minutes2 !== minutes && dist(speed, minutes2).isInt(), 'second distance whole');
      return { ...base, speed, minutes, minutes2 };
    }
    const start = rng.step(7 * 60, 15 * 60, 5);
    const stop = rng.step(10, 45, 5);
    return { ...base, speed, minutes, start, stop };
  },

  validate(v) {
    const p: string[] = [];
    if (v.level !== 'stretch' && v.speed <= 0) p.push('speed');
    return p;
  },

  render(v) {
    const { mode, name } = v;
    if (v.level === 'foundational') {
      return {
        stem: [text(`${name} ${mode.verb} ${dec(dist(v.speed, v.minutes))} ${mode.unit} in ${hoursMinutes(v.minutes)}.`)],
        parts: [
          part('a', 2, text(`Work out ${name}’s average speed in ${mode.speedUnit}.`)),
          part('b', 2, text(`${name} ${mode.verb} ${dec(dist(v.speed, v.minutes2))} ${mode.unit} at the same average speed.`), text('How long does this take?'), text('Give your answer in hours and minutes.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(
          `${name} ${mode.verb} ${dec(dist(v.speed, v.minutes))} ${mode.unit}.`,
          `${name}’s average speed while moving is ${v.speed} ${mode.speedUnit}.`,
          `${name} sets off at ${clock(v.start)} and stops for a break of ${v.stop} minutes on the way.`,
        ),
        parts: [single(3, text(`At what time does ${name} arrive?`))],
      };
    }
    return {
      stem: lines(
        `${name} goes on a ${mode.noun} in two stages.`,
        `Stage 1: ${name} travels ${dec(dist(v.s1, v.t1))} ${mode.unit} in ${hoursMinutes(v.t1)}.`,
        `Stage 2: ${name} travels for ${hoursMinutes(v.t2)} at an average speed of ${v.s2} ${mode.speedUnit}.`,
      ),
      parts: [
        single(
          4,
          text(`Work out ${name}’s average speed for the whole ${mode.noun}.`),
          ...(dist(v.s1, v.t1).add(dist(v.s2, v.t2)).div(Q.of(v.t1 + v.t2, 60)).terminatesWithin(1) ? [] : [text('Give your answer correct to 1 decimal place.')]),
        ),
      ],
    };
  },

  answer(v) {
    const u = v.mode.speedUnit;
    if (v.level === 'foundational') return [{ text: `${v.speed} ${u}` }, { text: hoursMinutes(v.minutes2) }];
    if (v.level === 'core') return [{ text: clock(v.start + v.minutes + v.stop) }];
    const avg = dist(v.s1, v.t1).add(dist(v.s2, v.t2)).div(Q.of(v.t1 + v.t2, 60));
    return [{ text: `${avg.terminatesWithin(1) ? dec(avg) : roundDp(avg, 1)} ${u}` }];
  },

  markScheme(v) {
    const { mode } = v;
    if (v.level === 'foundational') {
      const d1 = dist(v.speed, v.minutes);
      const d2 = dist(v.speed, v.minutes2);
      const h1 = Q.of(v.minutes, 60);
      return [
        [
          step('M1', `${hoursMinutes(v.minutes)} = ${h1.terminatesWithin(3) ? dec(h1) : `${v.minutes}/60`} hours, ${dec(d1)} ${DIV} ${h1.terminatesWithin(3) ? dec(h1) : `(${v.minutes}/60)`}`, 'Speed = distance ÷ time, with the time in hours.'),
          step('A1', `${v.speed} ${mode.speedUnit}`, 'Check it is sensible for this kind of journey.'),
        ],
        [
          step('M1', `${dec(d2)} ${DIV} ${v.speed} = ${Q.of(v.minutes2, 60).terminatesWithin(3) ? dec(Q.of(v.minutes2, 60)) : `${v.minutes2}/60`} hours`, 'Time = distance ÷ speed.'),
          step('A1', hoursMinutes(v.minutes2), 'Change the decimal part of the hours into minutes (× 60).'),
        ],
      ];
    }
    if (v.level === 'core') {
      const d = dist(v.speed, v.minutes);
      return [
        [
          step('P1', `${dec(d)} ${DIV} ${v.speed} = ${Q.of(v.minutes, 60).terminatesWithin(3) ? dec(Q.of(v.minutes, 60)) : `${v.minutes}/60`} hours = ${hoursMinutes(v.minutes)}`, 'Time = distance ÷ speed, then change to hours and minutes.'),
          step('P1', `${hoursMinutes(v.minutes)} + ${v.stop} minutes = ${hoursMinutes(v.minutes + v.stop)}`, 'Add on the break: the clock keeps going while stopped.'),
          step('A1', `${clock(v.start)} + ${hoursMinutes(v.minutes + v.stop)} = ${clock(v.start + v.minutes + v.stop)}`, 'Count on from the start time.'),
        ],
      ];
    }
    const d1 = dist(v.s1, v.t1);
    const d2 = dist(v.s2, v.t2);
    const total = d1.add(d2);
    const avg = total.div(Q.of(v.t1 + v.t2, 60));
    return [
      [
        step('P1', `Stage 2 distance = ${v.s2} ${TIMES} ${Q.of(v.t2, 60).terminatesWithin(3) ? dec(Q.of(v.t2, 60)) : `${v.t2}/60`} = ${dec(d2)} ${mode.unit}`, 'Distance = speed × time (time in hours).'),
        step('P1', `Total distance = ${dec(d1)} + ${dec(d2)} = ${dec(total)} ${mode.unit}`, 'Add the distances of both stages.'),
        step('P1', `Total time = ${hoursMinutes(v.t1 + v.t2)}${(v.t1 + v.t2) % 60 ? ` = ${Q.of(v.t1 + v.t2, 60).terminatesWithin(3) ? dec(Q.of(v.t1 + v.t2, 60)) : `${v.t1 + v.t2}/60`} hours` : ''}; ${dec(total)} ${DIV} ${Q.of(v.t1 + v.t2, 60).terminatesWithin(3) ? dec(Q.of(v.t1 + v.t2, 60)) : `(${v.t1 + v.t2}/60)`}`, 'Average speed = total distance ÷ total time. Don’t average the two speeds.'),
        step('A1', `${avg.terminatesWithin(1) ? dec(avg) : roundDp(avg, 1)} ${mode.speedUnit}`, avg.terminatesWithin(1) ? 'Give the units.' : 'Round to 1 decimal place.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'core') {
      // Simulate the clock minute by minute.
      let t = v.start;
      const d = dist(v.speed, v.minutes);
      let travelled = Q.of(0);
      while (travelled.lt(d)) {
        travelled = travelled.add(Q.of(v.speed, 60));
        t++;
      }
      t += v.stop;
      if (answers[0].text !== clock(t)) p.push('arrival');
      return p;
    }
    if (v.level === 'foundational') {
      const s = dist(v.speed, v.minutes).mul(60).div(v.minutes);
      const m2 = dist(v.speed, v.minutes2).div(s).mul(60);
      if (answers[0].text !== `${dec(s)} ${v.mode.speedUnit}` || answers[1].text !== hoursMinutes(m2.toInt())) p.push('foundational');
      return p;
    }
    // Average speed in units per minute, then × 60.
    const perMin = Q.of(v.s1 * v.t1 + v.s2 * v.t2, 60).div(v.t1 + v.t2);
    const avg = perMin.mul(60);
    const shown = parseFloat(answers[0].text);
    if (Math.abs(shown - avg.toNumber()) > (avg.terminatesWithin(1) ? 1e-9 : 0.05)) p.push('average');
    return p;
  },

  key: (v) => `${v.mode.verb}|${v.speed}|${v.minutes}|${v.minutes2}|${v.start}|${v.stop}|${v.s1}|${v.t1}|${v.s2}|${v.t2}`,
});
