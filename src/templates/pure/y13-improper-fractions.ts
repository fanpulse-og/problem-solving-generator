import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { shift, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 improper fractions (June 2025 P2 Q7 asks for A, B, C and D):
 * a fraction whose top has at least the degree of its bottom, divided first and then
 * split into partial fractions, and finally integrated between limits.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  A: number;
  B: number;
  C: number;
  D: number;
  r: number;
  s: number;
  lo: number;
  hi: number;
}

const bare = (r: number) => shift(r).slice(1, -1);
const den = (v: V) => polyTex([1, -(v.r + v.s), v.r * v.s]);
/** Numerator of (Ax + B) + C/(x − r) + D/(x − s) over (x − r)(x − s), highest power first. */
const top = (v: V) => {
  const [p, q] = [-(v.r + v.s), v.r * v.s];
  return [v.A, v.A * p + v.B, v.A * q + v.B * p + v.C + v.D, v.B * q - v.C * v.s - v.D * v.r];
};

export default defineTemplate<V>({
  id: 'y13-improper-fractions',
  title: 'Improper algebraic fractions',
  strand: 'Pure',
  subtopic: 'Partial fractions',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const r = rng.int(1, 5);
    const s = -rng.int(1, 5);
    const lo = r + rng.int(1, 3);
    const v: V = { level, A: level === 'foundational' ? 0 : rng.int(1, 4), B: rng.int(1, 6), C: nz(1, 6), D: nz(1, 6), r, s, lo, hi: lo + rng.int(1, 4) };
    ensure(top(v).slice(level === 'foundational' ? 1 : 0).every((c) => c !== 0), 'all terms appear');
    return v;
  },

  validate(v) {
    return v.lo > v.r ? [] : ['the limits must avoid the asymptote'];
  },

  render(v) {
    const t = top(v);
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [single(4, text(`Express  $\\frac{${polyTex(t.slice(1))}}{${den(v)}}$  in the form  $A + \\frac{B}{${bare(v.r)}} + \\frac{C}{${bare(v.s)}}$  where $A$, $B$ and $C$ are constants to be found.`))],
      };
    }
    const fx = `\\frac{${polyTex(t)}}{${den(v)}}`;
    if (v.level === 'core') {
      return { stem: [], parts: [single(5, text(`Express  $${fx}$  in the form  $Ax + B + \\frac{C}{${bare(v.r)}} + \\frac{D}{${bare(v.s)}}$  where $A$, $B$, $C$ and $D$ are constants to be found.`))] };
    }
    return {
      stem: lines(`$\\mathrm{f}(x) = ${fx}$`),
      parts: [
        part('a', 5, text(`Express $\\mathrm{f}(x)$ in the form  $Ax + B + \\frac{C}{${bare(v.r)}} + \\frac{D}{${bare(v.s)}}$`)),
        part('b', 4, text(`Hence find the exact value of  $\\int_{${v.lo}}^{${v.hi}} \\mathrm{f}(x)\\,\\mathrm{d}x$`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$A = ${v.B}$, $B = ${v.C}$, $C = ${v.D}$` }];
    const form = { text: `$A = ${v.A}$, $B = ${v.B}$, $C = ${v.C}$, $D = ${v.D}$` };
    if (v.level === 'core') return [form];
    return [form, { text: `$${exactIntegral(v)}$` }];
  },

  markScheme(v) {
    const t = top(v);
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `Divide: $A = ${t[1]}$`, 'The tops and bottoms both start with x², so the whole part is a number.'),
          step('M1', `$${polyTex(t.slice(1))} = ${v.B}(${den(v)}) + B${shift(v.s)} + C${shift(v.r)}$`, 'Multiply through by the denominator.'),
          step('A1', `$x = ${v.r}$:  $B = ${v.C}$`, 'Choose x to remove a bracket.'),
          step('A1', `$x = ${v.s}$:  $C = ${v.D}$`, 'Then the other.'),
        ],
      ];
    }
    const form = [
      step('M1', `$${polyTex(t)} = (Ax + B)(${den(v)}) + C${shift(v.s)} + D${shift(v.r)}$`, 'The degree of the top is one more than the bottom, so the whole part is linear.'),
      step('A1', `Coefficient of $x^3$:  $A = ${v.A}$`, 'Compare the highest power.'),
      step('A1', `Coefficient of $x^2$:  $B = ${v.B}$`, 'Then the next.'),
      step('M1', `$x = ${v.r}$:  $C = ${v.C}$`, 'Substituting removes the other terms.'),
      step('A1', `$x = ${v.s}$:  $D = ${v.D}$`, 'Substituting removes the other terms.'),
    ];
    if (v.level === 'core') return [form];
    return [
      form,
      [
        step('M1', `$\\int \\left(${terms([[v.A, 1], [v.B, 0]])} + \\frac{${v.C}}{${bare(v.r)}} + \\frac{${v.D}}{${bare(v.s)}}\\right)\\mathrm{d}x$`, 'Integrate term by term.'),
        step('A1', `$\\left[${fracTex(Q.of(v.A, 2))}x^2 + ${v.B}x + ${v.C}\\ln|${bare(v.r)}| ${v.D < 0 ? '-' : '+'} ${Math.abs(v.D)}\\ln|${bare(v.s)}|\\right]$`, 'The fractions give natural logs.'),
        step('M1', `Substitute $x = ${v.hi}$ and $x = ${v.lo}$, then subtract.`, 'Upper limit minus lower limit.'),
        step('A1', `$${exactIntegral(v)}$`, 'Combine the logs of each kind.'),
      ],
    ];
  },

  check(v) {
    // Compare both forms at several values of x.
    const t = top(v).slice(v.level === 'foundational' ? 1 : 0);
    const f = (x: number) => t.reduce((s, c) => s * x + c, 0) / ((x - v.r) * (x - v.s));
    const g = (x: number) => v.A * x + v.B + v.C / (x - v.r) + v.D / (x - v.s);
    for (const x of [v.r + 0.5, v.r + 3, -7.5, 11]) if (Math.abs(f(x) - g(x)) > 1e-9) return ['identity'];
    if (v.level !== 'stretch') return [];
    let s = g(v.lo) + g(v.hi);
    const n = 2000;
    for (let i = 1; i < n; i++) s += g(v.lo + ((v.hi - v.lo) * i) / n) * (i % 2 ? 4 : 2);
    const simpson = (s * (v.hi - v.lo)) / (3 * n);
    const exact = (v.A * (v.hi ** 2 - v.lo ** 2)) / 2 + v.B * (v.hi - v.lo) + v.C * Math.log((v.hi - v.r) / (v.lo - v.r)) + v.D * Math.log((v.hi - v.s) / (v.lo - v.s));
    return Math.abs(simpson - exact) < 1e-6 ? [] : ['integral'];
  },

  key: (v) => `${v.A}|${v.B}|${v.C}|${v.D}|${v.r}|${v.s}|${v.lo}|${v.hi}`,
});

/** rational + C ln(...) + D ln(...) */
function exactIntegral(v: V): string {
  const whole = Q.of(v.A * (v.hi ** 2 - v.lo ** 2), 2).add(v.B * (v.hi - v.lo));
  const log = (c: number, q: Q) => `${Math.abs(c) === 1 ? '' : Math.abs(c)}\\ln ${q.isInt() ? q.toString() : `\\left(${fracTex(q)}\\right)`}`;
  return `${fracTex(whole)} ${v.C < 0 ? '-' : '+'} ${log(v.C, Q.of(v.hi - v.r, v.lo - v.r))} ${v.D < 0 ? '-' : '+'} ${log(v.D, Q.of(v.hi - v.s, v.lo - v.s))}`;
}
