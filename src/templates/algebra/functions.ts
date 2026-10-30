import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, linTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 1H Q16 (f(x) = 3x − 5: find f(4), then solve f(x) = 13),
 * June 2022 1H Q18 (fg(2) and the inverse function) and Set 24 1H Q22
 * (g(x) = x²: solve gf(x) = 49). check() substitutes the answers back.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number; // f(x) = ax + b
  b: number;
  c: number; // core: g(x) = x² + c
  k: number; // foundational: f(k); core: fg(k)
  t: number; // foundational: f(x) = t
  s: number; // stretch: gf(x) = s²
}

const f = (v: V, x: Q) => x.mul(v.a).add(v.b);
const fTex = (v: V) => `f(x) = ${linTex(v.a, v.b)}`;
const signed = (n: number) => (n < 0 ? `- ${-n}` : `+ ${n}`);

export default defineTemplate<V>({
  id: 'alg-functions',
  title: 'Functions: composite and inverse',
  strand: 'Algebra',
  subtopic: 'Functions',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const a = rng.int(2, 6);
    const b = rng.int(-9, 9);
    ensure(b !== 0, 'f has a constant term');
    const base: V = { level, a, b, c: 0, k: 0, t: 0, s: 0 };
    if (level === 'foundational') {
      const [k, x] = [rng.int(-4, 6), rng.int(-3, 9)];
      ensure(k !== x, '(b) is not the same as (a) backwards');
      return { ...base, k, t: a * x + b };
    }
    if (level === 'core') {
      const c = rng.int(-5, 6);
      ensure(c !== 0, 'g has a constant term');
      return { ...base, c, k: rng.int(-3, 4) };
    }
    const s = rng.int(2, 9);
    return { ...base, s };
  },

  validate(v) {
    return v.level === 'foundational' && (v.t - v.b) % v.a !== 0 ? ['whole-number solution'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`$${fTex(v)}$`)],
        parts: [part('a', 1, text(`Find $f(${v.k})$`)), part('b', 2, text(`Solve $f(x) = ${v.t}$`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`$${fTex(v)}$`), text(`$g(x) = x^2 ${signed(v.c)}$`)],
        parts: [part('a', 2, text(`Find $fg(${v.k})$`)), part('b', 2, text('Find $f^{-1}(x)$'))],
      };
    }
    return {
      stem: [text(`$${fTex(v)}$`), text('$g(x) = x^2$')],
      parts: [single(3, text(`Solve $gf(x) = ${v.s * v.s}$`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${f(v, Q.of(v.k))}`.replace('-', '−') }, { text: `$x = ${(v.t - v.b) / v.a}$` }];
    if (v.level === 'core') {
      const g = v.k * v.k + v.c;
      return [{ text: `${f(v, Q.of(g))}`.replace('-', '−') }, { text: `$f^{-1}(x) = \\frac{x ${signed(-v.b)}}{${v.a}}$` }];
    }
    const roots = [Q.of(v.s - v.b, v.a), Q.of(-v.s - v.b, v.a)].sort((p, q) => q.cmp(p));
    return [{ text: `$x = ${fracTex(roots[0])}$ or $x = ${fracTex(roots[1])}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const x = (v.t - v.b) / v.a;
      return [
        [step('B1', `$${v.a} \\times ${v.k < 0 ? `(${v.k})` : v.k} ${signed(v.b)} = ${f(v, Q.of(v.k))}$`, `Replace x with ${v.k}.`)],
        [step('M1', `$${linTex(v.a, v.b)} = ${v.t}$`, 'f(x) is the expression, so set it equal to the number.'), step('A1', `$${v.a}x = ${v.t - v.b}$, $x = ${x}$`, 'Solve as a linear equation.')],
      ];
    }
    if (v.level === 'core') {
      const g = v.k * v.k + v.c;
      return [
        [step('M1', `$g(${v.k}) = ${v.k < 0 ? `(${v.k})` : v.k}^2 ${signed(v.c)} = ${g}$`, 'fg means do g FIRST, then f.'), step('A1', `$f(${g}) = ${v.a} \\times ${g < 0 ? `(${g})` : g} ${signed(v.b)} = ${f(v, Q.of(g))}$`, 'Put the output of g into f.')],
        [step('M1', `$y = ${linTex(v.a, v.b)}$, so $x = \\frac{y ${signed(-v.b)}}{${v.a}}$`, 'Write y = f(x) and make x the subject.'), step('A1', `$f^{-1}(x) = \\frac{x ${signed(-v.b)}}{${v.a}}$`, 'Swap y for x. The inverse undoes f: the operations reversed, in reverse order.')],
      ];
    }
    const roots = [Q.of(v.s - v.b, v.a), Q.of(-v.s - v.b, v.a)].sort((p, q) => q.cmp(p));
    return [
      [
        step('M1', `$(${linTex(v.a, v.b)})^2 = ${v.s * v.s}$`, 'gf means do f first, then square the result.'),
        step('M1', `$${linTex(v.a, v.b)} = ${v.s}$ or $${linTex(v.a, v.b)} = -${v.s}$`, `Square root both sides: don’t forget −${v.s}.`),
        step('A1', `$x = ${fracTex(roots[0])}$ or $x = ${fracTex(roots[1])}$`, 'Solve each linear equation.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = (t: string) => Number(t.replace('−', '-').replace(/[^\d.-]/g, ''));
    if (v.level === 'foundational') {
      if (num(answers[0].text) !== v.a * v.k + v.b) p.push('f(k)');
      const x = num(answers[1].text.replace('x =', ''));
      if (v.a * x + v.b !== v.t) p.push('solve');
    } else if (v.level === 'core') {
      const g = v.k * v.k + v.c;
      if (num(answers[0].text) !== v.a * g + v.b) p.push('fg');
      // f⁻¹(f(x)) = x for a few x
      const inv = (y: number) => (y - v.b) / v.a;
      if (![-3, 0, 5].every((x) => inv(v.a * x + v.b) === x) || !answers[1].text.includes(`x ${signed(-v.b)}`)) p.push('inverse');
    } else {
      // Read both roots back and test (ax + b)² = s².
      const vals = [...answers[0].text.matchAll(/x = (-?)(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))/g)].map((m) => Q.of(Number(m[2] ?? m[4]) * (m[1] ? -1 : 1), Number(m[3] ?? 1)));
      if (vals.length !== 2 || !vals.every((x) => f(v, x).mul(f(v, x)).eq(v.s * v.s)) || vals[0].eq(vals[1])) p.push('roots');
    }
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.k}|${v.t}|${v.s}`,
});
