import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/22 connected particles: a car towing a trailer, a package on a
 * smooth table joined to one hanging over a pulley (June 2025 Q3), and two particles
 * hanging either side of a pulley where the lighter one rises on after the string
 * goes slack.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  m1: number;
  m2: number;
  D: number;
  r1: number;
  r2: number;
  h: Q;
  d: Q;
}

const G = 9.8;

export default defineTemplate<V>({
  id: 'y12-connected',
  title: 'Connected particles',
  strand: 'Mechanics',
  subtopic: 'Connected particles',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, m1: 0, m2: 0, D: 0, r1: 0, r2: 0, h: Q.of(0), d: Q.of(0) };
    if (level === 'foundational') {
      const m1 = rng.step(800, 1600, 100);
      const m2 = rng.step(200, 700, 100);
      const a = Q.of(rng.int(1, 8), 4);
      const r1 = rng.step(200, 600, 50);
      const r2 = rng.step(100, 400, 50);
      const D = a.mul(m1 + m2).add(r1 + r2);
      ensure(D.isInt(), 'a whole-number driving force');
      return { ...base, m1, m2, D: D.toInt(), r1, r2 };
    }
    if (level === 'core') {
      const m1 = rng.int(1, 6);
      const m2 = rng.int(1, 6);
      const h = Q.of(rng.int(2, 15), 10);
      const d = h.add(Q.of(rng.int(2, 15), 10));
      return { ...base, m1, m2, h, d };
    }
    const m2 = rng.int(1, 5);
    const m1 = m2 + rng.int(1, 4);
    return { ...base, m1, m2, h: Q.of(rng.int(5, 30), 10) };
  },

  validate(v) {
    return v.level === 'stretch' && v.m1 <= v.m2 ? ['the first particle must be heavier'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A car of mass ${v.m1} kg tows a trailer of mass ${v.m2} kg along a straight horizontal road, using a light inextensible tow bar.`, `The engine of the car produces a constant driving force of ${v.D} N.`, `The resistances to motion on the car and on the trailer are ${v.r1} N and ${v.r2} N.`),
        parts: [
          part('a', 3, text('Find the acceleration of the car and trailer.')),
          part('b', 3, text('Find the tension in the tow bar.')),
          part('c', 1, text('State how you have used the fact that the tow bar is inextensible.')),
        ],
      };
    }
    if (v.level === 'core') {
      const figure = diagram({
        type: 'figure',
        points: { _t0: [0, 2], _t1: [5, 2], _leg: [5, 0], _f0: [0, 0], _f1: [8, 0], P: [1.6, 2.2], _c: [5.3, 2.2], _r: [5.45, 2.2], Q: [5.45, 1.25], _floor: [5.45, 0] },
        segments: [['_t0', '_t1'], ['_t1', '_leg'], ['_f0', '_f1'], ['P', '_c'], ['_r', 'Q']],
        dashed: [['Q', '_floor']],
        circle: { center: '_c', r: 0.15 },
        labelled: ['P', 'Q'],
        dots: ['P', 'Q'],
        edgeLabels: [{ a: 'Q', b: '_floor', text: `${dec(v.h)} m` }],
        notAccurate: true,
      });
      return {
        stem: [figure, ...lines(`A package $P$ of mass ${v.m1} kg is held at rest on a smooth horizontal table, ${dec(v.d)} m from a small smooth pulley at the edge.`, `A light inextensible rope joins $P$ to a package $Q$ of mass ${v.m2} kg, which hangs freely ${dec(v.h)} m above a horizontal floor.`, '$P$ is released from rest. Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.')],
        parts: [
          part('a', 2, text('Write down an equation of motion for $Q$ as it moves downwards.')),
          part('b', 3, text('Find the acceleration of $Q$ and the tension in the rope.')),
          part('c', 2, text('Find the speed of $Q$ at the instant it hits the floor.')),
          part('d', 2, text('$Q$ does not rebound. Find the further time taken for $P$ to reach the pulley.')),
          part('e', 1, text('In a refined model there is a resistance to the motion of $P$. State, with a reason, how this changes the acceleration of $Q$.')),
        ],
      };
    }
    return {
      stem: lines(`Two particles $A$ and $B$, of masses ${v.m1} kg and ${v.m2} kg, are attached to the ends of a light inextensible string that passes over a small smooth fixed pulley.`, `The particles are held at rest with the string taut, both ${dec(v.h)} m above a horizontal floor, then released.`, 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.'),
      parts: [
        part('a', 4, text('Find the acceleration of the particles and the tension in the string.')),
        part('b', 2, text('Find the speed of $A$ at the instant it hits the floor.')),
        part('c', 3, text('Given that $B$ does not reach the pulley, find the greatest height of $B$ above the floor.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const a = Q.of(v.D - v.r1 - v.r2, v.m1 + v.m2);
      return [{ text: `${dec(a)} m s$^{-2}$` }, { text: `${dec(a.mul(v.m2).add(v.r2))} N` }, { text: 'The car and trailer have the same acceleration.' }];
    }
    if (v.level === 'core') {
      const a = (v.m2 * G) / (v.m1 + v.m2);
      const T = v.m1 * a;
      const speed = Math.sqrt(2 * a * v.h.toNumber());
      return [
        { text: `$${v.m2}g - T = ${v.m2}a$` },
        { text: `$a = ${sf3(a)}$ m s$^{-2}$, $T = ${sf3(T)}$ N` },
        { text: `${sf3(speed)} m s$^{-1}$` },
        { text: `${sf3(v.d.sub(v.h).toNumber() / speed)} s` },
        { text: 'The acceleration is less, since the resistance reduces the resultant force on the system.' },
      ];
    }
    const a = ((v.m1 - v.m2) * G) / (v.m1 + v.m2);
    const T = v.m2 * (G + a);
    const speed = Math.sqrt(2 * a * v.h.toNumber());
    return [{ text: `$a = ${sf3(a)}$ m s$^{-2}$, $T = ${sf3(T)}$ N` }, { text: `${sf3(speed)} m s$^{-1}$` }, { text: `${sf3(2 * v.h.toNumber() + (speed * speed) / (2 * G))} m` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const a = Q.of(v.D - v.r1 - v.r2, v.m1 + v.m2);
      return [
        [
          step('M1', `$${v.D} - ${v.r1} - ${v.r2} = (${v.m1} + ${v.m2})a$`, 'Treat the whole system as one: the tension is internal, so it cancels.'),
          step('A1', `$${v.D - v.r1 - v.r2} = ${v.m1 + v.m2}a$`, 'Collect the numbers.'),
          step('A1', `${dec(a)} m s$^{-2}$`, 'Solve.'),
        ],
        [
          step('M1', `Trailer:  $T - ${v.r2} = ${v.m2}a$`, 'Look at the trailer on its own: it has fewer forces.'),
          step('M1', `$T = ${v.m2} \\times ${dec(a)} + ${v.r2}$`, 'Substitute the acceleration.'),
          step('A1', `${dec(a.mul(v.m2).add(v.r2))} N`, 'A check: the car’s equation gives the same answer.'),
        ],
        [step('B1', 'The car and trailer have the same acceleration.', 'An inextensible bar means they move together.')],
      ];
    }
    if (v.level === 'core') {
      const a = (v.m2 * G) / (v.m1 + v.m2);
      const T = v.m1 * a;
      const speed = Math.sqrt(2 * a * v.h.toNumber());
      return [
        [step('M1', 'Weight down, tension up, with $a$ downwards', 'Only the forces on Q go in this equation.'), step('A1', `$${v.m2}g - T = ${v.m2}a$`, 'Resultant equals mass times acceleration.')],
        [
          step('M1', `$P$:  $T = ${v.m1}a$`, 'Only the tension acts horizontally on P, since the table is smooth.'),
          step('A1', `$a = \\frac{${v.m2} \\times 9.8}{${v.m1 + v.m2}} = ${sf3(a)}$ m s$^{-2}$`, 'Add the two equations to remove T.'),
          step('A1', `$T = ${sf3(T)}$ N`, 'Substitute back.'),
        ],
        [step('M1', `$v^2 = 2 \\times ${sf3(a)} \\times ${dec(v.h)}$`, `Q falls ${dec(v.h)} m from rest.`), step('A1', `${sf3(speed)} m s$^{-1}$`, 'Use the unrounded acceleration.')],
        [step('M1', `$${dec(v.d.sub(v.h))} = ${sf3(speed)}t$`, `The rope is slack, so P moves at constant speed for the remaining ${dec(v.d)} − ${dec(v.h)} m.`), step('A1', `${sf3(v.d.sub(v.h).toNumber() / speed)} s`, 'No force, so no acceleration.')],
        [step('B1', 'Less: the resistance reduces the resultant force on the system.', 'State the change and give the reason.')],
      ];
    }
    const a = ((v.m1 - v.m2) * G) / (v.m1 + v.m2);
    const T = v.m2 * (G + a);
    const speed = Math.sqrt(2 * a * v.h.toNumber());
    return [
      [
        step('M1', `$A$:  $${v.m1}g - T = ${v.m1}a$`, 'A is heavier, so it moves down.'),
        step('M1', `$B$:  $T - ${v.m2}g = ${v.m2}a$`, 'B moves up with the same size of acceleration.'),
        step('A1', `$a = ${sf3(a)}$ m s$^{-2}$`, 'Add the equations.'),
        step('A1', `$T = ${sf3(T)}$ N`, 'Substitute back.'),
      ],
      [step('M1', `$v^2 = 2 \\times ${sf3(a)} \\times ${dec(v.h)}$`, `A falls ${dec(v.h)} m from rest.`), step('A1', `${sf3(speed)} m s$^{-1}$`, 'Use the unrounded acceleration.')],
      [
        step('B1', `$B$ is ${dec(v.h.mul(2))} m above the floor when $A$ lands.`, `B starts ${dec(v.h)} m up and rises another ${dec(v.h)} m.`),
        step('M1', `$0 = ${sf3(speed)}^2 - 2 \\times 9.8 \\times s$`, 'The string goes slack, so B now moves freely under gravity.'),
        step('A1', `${sf3(2 * v.h.toNumber() + (speed * speed) / (2 * G))} m`, 'Add the extra rise to the height so far.'),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const a = Q.of(v.D - v.r1 - v.r2, v.m1 + v.m2);
      // The car's own equation is the other route to the tension.
      const T1 = Q.of(v.D - v.r1).sub(a.mul(v.m1));
      const T2 = a.mul(v.m2).add(v.r2);
      return T1.eq(T2) ? [] : ['tension'];
    }
    // Energy is a different route to the speed.
    const h = v.h.toNumber();
    if (v.level === 'core') {
      const speed = Math.sqrt((2 * v.m2 * G * h) / (v.m1 + v.m2));
      const a = (v.m2 * G) / (v.m1 + v.m2);
      return Math.abs(speed - Math.sqrt(2 * a * h)) < 1e-9 ? [] : ['energy'];
    }
    const speed2 = (2 * (v.m1 - v.m2) * G * h) / (v.m1 + v.m2);
    const a = ((v.m1 - v.m2) * G) / (v.m1 + v.m2);
    return Math.abs(speed2 - 2 * a * h) < 1e-9 ? [] : ['energy'];
  },

  key: (v) => `${v.m1}|${v.m2}|${v.D}|${v.r1}|${v.r2}|${v.h}|${v.d}`,
});
