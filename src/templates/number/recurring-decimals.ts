import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, frac, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 22 1H Q14 (prove algebraically that 0.4̇5̇ = 5/11), Set 23
 * 1H Q12 (write 0.27̇ as a fraction) and Set 24 1H Q15 (add two recurring
 * decimals). check() expands the answer by long division and compares digits.
 */
interface D {
  pre: string; // digits after the point that do not recur
  rep: string; // the recurring block
}
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: D;
  b: D; // stretch: the second decimal
}

const value = (d: D): Q => {
  const pre = d.pre.length;
  const whole = Number(d.pre + d.rep) - Number(d.pre || '0');
  return Q.of(whole, (10 ** d.rep.length - 1) * 10 ** pre);
};
/** KaTeX: 0.2\dot{7}, 0.\dot{4}\dot{5}, 0.\dot{1}2\dot{3} */
const tex = (d: D) => {
  const r = d.rep;
  const dots = r.length === 1 ? `\\dot{${r}}` : `\\dot{${r[0]}}${r.slice(1, -1)}\\dot{${r[r.length - 1]}}`;
  return `0.${d.pre}${dots}`;
};
const digits = (rng: { int(a: number, b: number): number }, n: number) => Array.from({ length: n }, () => rng.int(0, 9)).join('');
/** Avoid blocks that are really shorter (e.g. "44") or trivial (0 or 9 recurring). */
const okBlock = (r: string) => !/^(\d)\1+$/.test(r) && !/^0+$/.test(r) && !/^9+$/.test(r);
/** A block that starts with 0 (0.0̇3̇) reads oddly when it is the whole decimal. */
const noLeadingZero = (d: D) => d.pre !== '' || d.rep[0] !== '0';

export default defineTemplate<V>({
  id: 'num-recurring-decimals',
  title: 'Recurring decimals to fractions',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { foundational: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    if (level === 'foundational') {
      const a = { pre: '', rep: digits(rng, 2) };
      ensure(okBlock(a.rep) && noLeadingZero(a), 'a genuine two-digit block');
      return { level, a, b: a };
    }
    if (level === 'core') {
      const a = { pre: String(rng.int(1, 9)), rep: digits(rng, rng.pick([1, 2])) };
      ensure(okBlock(a.rep) && a.pre !== a.rep[a.rep.length - 1], 'the block really starts after the first digit');
      ensure(value(a).d <= 990n, 'simplest form');
      return { level, a, b: a };
    }
    const a = { pre: '', rep: digits(rng, 2) };
    const b = { pre: String(rng.int(1, 9)), rep: String(rng.int(1, 8)) };
    ensure(okBlock(a.rep) && noLeadingZero(a) && b.pre !== b.rep, 'genuine recurring decimals');
    const sum = value(a).add(value(b));
    ensure(sum.lt(1) && sum.d >= 10n, 'a sum less than 1 that does not simplify away');
    return { level, a, b };
  },

  validate(v) {
    return okBlock(v.a.rep) ? [] : ['recurring block'];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(3, text(`Prove algebraically that the recurring decimal $${tex(v.a)}$ can be written as ${frac(value(v.a))}`))] };
    if (v.level === 'core') return { stem: [], parts: [single(3, text(`Write $${tex(v.a)}$ as a fraction in its simplest form.`))] };
    return { stem: [], parts: [single(4, text(`Work out $${tex(v.a)} + ${tex(v.b)}$`), text('Give your answer as a fraction in its simplest form.'))] };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: frac(value(v.a).add(value(v.b))) }];
    return [{ text: frac(value(v.a)) }];
  },

  markScheme(v) {
    const steps = (d: D, code: 'M1' | 'P1') => {
      const n = d.rep.length;
      const big = 10 ** (d.pre.length + n);
      const small = 10 ** d.pre.length;
      const shown = (k: number) => {
        // k × x written out with the recurring part, e.g. 100x = 45.4545…
        const s = d.pre + d.rep.repeat(8);
        const shift = Math.log10(k);
        return `${Number(s.slice(0, shift) || '0')}.${s.slice(shift, shift + 4)}…`;
      };
      const diff = Number(d.pre + d.rep) - Number(d.pre || '0');
      return [
        step(code, `$x = ${shown(1)}$, $${big}x = ${shown(big)}$${small > 1 ? `, $${small}x = ${shown(small)}$` : ''}`, `Multiply by ${big} to move one whole block of the recurring part past the point${small > 1 ? `, and by ${small} to move just the part that doesn’t recur` : ''}.`),
        step(code, `$${big - small}x = ${diff}$`, 'Subtract: the recurring parts cancel exactly.'),
        { fr: Q.of(diff, big - small), raw: `\\frac{${diff}}{${big - small}}` },
      ] as const;
    };
    if (v.level !== 'stretch') {
      const [s1, s2, f] = steps(v.a, 'M1');
      const simplified = f.raw === fracTex(f.fr) ? '' : ` = ${fracTex(f.fr)}`;
      return [[s1, s2, step('A1', `$x = ${f.raw}${simplified}$`, v.level === 'foundational' ? (simplified ? 'Simplify to reach the fraction in the question.' : 'This is the fraction in the question.') : simplified ? 'Cancel down fully.' : 'It is already in its simplest form.')]];
    }
    const [a1, , fa] = steps(v.a, 'M1');
    const [b1, , fb] = steps(v.b, 'M1');
    const sum = fa.fr.add(fb.fr);
    return [
      [
        { ...a1, working: `${a1.working} → $${fa.raw} = ${fracTex(fa.fr)}$` },
        { ...b1, working: `${b1.working.replace(/x/g, 'y')} → $${fb.raw} = ${fracTex(fb.fr)}$` },
        step('M1', `$${fracTex(fa.fr)} + ${fracTex(fb.fr)}$ with a common denominator`, 'Convert each decimal to a fraction, then add.'),
        step('A1', frac(sum), 'Simplest form.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(answers[0].text);
    if (!m) return ['not a fraction'];
    const [n, d] = [Number(m[1]), Number(m[2])];
    // Long division: the first 40 digits after the point.
    const expand = (num: number, den: number) => {
      let r = num % den;
      let s = '';
      for (let i = 0; i < 40; i++) {
        r *= 10;
        s += Math.floor(r / den);
        r %= den;
      }
      return s;
    };
    const intended = (x: D) => (x.pre + x.rep.repeat(40)).slice(0, 40);
    if (v.level !== 'stretch') {
      if (expand(n, d) !== intended(v.a)) p.push('digits do not match');
    } else {
      // Add the two digit strings as 40-digit integers (with a few guard digits) and compare.
      const toBig = (s: string) => BigInt(s);
      const sum = toBig(intended(v.a)) + toBig(intended(v.b));
      const got = toBig(expand(n, d));
      if (sum - got > 2n || got - sum > 2n) p.push('sum does not match');
    }
    // Simplest form.
    let [x, y] = [n, d];
    while (y) [x, y] = [y, x % y];
    if (x !== 1) p.push('not simplest form');
    return p;
  },

  key: (v) => `${v.a.pre}|${v.a.rep}|${v.b.pre}|${v.b.rep}`,
});
