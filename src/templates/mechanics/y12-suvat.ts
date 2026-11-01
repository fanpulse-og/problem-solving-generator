import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/22 constant acceleration: the suvat equations on a road, a ball
 * thrown upwards from above the ground (g = 9.8), and a particle passing three
 * points in equal times, which needs two equations in u and a.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  u: Q;
  a: Q;
  t: number;
  h: number;
  target: Q;
}

const G = 9.8;

export default defineTemplate<V>({
  id: 'y12-suvat',
  title: 'Constant acceleration',
  strand: 'Mechanics',
  subtopic: 'Kinematics',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base = { level, u: Q.of(0), a: Q.of(0), t: 0, h: 0, target: Q.of(0) };
    if (level === 'foundational') {
      const u = Q.of(rng.int(2, 15));
      const a = Q.of(rng.int(2, 10), 2).div(rng.pick([1, 2]));
      const t = rng.int(4, 20);
      const steps = rng.int(2, t - 1);
      return { ...base, u, a, t, target: u.add(a.mul(steps)) };
    }
    if (level === 'core') {
      const u = Q.of(rng.int(5, 25));
      const h = rng.int(1, 40);
      sf3(h + (u.toNumber() ** 2) / (2 * G));
      return { ...base, u, h };
    }
    const u = Q.of(rng.int(2, 12));
    const a = Q.of(rng.int(1, 8), 2);
    return { ...base, u, a, t: rng.int(2, 8) };
  },

  validate(v) {
    return v.level === 'foundational' && !v.target.gt(v.u) ? ['the target speed must be above the start'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A car moves along a straight horizontal road with constant acceleration ${dec(v.a)} m s$^{-2}$`, `The car passes a point $A$ with speed ${dec(v.u)} m s$^{-1}$`),
        parts: [
          part('a', 2, text(`Find the speed of the car ${v.t} s after passing $A$.`)),
          part('b', 2, text(`Find the distance travelled in those ${v.t} s.`)),
          part('c', 2, text(`Find the time taken from $A$ for the car to reach a speed of ${dec(v.target)} m s$^{-1}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A ball is projected vertically upwards with speed ${dec(v.u)} m s$^{-1}$ from a point ${v.h} m above horizontal ground.`, 'The ball is modelled as a particle moving freely under gravity.', 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.'),
        parts: [
          part('a', 3, text('Find the greatest height of the ball above the ground.')),
          part('b', 3, text('Find the time from projection until the ball hits the ground.')),
          part('c', 2, text('Find the speed of the ball as it hits the ground.')),
        ],
      };
    }
    const AB = v.u.mul(v.t).add(v.a.mul(v.t * v.t).div(2));
    const BC = AB.add(v.a.mul(v.t * v.t));
    return {
      stem: lines('A particle moves along a straight line with constant acceleration.', 'It passes the points $A$, $B$ and $C$ in that order.', `The particle takes ${v.t} s to travel from $A$ to $B$, a distance of ${dec(AB)} m.`, `It takes a further ${v.t} s to travel from $B$ to $C$, a distance of ${dec(BC)} m.`),
      parts: [
        part('a', 5, text('Find the acceleration of the particle and its speed at $A$.')),
        part('b', 2, text('Find the speed of the particle at $C$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const speed = v.u.add(v.a.mul(v.t));
      const s = v.u.mul(v.t).add(v.a.mul(v.t * v.t).div(2));
      return [{ text: `${dec(speed)} m s$^{-1}$` }, { text: `${dec(s)} m` }, { text: `${dec(v.target.sub(v.u).div(v.a))} s` }];
    }
    if (v.level === 'core') {
      const u = v.u.toNumber();
      const top = v.h + (u * u) / (2 * G);
      const land = Math.sqrt(u * u + 2 * G * v.h);
      return [{ text: `${sf3(top)} m` }, { text: `${sf3((u + land) / G)} s` }, { text: `${sf3(land)} m s$^{-1}$` }];
    }
    return [{ text: `Acceleration ${dec(v.a)} m s$^{-2}$; speed at $A$ ${dec(v.u)} m s$^{-1}$` }, { text: `${dec(v.u.add(v.a.mul(2 * v.t)))} m s$^{-1}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const speed = v.u.add(v.a.mul(v.t));
      const s = v.u.mul(v.t).add(v.a.mul(v.t * v.t).div(2));
      return [
        [step('M1', `$v = u + at = ${dec(v.u)} + ${dec(v.a)} \\times ${v.t}$`, 'List what you know: u, a and t.'), step('A1', `${dec(speed)} m s$^{-1}$`, 'Include the units.')],
        [step('M1', `$s = ut + \\frac{1}{2}at^2 = ${dec(v.u)} \\times ${v.t} + \\frac{1}{2} \\times ${dec(v.a)} \\times ${v.t}^2$`, 'Any correct suvat route.'), step('A1', `${dec(s)} m`, 'Square only the time.')],
        [step('M1', `$${dec(v.target)} = ${dec(v.u)} + ${dec(v.a)}t$`, 'Use v = u + at again.'), step('A1', `${dec(v.target.sub(v.u).div(v.a))} s`, 'Solve for t.')],
      ];
    }
    if (v.level === 'core') {
      const u = v.u.toNumber();
      const rise = (u * u) / (2 * G);
      const land = Math.sqrt(u * u + 2 * G * v.h);
      return [
        [
          step('M1', `$0^2 = ${dec(v.u)}^2 - 2 \\times 9.8 \\times s$`, 'At the top the speed is zero. Up is positive, so a = −9.8.'),
          step('A1', `$s = ${sf3(rise)}$ m`, 'That is the height above the point of projection.'),
          step('A1', `${sf3(v.h + rise)} m`, `Add the ${v.h} m to measure from the ground.`),
        ],
        [
          step('M1', `$-${v.h} = ${dec(v.u)}t - 4.9t^2$`, 'The ball ends below where it started, so the displacement is negative.'),
          step('M1', `$t = \\frac{${dec(v.u)} + \\sqrt{${dec(v.u)}^2 + 4 \\times 4.9 \\times ${v.h}}}{9.8}$`, 'Use the quadratic formula and take the positive root.'),
          step('A1', `${sf3((u + land) / G)} s`, 'Time cannot be negative.'),
        ],
        [step('M1', `$v^2 = ${dec(v.u)}^2 + 2 \\times 9.8 \\times ${v.h}$`, 'Use the whole motion: displacement is −h with acceleration −g.'), step('A1', `${sf3(land)} m s$^{-1}$`, 'Speed is the size of the velocity.')],
      ];
    }
    const AB = v.u.mul(v.t).add(v.a.mul(v.t * v.t).div(2));
    const AC = AB.add(AB).add(v.a.mul(v.t * v.t));
    return [
      [
        step('M1', `$A$ to $B$:  $${dec(AB)} = ${v.t}u + \\frac{1}{2}a \\times ${v.t}^2$`, 'One equation for the first stage.'),
        step('A1', `$${dec(AB)} = ${v.t}u + ${v.t * v.t / 2}a$`, 'Tidy it up.'),
        step('M1', `$A$ to $C$:  $${dec(AC)} = ${2 * v.t}u + \\frac{1}{2}a \\times ${2 * v.t}^2$`, 'Start the second equation from A as well, so that u is the same unknown.'),
        step('A1', `$a = ${dec(v.a)}$`, 'Solve the simultaneous equations.'),
        step('A1', `$u = ${dec(v.u)}$`, 'Substitute back.'),
      ],
      [step('M1', `$v = ${dec(v.u)} + ${dec(v.a)} \\times ${2 * v.t}$`, 'From A to C takes both time intervals.'), step('A1', `${dec(v.u.add(v.a.mul(2 * v.t)))} m s$^{-1}$`, 'Include the units.')],
    ];
  },

  check(v, answers) {
    const dt = 0.0005;
    if (v.level === 'core') {
      // Step the motion forward until the ball reaches the ground.
      let [y, w, t, top] = [v.h, v.u.toNumber(), 0, v.h];
      while (y > 0) {
        y += w * dt - 0.5 * G * dt * dt;
        w -= G * dt;
        t += dt;
        top = Math.max(top, y);
      }
      const [a, b, c] = answers.map((x) => Number(x.text.split(' ')[0]));
      return Math.abs(top - a) < 0.006 * a + 0.06 && Math.abs(t - b) < 0.006 * b + 0.006 && Math.abs(-w - c) < 0.006 * c + 0.06 ? [] : ['motion'];
    }
    if (v.level === 'stretch') {
      const s = (t: number) => v.u.toNumber() * t + 0.5 * v.a.toNumber() * t * t;
      const AB = v.u.mul(v.t).add(v.a.mul(v.t * v.t).div(2));
      // The second difference of equal-time distances is at².
      const second = s(2 * v.t) - 2 * s(v.t);
      return Math.abs(second - v.a.toNumber() * v.t * v.t) < 1e-9 && AB.isPositive() ? [] : ['distances'];
    }
    return v.u.add(v.a.mul(v.target.sub(v.u).div(v.a))).eq(v.target) ? [] : ['time'];
  },

  key: (v) => `${v.u}|${v.a}|${v.t}|${v.h}|${v.target}`,
});
