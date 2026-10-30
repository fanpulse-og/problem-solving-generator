import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, frac, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 22 1H Q9 (write 8^5 × 4^3 ÷ 2^4 as a power of 2; work out
 * (27/8)^(−2/3)), Set 23 1H Q15 (solve 9^(x+2) = 27^(x−1)) and Set 24 1H Q19
 * (2^x × 4^y = 32 and 3^x ÷ 9^y = 1/27: find x and y). Every exponent is
 * chosen so the answer is a whole number or a simple fraction.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  P: number; // prime base
  u: number[]; // bases as powers of P (foundational: three; core: two)
  e: number[]; // foundational: exponents a, b, c
  frac: [number, number, number, number]; // foundational (b): r, s, q, p → (r^q/s^q)^(−p/q)
  x: number;
  y: number;
  shift: [number, number]; // core: x + p and x + q
  P2: number; // stretch: second prime
  w: [number, number]; // stretch: second equation powers
}

const powTex = (b: number, ex: string) => `${b}^{${ex}}`;
const shifted = (k: number) => (k === 0 ? 'x' : k > 0 ? `x + ${k}` : `x - ${-k}`);
/** P^k shown as a number: 32 or \frac{1}{27}. */
const valueTex = (P: number, k: number) => fracTex(Q.of(P).pow(k));

export default defineTemplate<V>({
  id: 'num-index-equations',
  title: 'Index laws and equations with powers',
  strand: 'Number',
  subtopic: 'Indices & surds',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, P: 2, u: [], e: [], frac: [1, 1, 1, 1], x: 0, y: 0, shift: [0, 0], P2: 3, w: [1, 1] };
    const P = rng.pick([2, 3, 5]);
    const maxPow = P === 2 ? 5 : P === 3 ? 4 : 3;
    if (level === 'foundational') {
      const u = rng.sample(Array.from({ length: maxPow }, (_, i) => i + 1), 3);
      ensure(u.filter((k) => k > 1).length >= 2, 'mostly powers of the base');
      const e = [rng.int(2, 6), rng.int(2, 6), rng.int(2, 9)];
      const n = u[0] * e[0] + u[1] * e[1] - u[2] * e[2];
      ensure(n >= 2 && n <= 30, 'a sensible final power');
      const [r, s] = rng.sample([1, 2, 3, 4, 5], 2);
      const q = rng.pick([2, 3]);
      const p = rng.pick(q === 2 ? [1, 3] : [1, 2]);
      ensure(r ** q <= 125 && s ** q <= 125 && !(r === 1 && s === 1), 'friendly fraction');
      return { ...base, P, u, e, frac: [r, s, q, p] };
    }
    if (level === 'core') {
      const [u, w] = rng.sample(Array.from({ length: Math.min(maxPow, 4) - 1 }, (_, i) => i + 2), 2);
      const x = rng.int(-4, 9);
      const p = rng.int(-5, 5);
      const num = u * (x + p) - w * x; // w·q
      ensure(num % w === 0, 'whole-number shift');
      const q = num / w;
      ensure(p !== 0 && q !== 0 && p !== q && Math.abs(q) <= 9, 'shifts worth having');
      return { ...base, P, u: [u, w], x, shift: [p, q] };
    }
    const P2 = rng.pick([2, 3, 5].filter((k) => k !== P));
    const u = rng.int(2, Math.min(3, maxPow));
    const w = rng.int(2, P2 === 2 ? 3 : 2);
    const x = rng.int(-2, 6);
    const y = rng.int(-3, 4);
    ensure(x !== 0 && y !== 0 && x !== y, 'non-trivial solution');
    const A = x + u * y;
    const B = x - w * y;
    ensure(A !== 0 && B !== 0 && Math.abs(A) <= 6 && Math.abs(B) <= 6, 'friendly right-hand sides');
    ensure(P ** Math.abs(A) <= 729 && P2 ** Math.abs(B) <= 729, 'numbers small enough to recognise');
    return { ...base, P, P2, u: [1, u], w: [1, w], x, y };
  },

  validate(v) {
    return v.level === 'core' && v.u[0] === v.u[1] ? ['same base'] : [];
  },

  render(v) {
    const B = (k: number, P = v.P) => P ** k;
    if (v.level === 'foundational') {
      const [r, s, q, p] = v.frac;
      const inner = s === 1 ? `${r ** q}` : `\\frac{${r ** q}}{${s ** q}}`;
      return {
        stem: [],
        parts: [
          part('a', 2, text(`Write $${powTex(B(v.u[0]), String(v.e[0]))} \\times ${powTex(B(v.u[1]), String(v.e[1]))} \\div ${powTex(B(v.u[2]), String(v.e[2]))}$ as a single power of ${v.P}`)),
          part('b', 2, text(`Work out the value of $\\left(${inner}\\right)^{-\\frac{${p}}{${q}}}$`), text('Give your answer as a fraction in its simplest form.')),
        ],
      };
    }
    if (v.level === 'core') {
      const [p, q] = v.shift;
      return { stem: [], parts: [single(3, text(`Solve $${powTex(B(v.u[0]), shifted(p))} = ${powTex(B(v.u[1]), shifted(q))}$`))] };
    }
    const A = v.x + v.u[1] * v.y;
    const Bv = v.x - v.w[1] * v.y;
    return {
      stem: [text(`$${powTex(v.P, 'x')} \\times ${powTex(B(v.u[1]), 'y')} = ${valueTex(v.P, A)}$`), text(`$${powTex(v.P2, 'x')} \\div ${powTex(B(v.w[1], v.P2), 'y')} = ${valueTex(v.P2, Bv)}$`)],
      parts: [single(4, text('Work out the value of $x$ and the value of $y$.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const [r, s, , p] = v.frac;
      const n = v.u[0] * v.e[0] + v.u[1] * v.e[1] - v.u[2] * v.e[2];
      return [{ text: `$${powTex(v.P, String(n))}$` }, { text: frac(Q.of(s, r).pow(p)) }];
    }
    if (v.level === 'core') return [{ text: `$x = ${v.x}$` }];
    return [{ text: `$x = ${v.x}$, $y = ${v.y}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [r, s, q, p] = v.frac;
      const n = v.u[0] * v.e[0] + v.u[1] * v.e[1] - v.u[2] * v.e[2];
      const pw = (i: number) => `${v.P}^{${v.u[i] * v.e[i]}}`;
      const inner = s === 1 ? `${r ** q}` : `\\frac{${r ** q}}{${s ** q}}`;
      const flipped = r === 1 ? `${s ** q}` : `\\frac{${s ** q}}{${r ** q}}`;
      const root = r === 1 ? `${s}` : `\\frac{${s}}{${r}}`;
      return [
        [step('M1', `$${pw(0)} \\times ${pw(1)} \\div ${pw(2)}$`, `Write each number as a power of ${v.P} first, e.g. $${v.P ** v.u[0]} = ${v.P}^{${v.u[0]}}$, then use the index laws.`), step('A1', `$${v.P}^{${v.u[0] * v.e[0]} + ${v.u[1] * v.e[1]} - ${v.u[2] * v.e[2]}} = ${v.P}^{${n}}$`, 'Multiplying: add the powers. Dividing: subtract.')],
        [step('M1', `$\\left(${inner}\\right)^{-\\frac{${p}}{${q}}} = \\left(${flipped}\\right)^{\\frac{${p}}{${q}}} = \\left(${root}\\right)^{${p}}$`, `Negative power: flip the fraction. Denominator ${q}: take the ${q === 2 ? 'square' : 'cube'} root.`), step('A1', frac(Q.of(s, r).pow(p)), `Then raise to the power ${p}.`)],
      ];
    }
    if (v.level === 'core') {
      const [p, q] = v.shift;
      const [u, w] = v.u;
      return [
        [
          step('M1', `$${v.P}^{${u}(${shifted(p)})} = ${v.P}^{${w}(${shifted(q)})}$`, `$${v.P ** u} = ${v.P}^{${u}}$ and $${v.P ** w} = ${v.P}^{${w}}$: write both sides as powers of ${v.P}.`),
          step('M1', `$${u}(${shifted(p)}) = ${w}(${shifted(q)})$`, 'Same base on both sides, so the powers are equal.'),
          step('A1', `$${u}x ${u * p < 0 ? '-' : '+'} ${Math.abs(u * p)} = ${w}x ${w * q < 0 ? '-' : '+'} ${Math.abs(w * q)}$, so $x = ${v.x}$`, 'Expand and solve the linear equation.'),
        ],
      ];
    }
    const A = v.x + v.u[1] * v.y;
    const Bv = v.x - v.w[1] * v.y;
    return [
      [
        step('P1', `$${v.P}^{x + ${v.u[1]}y} = ${v.P}^{${A}}$, so $x + ${v.u[1]}y = ${A}$`, `Write ${v.P ** v.u[1]} as $${v.P}^{${v.u[1]}}$ and the right-hand side as a power of ${v.P}.`),
        step('P1', `$${v.P2}^{x - ${v.w[1]}y} = ${v.P2}^{${Bv}}$, so $x - ${v.w[1]}y = ${Bv}$`, `Do the same with base ${v.P2}: dividing means subtract the powers.`),
        step('M1', `Subtract: $${v.u[1] + v.w[1]}y = ${A - Bv}$`, 'Now solve the two equations simultaneously.'),
        step('A1', `$x = ${v.x}$, $y = ${v.y}$`, 'Check in both original equations.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const B = (k: number, P = v.P) => Q.of(P).pow(k);
    if (v.level === 'foundational') {
      // Evaluate both sides exactly.
      const lhs = B(v.u[0]).pow(v.e[0]).mul(B(v.u[1]).pow(v.e[1])).div(B(v.u[2]).pow(v.e[2]));
      const n = Number(/\^\{(-?\d+)\}/.exec(answers[0].text)![1]);
      if (!Q.of(v.P).pow(n).eq(lhs)) p.push('single power');
      // (r^q/s^q)^(−p/q): check that answer^(q) = (base)^(−p).
      const [r, s, q, pp] = v.frac;
      const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(answers[1].text);
      const a = m ? Q.of(Number(m[1]), Number(m[2])) : Q.of(answers[1].text.replace(/\$/g, ''));
      if (!a.pow(q).eq(Q.of(r ** q, s ** q).pow(-pp))) p.push('fractional power');
      return p;
    }
    const nums = (answers[0].text.match(/-?\d+/g) ?? []).map(Number);
    if (v.level === 'core') {
      const [pp, q] = v.shift;
      const x = nums[0];
      if (!B(v.u[0]).pow(x + pp).eq(B(v.u[1]).pow(x + q))) p.push('equation not satisfied');
      return p;
    }
    const [x, y] = nums;
    const A = v.x + v.u[1] * v.y;
    const Bv = v.x - v.w[1] * v.y;
    if (!Q.of(v.P).pow(x).mul(B(v.u[1]).pow(y)).eq(Q.of(v.P).pow(A))) p.push('first equation');
    if (!Q.of(v.P2).pow(x).div(B(v.w[1], v.P2).pow(y)).eq(Q.of(v.P2).pow(Bv))) p.push('second equation');
    return p;
  },

  key: (v) => `${v.P}|${v.u}|${v.e}|${v.frac}|${v.x}|${v.y}|${v.shift}|${v.P2}|${v.w}`,
});
