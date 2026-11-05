import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { surdTex, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/32 kinematics in two dimensions (June 2025 Q3 and Q4): constant
 * acceleration vectors with a bearing, a position vector differentiated twice, and a
 * velocity integrated from a known position, with a time when the motion is parallel
 * to a unit vector.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  u: [number, number];
  a: [number, number];
  t: number;
  r: number[];
  T: number;
}

const ij = (x: Q | number, y: Q | number) => {
  const [X, Y] = [Q.of(x), Q.of(y)];
  const front = X.eq(1) ? '' : X.eq(-1) ? '-' : dec(X);
  const back = Y.isPositive() ? '+' : '-';
  const abs = Y.isPositive() ? Y : Y.neg();
  return `${front}\\mathbf{i} ${back} ${abs.eq(1) ? '' : dec(abs)}\\mathbf{j}`;
};
const IJ = (x: string, y: string) => `(${x})\\mathbf{i} + (${y})\\mathbf{j}`;

/** The bearing of a velocity, measured clockwise from north (j) in degrees. */
const bearing = (x: number, y: number) => {
  const b = (Math.atan2(x, y) * 180) / Math.PI;
  return b < 0 ? b + 360 : b;
};
/** Bearings are written with three figures before the point: 003.4°. */
const bearingTex = (x: number, y: number) => roundFloatDp(bearing(x, y), 1).padStart(5, '0');

export default defineTemplate<V>({
  id: 'y13-vector-kinematics',
  title: 'Kinematics in two dimensions',
  strand: 'Mechanics',
  subtopic: 'Kinematics',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base: V = { level, u: [0, 0], a: [0, 0], t: rng.int(2, 8), r: [], T: 0 };
    if (level === 'foundational') {
      const u: [number, number] = [nz(1, 9), nz(1, 9)];
      const a: [number, number] = [nz(1, 5), nz(1, 5)];
      const v = [u[0] + a[0] * base.t, u[1] + a[1] * base.t];
      ensure(v[0] !== 0 && v[1] !== 0, 'the velocity has both components');
      return { ...base, u, a };
    }
    if (level === 'core') {
      // r = (p t² + q)i + (s t³ + w t)j
      const r = [rng.int(1, 5) * 2, nz(1, 9), rng.int(1, 3), nz(1, 9)];
      return { ...base, r, t: rng.int(1, 4) };
    }
    // v = (p t + q)i + (s t² − sT²)j, so that the j part vanishes at T, and starts from (x0, y0).
    const T = rng.int(2, 5);
    const r = [2 * rng.int(1, 4), nz(1, 9), 3 * rng.int(1, 3), nz(1, 9), nz(1, 9)];
    ensure(r[0] * T + r[1] !== 0, 'P is not at rest at that time');
    return { ...base, r, T };
  },

  validate(v) {
    return v.t > 0 ? [] : ['the time must be positive'];
  },

  render(v) {
    const dirs = 'In this question $\\mathbf{i}$ and $\\mathbf{j}$ are horizontal unit vectors due east and due north respectively.';
    if (v.level === 'foundational') {
      return {
        stem: lines(dirs, `A particle $P$ moves with constant acceleration  $(${ij(v.a[0], v.a[1])})$ m s$^{-2}$`, `At time  $t = 0$,  $P$ passes through the origin $O$ with velocity  $(${ij(v.u[0], v.u[1])})$ m s$^{-1}$`),
        parts: [
          part('a', 2, text(`Find the velocity of $P$ when  $t = ${v.t}$`)),
          part('b', 3, text(`Find the direction of motion of $P$ when  $t = ${v.t}$,  giving your answer as a bearing in degrees to 1 decimal place.`)),
          part('c', 2, text(`Find the position vector of $P$ when  $t = ${v.t}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      const [p, q, s, w] = v.r;
      return {
        stem: lines(`At time $t$ seconds, the position vector of a particle $P$ is $\\mathbf{r}$ metres, where`, `$\\mathbf{r} = ${IJ(terms([[p, 2], [q, 0]], 't'), terms([[s, 3], [w, 1]], 't'))}$`),
        parts: [
          part('a', 2, text('Find an expression for the velocity of $P$.')),
          part('b', 2, text('Find an expression for the acceleration of $P$.')),
          part('c', 3, text(`Find the speed of $P$ when  $t = ${v.t}$,  giving your answer as a surd or an integer.`)),
        ],
      };
    }
    const [p, q, s, x0, y0] = v.r;
    return {
      stem: lines(`At time $t$ seconds, $t \\geqslant 0$, the velocity of a particle $P$ is $\\mathbf{v}$ m s$^{-1}$, where`, `$\\mathbf{v} = ${IJ(terms([[p, 1], [q, 0]], 't'), terms([[s, 2], [-s * v.T * v.T, 0]], 't'))}$`, `When  $t = 0$,  the position vector of $P$ is  $(${ij(x0, y0)})$ m.`),
      parts: [
        part('a', 2, text('Find the value of $t$ when $P$ is moving parallel to the vector $\\mathbf{i}$.')),
        part('b', 3, text('Find an expression for the position vector of $P$ at time $t$ seconds.')),
        part('c', 2, text('Find the position vector of $P$ at the time found in part (a).')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const w: [number, number] = [v.u[0] + v.a[0] * v.t, v.u[1] + v.a[1] * v.t];
      const s: [number, number] = [v.u[0] * v.t + (v.a[0] * v.t * v.t) / 2, v.u[1] * v.t + (v.a[1] * v.t * v.t) / 2];
      return [{ text: `$(${ij(w[0], w[1])})$ m s$^{-1}$` }, { text: `$${bearingTex(w[0], w[1])}^\\circ$` }, { text: `$(${ij(Q.of(2 * s[0], 2), Q.of(2 * s[1], 2))})$ m` }];
    }
    if (v.level === 'core') {
      const [p, , s, w] = v.r;
      const vx = 2 * p * v.t;
      const vy = 3 * s * v.t * v.t + w;
      return [{ text: `$${IJ(terms([[2 * p, 1]], 't'), terms([[3 * s, 2], [w, 0]], 't'))}$` }, { text: `$${2 * p}\\mathbf{i} + ${terms([[6 * s, 1]], 't')}\\mathbf{j}$` }, { text: `$${surdTex(vx * vx + vy * vy)}$ m s$^{-1}$` }];
    }
    const [p, q, s, x0, y0] = v.r;
    const X = (t: number) => (p * t * t) / 2 + q * t + x0;
    const Y = (t: number) => (s * t ** 3) / 3 - s * v.T * v.T * t + y0;
    return [
      { text: `$t = ${v.T}$` },
      { text: `$\\mathbf{r} = ${IJ(terms([[p / 2, 2], [q, 1], [x0, 0]], 't'), terms([[s / 3, 3], [-s * v.T * v.T, 1], [y0, 0]], 't'))}$` },
      { text: `$(${ij(X(v.T), Y(v.T))})$ m` },
    ];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const w: [number, number] = [v.u[0] + v.a[0] * v.t, v.u[1] + v.a[1] * v.t];
      const s = [v.u[0] * v.t + (v.a[0] * v.t * v.t) / 2, v.u[1] * v.t + (v.a[1] * v.t * v.t) / 2];
      return [
        [step('M1', `$(${ij(v.u[0], v.u[1])}) + ${v.t}(${ij(v.a[0], v.a[1])})$`, 'v = u + at, with vectors.'), step('A1', `$(${ij(w[0], w[1])})$ m s$^{-1}$`, 'Collect the components.')],
        [
          step('M1', 'Sketch the velocity on north and east axes', 'A bearing is measured clockwise from north.'),
          step('M1', `$\\tan\\theta = \\frac{${Math.abs(w[0])}}{${Math.abs(w[1])}}$`, 'Find an angle in the triangle, then think about which quadrant it is in.'),
          step('A1', `$${bearingTex(w[0], w[1])}^\\circ$`, 'Adjust from the acute angle to a bearing, with three figures before the point.'),
        ],
        [step('M1', `$${v.t}(${ij(v.u[0], v.u[1])}) + \\frac{1}{2} \\times ${v.t}^2(${ij(v.a[0], v.a[1])})$`, 's = ut + ½at², with vectors.'), step('A1', `$(${ij(Q.of(2 * s[0], 2), Q.of(2 * s[1], 2))})$ m`, 'It starts at the origin.')],
      ];
    }
    if (v.level === 'core') {
      const [p, , s, w] = v.r;
      const vx = 2 * p * v.t;
      const vy = 3 * s * v.t * v.t + w;
      const ax = `${2 * p}\\mathbf{i} + ${terms([[6 * s, 1]], 't')}\\mathbf{j}`;
      return [
        [step('M1', '$\\mathbf{v} = \\frac{\\mathrm{d}\\mathbf{r}}{\\mathrm{d}t}$', 'Differentiate each component.'), step('A1', `$${IJ(terms([[2 * p, 1]], 't'), terms([[3 * s, 2], [w, 0]], 't'))}$`, 'Both components.')],
        [step('M1', '$\\mathbf{a} = \\frac{\\mathrm{d}\\mathbf{v}}{\\mathrm{d}t}$', 'Differentiate again.'), step('A1', `$${ax}$`, 'Both components.')],
        [step('M1', `$\\mathbf{v} = ${ij(vx, vy)}$`, `Substitute t = ${v.t}.`), step('M1', `$\\sqrt{${vx}^2 + (${vy})^2}$`, 'Speed is the size of the velocity.'), step('A1', `$${surdTex(vx * vx + vy * vy)}$ m s$^{-1}$`, 'Simplify if you can.')],
      ];
    }
    const [p, q, s, x0, y0] = v.r;
    const X = (t: number) => (p * t * t) / 2 + q * t + x0;
    const Y = (t: number) => (s * t ** 3) / 3 - s * v.T * v.T * t + y0;
    return [
      [step('M1', `$${terms([[s, 2], [-s * v.T * v.T, 0]], 't')} = 0$`, 'Parallel to i means the j component of the velocity is zero.'), step('A1', `$t = ${v.T}$`, 'Time is positive, so reject the negative root.')],
      [
        step('M1', '$\\mathbf{r} = \\int \\mathbf{v}\\,\\mathrm{d}t$', 'Integrate each component.'),
        step('A1', `$${IJ(terms([[p / 2, 2], [q, 1]], 't'), terms([[s / 3, 3], [-s * v.T * v.T, 1]], 't'))} + \\mathbf{c}$`, 'A constant vector.'),
        step('A1', `$\\mathbf{c} = ${ij(x0, y0)}$`, 'The position at t = 0.'),
      ],
      [step('M1', `Substitute $t = ${v.T}$`, 'Use the expression including c.'), step('A1', `$(${ij(X(v.T), Y(v.T))})$ m`, 'Both components.')],
    ];
  },

  check(v) {
    const dt = 1e-4;
    if (v.level === 'foundational') {
      // Step the motion forward from the origin.
      let [x, y, vx, vy] = [0, 0, v.u[0], v.u[1]];
      const n = Math.round(v.t / dt);
      for (let i = 0; i < n; i++) {
        x += vx * dt + 0.5 * v.a[0] * dt * dt;
        y += vy * dt + 0.5 * v.a[1] * dt * dt;
        vx += v.a[0] * dt;
        vy += v.a[1] * dt;
      }
      return Math.abs(x - (v.u[0] * v.t + 0.5 * v.a[0] * v.t * v.t)) < 1e-6 ? [] : ['position'];
    }
    if (v.level === 'core') {
      const [p, q, s, w] = v.r;
      const R = (t: number) => [p * t * t + q, s * t ** 3 + w * t];
      const num = (R(v.t + dt)[1] - R(v.t - dt)[1]) / (2 * dt);
      return Math.abs(num - (3 * s * v.t * v.t + w)) < 1e-4 ? [] : ['velocity'];
    }
    // Differentiate the shown position numerically: it must give back the velocity, and the j part is zero at T.
    const [p, q, s, x0, y0] = v.r;
    const X = (t: number) => (p * t * t) / 2 + q * t + x0;
    const Y = (t: number) => (s * t ** 3) / 3 - s * v.T * v.T * t + y0;
    for (const t of [0.5, 1.5, v.T]) {
      if (Math.abs((X(t + dt) - X(t - dt)) / (2 * dt) - (p * t + q)) > 1e-4) return ['i component'];
      if (Math.abs((Y(t + dt) - Y(t - dt)) / (2 * dt) - (s * t * t - s * v.T * v.T)) > 1e-4) return ['j component'];
    }
    return X(0) === x0 && Y(0) === y0 && Math.abs((Y(v.T + dt) - Y(v.T - dt)) / (2 * dt)) < 1e-4 ? [] : ['parallel'];
  },

  key: (v) => `${v.u}|${v.a}|${v.t}|${v.r}|${v.T}`,
});
