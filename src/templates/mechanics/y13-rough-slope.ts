import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/32 friction on an inclined plane: sliding down, projected up the
 * plane and whether it stays there, and a particle on the plane connected over a
 * pulley to a hanging one. Angles use tan α from a Pythagorean triple.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  sin: Q;
  cos: Q;
  label: string;
  mu: Q;
  m: number;
  m2: number;
  u: number;
  d: number;
}

const G = 9.8;
const ANGLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [4, 3, 5],
  [8, 15, 17],
  [7, 24, 25],
];
const accDown = (v: V) => G * (v.sin.toNumber() - v.mu.toNumber() * v.cos.toNumber());
const accUp = (v: V) => G * (v.sin.toNumber() + v.mu.toNumber() * v.cos.toNumber());

const slope = (v: V) =>
  diagram({
    type: 'polygon',
    points: [[0, 0], [5, 0], [5, (5 * v.sin.toNumber()) / v.cos.toNumber()]],
    angleLabels: ['α', '', ''],
    notAccurate: true,
  });

export default defineTemplate<V>({
  id: 'y13-rough-slope',
  title: 'Friction on an inclined plane',
  strand: 'Mechanics',
  subtopic: 'Friction',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [o, a, h] = rng.pick(ANGLES);
    const sin = Q.of(o, h);
    const cos = Q.of(a, h);
    const base: V = { level, sin, cos, label: `\\tan\\alpha = ${o === 1 ? '' : ''}\\frac{${o}}{${a}}`, mu: Q.of(0), m: rng.int(2, 12), m2: 0, u: 0, d: 0 };
    const tan = o / a;
    if (level === 'foundational') {
      const mu = Q.of(rng.int(1, 8), 10);
      ensure(mu.toNumber() < tan - 0.05, 'the particle must slide');
      return { ...base, mu, d: rng.int(2, 12) };
    }
    if (level === 'core') {
      const mu = Q.of(rng.int(1, 9), 10);
      ensure(Math.abs(mu.toNumber() - tan) > 0.03, 'a clear answer on whether it stays');
      return { ...base, mu, u: rng.int(4, 20) };
    }
    const mu = Q.of(rng.int(1, 5), 10);
    const m2 = rng.int(2, 14);
    const m = base.m;
    const drive = m2 - m * sin.toNumber() - mu.toNumber() * m * cos.toNumber();
    ensure(drive > 0.3, 'the hanging particle must fall');
    return { ...base, mu, m2, d: rng.int(1, 4) };
  },

  validate(v) {
    return v.sin.toNumber() < 1 && v.mu.isPositive() ? [] : ['a real angle and a rough plane'];
  },

  render(v) {
    const mu = dec(v.mu);
    if (v.level === 'foundational') {
      return {
        stem: [slope(v), ...lines(`A particle $P$ of mass ${v.m} kg is released from rest on a rough plane inclined at an angle $\\alpha$ to the horizontal, where  $${v.label}$`, `The coefficient of friction between $P$ and the plane is ${mu}`, 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.')],
        parts: [
          part('a', 2, text('Find the magnitude of the normal reaction on $P$.')),
          part('b', 3, text('Find the acceleration of $P$ down the plane.')),
          part('c', 2, text(`Find the speed of $P$ after it has moved ${v.d} m down the plane.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [slope(v), ...lines(`A particle $P$ of mass ${v.m} kg is projected with speed ${v.u} m s$^{-1}$ up a line of greatest slope of a rough plane inclined at $\\alpha$ to the horizontal, where  $${v.label}$`, `The coefficient of friction between $P$ and the plane is ${mu}`, 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.')],
        parts: [
          part('a', 4, text('Find the deceleration of $P$ as it moves up the plane.')),
          part('b', 2, text('Find the distance $P$ travels up the plane before coming to instantaneous rest.')),
          part('c', 2, text('Determine whether $P$ stays at rest or slides back down, giving a reason.')),
        ],
      };
    }
    return {
      stem: lines(`A particle $A$ of mass ${v.m} kg lies on a rough plane inclined at $\\alpha$ to the horizontal, where  $${v.label}$`, `A light inextensible string joins $A$ to a particle $B$ of mass ${v.m2} kg, passing over a small smooth pulley at the top of the plane. $B$ hangs freely.`, `The coefficient of friction between $A$ and the plane is ${mu}`, 'The system is released from rest and $A$ moves up the plane.', 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.'),
      parts: [
        part('a', 2, text('Find the magnitude of the friction on $A$.')),
        part('b', 4, text('Find the acceleration of the particles and the tension in the string.')),
        part('c', 2, text(`Find the speed of $B$ after it has fallen ${v.d} m.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const a = accDown(v);
      return [{ text: `${sf3(v.m * G * v.cos.toNumber())} N` }, { text: `${sf3(a)} m s$^{-2}$` }, { text: `${sf3(Math.sqrt(2 * a * v.d))} m s$^{-1}$` }];
    }
    if (v.level === 'core') {
      const a = accUp(v);
      const stays = v.mu.toNumber() >= v.sin.toNumber() / v.cos.toNumber();
      return [{ text: `${sf3(a)} m s$^{-2}$` }, { text: `${sf3((v.u * v.u) / (2 * a))} m` }, { text: stays ? 'It stays at rest: friction can balance the pull down the plane.' : 'It slides back down: the pull down the plane is more than the greatest friction.' }];
    }
    const F = v.mu.toNumber() * v.m * G * v.cos.toNumber();
    const a = ((v.m2 - v.m * v.sin.toNumber()) * G - F) / (v.m + v.m2);
    const T = v.m2 * (G - a);
    return [{ text: `${sf3(F)} N` }, { text: `$a = ${sf3(a)}$ m s$^{-2}$, $T = ${sf3(T)}$ N` }, { text: `${sf3(Math.sqrt(2 * a * v.d))} m s$^{-1}$` }];
  },

  markScheme(v) {
    const mu = dec(v.mu);
    const [s, c] = [v.sin, v.cos];
    const sinT = `\\frac{${s.n}}{${s.d}}`;
    const cosT = `\\frac{${c.n}}{${c.d}}`;
    const R = v.m * G * c.toNumber();
    if (v.level === 'foundational') {
      const a = accDown(v);
      return [
        [step('M1', `$R = ${v.m}g\\cos\\alpha$`, 'Resolve perpendicular to the plane.'), step('A1', `$R = ${sf3(R)}$ N`, `cos α = ${c.n}/${c.d} from the triangle.`)],
        [
          step('M1', `$F = \\mu R = ${mu} \\times ${sf3(R)}$`, 'The particle is moving, so friction is at its limit.'),
          step('M1', `$${v.m}g \\times ${sinT} - F = ${v.m}a$`, 'Resolve down the plane: weight component minus friction.'),
          step('A1', `${sf3(a)} m s$^{-2}$`, 'Use the unrounded values.'),
        ],
        [step('M1', `$v^2 = 2 \\times ${sf3(a)} \\times ${v.d}$`, 'From rest with constant acceleration.'), step('A1', `${sf3(Math.sqrt(2 * a * v.d))} m s$^{-1}$`, 'Take the square root.')],
      ];
    }
    if (v.level === 'core') {
      const a = accUp(v);
      const stays = v.mu.toNumber() >= s.toNumber() / c.toNumber();
      const down = v.m * G * s.toNumber();
      return [
        [
          step('B1', `$R = ${v.m}g \\times ${cosT}$`, 'Resolve perpendicular to the plane.'),
          step('M1', `$F = ${mu}R$`, 'Friction acts down the plane, as P is moving up.'),
          step('M1', `$${v.m}g \\times ${sinT} + F = ${v.m}a$`, 'Both forces oppose the motion.'),
          step('A1', `${sf3(a)} m s$^{-2}$`, 'Solve; the mass cancels.'),
        ],
        [step('M1', `$0 = ${v.u}^2 - 2 \\times ${sf3(a)} \\times s$`, 'At rest, v = 0.'), step('A1', `${sf3((v.u * v.u) / (2 * a))} m`, 'Use the unrounded deceleration.')],
        [
          step('M1', `Pull down the plane $= ${sf3(down)}$ N; greatest friction $= ${sf3(v.mu.toNumber() * R)}$ N`, 'At rest, friction can act up the plane, up to its limit.'),
          step('A1', stays ? 'It stays at rest: friction can balance the pull down the plane.' : 'It slides back down: the pull down the plane is more than the greatest friction.', 'Compare the two and conclude.'),
        ],
      ];
    }
    const F = v.mu.toNumber() * R;
    const a = ((v.m2 - v.m * s.toNumber()) * G - F) / (v.m + v.m2);
    const T = v.m2 * (G - a);
    return [
      [step('M1', `$R = ${v.m}g \\times ${cosT}$, $F = ${mu}R$`, 'Resolve perpendicular to the plane, then use the friction law.'), step('A1', `${sf3(F)} N`, 'A moves up the plane, so friction acts down it.')],
      [
        step('M1', `$A$:  $T - ${v.m}g \\times ${sinT} - F = ${v.m}a$`, 'Along the plane, up is positive.'),
        step('M1', `$B$:  $${v.m2}g - T = ${v.m2}a$`, 'Vertical, down is positive.'),
        step('A1', `$a = ${sf3(a)}$ m s$^{-2}$`, 'Add to remove T.'),
        step('A1', `$T = ${sf3(T)}$ N`, 'Substitute back.'),
      ],
      [step('M1', `$v^2 = 2 \\times ${sf3(a)} \\times ${v.d}$`, 'From rest.'), step('A1', `${sf3(Math.sqrt(2 * a * v.d))} m s$^{-1}$`, 'Use the unrounded acceleration.')],
    ];
  },

  check(v) {
    // Work-energy is a different route to each speed or distance.
    const [s, c, mu] = [v.sin.toNumber(), v.cos.toNumber(), v.mu.toNumber()];
    if (Math.abs(s * s + c * c - 1) > 1e-12) return ['angle'];
    if (v.level === 'foundational') {
      const speed2 = 2 * (v.m * G * s * v.d - mu * v.m * G * c * v.d) / v.m;
      return Math.abs(speed2 - 2 * accDown(v) * v.d) < 1e-9 ? [] : ['energy'];
    }
    if (v.level === 'core') {
      const d = (v.u * v.u) / (2 * accUp(v));
      const lost = 0.5 * v.m * v.u * v.u;
      return Math.abs(lost - (v.m * G * s * d + mu * v.m * G * c * d)) < 1e-6 ? [] : ['energy'];
    }
    const a = ((v.m2 - v.m * s) * G - mu * v.m * G * c) / (v.m + v.m2);
    const lhs = 0.5 * (v.m + v.m2) * 2 * a * v.d;
    const rhs = v.m2 * G * v.d - v.m * G * s * v.d - mu * v.m * G * c * v.d;
    return Math.abs(lhs - rhs) < 1e-6 && a > 0 ? [] : ['energy'];
  },

  key: (v) => `${v.sin}|${v.mu}|${v.m}|${v.m2}|${v.u}|${v.d}`,
});
