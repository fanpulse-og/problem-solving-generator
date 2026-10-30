import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { clock, dec, ensure, frac } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on November 2022 3F Q19 (Carly cycles to her friend's house, stays,
 * then cycles home: read the graph, then work out a speed in km/h). The
 * examiner report says students misread the axis scales and forgot to change
 * minutes to hours, so every reading here sits on a grid line and the notes
 * spell out the time conversion.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  other: string;
  mode: number; // 0 cycles, 1 walks
  start: number; // minutes after midnight
  t1: number; // minutes out
  d: number; // km (may be a half)
  stay: number;
  t3: number; // minutes back
  at: number; // foundational: minutes after the start for the reading
  late: number; // stretch: brother leaves this many minutes after the start
  vb: number; // stretch: brother's speed km/h
}

const MODES = [
  { verb: 'cycles', went: 'cycled', place: 'the sports centre', speeds: [10, 12, 15, 16, 18, 20], dStep: 1 },
  { verb: 'walks', went: 'walked', place: 'the library', speeds: [3, 4, 5, 6], dStep: 0.5 },
];

/** The distance as an exact rational (it may be a half). */
const dQ = (v: V) => Q.of(Math.round(v.d * 2), 2);
const speed = (km: number, min: number) => Q.of(Math.round(km * 2) * 60, 2 * min);

export default defineTemplate<V>({
  id: 'alg-travel-graph',
  title: 'Travel graphs',
  strand: 'Algebra',
  subtopic: 'Straight-line graphs',
  tiers: ['KS3', 'F'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { core: 'decide', stretch: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const [name, other] = names(rng, 2);
    const mode = rng.int(0, 1);
    const M = MODES[mode];
    // Pick from the combinations that land on grid lines, rather than retrying.
    const outs: [number, number][] = [];
    for (const sp of M.speeds)
      for (let t = 10; t <= (mode === 0 ? 40 : 60); t += 5) {
        const dd = (sp * t) / 60;
        if (Number.isInteger(dd / M.dStep) && dd >= (mode === 0 ? 3 : 1.5)) outs.push([sp, t]);
      }
    const [v1, t1] = rng.pick(outs);
    const d = (v1 * t1) / 60;
    const backs = M.speeds.map((sp) => (d / sp) * 60).filter((t) => Number.isInteger(t) && t % 5 === 0 && t !== t1);
    ensure(backs.length > 0, 'a return time on a grid line');
    const t3 = rng.pick(backs);
    const stay = rng.step(10, 40, 5);
    ensure(t1 + stay + t3 <= 120, 'fits on the graph');
    const start = rng.step(7 * 60, 15 * 60, 10);
    const v: V = { level, name, other, mode, start, t1, d, stay, t3, at: 0, late: 0, vb: 0 };
    if (level === 'foundational') {
      const ats = Array.from({ length: t1 / 5 - 1 }, (_, i) => (i + 1) * 5).filter((t) => Number.isInteger(((v1 * t) / 60) / M.dStep));
      ensure(ats.length > 0, 'a readable point on the way out');
      v.at = rng.pick(ats);
    }
    if (level === 'stretch') {
      const opts: [number, number][] = [];
      for (let late = 5; late <= t1 + stay; late += 5)
        for (const vb of M.speeds.map((sp) => sp + (mode === 0 ? 4 : 1))) {
          const arrive = late + (d / vb) * 60;
          if (Number.isInteger(arrive) && arrive !== t1 + stay && Math.abs(arrive - (t1 + stay)) <= 20) opts.push([late, vb]);
        }
      ensure(opts.length > 0, 'a close call, in whole minutes');
      const [late, vb] = rng.pick(opts);
      Object.assign(v, { late, vb });
    }
    return v;
  },

  validate(v) {
    return v.t1 > 0 && v.t3 > 0 ? [] : ['legs'];
  },

  render(v) {
    const M = MODES[v.mode];
    const T = v.t1 + v.stay + v.t3;
    const xMax = Math.ceil((T + 5) / 10) * 10;
    const yMax = Math.ceil(v.d + M.dStep * 2);
    const graph = diagram({
      type: 'grid',
      x: [0, xMax],
      y: [0, yMax],
      xStep: 5,
      yStep: M.dStep,
      xLabelEvery: xMax > 60 ? 20 : 10,
      yLabelEvery: yMax > 8 ? 2 : 1,
      xClock: v.start,
      xLabel: 'Time of day',
      yLabel: 'Distance from home (km)',
      paths: [{ points: [[0, 0], [v.t1, v.d], [v.t1 + v.stay, v.d], [T, 0]], dots: false }],
    });
    const intro = [text(`${v.name} ${M.verb} from home to ${M.place}.`), text(`${v.name} stays at ${M.place} for some time and then ${M.verb} home.`), text(`Here is the travel graph for ${v.name}’s journey.`), graph];
    if (v.level === 'foundational') {
      return {
        stem: intro,
        parts: [
          part('a', 1, text(`For how many minutes does ${v.name} stay at ${M.place}?`)),
          part('b', 1, text(`How far from home is ${v.name} at ${clock(v.start + v.at)}?`)),
          part('c', 2, text(`Work out ${v.name}’s average speed on the way to ${M.place}.`), text('Give your answer in kilometres per hour.')),
        ],
      };
    }
    if (v.level === 'core') {
      return { stem: intro, parts: [single(3, text(`Is ${v.name} faster on the way to ${M.place} or on the way home?`), text('You must show how you get your answer.'))] };
    }
    return {
      stem: [...intro, text(`${v.other} leaves ${v.name}’s home at ${clock(v.start + v.late)} and ${M.verb} to ${M.place} at an average speed of ${v.vb} km/h.`)],
      parts: [single(4, text(`Does ${v.other} get to ${M.place} before ${v.name} leaves?`), text('You must show how you get your answer.'))],
    };
  },

  answer(v) {
    const v1 = speed(v.d, v.t1);
    const v3 = speed(v.d, v.t3);
    if (v.level === 'foundational') return [{ text: `${v.stay} minutes` }, { text: `${dec(v1.mul(v.at).div(60))} km` }, { text: `${dec(v1)} km/h` }];
    if (v.level === 'core') return [{ text: `${v1.gt(v3) ? 'On the way there' : 'On the way home'}: ${dec(v1)} km/h there, ${dec(v3)} km/h home` }];
    const arrive = v.late + (v.d / v.vb) * 60;
    const leaves = v.t1 + v.stay;
    return [{ text: `${arrive < leaves ? 'Yes' : 'No'}: ${v.other} arrives at ${clock(v.start + arrive)} and ${v.name} leaves at ${clock(v.start + leaves)}` }];
  },

  markScheme(v) {
    const M = MODES[v.mode];
    const v1 = speed(v.d, v.t1);
    const v3 = speed(v.d, v.t3);
    const sp = (t: number, s: Q) => [
      step('M1', `${dec(dQ(v))} km in ${t} minutes: ${dec(dQ(v))} ${DIV} ${t} ${TIMES} 60`, `${t} minutes is ${frac(Q.of(t, 60))} of an hour, so divide by ${t} and multiply by 60 (not just ${dec(dQ(v))} ÷ ${t}).`),
      step('A1', `${dec(s)} km/h`, 'Speed = distance ÷ time, with the time in HOURS.'),
    ];
    if (v.level === 'foundational') {
      return [
        [step('B1', `${clock(v.start + v.t1)} to ${clock(v.start + v.t1 + v.stay)} = ${v.stay} minutes`, 'The flat part of the graph: the distance is not changing.')],
        [step('B1', `${dec(v1.mul(v.at).div(60))} km`, `Go up from ${clock(v.start + v.at)} to the line, then across. Each small square up is ${M.dStep} km.`)],
        sp(v.t1, v1),
      ];
    }
    if (v.level === 'core') {
      const [a, b] = sp(v.t1, v1);
      return [[a, step('M1', `${dec(dQ(v))} ${DIV} ${v.t3} ${TIMES} 60 = ${dec(v3)} km/h`, 'Same for the way home.'), step('C1', `${v1.gt(v3) ? 'Faster on the way there' : 'Faster on the way home'} (${dec(v1)} km/h and ${dec(v3)} km/h)`, `Or compare the steepness: the steeper part of the graph is faster. ${b.note}`)]];
    }
    const travel = (v.d / v.vb) * 60;
    const arrive = v.late + travel;
    const leaves = v.t1 + v.stay;
    return [
      [
        step('P1', `${dec(dQ(v))} ${DIV} ${v.vb} ${TIMES} 60 = ${travel} minutes`, 'Time = distance ÷ speed gives hours; multiply by 60 for minutes.'),
        step('P1', `${clock(v.start + v.late)} + ${travel} minutes = ${clock(v.start + arrive)}`, `${v.other}’s arrival time.`),
        step('P1', `${v.name} leaves at ${clock(v.start + leaves)}`, 'Read the end of the flat section from the graph.'),
        step('C1', `${arrive < leaves ? 'Yes' : 'No'}, ${clock(v.start + arrive)} is ${arrive < leaves ? 'before' : 'after'} ${clock(v.start + leaves)}`, 'Compare the two times and conclude.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Gradients from the plotted points (km per minute × 60).
    const pts: [number, number][] = [[0, 0], [v.t1, v.d], [v.t1 + v.stay, v.d], [v.t1 + v.stay + v.t3, 0]];
    const grad = (i: number) => Math.abs((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0])) * 60;
    if (v.level === 'foundational') {
      if (answers[0].text !== `${pts[2][0] - pts[1][0]} minutes`) p.push('stay');
      const dist = (pts[1][1] / pts[1][0]) * v.at;
      if (Math.abs(parseFloat(answers[1].text) - dist) > 1e-9) p.push('reading');
      if (Math.abs(parseFloat(answers[2].text) - grad(0)) > 1e-9) p.push('speed');
      return p;
    }
    if (v.level === 'core') {
      if (answers[0].text.startsWith('On the way there') !== grad(0) > grad(2)) p.push('faster');
      return p;
    }
    // Brother's line: distance = vb × (t − late)/60; does it reach d before Carly leaves?
    const reach = v.late + (v.d * 60) / v.vb;
    if (answers[0].text.startsWith('Yes') !== reach < pts[2][0]) p.push('decision');
    return p;
  },

  key: (v) => `${v.mode}|${v.start}|${v.t1}|${v.d}|${v.stay}|${v.t3}|${v.at}|${v.late}|${v.vb}`,
});
