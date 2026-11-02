import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, roundFloatDp } from '../../engine/format';
import { DEG, coef, inRange, signed, signedCoef, surdTex } from '../../engine/pure';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Modelled on 9MA0 reciprocal trigonometry: exact values of sec, cosec and cot,
 * sec²x = 1 + tan²x leading to a quadratic in tan x, and cosec²x = 1 + cot²x
 * with a root to reject because |cosec x| is at least 1.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  p: number;
  q: number;
  s: number;
  m: number;
  n: number;
}

const coreRoots = (v: V) => inRange([Math.atan(v.q / v.p) / DEG, Math.atan(v.s) / DEG], 0, 180, 180);
const stretchRoots = (v: V) => {
  const a = Math.asin(v.m / v.n) / DEG;
  return inRange([a, 180 - a], 0, 360);
};
const list = (xs: number[]) => xs.map((x) => `$x = ${roundFloatDp(x, 1)}^\\circ$`).join(', ');

export default defineTemplate<V>({
  id: 'y13-reciprocal-trig',
  title: 'Sec, cosec and cot',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, p: 0, q: 0, s: 0, m: 0, n: 0 };
    if (level === 'foundational') {
      const p = rng.int(1, 9);
      const q = rng.int(1, 9);
      ensure(p !== q, 'not 45 degrees');
      return { ...base, p, q };
    }
    if (level === 'core') {
      const p = rng.pick([1, 2, 3]);
      const q = rng.int(1, 5) * rng.pick([1, -1]);
      const s = rng.int(1, 5) * rng.pick([1, -1]);
      const v: V = { ...base, p, q, s };
      ensure(q !== p * s && p * s + q !== 0 && p - q * s !== 0, 'two different roots and all terms');
      coreRoots(v).forEach((x) => roundFloatDp(x, 1));
      return v;
    }
    // (m u − n)(2u − 1) = 0 with u = cosec x: u = n/m is possible, u = 1/2 is not.
    const n = rng.int(2, 7);
    const m = rng.int(1, n - 1) * rng.pick([1, -1]);
    ensure(gcdInt(m, n) === 1, 'a fraction in lowest terms, so the quadratic is in its simplest form');
    return { ...base, m, n };
  },

  validate(v) {
    return v.level === 'stretch' && Math.abs(v.m / v.n) >= 1 ? ['sin x must be below 1 in size'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`Given that  $\\tan A = \\frac{${v.q}}{${v.p}}$  where $A$ is acute, find the exact value of`),
        parts: [part('a', 1, text('$\\cot A$')), part('b', 2, text('$\\sec A$')), part('c', 2, text('$\\text{cosec}\\,A$'))],
      };
    }
    if (v.level === 'core') {
      const B = -(v.p * v.s + v.q);
      const C = v.p - v.q * v.s;
      return {
        stem: lines(`$${coef(v.p, '\\sec^2 x')} ${signedCoef(B, '\\tan x')} = ${C}$`),
        parts: [
          part('a', 2, text(`Show that this equation can be written as  $${coef(v.p, '\\tan^2 x')} ${signedCoef(B, '\\tan x')} ${signed(v.q * v.s)} = 0$`)),
          part('b', 4, text('Hence solve the equation for  $0 \\leqslant x < 180^\\circ$,  giving your answers to 1 decimal place.')),
        ],
      };
    }
    const a = 2 * v.m;
    const b = v.m + 2 * v.n;
    const c = v.n + a;
    return {
      stem: lines(`$${coef(a, '\\cot^2 x')} ${signedCoef(-b, '\\text{cosec}\\,x')} ${signed(c)} = 0$`),
      parts: [
        part('a', 2, text(`Show that this equation can be written as  $${coef(a, '\\text{cosec}^2 x')} ${signedCoef(-b, '\\text{cosec}\\,x')} ${signed(v.n)} = 0$`)),
        part('b', 4, text('Hence solve the equation for  $0 < x < 360^\\circ$,  giving your answers to 1 decimal place and explaining why one value of cosec $x$ is rejected.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const h = v.p * v.p + v.q * v.q;
      const [a, r] = [surdTex(h), Math.sqrt(h)];
      const whole = Number.isInteger(r);
      return [{ text: `$${fracTex(Q.of(v.p, v.q))}$` }, { text: `$${whole ? fracTex(Q.of(r, v.p)) : `\\frac{${a}}{${v.p}}`}$` }, { text: `$${whole ? fracTex(Q.of(r, v.q)) : `\\frac{${a}}{${v.q}}`}$` }];
    }
    if (v.level === 'core') return [{ text: 'Shown' }, { text: list(coreRoots(v)) }];
    return [{ text: 'Shown' }, { text: list(stretchRoots(v)) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const h = v.p * v.p + v.q * v.q;
      const [a, r] = [surdTex(h), Math.sqrt(h)];
      const whole = Number.isInteger(r);
      return [
        [step('B1', `$${fracTex(Q.of(v.p, v.q))}$`, 'cot A is the reciprocal of tan A.')],
        [step('M1', `$\\sec^2 A = 1 + \\tan^2 A$, or the hypotenuse is $${a}$`, 'Use the identity or a right-angled triangle.'), step('A1', `$${whole ? fracTex(Q.of(r, v.p)) : `\\frac{${a}}{${v.p}}`}$`, 'A is acute, so sec A is positive.')],
        [step('M1', `$\\sin A = \\frac{${v.q}}{${a}}$`, 'cosec A is the reciprocal of sin A.'), step('A1', `$${whole ? fracTex(Q.of(r, v.q)) : `\\frac{${a}}{${v.q}}`}$`, 'Flip the fraction.')],
      ];
    }
    if (v.level === 'core') {
      const B = -(v.p * v.s + v.q);
      const t = Q.of(v.q, v.p);
      return [
        [step('M1', `$${coef(v.p, '(1 + \\tan^2 x)')} ${signedCoef(B, '\\tan x')} = ${v.p - v.q * v.s}$`, 'Use sec²x = 1 + tan²x.'), step('A1', `$${coef(v.p, '\\tan^2 x')} ${signedCoef(B, '\\tan x')} ${signed(v.q * v.s)} = 0$`, 'Collect on one side. This is the printed answer.')],
        [
          step('M1', `$(${coef(v.p, '\\tan x')} ${signed(-v.q)})(\\tan x ${signed(-v.s)}) = 0$`, 'Factorise as a quadratic in tan x.'),
          step('A1', `$\\tan x = ${fracTex(t)}$ or $\\tan x = ${v.s}$`, 'Both can happen: tan has no upper limit.'),
          step('M1', 'Inverse tan, adding $180^\\circ$ to any negative angle', 'tan repeats every 180°.'),
          step('A1', list(coreRoots(v)), 'Both values in the range.'),
        ],
      ];
    }
    const a = 2 * v.m;
    const b = v.m + 2 * v.n;
    const u = Q.of(v.n, v.m);
    return [
      [step('M1', `$${coef(a, '(\\text{cosec}^2 x - 1)')} ${signedCoef(-b, '\\text{cosec}\\,x')} ${signed(v.n + a)} = 0$`, 'Use cot²x = cosec²x − 1.'), step('A1', `$${coef(a, '\\text{cosec}^2 x')} ${signedCoef(-b, '\\text{cosec}\\,x')} ${signed(v.n)} = 0$`, 'Collect the numbers. This is the printed answer.')],
      [
        step('M1', `$(${coef(v.m, '\\text{cosec}\\,x')} ${signed(-v.n)})(2\\text{cosec}\\,x - 1) = 0$`, 'Factorise as a quadratic in cosec x.'),
        step('A1', `$\\text{cosec}\\,x = ${fracTex(u)}$; $\\text{cosec}\\,x = \\frac{1}{2}$ is rejected, since $|\\text{cosec}\\,x| \\geqslant 1$`, 'That value would need sin x = 2.'),
        step('M1', `$\\sin x = ${fracTex(Q.of(v.m, v.n))}$`, 'Take the reciprocal.'),
        step('A1', list(stretchRoots(v)), 'Both values in the range.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') return Math.abs(1 / Math.cos(Math.atan(v.q / v.p)) ** 2 - (1 + (v.q / v.p) ** 2)) < 1e-9 ? [] : ['identity'];
    const shown = [...answers[1].text.matchAll(/= (-?[\d.]+)\^/g)].map((m) => Number(m[1]));
    if (shown.length !== 2) return ['two solutions'];
    for (const x of shown) {
      const r = x * DEG;
      if (v.level === 'core') {
        const B = -(v.p * v.s + v.q);
        if (Math.abs(v.p / Math.cos(r) ** 2 + B * Math.tan(r) - (v.p - v.q * v.s)) > 1.5) return ['core'];
      } else {
        const a = 2 * v.m;
        const b = v.m + 2 * v.n;
        if (Math.abs(a / Math.tan(r) ** 2 - b / Math.sin(r) + v.n + a) > 1.5) return ['stretch'];
      }
    }
    return [];
  },

  key: (v) => `${v.p}|${v.q}|${v.s}|${v.m}|${v.n}`,
});
