import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, linTex, polyTex } from '../../engine/format';

/**
 * Expanding three brackets (Practice, and with a 2x or 3x bracket for Apply)
 * and finding the missing values in an identity by comparing coefficients
 * (Extend). check() evaluates both sides at several whole numbers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  p: number; // (px + a)(x + b)(x + c)
  a: number;
  b: number;
  c: number;
}

const br = (p: number, r: number) => `(${linTex(p, r)})`;
/** Coefficients of (px + a)(x + b)(x + c). */
const cubic = (v: V) => [v.p, v.p * (v.b + v.c) + v.a, v.p * v.b * v.c + v.a * (v.b + v.c), v.a * v.b * v.c];
const at = (c: number[], x: number) => c.reduce((s, k) => s * x + k, 0);

export default defineTemplate<V>({
  id: 'alg-triple-brackets',
  title: 'Expanding three brackets and identities',
  strand: 'Algebra',
  subtopic: 'Expanding & factorising',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const nz = (hi: number) => rng.int(1, hi) * rng.pick([1, -1]);
    if (level === 'stretch') {
      // (x + a)(x − a)(x + c) ≡ x³ + cx² − a²x + m
      const a = rng.int(2, 7);
      const c = nz(9);
      ensure(Math.abs(c) !== a, 'three different brackets');
      return { level, p: 1, a, b: -a, c };
    }
    const v = { level, p: level === 'core' ? rng.pick([2, 3]) : 1, a: nz(level === 'core' ? 5 : 6), b: nz(6), c: nz(6) };
    ensure(new Set([v.a, v.b, v.c]).size === 3, 'three different brackets');
    ensure(cubic(v).every((k) => k !== 0), 'every power of x appears');
    ensure(v.b + v.c !== 0, 'the first product has an x term');
    return v;
  },

  validate(v) {
    return v.level === 'stretch' && v.b !== -v.a ? ['needs a difference of two squares'] : [];
  },

  render(v) {
    if (v.level !== 'stretch') return { stem: [], parts: [single(3, text(`Expand and simplify  $${br(v.p, v.a)}${br(1, v.b)}${br(1, v.c)}$`))] };
    const [, k, q] = cubic(v);
    return {
      stem: [text(`$(x + a)(x - a)(x + k) \\equiv x^3 ${k < 0 ? '-' : '+'} ${Math.abs(k)}x^2 - ${-q}x + m$`), text('where $a$, $k$ and $m$ are integers and $a > 0$')],
      parts: [single(4, text('Find the value of $a$, the value of $k$ and the value of $m$.'))],
    };
  },

  answer(v) {
    if (v.level !== 'stretch') return [{ text: `$${polyTex(cubic(v))}$` }];
    return [{ text: `$a = ${v.a}$, $k = ${v.c}$, $m = ${cubic(v)[3]}$` }];
  },

  markScheme(v) {
    if (v.level !== 'stretch') {
      const two = [1, v.b + v.c, v.b * v.c];
      const quad = polyTex(two);
      const px = v.p === 1 ? 'x' : `${v.p}x`;
      return [
        [
          step('M1', `$${br(1, v.b)}${br(1, v.c)} = ${quad}$`, 'Expand two of the brackets first and simplify.'),
          step(
            'M1',
            `$${px}(${quad}) = ${polyTex([v.p, v.p * two[1], v.p * two[2], 0])}$ and $${v.a}(${quad}) = ${polyTex([v.a, v.a * two[1], v.a * two[2]])}$`,
            'Multiply the quadratic by each term of the third bracket. That gives six terms.',
          ),
          step('A1', `$${polyTex(cubic(v))}$`, 'Add the two lines and collect the like terms.'),
        ],
      ];
    }
    const [, k, q, m] = cubic(v);
    return [
      [
        step('M1', '$(x + a)(x - a) = x^2 - a^2$, so the left side is $x^3 + kx^2 - a^2x - a^2k$', 'Expand the difference of two squares first, then multiply by the third bracket.'),
        step('M1', `$k = ${k}$`, 'Compare the coefficients of $x^2$.'),
        step('M1', `$a^2 = ${-q}$, so $a = ${v.a}$`, 'Compare the coefficients of $x$, and take the positive root.'),
        step('A1', `$m = -a^2k = -${-q} \\times ${k < 0 ? `(${k})` : k} = ${m}$`, 'Compare the constant terms.'),
      ],
    ];
  },

  check(v, answers) {
    const product = (x: number) => (v.p * x + v.a) * (x + v.b) * (x + v.c);
    if (v.level !== 'stretch') {
      // Read the cubic back from the answer and compare values.
      const t = answers[0].text.replace(/[$ ]/g, '');
      const coef = [0, 0, 0, 0];
      for (const m of t.matchAll(/([+-]?)(\d*)(x(?:\^(\d))?)?/g)) {
        if (!m[0]) continue;
        const pow = m[3] ? Number(m[4] ?? 1) : 0;
        coef[3 - pow] += (m[1] === '-' ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
      }
      return [-3, -1, 0, 2, 5].every((x) => at(coef, x) === product(x)) ? [] : ['expansion differs'];
    }
    const g = (n: string) => Number(new RegExp(`${n} = (-?\\d+)`).exec(answers[0].text)?.[1]);
    const [a, k, m] = [g('a'), g('k'), g('m')];
    const [, K, Qc] = cubic(v);
    return a > 0 && [-2, 1, 3, 4].every((x) => (x + a) * (x - a) * (x + k) === x ** 3 + K * x * x + Qc * x + m) ? [] : ['identity fails'];
  },

  key: (v) => `${v.p}|${v.a}|${v.b}|${v.c}`,
});
