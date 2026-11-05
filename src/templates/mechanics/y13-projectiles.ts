import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/32 projectiles (June 2025 Q5): horizontal projection from a
 * height, an angle with tan α from a triple, and projection from above the ground
 * with the speed and direction on landing and whether it clears a wall.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  U: number;
  h: number;
  sin: Q;
  cos: Q;
  o: number;
  a: number;
  x: number;
  w: number;
}

const G = 9.8;
const ANGLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
];

const flight = (v: V) => {
  const uy = v.U * v.sin.toNumber();
  return (uy + Math.sqrt(uy * uy + 2 * G * v.h)) / G;
};

function path(v: V) {
  const [ux, uy] = [v.U * v.cos.toNumber(), v.U * v.sin.toNumber()];
  const T = flight(v);
  const pts: [number, number][] = Array.from({ length: 49 }, (_, i) => {
    const t = (T * i) / 48;
    return [ux * t, v.h + uy * t - 0.5 * G * t * t];
  });
  const range = ux * T;
  const top = Math.max(...pts.map((p) => p[1]));
  return diagram({
    type: 'graph',
    x: [-0.08 * range, 1.2 * range],
    y: [-0.18 * top, 1.35 * top],
    xLabel: ' ',
    yLabel: ' ',
    curves: [{ points: pts }],
    marks: [{ at: [0, v.h], label: 'A', dx: -10, dy: -4, dot: true }, { at: [range, 0], label: 'B', dy: 16 }],
  });
}

export default defineTemplate<V>({
  id: 'y13-projectiles',
  title: 'Projectiles',
  strand: 'Mechanics',
  subtopic: 'Projectiles',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [o, a, hyp] = rng.pick(ANGLES);
    const sin = Q.of(o, hyp);
    const cos = Q.of(a, hyp);
    const base: V = { level, U: rng.int(10, 40), h: 0, sin, cos, o, a, x: 0, w: 0 };
    if (level === 'foundational') return { ...base, sin: Q.of(0), cos: Q.of(1), h: rng.int(10, 80) };
    if (level === 'core') return base;
    const h = rng.int(1, 20);
    const v = { ...base, h };
    const T = flight(v);
    const x = Math.round(v.U * cos.toNumber() * T * (rng.int(3, 7) / 10));
    ensure(x > 0, 'the building is in the way');
    const t = x / (v.U * cos.toNumber());
    const at = h + v.U * sin.toNumber() * t - 0.5 * G * t * t;
    const w = Math.max(1, Math.round(at + rng.pick([-2, -1, 1, 2])));
    ensure(Math.abs(at - w) > 0.2 && at > 0, 'a clear answer on the building');
    return { ...v, x, w };
  },

  validate(v) {
    return v.U > 0 ? [] : ['a real speed'];
  },

  render(v) {
    const take = 'The ball is modelled as a particle moving freely under gravity. Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.';
    if (v.level === 'foundational') {
      return {
        stem: [path(v), ...lines(`A ball is thrown horizontally with speed ${v.U} m s$^{-1}$ from a point $A$ at the top of a cliff, ${v.h} m above horizontal ground, and lands at $B$.`, take)],
        parts: [
          part('a', 2, text('Find the time taken for the ball to reach the ground.')),
          part('b', 2, text('Find the horizontal distance travelled.')),
          part('c', 3, text('Find the speed of the ball as it lands.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A ball is projected from a point on horizontal ground with speed ${v.U} m s$^{-1}$ at an angle $\\alpha$ above the horizontal, where  $\\tan\\alpha = \\frac{${v.o}}{${v.a}}$`, take),
        parts: [
          part('a', 3, text('Find the time taken for the ball to return to the ground.')),
          part('b', 2, text('Find the horizontal distance travelled in this time.')),
          part('c', 2, text('Find the greatest height of the ball above the ground.')),
          part('d', 1, text('State one way in which the model could be improved.')),
        ],
      };
    }
    return {
      stem: [path(v), ...lines(`A ball is projected from a point $A$, ${v.h} m above horizontal ground, with speed ${v.U} m s$^{-1}$ at an angle $\\alpha$ above the horizontal, where  $\\tan\\alpha = \\frac{${v.o}}{${v.a}}$`, 'It lands at the point $B$ on the ground.', take)],
      parts: [
        part('a', 3, text('Find the time taken for the ball to travel from $A$ to $B$.')),
        part('b', 3, text('Find the speed of the ball as it lands.')),
        part('c', 3, text(`A building of height ${v.w} m stands ${v.x} m horizontally from $A$. Determine whether the ball passes over the building.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const t = Math.sqrt((2 * v.h) / G);
      return [{ text: `${sf3(t)} s` }, { text: `${sf3(v.U * t)} m` }, { text: `${sf3(Math.sqrt(v.U * v.U + 2 * G * v.h))} m s$^{-1}$` }];
    }
    const uy = v.U * v.sin.toNumber();
    const ux = v.U * v.cos.toNumber();
    if (v.level === 'core') {
      const T = (2 * uy) / G;
      return [{ text: `${sf3(T)} s` }, { text: `${sf3(ux * T)} m` }, { text: `${sf3((uy * uy) / (2 * G))} m` }, { text: 'For example, include air resistance.' }];
    }
    const T = flight(v);
    const t = v.x / ux;
    const at = v.h + uy * t - 0.5 * G * t * t;
    return [{ text: `${sf3(T)} s` }, { text: `${sf3(Math.sqrt(v.U * v.U + 2 * G * v.h))} m s$^{-1}$` }, { text: at > v.w ? `Yes: the ball is at height ${sf3(at)} m, above the building.` : `No: the ball is at height ${sf3(at)} m, below the top of the building.` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const t = Math.sqrt((2 * v.h) / G);
      const vy = G * t;
      return [
        [step('M1', `$${v.h} = \\frac{1}{2} \\times 9.8 \\times t^2$`, 'Vertically it starts with no speed.'), step('A1', `${sf3(t)} s`, 'Take the positive root.')],
        [step('M1', `$${v.U} \\times ${sf3(t)}$`, 'Horizontally the speed is constant.'), step('A1', `${sf3(v.U * t)} m`, 'Use the unrounded time.')],
        [step('M1', `$v_y = 9.8 \\times ${sf3(t)} = ${sf3(vy)}$`, 'Vertical speed on landing.'), step('M1', `$\\sqrt{${v.U}^2 + ${sf3(vy)}^2}$`, 'Combine the two components by Pythagoras.'), step('A1', `${sf3(Math.sqrt(v.U * v.U + 2 * G * v.h))} m s$^{-1}$`, 'To 3 significant figures.')],
      ];
    }
    const uy = v.U * v.sin.toNumber();
    const ux = v.U * v.cos.toNumber();
    const [s, c] = [`\\frac{${v.sin.n}}{${v.sin.d}}`, `\\frac{${v.cos.n}}{${v.cos.d}}`];
    if (v.level === 'core') {
      const T = (2 * uy) / G;
      return [
        [
          step('B1', `Vertical speed $= ${v.U} \\times ${s}$`, 'Use the triangle for sin α.'),
          step('M1', `$0 = ${sf3(uy)}t - 4.9t^2$`, 'Vertical displacement is zero on landing.'),
          step('A1', `${sf3(T)} s`, 't = 0 is the start.'),
        ],
        [step('M1', `$${v.U} \\times ${c} \\times ${sf3(T)}$`, 'Horizontal speed is constant.'), step('A1', `${sf3(ux * T)} m`, 'Use the unrounded time.')],
        [step('M1', `$0 = ${sf3(uy)}^2 - 2 \\times 9.8 \\times s$`, 'At the top, the vertical speed is zero.'), step('A1', `${sf3((uy * uy) / (2 * G))} m`, 'To 3 significant figures.')],
        [step('B1', 'For example, include air resistance.', 'Or spin, or treat the ball as having a size.')],
      ];
    }
    const T = flight(v);
    const t = v.x / ux;
    const at = v.h + uy * t - 0.5 * G * t * t;
    const vy = G * T - uy;
    return [
      [
        step('B1', `Vertical speed $= ${v.U} \\times ${s}$`, 'Use sin α from the triangle.'),
        step('M1', `$-${v.h} = ${sf3(uy)}t - 4.9t^2$`, 'B is below A, so the displacement is negative.'),
        step('A1', `${sf3(T)} s`, 'Use the quadratic formula; take the positive root.'),
      ],
      [
        step('M1', `$v_y = ${sf3(vy)}$ downwards; $v_x = ${sf3(ux)}$`, 'Find each component on landing.'),
        step('M1', `$\\sqrt{${sf3(ux)}^2 + ${sf3(vy)}^2}$`, 'Pythagoras.'),
        step('A1', `${sf3(Math.sqrt(v.U * v.U + 2 * G * v.h))} m s$^{-1}$`, 'A check: energy gives the same value.'),
      ],
      [
        step('M1', `$t = \\frac{${v.x}}{${sf3(ux)}} = ${sf3(t)}$`, 'Time to reach the building.'),
        step('M1', `Height $= ${v.h} + ${sf3(uy)} \\times ${sf3(t)} - 4.9 \\times ${sf3(t)}^2 = ${sf3(at)}$`, 'Add the starting height.'),
        step('A1', at > v.w ? `$${sf3(at)} > ${v.w}$, so it passes over the building.` : `$${sf3(at)} < ${v.w}$, so it hits the building.`, 'Compare and conclude.'),
      ],
    ];
  },

  check(v) {
    // Step the motion forward in small time steps until it lands.
    const dt = 0.0002;
    let [x, y, vx, vy, t] = [0, v.h, v.U * v.cos.toNumber(), v.U * v.sin.toNumber(), 0];
    if (v.level === 'core') y = 1e-9;
    let top = y;
    while (y > 0 || t === 0) {
      x += vx * dt;
      y += vy * dt - 0.5 * G * dt * dt;
      vy -= G * dt;
      t += dt;
      top = Math.max(top, y);
    }
    const expect = v.level === 'core' ? (2 * v.U * v.sin.toNumber()) / G : flight(v);
    if (Math.abs(t - expect) > 0.01) return ['time'];
    return Math.abs(Math.hypot(vx, vy) - Math.sqrt(v.U * v.U + 2 * G * v.h)) < 0.01 ? [] : ['landing speed'];
  },

  key: (v) => `${v.U}|${v.h}|${v.sin}|${v.x}|${v.w}`,
});
