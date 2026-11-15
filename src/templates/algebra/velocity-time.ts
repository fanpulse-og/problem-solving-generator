import { defineTemplate } from '../../engine/types';
import { diagram, part, step, text } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Speed-time graphs made of straight lines: speed up, steady speed, slow down.
 * Practice reads the acceleration and the distance (area under the graph);
 * Apply works back from the distance to the top speed; Extend works back to
 * the total time, then the average speed. check() adds up the area in thin
 * strips instead of using the trapezium formula.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  who: [string, string]; // "A car", "The car"
  t1: number;
  t2: number;
  t3: number;
  V: number;
}

const WHO: [string, string, number, number][] = [
  ['A car', 'The car', 10, 30],
  ['A train', 'The train', 12, 40],
  ['A cyclist', 'The cyclist', 6, 12],
  ['A tram', 'The tram', 8, 20],
  ['A motorbike', 'The motorbike', 10, 30],
];
const T = (v: V) => v.t1 + v.t2 + v.t3;
/** Twice the distance, to stay in whole numbers. */
const twiceDist = (v: V) => v.V * (T(v) + v.t2);
const dist = (v: V) => twiceDist(v) / 2;

function graph(v: V) {
  const end = T(v);
  const topLabel = v.level === 'core' ? 'V' : `${v.V}`;
  const marks = [
    { at: [0, v.V] as [number, number], label: topLabel, dx: -12, dy: 4 },
    { at: [v.t1, 0] as [number, number], label: `${v.t1}`, dy: 16 },
    { at: [end, 0] as [number, number], label: v.level === 'stretch' ? 'T' : `${end}`, dy: 16 },
  ];
  if (v.level !== 'stretch') marks.splice(2, 0, { at: [v.t1 + v.t2, 0], label: `${v.t1 + v.t2}`, dy: 16 });
  return diagram({
    type: 'graph',
    x: [-0.06 * end, 1.25 * end],
    y: [-0.18 * v.V, 1.35 * v.V],
    xLabel: 'time (s)',
    yLabel: 'speed (m/s)',
    curves: [{ points: [[0, 0], [v.t1, v.V], [v.t1 + v.t2, v.V], [end, 0]] }],
    marks,
    notAccurate: true,
  });
}

export default defineTemplate<V>({
  id: 'alg-velocity-time',
  title: 'Speed-time graphs',
  strand: 'Algebra',
  subtopic: 'Straight-line graphs',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'backwards' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const [a, the, lo, hi] = rng.pick(WHO);
    const V = rng.int(lo / 2, hi / 2) * 2;
    const t1 = rng.int(2, 10) * 2;
    const t3 = rng.int(2, 10) * 2;
    const t2 = rng.int(4, 20) * 2;
    const v: V = { level, who: [a, the], t1, t2, t3, V };
    ensure(t1 !== t3, 'speeding up and slowing down take different times');
    ensure(V / t1 <= 3 && V / t3 <= 4 && V / t1 >= 0.5, 'realistic acceleration and braking');
    ensure(Q.of(V, t1).terminatesWithin(2) && Q.of(V, t3).terminatesWithin(2), 'tidy accelerations');
    if (level === 'stretch') ensure(Q.of(dist(v), T(v)).terminatesWithin(2), 'a tidy average speed');
    return v;
  },

  validate(v) {
    return Number.isInteger(dist(v)) ? [] : ['whole-number distance'];
  },

  render(v) {
    const [a, the] = v.who;
    const lower = the.toLowerCase();
    const intro = text(`${a} travels between ${a === 'A train' || a === 'A tram' ? 'two stations' : 'two sets of traffic lights'}. Here is a speed-time graph for the journey.`);
    if (v.level === 'foundational') {
      return {
        stem: [intro, graph(v)],
        parts: [part('a', 2, text(`Work out the acceleration of ${lower} during the first ${v.t1} seconds.`)), part('b', 3, text(`Work out the total distance ${lower} travels.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [intro, graph(v), text(`${the} travels a total distance of ${int(dist(v))} metres.`)],
        parts: [part('a', 3, text('Work out the value of $V$.')), part('b', 2, text(`Work out the deceleration of ${lower} during the last ${v.t3} seconds.`))],
      };
    }
    return {
      stem: [intro, graph(v), text(`${the} slows down for the last ${v.t3} seconds of the journey.`), text(`${the} travels a total distance of ${int(dist(v))} metres.`)],
      parts: [part('a', 4, text('Work out the value of $T$.')), part('b', 2, text(`Work out the average speed of ${lower} for the whole journey.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(Q.of(v.V, v.t1))} m/s²` }, { text: `${int(dist(v))} m` }];
    if (v.level === 'core') return [{ text: `$V = ${v.V}$` }, { text: `${dec(Q.of(v.V, v.t3))} m/s²` }];
    return [{ text: `$T = ${T(v)}$` }, { text: `${dec(Q.of(dist(v), T(v)))} m/s` }];
  },

  markScheme(v) {
    const end = T(v);
    if (v.level === 'foundational') {
      return [
        [step('M1', `${v.V} ÷ ${v.t1}`, 'Acceleration is the gradient of the graph: change in speed ÷ time taken.'), step('A1', `${dec(Q.of(v.V, v.t1))} m/s²`, 'The units are metres per second, per second.')],
        [
          step('M1', `$\\frac{1}{2} \\times (${end} + ${v.t2}) \\times ${v.V}$`, `Distance is the area under the graph. It is a trapezium with parallel sides ${end} and ${v.t2} (from ${v.t1} to ${v.t1 + v.t2}).`),
          step('M1', `$\\frac{1}{2} \\times ${end + v.t2} \\times ${v.V}$`, 'Or split it into a triangle, a rectangle and a triangle and add the three areas.'),
          step('A1', `${int(dist(v))} m`, 'Speed in m/s and time in seconds give metres.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\frac{1}{2} \\times (${end} + ${v.t2}) \\times V = ${dist(v)}$`, `Distance is the area under the graph: a trapezium with parallel sides ${end} and ${v.t2}.`),
          step('M1', `$${Q.of(end + v.t2, 2).isInt() ? (end + v.t2) / 2 : dec(Q.of(end + v.t2, 2))}V = ${dist(v)}$`, 'Simplify, then divide.'),
          step('A1', `$V = ${v.V}$`, 'Check: is this a sensible speed in m/s?'),
        ],
        [step('M1', `${v.V} ÷ ${v.t3}`, 'The gradient of the last section: the speed falls from V to 0.'), step('A1', `${dec(Q.of(v.V, v.t3))} m/s²`, 'A deceleration is given as a positive number.')],
      ];
    }
    const tri = (v.V * (v.t1 + v.t3)) / 2;
    return [
      [
        step('M1', `$\\frac{1}{2} \\times ${v.t1} \\times ${v.V} + \\frac{1}{2} \\times ${v.t3} \\times ${v.V} = ${tri}$`, 'The distance travelled while speeding up and slowing down: the two triangles.'),
        step('M1', `${int(dist(v))} − ${tri} = ${int(dist(v) - tri)}`, 'What is left is the distance at steady speed: the rectangle.'),
        step('M1', `${int(dist(v) - tri)} ÷ ${v.V} = ${v.t2}`, 'Rectangle area ÷ height gives the time at steady speed.'),
        step('A1', `$T = ${v.t1} + ${v.t2} + ${v.t3} = ${end}$`, 'Add the three stages.'),
      ],
      [step('M1', `${int(dist(v))} ÷ ${end}`, 'Average speed = total distance ÷ total time.'), step('A1', `${dec(Q.of(dist(v), end))} m/s`, 'It must be less than the top speed.')],
    ];
  },

  check(v, answers) {
    // Area under the graph in strips of 1/100 s, using the mid-point speed of each strip.
    const speed = (t: number) => (t < v.t1 ? (v.V * t) / v.t1 : t < v.t1 + v.t2 ? v.V : (v.V * (T(v) - t)) / v.t3);
    let area = 0;
    for (let i = 0; i < T(v) * 100; i++) area += speed((i + 0.5) / 100) / 100;
    const num = (s: string) => Number(s.replace(/[^\d.]/g, ''));
    const near = (a: number, b: number) => Math.abs(a - b) < 1e-6 * Math.max(1, b);
    if (v.level === 'foundational') return near(num(answers[0].text.replace('m/s²', '')), speed(1)) && near(num(answers[1].text), area) ? [] : ['acceleration or distance'];
    if (v.level === 'core') return num(answers[0].text) === v.V && near(num(answers[1].text.replace('m/s²', '')), speed(T(v) - 1)) && near(area, dist(v)) ? [] : ['V or deceleration'];
    return num(answers[0].text) === T(v) && near(num(answers[1].text) * T(v), area) ? [] : ['T or average speed'];
  },

  key: (v) => `${v.level}|${v.t1}|${v.t2}|${v.t3}|${v.V}`,
});
