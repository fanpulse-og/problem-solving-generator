import { defineTemplate } from '../../engine/types';
import { single, step, text, MINUS } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';

/**
 * Modelled on Set 22 1H Q14 (nth term of 4, 9, 18, 31, 48), June 2022 1H Q20
 * (is 150 a term of n² + 3n − 4? show how you decide) and Set 24 1H Q17 (the
 * nth term is an² + bn; the 2nd term is 14 and the 5th term is 65: find a and
 * b). check() builds the sequence term by term.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  N: number; // core: the number tested
}

const term = (v: V, n: number) => v.a * n * n + v.b * n + v.c;
const seq = (v: V, k = 5) => Array.from({ length: k }, (_, i) => term(v, i + 1));
const nth = (v: V) => `$${polyTex([v.a, v.b, v.c], 'n')}$`;
const fmt = (n: number) => (n < 0 ? `−${-n}` : `${n}`);

export default defineTemplate<V>({
  id: 'alg-quadratic-sequences',
  title: 'Quadratic sequences',
  strand: 'Algebra',
  subtopic: 'Sequences & iteration',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide', stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    if (level === 'foundational') {
      const v: V = { level, a: rng.int(1, 3), b: rng.int(-6, 6), c: rng.int(-8, 8), N: 0 };
      ensure(v.b !== 0 || v.c !== 0, 'not just an²');
      ensure(seq(v).every((t, i, xs) => i === 0 || t > xs[i - 1]), 'an increasing sequence');
      return v;
    }
    if (level === 'core') {
      const v: V = { level, a: 1, b: rng.int(-4, 6), c: rng.int(-9, 9), N: 0 };
      const k = rng.int(8, 15);
      // Half the time N is a term; otherwise it sits between two terms.
      v.N = rng.chance(0.5) ? term(v, k) : term(v, k) + rng.int(1, term(v, k + 1) - term(v, k) - 1);
      ensure(seq(v).every((t, i, xs) => i === 0 || t > xs[i - 1]), 'an increasing sequence');
      return v;
    }
    const v: V = { level, a: rng.int(1, 4), b: rng.int(-5, 9), c: 0, N: 0 };
    ensure(v.b !== 0 && term(v, 2) > 0, 'positive terms');
    return v;
  },

  validate(v) {
    return v.a > 0 ? [] : ['a quadratic sequence'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return { stem: [text(`Here are the first five terms of a quadratic sequence.`), text(`$${seq(v).join(',\\ ')}$`)], parts: [single(3, text('Find an expression, in terms of $n$, for the $n$th term of this sequence.'))] };
    }
    if (v.level === 'core') {
      return { stem: [text(`The $n$th term of a sequence is ${nth(v)}`)], parts: [single(3, text(`Is ${v.N} a term of this sequence?`), text('You must show how you get your answer.'))] };
    }
    return {
      stem: [text('The $n$th term of a sequence is $an^2 + bn$, where $a$ and $b$ are integers.'), text(`The 2nd term of the sequence is ${term(v, 2)}`), text(`The 5th term of the sequence is ${term(v, 5)}`)],
      parts: [single(4, text('Find the value of $a$ and the value of $b$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: nth(v) }];
    if (v.level === 'core') {
      const k = Array.from({ length: 40 }, (_, i) => i + 1).find((n) => term(v, n) >= v.N)!;
      return [{ text: term(v, k) === v.N ? `Yes: it is the ${k}th term` : `No: the ${k - 1}th term is ${term(v, k - 1)} and the ${k}th term is ${term(v, k)}` }];
    }
    return [{ text: `$a = ${v.a}$, $b = ${v.b}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const s = seq(v);
      const d1 = s.slice(1).map((t, i) => t - s[i]);
      const rest = s.map((t, i) => t - v.a * (i + 1) ** 2);
      return [
        [
          step('M1', `First differences ${d1.join(', ')}; second difference ${d1[1] - d1[0]}`, `Half the second difference is the number of n²: ${d1[1] - d1[0]} ÷ 2 = ${v.a}.`),
          step('M1', `Sequence ${MINUS} ${v.a === 1 ? '' : v.a}n²: ${rest.map(fmt).join(', ')}`, 'Take away the n² part. What is left is a linear sequence.'),
          step('A1', nth(v), `The linear part is $${polyTex([v.b, v.c], 'n')}$. Check: n = 1 gives ${s[0]}.`),
        ],
      ];
    }
    if (v.level === 'core') {
      const k = Array.from({ length: 40 }, (_, i) => i + 1).find((n) => term(v, n) >= v.N)!;
      return [
        [
          step('M1', `$${polyTex([v.a, v.b, v.c], 'n')} = ${v.N}$`, 'Set the nth term equal to the number, or try values of n.'),
          step('M1', `n = ${k - 1}: ${term(v, k - 1)};  n = ${k}: ${term(v, k)}`, 'Find the terms either side.'),
          step('C1', term(v, k) === v.N ? `Yes, the ${k}th term` : `No: ${v.N} is between two terms`, 'n must be a whole number for it to be a term.'),
        ],
      ];
    }
    const [T2, T5] = [term(v, 2), term(v, 5)];
    return [
      [
        step('M1', `$4a + 2b = ${T2}$`, 'Substitute n = 2 into an² + bn.'),
        step('M1', `$25a + 5b = ${T5}$`, 'Substitute n = 5.'),
        step('M1', `$20a + 10b = ${5 * T2}$ and $50a + 10b = ${2 * T5}$, so $30a = ${2 * T5 - 5 * T2}$`, 'Make the b terms match, then subtract to eliminate b.'),
        step('A1', `$a = ${v.a}$, $b = ${v.b}$`, `Substitute a = ${v.a} back: 2b = ${T2} − ${4 * v.a}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // The answer's coefficients must reproduce the five given terms.
      const t = answers[0].text.replace(/\$/g, '');
      const coeff = (re: RegExp) => {
        const m = t.match(re);
        return m ? Number((m[1] + (m[2] || '1')).replace(/\s/g, '')) : 0;
      };
      const A = coeff(/^(-?)(\d*)n\^2/);
      const B = coeff(/([+-]?)\s*(\d*)n(?!\^)/);
      const C = Number((t.match(/([+-])\s*(\d+)$/)?.slice(1).join('') ?? '0').replace(/\s/g, '')) || (/n/.test(t) ? 0 : Number(t));
      if (!seq(v).every((x, i) => A * (i + 1) ** 2 + B * (i + 1) + C === x)) p.push('nth term');
    } else if (v.level === 'core') {
      const isTerm = Array.from({ length: 60 }, (_, i) => i + 1).some((n) => n * n + v.b * n + v.c === v.N);
      if (isTerm !== answers[0].text.startsWith('Yes')) p.push('decision');
    } else {
      // Search small integers for a and b that fit both given terms.
      const fits: string[] = [];
      for (let a = -10; a <= 10; a++) for (let b = -20; b <= 20; b++) if (4 * a + 2 * b === term(v, 2) && 25 * a + 5 * b === term(v, 5)) fits.push(`$a = ${a}$, $b = ${b}$`);
      if (fits.length !== 1 || fits[0] !== answers[0].text) p.push('a and b');
    }
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.N}`,
});
