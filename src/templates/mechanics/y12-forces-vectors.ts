import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { DEG, sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/22 forces as vectors (June 2025 Q2): resultant, acceleration, a
 * third force giving constant velocity; then a change in velocity over time, and a
 * resultant that must be parallel to a given direction.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  f1: [number, number];
  f2: [number, number];
  m: Q;
  u: [number, number];
  t: number;
  dir: [number, number];
  k: number;
}

const ij = ([x, y]: [number, number]) => `${x === 1 ? '' : x === -1 ? '-' : x}\\mathbf{i} ${y < 0 ? '-' : '+'} ${Math.abs(y) === 1 ? '' : Math.abs(y)}\\mathbf{j}`;
const add = (a: [number, number], b: [number, number]): [number, number] => [a[0] + b[0], a[1] + b[1]];

export default defineTemplate<V>({
  id: 'y12-forces-vectors',
  title: 'Forces as vectors',
  strand: 'Mechanics',
  subtopic: 'Forces & Newton’s laws',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base: V = { level, f1: [0, 0], f2: [0, 0], m: Q.of(1), u: [0, 0], t: 0, dir: [0, 0], k: 0 };
    const m = rng.pick([Q.of(1, 2), Q.of(1, 4), Q.of(2), Q.of(3), Q.of(4), Q.of(5)]);
    if (level === 'stretch') {
      const f1: [number, number] = [nz(1, 9), nz(1, 9)];
      const dir: [number, number] = rng.pick([[1, 2], [2, 1], [3, 4], [4, 3], [1, -2], [2, -1], [3, -4]]);
      const k = rng.int(1, 4);
      const f2: [number, number] = [k * dir[0] - f1[0], k * dir[1] - f1[1]];
      ensure(f2[0] !== 0 && f2[1] !== 0, 'F2 has both components');
      return { ...base, f1, f2, m, dir, k };
    }
    const f1: [number, number] = [nz(1, 9), nz(1, 9)];
    const f2: [number, number] = [nz(1, 9), nz(1, 9)];
    const r = add(f1, f2);
    ensure(r[0] !== 0 && r[1] !== 0, 'the resultant has both components');
    ensure(Q.of(r[0]).div(m).terminatesWithin(3) && Q.of(r[1]).div(m).terminatesWithin(3), 'an exact decimal acceleration');
    return { ...base, f1, f2, m, u: [nz(1, 6), nz(1, 6)], t: rng.int(2, 8) };
  },

  validate(v) {
    return v.m.isPositive() ? [] : ['the mass must be positive'];
  },

  render(v) {
    const m = dec(v.m);
    if (v.level === 'foundational') {
      return {
        stem: lines(`A particle $P$ has mass ${m} kg.`, 'The particle moves on a smooth horizontal surface under the action of two horizontal forces $\\mathbf{F}_1$ and $\\mathbf{F}_2$', `Given that  $\\mathbf{F}_1 = (${ij(v.f1)})$ N  and  $\\mathbf{F}_2 = (${ij(v.f2)})$ N,`),
        parts: [
          part('a', 1, text('find the resultant force on $P$, in terms of $\\mathbf{i}$ and $\\mathbf{j}$,')),
          part('b', 3, text('find the magnitude of the acceleration of $P$.')),
          part('c', 1, text('A third horizontal force $\\mathbf{F}_3$ is applied, and $P$ now moves with constant velocity. Find $\\mathbf{F}_3$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A particle $P$ of mass ${m} kg moves under the action of forces  $(${ij(v.f1)})$ N  and  $(${ij(v.f2)})$ N.`, `At time  $t = 0$,  the velocity of $P$ is  $(${ij(v.u)})$ m s$^{-1}$`),
        parts: [
          part('a', 2, text('Find the acceleration of $P$, in terms of $\\mathbf{i}$ and $\\mathbf{j}$.')),
          part('b', 2, text(`Find the velocity of $P$ when  $t = ${v.t}$`)),
          part('c', 2, text(`Find the speed of $P$ when  $t = ${v.t}$,  giving your answer to 3 significant figures.`)),
          part('d', 2, text('Find the size of the angle between the acceleration and the vector $\\mathbf{i}$, giving your answer in degrees to 1 decimal place.')),
        ],
      };
    }
    return {
      stem: lines(`A particle of mass ${m} kg moves under the action of two forces  $\\mathbf{F}_1 = (${ij(v.f1)})$ N  and  $\\mathbf{F}_2 = (p\\mathbf{i} ${v.f2[1] < 0 ? '-' : '+'} ${Math.abs(v.f2[1])}\\mathbf{j})$ N,  where $p$ is a constant.`, `The resultant force is parallel to  $(${ij(v.dir)})$`),
      parts: [
        part('a', 3, text('Find the value of $p$')),
        part('b', 3, text('Find the magnitude of the acceleration of the particle, giving your answer to 3 significant figures.')),
      ],
    };
  },

  answer(v) {
    const r = add(v.f1, v.f2);
    const a = (r[0] ** 2 + r[1] ** 2) ** 0.5 / v.m.toNumber();
    if (v.level === 'foundational') return [{ text: `$(${ij(r)})$ N` }, { text: `${sf3(a)} m s$^{-2}$` }, { text: `$(${ij([-r[0], -r[1]])})$ N` }];
    if (v.level === 'core') {
      const acc = [Q.of(r[0]).div(v.m), Q.of(r[1]).div(v.m)];
      const vel = [Q.of(v.u[0]).add(acc[0].mul(v.t)), Q.of(v.u[1]).add(acc[1].mul(v.t))];
      return [
        { text: `$(${vecQ(acc)})$ m s$^{-2}$` },
        { text: `$(${vecQ(vel)})$ m s$^{-1}$` },
        { text: `${sf3(Math.hypot(vel[0].toNumber(), vel[1].toNumber()))} m s$^{-1}$` },
        { text: `$${roundFloatDp(Math.atan(Math.abs(r[1] / r[0])) / DEG, 1)}^\\circ$` },
      ];
    }
    return [{ text: `$p = ${v.f2[0]}$` }, { text: `${sf3((Math.hypot(v.dir[0], v.dir[1]) * v.k) / v.m.toNumber())} m s$^{-2}$` }];
  },

  markScheme(v) {
    const r = add(v.f1, v.f2);
    const m = dec(v.m);
    if (v.level === 'foundational') {
      const size = Math.hypot(r[0], r[1]);
      return [
        [step('B1', `$(${ij(r)})$ N`, 'Add the i parts and the j parts.')],
        [
          step('M1', `$|\\mathbf{R}| = \\sqrt{(${r[0]})^2 + (${r[1]})^2} = ${sf3(size)}$`, 'Pythagoras gives the size of the resultant.'),
          step('M1', `$${sf3(size)} = ${m}a$`, 'Newton’s second law: F = ma.'),
          step('A1', `${sf3(size / v.m.toNumber())} m s$^{-2}$`, 'Use the unrounded force.'),
        ],
        [step('B1', `$(${ij([-r[0], -r[1]])})$ N`, 'Constant velocity means no acceleration, so the forces must balance.')],
      ];
    }
    if (v.level === 'core') {
      const acc = [Q.of(r[0]).div(v.m), Q.of(r[1]).div(v.m)];
      const vel = [Q.of(v.u[0]).add(acc[0].mul(v.t)), Q.of(v.u[1]).add(acc[1].mul(v.t))];
      return [
        [step('M1', `$(${ij(r)}) = ${m}\\mathbf{a}$`, 'F = ma with vectors: use the resultant.'), step('A1', `$(${vecQ(acc)})$ m s$^{-2}$`, 'Divide both components by the mass.')],
        [step('M1', `$\\mathbf{v} = (${ij(v.u)}) + ${v.t}(${vecQ(acc)})$`, 'v = u + at works with vectors too.'), step('A1', `$(${vecQ(vel)})$ m s$^{-1}$`, 'Collect the components.')],
        [step('M1', `$\\sqrt{(${dec(vel[0])})^2 + (${dec(vel[1])})^2}$`, 'Speed is the size of the velocity.'), step('A1', `${sf3(Math.hypot(vel[0].toNumber(), vel[1].toNumber()))} m s$^{-1}$`, 'To 3 significant figures.')],
        [step('M1', `$\\tan\\theta = \\frac{${Math.abs(r[1])}}{${Math.abs(r[0])}}$`, 'The acceleration points the same way as the resultant.'), step('A1', `$${roundFloatDp(Math.atan(Math.abs(r[1] / r[0])) / DEG, 1)}^\\circ$`, 'Use the sizes of the components.')],
      ];
    }
    const size = Math.hypot(v.dir[0], v.dir[1]) * v.k;
    return [
      [
        step('M1', `$\\mathbf{R} = (${v.f1[0]} + p)\\mathbf{i} ${r[1] < 0 ? '-' : '+'} ${Math.abs(r[1])}\\mathbf{j}$`, 'Add the forces.'),
        step('M1', `$\\frac{${v.f1[0]} + p}{${r[1]}} = \\frac{${v.dir[0]}}{${v.dir[1]}}$`, 'Parallel vectors have components in the same ratio.'),
        step('A1', `$p = ${v.f2[0]}$`, 'Solve the linear equation.'),
      ],
      [
        step('M1', `$\\mathbf{R} = ${ij(r)}$, so $|\\mathbf{R}| = ${sf3(size)}$`, 'Pythagoras on the resultant.'),
        step('M1', `$a = ${sf3(size)} \\div ${m}$`, 'Newton’s second law.'),
        step('A1', `${sf3(size / v.m.toNumber())} m s$^{-2}$`, 'Use the unrounded force.'),
      ],
    ];
  },

  check(v) {
    const r = add(v.f1, v.f2);
    if (v.level === 'stretch') return r[0] * v.dir[1] === r[1] * v.dir[0] ? [] : ['parallel'];
    // The third force brings the total to zero.
    return r[0] + -r[0] === 0 && Math.hypot(r[0], r[1]) > 0 ? [] : ['balance'];
  },

  key: (v) => `${v.f1}|${v.f2}|${v.m}|${v.u}|${v.t}|${v.dir}`,
});

function vecQ([x, y]: Q[]): string {
  return `${dec(x)}\\mathbf{i} ${y.isPositive() ? '+' : '-'} ${dec(y.isPositive() ? y : y.neg())}\\mathbf{j}`;
}
