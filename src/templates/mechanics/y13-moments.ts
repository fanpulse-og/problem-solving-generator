import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/32 moments: a uniform beam on two supports, a beam about to tilt,
 * and a uniform ladder against a smooth wall on rough ground in limiting equilibrium.
 * Weights use g = 9.8.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  L: number;
  M: number;
  m: number;
  c: number;
  d: number;
  x: number;
  tan: [number, number];
}

const G = 9.8;

export default defineTemplate<V>({
  id: 'y13-moments',
  title: 'Moments',
  strand: 'Mechanics',
  subtopic: 'Moments',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, L: 0, M: 0, m: 0, c: 0, d: 0, x: 0, tan: [3, 4] };
    if (level === 'foundational') {
      const L = rng.pick([4, 5, 6, 8, 10]);
      return { ...base, L, M: rng.step(10, 60, 5), m: rng.step(20, 90, 5), x: rng.int(1, L - 1) };
    }
    if (level === 'core') {
      const L = rng.pick([6, 8, 10, 12]);
      const c = rng.int(1, 2);
      const d = L / 2 + rng.int(1, L / 2 - 1);
      const M = rng.step(10, 60, 5);
      ensure(L - d > 0 && d > L / 2 && c < L / 2, 'the beam overhangs the second support');
      ensure(d - L / 2 <= 2 * (L - d), 'a load no more than twice the mass of the beam');
      return { ...base, L, M, c, d };
    }
    const tan = rng.pick([[4, 3], [3, 2], [2, 1], [5, 2], [12, 5]] as [number, number][]);
    return { ...base, L: 2 * rng.int(2, 5), M: rng.step(10, 40, 5), tan };
  },

  validate(v) {
    return v.level === 'foundational' && (v.x <= 0 || v.x >= v.L) ? ['the load must be on the beam'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const fig = diagram({
        type: 'figure',
        points: { A: [0, 0], B: [v.L, 0], C: [v.x, 0.25], _at: [v.x, 0], _a: [0, -0.5], _b: [v.L, -0.5] },
        segments: [['A', 'B'], ['A', '_a'], ['B', '_b']],
        labelled: ['A', 'B', 'C'],
        dots: ['_at'],
        notAccurate: true,
      });
      return {
        stem: [fig, ...lines(`A uniform beam $AB$ of length ${v.L} m and mass ${v.M} kg rests horizontally on two supports, at $A$ and at $B$.`, `A person of mass ${v.m} kg stands on the beam at $C$, where  $AC = ${v.x}$ m.`, 'The beam and the person are modelled as a uniform rod and a particle. Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.')],
        parts: [
          part('a', 3, text('Find the magnitude of the reaction at $B$.')),
          part('b', 2, text('Find the magnitude of the reaction at $A$.')),
          part('c', 1, text('Explain how you have used the fact that the beam is uniform.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A uniform beam $AB$ of length ${v.L} m and mass ${v.M} kg rests horizontally on two supports, at $C$ and at $D$.`, `$AC = ${v.c}$ m and $AD = ${v.d}$ m, so the end $B$ overhangs $D$.`, 'A particle of mass $m$ kg is placed at $B$, and the beam is on the point of tilting about $D$.', 'Take  $g = 9.8$ m s$^{-2}$'),
        parts: [
          part('a', 1, text('State the value of the reaction at $C$.')),
          part('b', 3, text('Find the value of $m$.')),
          part('c', 2, text('Find the magnitude of the reaction at $D$, giving your answer to 3 significant figures.')),
        ],
      };
    }
    const [a, b] = v.tan;
    return {
      stem: lines(`A uniform ladder $AB$ of length ${v.L} m and mass ${v.M} kg rests with its end $A$ on rough horizontal ground and its end $B$ against a smooth vertical wall.`, `The ladder makes an angle $\\alpha$ with the ground, where  $\\tan\\alpha = \\frac{${a}}{${b}}$`, 'The ladder is in a vertical plane perpendicular to the wall. Take  $g = 9.8$ m s$^{-2}$.'),
      parts: [
        part('a', 2, text('Find the magnitude of the normal reaction at $A$.')),
        part('b', 3, text('Find the magnitude of the reaction at the wall, giving your answer to 3 significant figures.')),
        part('c', 2, text('Find the smallest possible value of the coefficient of friction between the ladder and the ground.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const RB = (G * (v.M * (v.L / 2) + v.m * v.x)) / v.L;
      const RA = G * (v.M + v.m) - RB;
      return [{ text: `${sf3(RB)} N` }, { text: `${sf3(RA)} N` }, { text: 'Its weight acts at its midpoint.' }];
    }
    if (v.level === 'core') {
      const m = Q.of(v.M * (v.d - v.L / 2), v.L - v.d);
      return [{ text: '0' }, { text: `$m = ${fracTex(m)}$` }, { text: `${sf3(G * (v.M + m.toNumber()))} N` }];
    }
    const [a, b] = v.tan;
    const S = (G * v.M * b) / (2 * a);
    return [{ text: `${sf3(G * v.M)} N` }, { text: `${sf3(S)} N` }, { text: `$${fracTex(Q.of(b, 2 * a))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const RB = (G * (v.M * (v.L / 2) + v.m * v.x)) / v.L;
      return [
        [
          step('M1', 'Take moments about $A$', 'This removes the reaction at A from the equation.'),
          step('A1', `$${v.L}R_B = ${v.M}g \\times ${v.L / 2} + ${v.m}g \\times ${v.x}$`, 'Each moment is a force times its distance from A.'),
          step('A1', `${sf3(RB)} N`, 'Solve, using g = 9.8.'),
        ],
        [step('M1', `$R_A + R_B = (${v.M} + ${v.m})g$`, 'Resolve vertically.'), step('A1', `${sf3(G * (v.M + v.m) - RB)} N`, 'Use the unrounded value of the other reaction.')],
        [step('B1', 'Its weight acts at its midpoint.', 'That is what uniform means here.')],
      ];
    }
    if (v.level === 'core') {
      const m = Q.of(v.M * (v.d - v.L / 2), v.L - v.d);
      return [
        [step('B1', '0', 'On the point of tilting, the beam is just lifting off that support.')],
        [
          step('M1', 'Take moments about $D$', 'This removes the reaction at D.'),
          step('A1', `$${v.M}g \\times ${v.d - v.L / 2} = mg \\times ${v.L - v.d}$`, 'The weight of the beam acts at the midpoint. The g cancels.'),
          step('A1', `$m = ${fracTex(m)}$`, 'Solve.'),
        ],
        [step('M1', `$R_D = (${v.M} + ${fracTex(m)})g$`, 'Resolve vertically: all the weight now rests on D.'), step('A1', `${sf3(G * (v.M + m.toNumber()))} N`, 'To 3 significant figures.')],
      ];
    }
    const [a, b] = v.tan;
    const S = (G * v.M * b) / (2 * a);
    return [
      [step('M1', 'Resolve vertically', 'The wall is smooth, so it pushes horizontally only.'), step('A1', `$R = ${v.M}g = ${sf3(G * v.M)}$ N`, 'Only the ground balances the weight.')],
      [
        step('M1', 'Take moments about $A$', 'This removes both forces at the ground.'),
        step('A1', `$${v.M}g \\times ${v.L / 2}\\cos\\alpha = S \\times ${v.L}\\sin\\alpha$`, 'Use perpendicular distances.'),
        step('A1', `$S = ${sf3(S)}$ N`, `S = ${v.M}g ÷ (2 tan α).`),
      ],
      [step('M1', `$F = S$ and $F \\leqslant \\mu R$`, 'Friction balances the wall. It is limited by μR.'), step('A1', `$\\mu = \\frac{S}{R} = ${fracTex(Q.of(b, 2 * a))}$`, 'The mass and the length cancel.')],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const RB = (G * (v.M * (v.L / 2) + v.m * v.x)) / v.L;
      const RA = G * (v.M + v.m) - RB;
      // Moments about B give the other reaction independently.
      const RA2 = (G * (v.M * (v.L / 2) + v.m * (v.L - v.x))) / v.L;
      return Math.abs(RA - RA2) < 1e-9 ? [] : ['moments'];
    }
    if (v.level === 'core') {
      const m = (v.M * (v.d - v.L / 2)) / (v.L - v.d);
      // Moments about A, with the reaction at D found by resolving.
      const R = (v.M + m) * G;
      return Math.abs(R * v.d - (v.M * G * (v.L / 2) + m * G * v.L)) < 1e-6 ? [] : ['moments about A'];
    }
    // Moments about the top of the ladder must also balance.
    const [a, b] = v.tan;
    const alpha = Math.atan2(a, b);
    const S = (G * v.M * b) / (2 * a);
    const lhs = G * v.M * Math.cos(alpha) * v.L;
    const rhs = G * v.M * Math.cos(alpha) * (v.L / 2) + S * v.L * Math.sin(alpha);
    return Math.abs(lhs - rhs) < 1e-6 ? [] : ['moments about B'];
  },

  key: (v) => `${v.L}|${v.M}|${v.m}|${v.c}|${v.d}|${v.x}|${v.tan}`,
});
