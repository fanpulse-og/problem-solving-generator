import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/22 speed-time graphs (June 2025 Q1): accelerate, cruise, slow
 * down. The area under the graph is the distance, then the question is turned
 * round so that the total time or the top speed is the unknown.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  V: number;
  t1: number;
  t2: number;
  t3: number;
}

/** Speeds suit the mover, so the numbers stay believable. */
const WHO = [
  { name: 'cyclist', on: 'road', lo: 5, hi: 12 },
  { name: 'runner', on: 'road', lo: 3, hi: 8 },
  { name: 'train', on: 'track', lo: 15, hi: 40 },
  { name: 'car', on: 'road', lo: 10, hi: 30 },
];
const area = (v: V) => Q.of(v.V * (v.t1 + 2 * v.t2 + v.t3), 2);

const graph = (v: V, top: string, end: string) =>
  diagram({
    type: 'graph',
    x: [-0.06 * (v.t1 + v.t2 + v.t3), 1.3 * (v.t1 + v.t2 + v.t3)],
    y: [-0.18 * v.V, 1.35 * v.V],
    xLabel: 'time (s)',
    yLabel: 'speed (m s⁻¹)',
    curves: [{ points: [[0, 0], [v.t1, v.V], [v.t1 + v.t2, v.V], [v.t1 + v.t2 + v.t3, 0]] }],
    marks: [
      { at: [0, v.V], label: top, dx: -10, dy: 4 },
      { at: [v.t1 + v.t2 + v.t3, 0], label: end, dy: 16 },
    ],
  });

export default defineTemplate<V>({
  id: 'y12-speed-time',
  title: 'Speed-time graphs',
  strand: 'Mechanics',
  subtopic: 'Kinematics',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const ctx = rng.int(0, WHO.length - 1);
    const V = rng.int(WHO[ctx].lo, WHO[ctx].hi);
    const t1 = rng.int(2, 10) * 2;
    const t3 = rng.int(2, 10) * 2;
    const t2 = rng.int(4, 30) * 2;
    ensure(t1 !== t3, 'different slopes');
    return { level, ctx, V, t1, t2, t3 };
  },

  validate(v) {
    return v.V > 0 ? [] : ['the speed must be positive'];
  },

  render(v) {
    const { name, on } = WHO[v.ctx];
    const T = v.t1 + v.t2 + v.t3;
    if (v.level === 'foundational') {
      return {
        stem: [graph(v, `${v.V}`, `${T}`), ...lines(`The speed-time graph shows a model of the motion of a ${name} along a straight horizontal ${on}.`, `The ${name} starts from rest, accelerates uniformly for ${v.t1} s, travels at a constant speed of ${v.V} m s$^{-1}$, then decelerates uniformly for ${v.t3} s until coming to rest after ${T} s.`)],
        parts: [
          part('a', 2, text('Find the acceleration during the first stage of the motion.')),
          part('b', 3, text('Find the total distance travelled.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [graph(v, `${v.V}`, 'T'), ...lines(`The speed-time graph shows a model of the motion of a ${name} along a straight horizontal ${on} from $A$ to $B$.`, `The distance from $A$ to $B$ is ${dec(area(v))} m.`, 'In the model:', `the ${name} starts from rest at $A$, moves with constant acceleration for ${v.t1} s to a speed of ${v.V} m s$^{-1}$, then travels at that constant speed, then moves with constant deceleration for ${v.t3} s, coming to rest at $B$ after a total of $T$ seconds.`)],
        parts: [
          part('a', 3, text('Find the value of $T$')),
          part('b', 2, text('Find the deceleration during the last stage of the motion.')),
          part('c', 1, text('State one reason why the actual time taken might not be $T$ seconds.')),
        ],
      };
    }
    return {
      stem: [graph(v, 'V', `${T}`), ...lines(`The speed-time graph shows a model of the motion of a ${name} along a straight horizontal ${on} from $A$ to $B$.`, `It starts from rest, accelerates uniformly for ${v.t1} s to a speed of $V$ m s$^{-1}$, travels at that speed, then decelerates uniformly for ${v.t3} s, coming to rest at $B$.`, `The total time is ${T} s and the distance from $A$ to $B$ is ${dec(area(v))} m.`)],
      parts: [
        part('a', 3, text('Find the value of $V$')),
        part('b', 1, text('Find the acceleration during the first stage.')),
        part('c', 3, text('Find the time taken to travel the first half of the distance from $A$ to $B$.')),
      ],
    };
  },

  answer(v) {
    const accel = Q.of(v.V, v.t1);
    if (v.level === 'foundational') return [{ text: `$${fracTex(accel)}$ m s$^{-2}$` }, { text: `${dec(area(v))} m` }];
    if (v.level === 'core') return [{ text: `$T = ${v.t1 + v.t2 + v.t3}$` }, { text: `$${fracTex(Q.of(v.V, v.t3))}$ m s$^{-2}$` }, { text: 'For example, the acceleration may not be constant.' }];
    return [{ text: `$V = ${v.V}$` }, { text: `$${fracTex(accel)}$ m s$^{-2}$` }, { text: `$${fracTex(halfTime(v))}$ s` }];
  },

  markScheme(v) {
    const T = v.t1 + v.t2 + v.t3;
    const accel = Q.of(v.V, v.t1);
    if (v.level === 'foundational') {
      return [
        [step('M1', `$\\frac{${v.V}}{${v.t1}}$`, 'Acceleration is the gradient of the graph.'), step('A1', `$${fracTex(accel)}$ m s$^{-2}$`, 'Include the units.')],
        [
          step('M1', `Middle stage lasts $${T} - ${v.t1} - ${v.t3} = ${v.t2}$ s`, 'Read the time at constant speed from the graph.'),
          step('M1', `$\\frac{1}{2} \\times (${T} + ${v.t2}) \\times ${v.V}$`, 'The distance is the area of the trapezium.'),
          step('A1', `${dec(area(v))} m`, 'Work it out.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\frac{1}{2}(T + T - ${v.t1} - ${v.t3}) \\times ${v.V} = ${dec(area(v))}$`, 'Area of the trapezium equals the distance. The top side is T minus both sloping stages.'),
          step('M1', `$2T - ${v.t1 + v.t3} = ${(2 * area(v).toNumber()) / v.V}$`, 'Clear the fraction.'),
          step('A1', `$T = ${T}$`, 'Solve the linear equation.'),
        ],
        [step('M1', `$\\frac{${v.V}}{${v.t3}}$`, 'The size of the gradient of the last stage.'), step('A1', `$${fracTex(Q.of(v.V, v.t3))}$ m s$^{-2}$`, 'Deceleration is positive: the word already means slowing down.')],
        [step('B1', 'For example, the acceleration may not be constant.', 'Any sensible reason why the model is not exact.')],
      ];
    }
    const half = area(v).div(2);
    return [
      [
        step('M1', `Top of the trapezium is $${T} - ${v.t1} - ${v.t3} = ${v.t2}$ s`, 'Time at the constant speed.'),
        step('M1', `$\\frac{1}{2}(${T} + ${v.t2})V = ${dec(area(v))}$`, 'Area equals distance.'),
        step('A1', `$V = ${v.V}$`, 'Solve.'),
      ],
      [step('B1', `$${fracTex(accel)}$ m s$^{-2}$`, 'The gradient of the first stage.')],
      [
        step('M1', `Half the distance is $${dec(half)}$ m; the first stage covers $${dec(Q.of(v.V * v.t1, 2))}$ m`, 'See which stage the halfway point falls in.'),
        step('M1', `$${dec(Q.of(v.V * v.t1, 2))} + ${v.V}(t - ${v.t1}) = ${dec(half)}$`, 'Add the distance at constant speed.'),
        step('A1', `$t = ${fracTex(halfTime(v))}$ s`, 'Solve for the time from the start.'),
      ],
    ];
  },

  check(v, answers) {
    // Walk along the motion in small time steps instead of using the trapezium.
    const T = v.t1 + v.t2 + v.t3;
    const speed = (t: number) => (t < v.t1 ? (v.V * t) / v.t1 : t < v.t1 + v.t2 ? v.V : (v.V * (T - t)) / v.t3);
    let s = 0;
    const dt = 0.001;
    let halfAt = -1;
    for (let t = dt / 2; t < T; t += dt) {
      s += speed(t) * dt;
      if (halfAt < 0 && s >= area(v).toNumber() / 2) halfAt = t;
    }
    if (Math.abs(s - area(v).toNumber()) > 0.05) return ['distance'];
    if (v.level === 'stretch' && Math.abs(halfAt - halfTime(v).toNumber()) > 0.01) return ['half way'];
    return answers.length ? [] : ['answers'];
  },

  key: (v) => `${v.V}|${v.t1}|${v.t2}|${v.t3}`,
});

/** Time to the halfway point. By symmetry of the model it must be recalculated if it falls in the first or last stage. */
function halfTime(v: V): Q {
  const half = area(v).div(2);
  const first = Q.of(v.V * v.t1, 2);
  ensure(half.gt(first) && half.lt(first.add(v.V * v.t2)), 'the halfway point is in the middle stage');
  return half.sub(first).div(v.V).add(v.t1);
}
