import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { shift, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0/01 and 02: express a fraction in partial fractions, then
 * integrate between limits to an exact form with logarithms. The stretch question
 * has a repeated factor, which the papers use to separate the top grades.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  A: number;
  B: number;
  C: number;
  r: number;
  s: number;
  lo: number;
  hi: number;
}

const logTerm = (c: Q, arg: Q) => `${c.eq(1) ? '' : c.eq(-1) ? '-' : fracTex(c)}\\ln ${arg.isInt() ? arg.toString() : `\\left(${fracTex(arg)}\\right)`}`;
const bare = (r: number) => shift(r).slice(1, -1);
const plus = (s: string) => (s.startsWith('-') ? ` - ${s.slice(1)}` : ` + ${s}`);

export default defineTemplate<V>({
  id: 'y13-partial-fractions',
  title: 'Partial fractions',
  strand: 'Pure',
  subtopic: 'Partial fractions',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const A = nz(1, 6);
    const B = nz(1, 6);
    const C = level === 'stretch' ? nz(1, 6) : 0;
    const r = rng.int(1, 5);
    const s = rng.int(1, 5) * -1;
    ensure(r !== s, 'different factors');
    const lo = r + rng.int(1, 3);
    const hi = lo + rng.int(1, 4);
    return { level, A, B, C, r, s, lo, hi };
  },

  validate(v) {
    return v.lo > v.r && v.lo > v.s ? [] : ['the limits must avoid the asymptotes'];
  },

  render(v) {
    if (v.level !== 'stretch') {
      // A/(x − r) + B/(x − s) = ((A + B)x − As − Br) / ((x − r)(x − s))
      const top = polyTex([v.A + v.B, -v.A * v.s - v.B * v.r]);
      const form = text(`Express  $\\frac{${top}}{${shift(v.r)}${shift(v.s)}}$  in the form  $\\frac{A}{${bare(v.r)}} + \\frac{B}{${bare(v.s)}}$  where $A$ and $B$ are constants to be found.`);
      if (v.level === 'foundational') return { stem: [], parts: [single(3, form)] };
      const parts = [part('a', 3, form)];
      parts.push(part('b', 4, text(`Hence find the exact value of  $\\int_{${v.lo}}^{${v.hi}} \\frac{${top}}{${shift(v.r)}${shift(v.s)}}\\,\\mathrm{d}x$`), text('giving your answer in terms of natural logarithms.')));
      return { stem: [], parts };
    }
    // A/(x − r) + B/(x − r)² + C/(x − s)
    const [a, b, c] = [v.A + v.C, -v.A * (v.r + v.s) + v.B - 2 * v.C * v.r, v.A * v.r * v.s - v.B * v.s + v.C * v.r * v.r];
    return {
      stem: lines(`$\\mathrm{f}(x) = \\frac{${polyTex([a, b, c])}}{${shift(v.r)}^2${shift(v.s)}}$`),
      parts: [
        part('a', 4, text(`Express $\\mathrm{f}(x)$ in the form  $\\frac{A}{${bare(v.r)}} + \\frac{B}{${shift(v.r)}^2} + \\frac{C}{${bare(v.s)}}$`)),
        part('b', 4, text(`Hence find the exact value of  $\\int_{${v.lo}}^{${v.hi}} \\mathrm{f}(x)\\,\\mathrm{d}x$`)),
      ],
    };
  },

  answer(v) {
    const [A, B] = [Q.of(v.A), Q.of(v.B)];
    const rat1 = Q.of(v.hi - v.r, v.lo - v.r);
    const rat2 = Q.of(v.hi - v.s, v.lo - v.s);
    if (v.level !== 'stretch') {
      const first = [{ text: `$A = ${v.A}$, $B = ${v.B}$` }];
      if (v.level === 'foundational') return first;
      return [...first, { text: `$${logTerm(A, rat1)}${plus(logTerm(B, rat2))}$` }];
    }
    const rational = Q.of(v.B, v.lo - v.r).sub(Q.of(v.B, v.hi - v.r));
    return [{ text: `$A = ${v.A}$, $B = ${v.B}$, $C = ${v.C}$` }, { text: `$${logTerm(A, rat1)}${plus(logTerm(Q.of(v.C), rat2))}${plus(fracTex(rational))}$` }];
  },

  markScheme(v) {
    if (v.level !== 'stretch') {
      const num = (x: number) => (v.A + v.B) * x - v.A * v.s - v.B * v.r;
      const a = [
        step('M1', `$${polyTex([v.A + v.B, -v.A * v.s - v.B * v.r])} = A${shift(v.s)} + B${shift(v.r)}$`, 'Multiply through by the denominator.'),
        step('A1', `$x = ${v.r}$:  $${num(v.r)} = ${v.r - v.s}A$, so $A = ${v.A}$`, 'Choose x to remove one bracket.'),
        step('A1', `$x = ${v.s}$:  $${num(v.s)} = ${v.s - v.r}B$, so $B = ${v.B}$`, 'Then remove the other.'),
      ];
      if (v.level === 'foundational') return [a];
      const rat1 = Q.of(v.hi - v.r, v.lo - v.r);
      const rat2 = Q.of(v.hi - v.s, v.lo - v.s);
      return [
        a,
        [
          step('M1', `$\\int \\frac{${v.A}}{${bare(v.r)}} + \\frac{${v.B}}{${bare(v.s)}}\\,\\mathrm{d}x$`, 'Integrate each fraction: the top is a constant and the bottom is linear.'),
          step('A1', `$\\left[${v.A}\\ln|${bare(v.r)}|${v.B < 0 ? ' - ' : ' + '}${Math.abs(v.B)}\\ln|${bare(v.s)}|\\right]_{${v.lo}}^{${v.hi}}$`, 'Each one gives a natural log.'),
          step('M1', `$${v.A}(\\ln ${v.hi - v.r} - \\ln ${v.lo - v.r})${v.B < 0 ? ' - ' : ' + '}${Math.abs(v.B)}(\\ln ${v.hi - v.s} - \\ln ${v.lo - v.s})$`, 'Upper limit minus lower limit.'),
          step('A1', `$${logTerm(Q.of(v.A), rat1)}${plus(logTerm(Q.of(v.B), rat2))}$`, 'Combine with the subtraction law for logs.'),
        ],
      ];
    }
    const [a, b, c] = [v.A + v.C, -v.A * (v.r + v.s) + v.B - 2 * v.C * v.r, v.A * v.r * v.s - v.B * v.s + v.C * v.r * v.r];
    const n = (x: number) => a * x * x + b * x + c;
    const rat1 = Q.of(v.hi - v.r, v.lo - v.r);
    const rat2 = Q.of(v.hi - v.s, v.lo - v.s);
    const rational = Q.of(v.B, v.lo - v.r).sub(Q.of(v.B, v.hi - v.r));
    return [
      [
        step('M1', `$${polyTex([a, b, c])} = A${shift(v.r)}${shift(v.s)} + B${shift(v.s)} + C${shift(v.r)}^2$`, 'Multiply through by the whole denominator.'),
        step('A1', `$x = ${v.r}$:  $${n(v.r)} = ${v.r - v.s}B$, so $B = ${v.B}$`, 'This removes the A and C terms.'),
        step('A1', `$x = ${v.s}$:  $${n(v.s)} = ${(v.s - v.r) ** 2}C$, so $C = ${v.C}$`, 'This removes the A and B terms.'),
        step('A1', `Coefficient of $x^2$:  $${a} = A + ${v.C < 0 ? `(${v.C})` : v.C}$, so $A = ${v.A}$`, 'Compare coefficients for the last constant.'),
      ],
      [
        step('M1', `$\\int \\frac{${v.B}}{${shift(v.r)}^2}\\,\\mathrm{d}x = ${terms([[-v.B, 0]])} \\div ${shift(v.r)}$`, 'The squared bracket integrates to a power, not a log.'),
        step('A1', 'The other two fractions each give a natural log.', 'Keep the brackets inside the logs.'),
        step('M1', `Substitute $x = ${v.hi}$ and $x = ${v.lo}$, then subtract.`, 'Upper limit minus lower limit.'),
        step('A1', `$${logTerm(Q.of(v.A), rat1)}${plus(logTerm(Q.of(v.C), rat2))}${plus(fracTex(rational))}$`, 'Combine the logs and the fractions.'),
      ],
    ];
  },

  check(v, answers) {
    const simpson = (f: (x: number) => number, a: number, b: number, n = 400) => {
      let s = f(a) + f(b);
      for (let i = 1; i < n; i++) s += f(a + ((b - a) * i) / n) * (i % 2 ? 4 : 2);
      return (s * (b - a)) / (3 * n);
    };
    if (v.level === 'foundational') return answers.length === 1 ? [] : ['parts'];
    const log = (c: number, r: number) => c * Math.log(r);
    if (v.level === 'core') {
      const f = (x: number) => ((v.A + v.B) * x - v.A * v.s - v.B * v.r) / ((x - v.r) * (x - v.s));
      const exact = log(v.A, (v.hi - v.r) / (v.lo - v.r)) + log(v.B, (v.hi - v.s) / (v.lo - v.s));
      return Math.abs(simpson(f, v.lo, v.hi) - exact) < 1e-6 ? [] : ['integral'];
    }
    const [a, b, c] = [v.A + v.C, -v.A * (v.r + v.s) + v.B - 2 * v.C * v.r, v.A * v.r * v.s - v.B * v.s + v.C * v.r * v.r];
    const f = (x: number) => (a * x * x + b * x + c) / ((x - v.r) ** 2 * (x - v.s));
    const exact = log(v.A, (v.hi - v.r) / (v.lo - v.r)) + log(v.C, (v.hi - v.s) / (v.lo - v.s)) + v.B / (v.lo - v.r) - v.B / (v.hi - v.r);
    return Math.abs(simpson(f, v.lo, v.hi) - exact) < 1e-6 ? [] : ['integral'];
  },

  key: (v) => `${v.A}|${v.B}|${v.C}|${v.r}|${v.s}|${v.lo}|${v.hi}`,
});
