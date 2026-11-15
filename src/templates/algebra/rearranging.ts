import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Changing the subject at grade 7 and above: undoing a square root (Practice),
 * and formulae where the new subject appears twice, so its terms have to be
 * collected and factorised (Apply, Extend). check() picks values of x, finds y
 * from the original formula and puts it into the rearranged one.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // foundational: y = √((x + a)/b)
  // core / stretch: y = (ax + b)/(cx + d)
  a: number;
  b: number;
  c: number;
  d: number;
  y0: number; // stretch part (b)
}

/** x = (b − dy)/(cy − a), as coefficients of the top and bottom in y. */
const top = (v: V) => (v.d > 0 ? `${v.b} - ${v.d === 1 ? '' : v.d}y` : polyTex([-v.d, v.b], 'y'));
const bottom = (v: V) => polyTex([v.c, -v.a], 'y');
const formula = (v: V) => `y = \\dfrac{${polyTex([v.a, v.b])}}{${polyTex([v.c, v.d])}}`;
const x0 = (v: V) => Q.of(v.b - v.d * v.y0, v.c * v.y0 - v.a);

export default defineTemplate<V>({
  id: 'alg-rearranging',
  title: 'Rearranging harder formulae',
  strand: 'Algebra',
  subtopic: 'Forming & using formulae',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 1, c: 1, d: 0, y0: 0 };
    if (level === 'foundational') return { ...base, a: rng.int(1, 9) * rng.pick([1, -1]), b: rng.int(2, 9) };
    const a = rng.int(2, 7);
    const b = rng.int(1, 9) * rng.pick([1, -1]);
    const c = level === 'core' ? 1 : rng.int(2, 5);
    const d = rng.int(1, 9) * rng.pick([1, -1]);
    ensure(a * d !== b * c && a !== c, 'the fraction must not cancel to a constant');
    ensure(gcdInt(gcdInt(a, Math.abs(b)), gcdInt(c, Math.abs(d))) === 1, 'no common factor');
    const v = { ...base, a, b, c, d, y0: rng.int(2, 6) * rng.pick([1, -1]) };
    if (level === 'stretch') ensure(v.c * v.y0 !== v.a && !x0(v).eq(0) && Math.abs(Number(x0(v).d)) <= 12, 'a tidy value in part (b)');
    return v;
  },

  validate(v) {
    return v.level !== 'foundational' && v.a * v.d === v.b * v.c ? ['degenerate formula'] : [];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(3, text(`Make $x$ the subject of the formula  $y = \\sqrt{\\dfrac{${polyTex([1, v.a])}}{${v.b}}}$`))] };
    if (v.level === 'core') return { stem: [], parts: [single(4, text(`Make $x$ the subject of the formula  $${formula(v)}$`))] };
    return {
      stem: [text(`$${formula(v)}$`)],
      parts: [part('a', 4, text('Make $x$ the subject of the formula.')), part('b', 2, text(`Find the value of $x$ when $y = ${v.y0}$`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$x = ${polyTex([v.b, 0, -v.a], 'y')}$` }];
    const a = { text: `$x = \\dfrac{${top(v)}}{${bottom(v)}}$` };
    return v.level === 'core' ? [a] : [a, { text: `$x = ${fracTex(x0(v))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('M1', `$y^2 = \\dfrac{${polyTex([1, v.a])}}{${v.b}}$`, 'Square both sides to undo the square root.'),
          step('M1', `$${v.b}y^2 = ${polyTex([1, v.a])}$`, `Multiply both sides by ${v.b}.`),
          step('A1', `$x = ${polyTex([v.b, 0, -v.a], 'y')}$`, v.a > 0 ? `Subtract ${v.a} from both sides.` : `Add ${-v.a} to both sides.`),
        ],
      ];
    }
    const main = [
      step('M1', `$y(${polyTex([v.c, v.d])}) = ${polyTex([v.a, v.b])}$`, 'Multiply both sides by the denominator.'),
      step('M1', `$${v.c === 1 ? '' : v.c}xy - ${v.a}x = ${top(v)}$`, 'Expand, then get every x term on one side and everything else on the other.'),
      step('M1', `$x(${bottom(v)}) = ${top(v)}$`, 'x appears twice, so factorise it out.'),
      step('A1', `$x = \\dfrac{${top(v)}}{${bottom(v)}}$`, 'Divide by the bracket.'),
    ];
    if (v.level === 'core') return [main];
    const n = v.b - v.d * v.y0;
    const m = v.c * v.y0 - v.a;
    return [main, [step('M1', `$x = \\dfrac{${v.b} - ${v.d < 0 ? `(${v.d})` : v.d} \\times ${v.y0 < 0 ? `(${v.y0})` : v.y0}}{${v.c} \\times ${v.y0 < 0 ? `(${v.y0})` : v.y0} - ${v.a}} = \\dfrac{${n}}{${m}}$`, 'Substitute into your answer to part (a).'), step('A1', `$x = ${fracTex(x0(v))}$`, 'Simplify the fraction.')]];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // x = by² − a must give back y for a few values of x.
      const m = /x = (\d+)y\^2 ([+-]) (\d+)/.exec(answers[0].text);
      if (!m) return ['format'];
      for (const y of [1, 2, 3, 5]) {
        const x = Number(m[1]) * y * y + Number(m[3]) * (m[2] === '-' ? -1 : 1);
        if ((x + v.a) / v.b !== y * y) return ['does not undo the formula'];
      }
      return [];
    }
    const m = /dfrac\{([^}]*)\}\{([^}]*)\}/.exec(answers[0].text);
    if (!m) return ['format'];
    // "8 - 6y" or "2y - 5" as [coefficient of y, constant].
    const lin = (t: string): [number, number] => {
      const u = t.replace(/ /g, '');
      const ym = /([+-]?\d*)y/.exec(u)!;
      const k = ym[1] === '' || ym[1] === '+' ? 1 : ym[1] === '-' ? -1 : Number(ym[1]);
      return [k, Number(u.replace(ym[0], '') || 0)];
    };
    const [[p, q], [r, s]] = [lin(m[1]), lin(m[2])];
    for (const xn of [3, 7, -5, 11]) {
      const x = Q.of(xn, 13);
      const y = x.mul(v.a).add(v.b).div(x.mul(v.c).add(v.d));
      if (!y.mul(p).add(q).div(y.mul(r).add(s)).eq(x)) return ['rearranged formula is not equivalent'];
    }
    if (v.level === 'stretch') {
      const mm = /x = (-?)(?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))/.exec(answers[1].text);
      if (!mm) return ['format (b)'];
      const x = (mm[2] ? Q.of(Number(mm[2]), Number(mm[3])) : Q.of(Number(mm[4]))).mul(mm[1] ? -1 : 1);
      // Back into the ORIGINAL formula.
      if (!x.mul(v.a).add(v.b).div(x.mul(v.c).add(v.d)).eq(v.y0)) return ['part (b) does not give y'];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.d}|${v.y0}`,
});
