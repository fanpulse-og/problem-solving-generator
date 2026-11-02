import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, roundFloatDp } from '../../engine/format';
import { DEG, inRange } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 addition formulae: exact values from two right-angled triangles,
 * an equation in sin(x + 30°) and cos(x + 60°) that reduces to tan x, and
 * tan(A + B) used in reverse.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: [number, number, number];
  b: [number, number, number];
  k: number;
  T: Q;
  p: Q;
}

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [4, 3, 5],
  [5, 12, 13],
  [12, 5, 13],
  [8, 15, 17],
  [15, 8, 17],
];

const tanCore = (k: number) => Q.of(k - 1, 3 * (k + 1));
const coreRoots = (v: V) => inRange([Math.atan(tanCore(v.k).toNumber() * Math.sqrt(3)) / DEG], 0, 360, 180);
const list = (xs: number[]) => xs.map((x) => `$x = ${roundFloatDp(x, 1)}^\\circ$`).join(', ');

export default defineTemplate<V>({
  id: 'y13-addition-formulae',
  title: 'Addition formulae',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: [3, 4, 5], b: [3, 4, 5], k: 0, T: Q.of(0), p: Q.of(0) };
    if (level === 'foundational') {
      const a = rng.pick(TRIPLES);
      const b = rng.pick(TRIPLES);
      ensure(a[2] !== b[2], 'two different triangles');
      return { ...base, a, b };
    }
    if (level === 'core') {
      const k = rng.int(2, 9);
      coreRoots({ ...base, k }).forEach((x) => roundFloatDp(x, 1));
      return { ...base, k };
    }
    const T = Q.of(rng.int(1, 5), rng.int(2, 7));
    const p = Q.of(rng.int(1, 9));
    ensure(!T.mul(p).add(1).eq(0) && !p.eq(T), 'a real, non-zero answer');
    const t = p.sub(T).div(Q.of(1).add(p.mul(T)));
    ensure(!t.mul(t).eq(1), 'tan 2x must exist');
    ensure(t.mul(2).div(Q.of(1).sub(t.mul(t))).d <= 200n, 'a fraction of a sensible size');
    return { ...base, T, p };
  },

  validate(v) {
    return v.a[0] ** 2 + v.a[1] ** 2 === v.a[2] ** 2 ? [] : ['a right-angled triangle is needed'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`Given that  $\\sin A = \\frac{${v.a[0]}}{${v.a[2]}}$  and  $\\cos B = \\frac{${v.b[1]}}{${v.b[2]}}$,  where $A$ and $B$ are both acute,`),
        parts: [part('a', 3, text('find the exact value of  $\\sin(A + B)$')), part('b', 2, text('find the exact value of  $\\cos(A + B)$'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`$\\sin(x + 30^\\circ) = ${v.k}\\cos(x + 60^\\circ)$`),
        parts: [
          part('a', 4, text('Show that  $\\tan x = a\\sqrt{3}$  where $a$ is a rational number to be found.')),
          part('b', 2, text('Hence solve the equation for  $0 \\leqslant x < 360^\\circ$,  giving your answers to 1 decimal place.')),
        ],
      };
    }
    return {
      stem: lines(`Given that  $\\tan(x + y) = ${fracTex(v.p)}$  and  $\\tan y = ${fracTex(v.T)}$,`),
      parts: [part('a', 3, text('find the exact value of  $\\tan x$')), part('b', 2, text('hence find the exact value of  $\\tan 2x$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const [sa, ca, sb, cb] = [Q.of(v.a[0], v.a[2]), Q.of(v.a[1], v.a[2]), Q.of(v.b[0], v.b[2]), Q.of(v.b[1], v.b[2])];
      return [{ text: `$${fracTex(sa.mul(cb).add(ca.mul(sb)))}$` }, { text: `$${fracTex(ca.mul(cb).sub(sa.mul(sb)))}$` }];
    }
    if (v.level === 'core') return [{ text: `$a = ${fracTex(tanCore(v.k))}$` }, { text: list(coreRoots(v)) }];
    const t = v.p.sub(v.T).div(Q.of(1).add(v.p.mul(v.T)));
    return [{ text: `$${fracTex(t)}$` }, { text: `$${fracTex(t.mul(2).div(Q.of(1).sub(t.mul(t))))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [sa, ca, sb, cb] = [Q.of(v.a[0], v.a[2]), Q.of(v.a[1], v.a[2]), Q.of(v.b[0], v.b[2]), Q.of(v.b[1], v.b[2])];
      return [
        [
          step('B1', `$\\cos A = ${fracTex(ca)}$ and $\\sin B = ${fracTex(sb)}$`, 'Use Pythagoras. Both angles are acute, so all values are positive.'),
          step('M1', `$\\sin A\\cos B + \\cos A\\sin B$`, 'The formula is in the booklet.'),
          step('A1', `$${fracTex(sa.mul(cb).add(ca.mul(sb)))}$`, 'Add the fractions.'),
        ],
        [step('M1', '$\\cos A\\cos B - \\sin A\\sin B$', 'The sign in the middle of the cos formula is opposite.'), step('A1', `$${fracTex(ca.mul(cb).sub(sa.mul(sb)))}$`, 'A negative value means A + B is obtuse.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', '$\\sin x\\cos 30^\\circ + \\cos x\\sin 30^\\circ$', 'Expand the left side.'),
          step('M1', `$${v.k}(\\cos x\\cos 60^\\circ - \\sin x\\sin 60^\\circ)$`, 'Expand the right side.'),
          step('M1', `$\\frac{\\sqrt{3}}{2}\\sin x + \\frac{1}{2}\\cos x = \\frac{${v.k}}{2}\\cos x - \\frac{${v.k}\\sqrt{3}}{2}\\sin x$`, 'Use the exact values. Then divide by cos x to bring in tan x.'),
          step('A1', `$\\tan x = \\frac{${v.k - 1}}{${v.k + 1}\\sqrt{3}}$, so $a = ${fracTex(tanCore(v.k))}$`, 'Rationalise the denominator.'),
        ],
        [step('M1', `$x = \\arctan\\left(${fracTex(tanCore(v.k))}\\sqrt{3}\\right)$`, 'Use inverse tan.'), step('A1', list(coreRoots(v)), 'tan repeats every 180°, so add 180° for the second value.')],
      ];
    }
    const t = v.p.sub(v.T).div(Q.of(1).add(v.p.mul(v.T)));
    return [
      [
        step('M1', `$\\frac{\\tan x + ${fracTex(v.T)}}{1 - ${fracTex(v.T)}\\tan x} = ${fracTex(v.p)}$`, 'Use the tan addition formula with t = tan x.'),
        step('M1', `$\\tan x + ${fracTex(v.T)} = ${fracTex(v.p)} - ${fracTex(v.p.mul(v.T))}\\tan x$`, 'Multiply out and collect the tan x terms.'),
        step('A1', `$\\tan x = ${fracTex(t)}$`, 'Solve.'),
      ],
      [step('M1', `$\\tan 2x = \\frac{2\\tan x}{1 - \\tan^2 x}$`, 'The double angle formula comes from the addition formula.'), step('A1', `$${fracTex(t.mul(2).div(Q.of(1).sub(t.mul(t))))}$`, 'Work it out with fractions.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      const A = Math.asin(v.a[0] / v.a[2]);
      const B = Math.acos(v.b[1] / v.b[2]);
      const [sa, ca, sb, cb] = [Q.of(v.a[0], v.a[2]), Q.of(v.a[1], v.a[2]), Q.of(v.b[0], v.b[2]), Q.of(v.b[1], v.b[2])];
      return Math.abs(sa.mul(cb).add(ca.mul(sb)).toNumber() - Math.sin(A + B)) < 1e-9 && Math.abs(ca.mul(cb).sub(sa.mul(sb)).toNumber() - Math.cos(A + B)) < 1e-9 ? [] : ['sum'];
    }
    if (v.level === 'core') {
      const shown = [...answers[1].text.matchAll(/= (-?[\d.]+)\^/g)].map((m) => Number(m[1]));
      for (const x of shown) if (Math.abs(Math.sin((x + 30) * DEG) - v.k * Math.cos((x + 60) * DEG)) > 0.05) return ['root'];
      return shown.length === 2 ? [] : ['two solutions'];
    }
    const t = v.p.sub(v.T).div(Q.of(1).add(v.p.mul(v.T))).toNumber();
    const x = Math.atan(t);
    const y = Math.atan(v.T.toNumber());
    return Math.abs(Math.tan(x + y) - v.p.toNumber()) < 1e-6 ? [] : ['tan'];
  },

  key: (v) => `${v.a}|${v.b}|${v.k}|${v.T}|${v.p}`,
});
