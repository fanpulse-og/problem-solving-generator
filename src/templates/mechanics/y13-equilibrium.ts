import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/32 equilibrium of a particle: a weight held by two strings, a
 * particle held on a smooth slope by a horizontal force, and the same on a rough
 * slope when it is on the point of sliding down.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  m: number;
  a: [number, number, number];
  b: [number, number, number];
  mu: Q;
}

const G = 9.8;
const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
];

export default defineTemplate<V>({
  id: 'y13-equilibrium',
  title: 'Forces in equilibrium',
  strand: 'Mechanics',
  subtopic: 'Forces & Newton’s laws',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const a = rng.pick(TRIPLES);
    const b = rng.pick(TRIPLES);
    const m = rng.int(2, 15);
    ensure(level !== 'foundational' || a[2] !== b[2] || a[0] !== b[0], 'the two strings are at different angles');
    if (level === 'stretch') {
      const mu = Q.of(rng.int(1, 5), 10);
      ensure(mu.toNumber() < a[0] / a[1] - 0.05, 'the particle would slide without the force');
      return { level, m, a, b, mu };
    }
    return { level, m, a, b, mu: Q.of(0) };
  },

  validate(v) {
    return v.m > 0 ? [] : ['a real mass'];
  },

  render(v) {
    const take = 'Take  $g = 9.8$ m s$^{-2}$  and give your answers to 3 significant figures.';
    const tan = (t: number[]) => `\\frac{${t[0]}}{${t[1]}}`;
    if (v.level === 'foundational') {
      const [ca, sa, cb, sb] = [v.a[1] / v.a[2], v.a[0] / v.a[2], v.b[1] / v.b[2], v.b[0] / v.b[2]];
      // P hangs below; the strings go up to A on the left and B on the right.
      const fig = diagram({
        type: 'figure',
        points: { P: [0, 0], A: [-3 * ca, 3 * sa], B: [3 * cb, 3 * sb] },
        segments: [['P', 'A'], ['P', 'B']],
        labelled: ['A', 'B', 'P'],
        dots: ['P'],
        notAccurate: true,
      });
      return {
        stem: [fig, ...lines(`A particle $P$ of mass ${v.m} kg hangs in equilibrium from two light inextensible strings $PA$ and $PB$.`, `$PA$ makes an angle $\\alpha$ with the horizontal, where  $\\tan\\alpha = ${tan(v.a)}$`, `$PB$ makes an angle $\\beta$ with the horizontal, where  $\\tan\\beta = ${tan(v.b)}$`, take)],
        parts: [
          part('a', 2, text('Write down an equation by resolving horizontally, and an equation by resolving vertically.')),
          part('b', 4, text('Find the tension in each string.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A particle of mass ${v.m} kg is held at rest on a smooth plane inclined at $\\alpha$ to the horizontal, where  $\\tan\\alpha = ${tan(v.a)}$`, 'It is held in place by a horizontal force of magnitude $P$ newtons, whose line of action is in the vertical plane containing a line of greatest slope.', take),
        parts: [
          part('a', 3, text('Find the value of $P$.')),
          part('b', 3, text('Find the magnitude of the normal reaction on the particle.')),
        ],
      };
    }
    return {
      stem: lines(`A particle of mass ${v.m} kg is held at rest on a rough plane inclined at $\\alpha$ to the horizontal, where  $\\tan\\alpha = ${tan(v.a)}$`, `The coefficient of friction between the particle and the plane is ${dec(v.mu)}`, 'It is held in place by a horizontal force of magnitude $P$ newtons, whose line of action is in the vertical plane containing a line of greatest slope.', 'The particle is on the point of sliding down the plane.', take),
      parts: [
        part('a', 4, text('Write down equations by resolving parallel and perpendicular to the plane, including the normal reaction $R$.')),
        part('b', 3, text('Find the value of $P$.')),
        part('c', 1, text('State the direction of the friction on the particle.')),
      ],
    };
  },

  answer(v) {
    const [s, c] = [v.a[0] / v.a[2], v.a[1] / v.a[2]];
    if (v.level === 'foundational') {
      const [cb, sb] = [v.b[1] / v.b[2], v.b[0] / v.b[2]];
      const Ta = (v.m * G * cb) / (s * cb + sb * c);
      const Tb = (v.m * G * c) / (s * cb + sb * c);
      return [{ text: '$T_A\\cos\\alpha = T_B\\cos\\beta$;  $T_A\\sin\\alpha + T_B\\sin\\beta = ' + `${v.m}g$` }, { text: `$T_A = ${sf3(Ta)}$ N, $T_B = ${sf3(Tb)}$ N` }];
    }
    if (v.level === 'core') return [{ text: `$P = ${sf3((v.m * G * s) / c)}$` }, { text: `${sf3((v.m * G) / c)} N` }];
    const mu = v.mu.toNumber();
    const P = (v.m * G * (s - mu * c)) / (c + mu * s);
    return [{ text: `$P\\cos\\alpha + \\mu R = ${v.m}g\\sin\\alpha$;  $R = ${v.m}g\\cos\\alpha + P\\sin\\alpha$` }, { text: `$P = ${sf3(P)}$` }, { text: 'Up the plane.' }];
  },

  markScheme(v) {
    const [s, c] = [v.a[0] / v.a[2], v.a[1] / v.a[2]];
    const sT = `\\frac{${v.a[0]}}{${v.a[2]}}`;
    const cT = `\\frac{${v.a[1]}}{${v.a[2]}}`;
    if (v.level === 'foundational') {
      const [cb, sb] = [v.b[1] / v.b[2], v.b[0] / v.b[2]];
      const cbT = `\\frac{${v.b[1]}}{${v.b[2]}}`;
      const sbT = `\\frac{${v.b[0]}}{${v.b[2]}}`;
      const den = s * cb + sb * c;
      return [
        [step('B1', '$T_A\\cos\\alpha = T_B\\cos\\beta$', 'No overall horizontal force.'), step('B1', `$T_A\\sin\\alpha + T_B\\sin\\beta = ${v.m}g$`, 'The upward parts balance the weight.')],
        [
          step('M1', `$${cT}\\,T_A = ${cbT}\\,T_B$`, 'Use the triangles for sin and cos.'),
          step('M1', `$${sT}\\,T_A + ${sbT}\\,T_B = ${v.m} \\times 9.8$`, 'Substitute to get one equation with one tension.'),
          step('A1', `$T_A = ${sf3((v.m * G * cb) / den)}$ N`, 'Solve the simultaneous equations.'),
          step('A1', `$T_B = ${sf3((v.m * G * c) / den)}$ N`, 'The steeper string usually has the larger tension.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', `$P\\cos\\alpha = ${v.m}g\\sin\\alpha$`, 'Resolve along the plane: this removes R.'), step('M1', `$P = ${v.m}g\\tan\\alpha$`, 'Divide by cos α.'), step('A1', `$P = ${sf3((v.m * G * s) / c)}$`, 'To 3 significant figures.')],
        [step('M1', `$R = ${v.m}g\\cos\\alpha + P\\sin\\alpha$`, 'Resolve perpendicular to the plane. Part of P presses into the plane.'), step('M1', `$R = ${v.m}g \\times ${cT} + ${sf3((v.m * G * s) / c)} \\times ${sT}$`, 'Substitute.'), step('A1', `${sf3((v.m * G) / c)} N`, 'Use the unrounded value of P.')],
      ];
    }
    const mu = v.mu.toNumber();
    const P = (v.m * G * (s - mu * c)) / (c + mu * s);
    return [
      [
        step('M1', `$R = ${v.m}g\\cos\\alpha + P\\sin\\alpha$`, 'Perpendicular to the plane.'),
        step('A1', 'Friction is limiting: $F = \\mu R$', 'On the point of sliding.'),
        step('M1', `$P\\cos\\alpha + F = ${v.m}g\\sin\\alpha$`, 'Along the plane.'),
        step('A1', `$P\\cos\\alpha + ${dec(v.mu)}R = ${v.m}g\\sin\\alpha$`, 'Friction acts up the plane, helping to hold it.'),
      ],
      [
        step('M1', `$P\\left(${cT} + ${dec(v.mu)} \\times ${sT}\\right) = ${v.m}g\\left(${sT} - ${dec(v.mu)} \\times ${cT}\\right)$`, 'Substitute R and collect the terms in P.'),
        step('M1', `$P = \\frac{${v.m}g(\\sin\\alpha - \\mu\\cos\\alpha)}{\\cos\\alpha + \\mu\\sin\\alpha}$`, 'Rearrange.'),
        step('A1', `$P = ${sf3(P)}$`, 'To 3 significant figures.'),
      ],
      [step('B1', 'Up the plane.', 'Friction opposes the sliding motion, which would be down the plane.')],
    ];
  },

  check(v) {
    const [s, c] = [v.a[0] / v.a[2], v.a[1] / v.a[2]];
    if (v.level === 'foundational') {
      const [cb, sb] = [v.b[1] / v.b[2], v.b[0] / v.b[2]];
      const den = s * cb + sb * c;
      const [Ta, Tb] = [(v.m * G * cb) / den, (v.m * G * c) / den];
      return Math.abs(Ta * c - Tb * cb) < 1e-9 && Math.abs(Ta * s + Tb * sb - v.m * G) < 1e-9 ? [] : ['resolve'];
    }
    if (v.level === 'core') {
      const P = (v.m * G * s) / c;
      const R = v.m * G * c + P * s;
      // Horizontal and vertical resolving are a different route from along and across the plane.
      return Math.abs(R * c - v.m * G) < 1e-9 && Math.abs(R * s - P) < 1e-9 ? [] : ['resolve'];
    }
    const mu = v.mu.toNumber();
    const P = (v.m * G * (s - mu * c)) / (c + mu * s);
    const R = v.m * G * c + P * s;
    const F = mu * R;
    // Resolve horizontally and vertically instead.
    return Math.abs(R * s - F * c - P) < 1e-9 && Math.abs(R * c + F * s - v.m * G) < 1e-9 && P > 0 ? [] : ['resolve'];
  },

  key: (v) => `${v.m}|${v.a}|${v.b}|${v.mu}`,
});
