import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { terms } from '../../engine/pure';

/**
 * Modelled on 8MA0/22 variable acceleration (June 2025 Q4): s is a cubic in t.
 * Instantaneous rest, total distance (not displacement, so the particle turning
 * round matters), and integrating a velocity back to a displacement.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  p: number;
  q: number;
  r: number;
  s0: number;
}

const coeffs = (v: V) => [v.a, (-3 * v.a * (v.p + v.q)) / 2, 3 * v.a * v.p * v.q, 0];
const S = (v: V, t: number) => coeffs(v).reduce((s, c) => s * t + c, 0) + v.s0;
const vel = (v: V) => [3 * v.a, -3 * v.a * (v.p + v.q), 3 * v.a * v.p * v.q];
const W = (v: V, t: number) => 3 * v.a * (t - v.p) * (t - v.q);
const INTRO = 'In this question you must show all stages of your working. Solutions relying entirely on calculator technology are not acceptable.';
const total = (v: V) => Math.abs(S(v, v.p) - S(v, 0)) + Math.abs(S(v, v.q) - S(v, v.p)) + Math.abs(S(v, v.r) - S(v, v.q));

export default defineTemplate<V>({
  id: 'y12-variable-acceleration',
  title: 'Variable acceleration',
  strand: 'Mechanics',
  subtopic: 'Variable acceleration',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const a = rng.int(1, 3);
    const p = rng.int(1, 4);
    const q = p + 2 * rng.int(1, 3);
    const r = q + rng.int(1, 3);
    return { level, a, p, q, r, s0: level === 'stretch' ? rng.int(1, 20) : 0 };
  },

  validate(v) {
    return (v.p + v.q) % 2 === 0 ? [] : ['p + q must be even for whole coefficients'];
  },

  render(v) {
    const s = polyTex(coeffs(v));
    const stem = lines('A fixed point $O$ lies on a straight line. A particle $P$ moves along the line.');
    if (v.level === 'foundational') {
      return {
        stem: [...stem, ...lines(`At time $t$ seconds, $t \\geqslant 0$, the displacement, $s$ metres, of $P$ from $O$ is given by  $s = ${s.replace(/x/g, 't')}$`)],
        parts: [
          part('a', 2, text('Find an expression for the velocity of $P$ at time $t$ seconds.')),
          part('b', 2, text('Find an expression for the acceleration of $P$ at time $t$ seconds.')),
          part('c', 2, text(`Find the velocity of $P$ when  $t = ${v.r}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [...lines(INTRO), ...stem, ...lines(`At time $t$ seconds, $t \\geqslant 0$, the displacement, $s$ metres, of $P$ from $O$ is given by  $s = ${s.replace(/x/g, 't')}$`)],
        parts: [
          part('a', 4, text('Find the values of $t$ for which $P$ is instantaneously at rest.')),
          part('b', 3, text(`Find the total distance travelled by $P$ in the interval  $0 \\leqslant t \\leqslant ${v.r}$`)),
        ],
      };
    }
    return {
      stem: [...lines(INTRO), ...stem, ...lines(`At time $t$ seconds, $t \\geqslant 0$, the velocity, $v$ m s$^{-1}$, of $P$ is given by  $v = ${polyTex(vel(v)).replace(/x/g, 't')}$`, `When  $t = 0$,  $P$ is ${v.s0} m from $O$, on the positive side.`)],
      parts: [
        part('a', 3, text('Find an expression for the displacement of $P$ from $O$ at time $t$ seconds.')),
        part('b', 3, text(`Find the maximum speed of $P$ in the interval  $${v.p} \\leqslant t \\leqslant ${v.q}$`)),
        part('c', 2, text(`Find the displacement of $P$ from $O$ when  $t = ${v.r}$`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const a = [6 * v.a, -3 * v.a * (v.p + v.q)];
      return [{ text: `$v = ${polyTex(vel(v)).replace(/x/g, 't')}$` }, { text: `$a = ${polyTex(a).replace(/x/g, 't')}$` }, { text: `${W(v, v.r)} m s$^{-1}$` }];
    }
    if (v.level === 'core') return [{ text: `$t = ${v.p}$ and $t = ${v.q}$` }, { text: `${total(v)} m` }];
    const mid = (v.p + v.q) / 2;
    return [
      { text: `$s = ${terms([[v.a, 3], [coeffs(v)[1], 2], [coeffs(v)[2], 1], [v.s0, 0]], 't')}$` },
      { text: `${Math.abs(W(v, mid))} m s$^{-1}$` },
      { text: `${S(v, v.r)} m` },
    ];
  },

  markScheme(v) {
    const vp = polyTex(vel(v)).replace(/x/g, 't');
    if (v.level === 'foundational') {
      const a = [6 * v.a, -3 * v.a * (v.p + v.q)];
      return [
        [step('M1', '$v = \\frac{\\mathrm{d}s}{\\mathrm{d}t}$', 'Velocity is the rate of change of displacement.'), step('A1', `$v = ${vp}$`, 'Differentiate each term.')],
        [step('M1', '$a = \\frac{\\mathrm{d}v}{\\mathrm{d}t}$', 'Acceleration is the rate of change of velocity.'), step('A1', `$a = ${polyTex(a).replace(/x/g, 't')}$`, 'Differentiate again.')],
        [step('M1', `Substitute $t = ${v.r}$ into $v$`, 'Use the velocity expression, not the displacement.'), step('A1', `${W(v, v.r)} m s$^{-1}$`, 'A negative value would mean moving towards O.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `$v = ${vp}$`, 'Differentiate the displacement.'),
          step('M1', `$${vp} = 0$`, 'At rest means v = 0.'),
          step('M1', `$${3 * v.a}(t - ${v.p})(t - ${v.q}) = 0$`, 'Take out the common factor, then factorise.'),
          step('A1', `$t = ${v.p}$ and $t = ${v.q}$`, 'Both values.'),
        ],
        [
          step('M1', `$s$ at $t = 0, ${v.p}, ${v.q}, ${v.r}$ is $0$, $${S(v, v.p)}$, $${S(v, v.q)}$, $${S(v, v.r)}$`, 'The particle turns round at each rest point, so find s there.'),
          step('M1', `$${Math.abs(S(v, v.p))} + ${Math.abs(S(v, v.q) - S(v, v.p))} + ${Math.abs(S(v, v.r) - S(v, v.q))}$`, 'Add the size of each stage: distance is not displacement.'),
          step('A1', `${total(v)} m`, 'Common error: giving only the final displacement.'),
        ],
      ];
    }
    const mid = (v.p + v.q) / 2;
    const s = terms([[v.a, 3], [coeffs(v)[1], 2], [coeffs(v)[2], 1], [v.s0, 0]], 't');
    return [
      [
        step('M1', `$s = \\int (${vp})\\,\\mathrm{d}t$`, 'Displacement is the integral of velocity.'),
        step('A1', `$s = ${terms([[v.a, 3], [coeffs(v)[1], 2], [coeffs(v)[2], 1]], 't')} + c$`, 'Integrate each term.'),
        step('A1', `$s = ${s}$`, `At t = 0, s = ${v.s0}, so c = ${v.s0}.`),
      ],
      [
        step('M1', `$\\frac{\\mathrm{d}v}{\\mathrm{d}t} = ${polyTex([6 * v.a, -3 * v.a * (v.p + v.q)]).replace(/x/g, 't')} = 0$`, 'Speed is greatest where the acceleration is zero.'),
        step('A1', `$t = ${mid}$`, 'This is halfway between the two rest times.'),
        step('A1', `$|v| = ${Math.abs(W(v, mid))}$ m s$^{-1}$`, 'v is negative here; speed is its size.'),
      ],
      [step('M1', `Substitute $t = ${v.r}$ into $s$`, 'Use the expression including c.'), step('A1', `${S(v, v.r)} m`, 'A displacement can be negative.')],
    ];
  },

  check(v, answers) {
    ensure(answers.length > 0, 'answers');
    const dt = 0.0005;
    if (v.level === 'core') {
      // Add |v| in small time steps.
      let d = 0;
      for (let t = dt / 2; t < v.r; t += dt) d += Math.abs(W(v, t)) * dt;
      return Math.abs(d - total(v)) < 0.01 ? [] : ['distance'];
    }
    // Numerical derivative of s gives v at several times.
    for (const t of [0.5, 1.7, 3.2]) {
      const n = (S(v, t + 1e-5) - S(v, t - 1e-5)) / 2e-5;
      if (Math.abs(n - W(v, t)) > 1e-3) return ['velocity'];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.p}|${v.q}|${v.r}|${v.s0}`,
});
