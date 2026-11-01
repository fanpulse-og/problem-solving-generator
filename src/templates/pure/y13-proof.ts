import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure } from '../../engine/format';

/**
 * Modelled on 9MA0 proof by contradiction: a² − b² cannot equal 4n + 2, √p is
 * irrational for a prime p, and log_a b is irrational for different primes.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  k: number;
  p: number;
  q: number;
}

export default defineTemplate<V>({
  id: 'y13-proof',
  title: 'Proof by contradiction',
  strand: 'Pure',
  subtopic: 'Proof',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'foundational') return { level, k: 4 * rng.int(1, 30) + 2, p: 0, q: 0 };
    if (level === 'core') return { level, k: 0, p: rng.pick([2, 3, 5, 7, 11, 13]), q: 0 };
    const [p, q] = rng.sample([2, 3, 5, 7, 11], 2);
    ensure(p !== q, 'two different primes');
    return { level, k: 0, p, q };
  },

  validate(v) {
    return v.level === 'foundational' && v.k % 4 !== 2 ? ['k must leave remainder 2 on division by 4'] : [];
  },

  render(v) {
    if (v.level === 'foundational') return { stem: [], parts: [single(4, text(`Use proof by contradiction to prove that there are no integers $a$ and $b$ such that  $a^2 - b^2 = ${v.k}$`))] };
    if (v.level === 'core') return { stem: [], parts: [single(5, text(`Use proof by contradiction to prove that  $\\sqrt{${v.p}}$  is irrational.`))] };
    return { stem: [], parts: [single(4, text(`Use proof by contradiction to prove that  $\\log_{${v.p}} ${v.q}$  is irrational.`))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `Proof: $(a - b)$ and $(a + b)$ are both even or both odd, which is impossible for ${v.k}.` }];
    if (v.level === 'core') return [{ text: `Proof: $a$ and $b$ would share the factor ${v.p}, a contradiction.` }];
    return [{ text: `Proof: $${v.p}^a = ${v.q}^b$ is impossible for positive integers.` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [
          step('B1', `Assume there are integers $a$ and $b$ with $a^2 - b^2 = ${v.k}$`, 'A proof by contradiction starts by assuming the opposite.'),
          step('M1', `$(a - b)(a + b) = ${v.k}$`, 'Difference of two squares.'),
          step('M1', '$(a + b) - (a - b) = 2b$, which is even, so the two brackets are both even or both odd.', 'Compare the brackets.'),
          step('A1', `Both odd gives an odd product; both even gives a multiple of 4. But ${v.k} is even and not a multiple of 4: a contradiction.`, 'Deal with both cases, then state the contradiction.'),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('B1', `Assume  $\\sqrt{${v.p}} = \\frac{a}{b}$,  where $a$ and $b$ are integers with no common factors.`, 'The "no common factors" part is essential: the contradiction relies on it.'),
          step('M1', `$a^2 = ${v.p}b^2$`, 'Square and rearrange.'),
          step('A1', `So $a^2$ is a multiple of ${v.p}, and since ${v.p} is prime, $a$ is too: $a = ${v.p}c$`, 'A prime that divides a square must divide the number.'),
          step('M1', `$${v.p * v.p}c^2 = ${v.p}b^2$, so $b^2 = ${v.p}c^2$`, 'Substitute, then divide.'),
          step('A1', `So $b$ is also a multiple of ${v.p}: $a$ and $b$ share a factor, a contradiction. Hence $\\sqrt{${v.p}}$ is irrational.`, 'State the contradiction and the conclusion.'),
        ],
      ];
    }
    return [
      [
        step('B1', `Assume  $\\log_{${v.p}} ${v.q} = \\frac{a}{b}$,  where $a$ and $b$ are positive integers.`, `The log is positive because ${v.q} > 1.`),
        step('M1', `$${v.p}^{\\frac{a}{b}} = ${v.q}$`, 'Write it in index form.'),
        step('M1', `$${v.p}^a = ${v.q}^b$`, 'Raise both sides to the power b.'),
        step('A1', `The left side is a power of ${v.p} and the right side a power of ${v.q}. Different primes cannot give the same number (unique factorisation): a contradiction.`, 'Name the reason: prime factorisation is unique.'),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      // Search all small a, b: no solutions exist.
      for (let a = 0; a <= v.k + 2; a++) for (let b = 0; b <= a; b++) if (a * a - b * b === v.k) return [`${a}, ${b}`];
      return [];
    }
    if (v.level === 'core') {
      const r = Math.sqrt(v.p);
      for (let b = 1; b <= 2000; b++) if (Math.round(r * b) ** 2 === v.p * b * b) return [`${b}`];
      return [];
    }
    const big = (x: number, n: number) => BigInt(x) ** BigInt(n);
    for (let a = 1; a <= 40; a++) for (let b = 1; b <= 40; b++) if (big(v.p, a) === big(v.q, b)) return [`${a}, ${b}`];
    return [];
  },

  key: (v) => `${v.k}|${v.p}|${v.q}`,
});
