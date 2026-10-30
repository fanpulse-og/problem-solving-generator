import { defineTemplate } from '../../engine/types';
import { part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { ensure, int } from '../../engine/format';
import { gcdInt, lcmInt } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on the "greatest number of identical party bags" questions
 * (Set 22 1F), June 2022 1F Q21 (two lengths of ribbon cut into equal pieces
 * with none left over) and Set 24 1H Q4 (A = 2³ × 3 × 5², B = 2 × 3² × 5:
 * the HCF and LCM in index form). check() searches divisors directly.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  nums: number[]; // foundational: item counts; core: lengths (cm)
  // stretch: exponents of 2, 3, 5 (and 7) in A and B
  ea: number[];
  eb: number[];
}

const BAGS = [
  { items: ['pencils', 'rubbers'], pack: 'pencil cases', who: 'a teacher' },
  { items: ['sweets', 'stickers'], pack: 'party bags', who: 'a parent' },
  { items: ['apples', 'bananas'], pack: 'fruit boxes', who: 'a shop' },
  { items: ['red roses', 'white roses'], pack: 'bunches', who: 'a florist' },
];
const LENGTHS = [
  { what: 'ribbon', pieces: 'pieces of ribbon' },
  { what: 'wood', pieces: 'pieces of wood' },
  { what: 'rope', pieces: 'pieces of rope' },
];
const PRIMES = [2, 3, 5, 7];

const hcfAll = (xs: number[]) => xs.reduce((a, b) => gcdInt(a, b));
const valueOf = (e: number[]) => e.reduce((s, k, i) => s * PRIMES[i] ** k, 1);
const powTex = (e: number[]) =>
  e
    .map((k, i) => (k === 0 ? '' : k === 1 ? `${PRIMES[i]}` : `${PRIMES[i]}^{${k}}`))
    .filter(Boolean)
    .join(' \\times ');

export default defineTemplate<V>({
  id: 'num-hcf-problems',
  title: 'Highest common factor in context',
  strand: 'Number',
  subtopic: 'Factors, multiples & primes',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, ctx: 0, nums: [], ea: [], eb: [] };
    if (level === 'stretch') {
      const n = tier === 'H' ? 4 : 3;
      const ea = PRIMES.slice(0, n).map((_, i) => rng.int(0, i === 0 ? 4 : 2));
      const eb = PRIMES.slice(0, n).map((_, i) => rng.int(0, i === 0 ? 4 : 2));
      ensure(ea.some((k, i) => k !== eb[i]), 'different numbers');
      ensure(ea.some((k, i) => k > 0 && eb[i] > 0), 'a common factor');
      ensure(ea.some((k, i) => k > eb[i]) && eb.some((k, i) => k > ea[i]), 'neither is a factor of the other');
      ensure(valueOf(ea) <= 5000 && valueOf(eb) <= 5000, 'numbers of a sensible size');
      return { ...base, ea, eb };
    }
    const g = rng.int(level === 'core' ? 6 : 3, tier === 'KS3' ? 12 : level === 'core' ? 30 : 15);
    const [m1, m2] = [rng.int(2, 9), rng.int(2, 9)];
    ensure(m1 < m2 && gcdInt(m1, m2) === 1, 'the HCF is exactly g');
    if (level === 'foundational') return { ...base, ctx: rng.int(0, BAGS.length - 1), nums: [g * m1, g * m2] };
    // Core: three lengths, all multiples of the HCF.
    const m3 = rng.int(2, 11);
    ensure(m3 !== m1 && m3 !== m2 && gcdInt(gcdInt(m1, m2), m3) === 1, 'still the HCF');
    ensure(g * m3 <= 300 && g * m2 <= 300, 'lengths in centimetres');
    return { ...base, ctx: rng.int(0, LENGTHS.length - 1), nums: [g * m1, g * m2, g * m3].sort((a, b) => a - b) };
  },

  validate(v) {
    return v.level !== 'stretch' && hcfAll(v.nums) < 2 ? ['common factor needed'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const c = BAGS[v.ctx];
      const [a, b] = v.nums;
      return {
        stem: [text(`${v.name} has ${a} ${c.items[0]} and ${b} ${c.items[1]}.`), text(`${v.name} wants to put all of them into ${c.pack}.`), text(`Each of the ${c.pack} must have the same number of ${c.items[0]} and the same number of ${c.items[1]}.`)],
        parts: [single(3, text(`What is the greatest number of ${c.pack} ${v.name} can make?`))],
      };
    }
    if (v.level === 'core') {
      const c = LENGTHS[v.ctx];
      return {
        stem: [text(`${v.name} has three lengths of ${c.what}: ${v.nums.map((n) => `${n} cm`).join(', ').replace(/, ([^,]*)$/, ' and $1')}.`), text(`${v.name} cuts all three into ${c.pieces} that are all the same length, with none left over.`), text(`Each piece must be as long as possible.`)],
        parts: [single(4, text(`How many ${c.pieces} does ${v.name} cut altogether?`))],
      };
    }
    return {
      stem: [text(`$A = ${powTex(v.ea)}$`), text(`$B = ${powTex(v.eb)}$`)],
      parts: [part('a', 2, text('Find the highest common factor (HCF) of $A$ and $B$'), text('Give your answer as a product of powers of prime factors.')), part('b', 2, text('Find the lowest common multiple (LCM) of $A$ and $B$'), text('Give your answer as a product of powers of prime factors.'))],
    };
  },

  answer(v) {
    if (v.level === 'stretch') {
      return [{ text: `$${powTex(v.ea.map((k, i) => Math.min(k, v.eb[i])))}$` }, { text: `$${powTex(v.ea.map((k, i) => Math.max(k, v.eb[i])))}$` }];
    }
    const g = hcfAll(v.nums);
    if (v.level === 'foundational') return [{ text: `${g}` }];
    return [{ text: `${v.nums.reduce((s, n) => s + n / g, 0)}` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const lo = v.ea.map((k, i) => Math.min(k, v.eb[i]));
      const hi = v.ea.map((k, i) => Math.max(k, v.eb[i]));
      return [
        [step('M1', `Common primes: ${PRIMES.filter((_, i) => lo[i] > 0).join(', ')}`, 'The HCF uses only the primes that are in BOTH numbers.'), step('A1', `$${powTex(lo)}$`, 'Take the LOWER power of each shared prime.')],
        [step('M1', `Every prime: ${PRIMES.filter((_, i) => hi[i] > 0).join(', ')}`, 'The LCM uses every prime in EITHER number.'), step('A1', `$${powTex(hi)}$`, `Take the HIGHER power of each prime. (Check: HCF × LCM = A × B = ${int(valueOf(v.ea) * valueOf(v.eb))}.)`)],
      ];
    }
    const g = hcfAll(v.nums);
    const factors = (n: number) => Array.from({ length: n }, (_, i) => i + 1).filter((d) => n % d === 0);
    if (v.level === 'foundational') {
      const c = BAGS[v.ctx];
      const [a, b] = v.nums;
      return [
        [
          step('M1', `${a}: ${factors(a).join(', ')};  ${b}: ${factors(b).join(', ')}`, 'List the factors of each number (or write each as a product of primes).'),
          step('M1', `Common factors: ${factors(g).filter((d) => b % d === 0).join(', ')}`, `The number of ${c.pack} must divide both numbers exactly.`),
          step('A1', `${g} ${c.pack}`, `Check: ${a} ${DIV} ${g} = ${a / g} ${c.items[0]} and ${b} ${DIV} ${g} = ${b / g} ${c.items[1]} in each.`),
        ],
      ];
    }
    const c = LENGTHS[v.ctx];
    return [
      [
        step('M1', v.nums.map((n) => `${n} = ${g} ${TIMES} ${n / g}`).join(',  '), 'Find a common factor of all three lengths…'),
        step('M1', `HCF = ${g} cm`, '…the highest one, so each piece is as long as possible.'),
        step('M1', v.nums.map((n) => `${n} ${DIV} ${g} = ${n / g}`).join(',  '), 'How many pieces from each length.'),
        step('A1', `${v.nums.map((n) => n / g).join(' + ')} = ${v.nums.reduce((s, n) => s + n / g, 0)} ${c.pieces}`, 'The question asks for the number of pieces, not their length.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Recompute from the numbers themselves: HCF by search, LCM = A × B ÷ HCF.
      const A = valueOf(v.ea);
      const B = valueOf(v.eb);
      let h = Math.min(A, B);
      while (A % h || B % h) h--;
      const read = (t: string) =>
        t
          .replace(/\$/g, '')
          .split('\\times')
          .reduce((s, f) => {
            const [b, e] = f.trim().replace(/[{}]/g, '').split('^');
            return s * Number(b) ** Number(e ?? 1);
          }, 1);
      if (read(answers[0].text) !== h) p.push('HCF');
      if (read(answers[1].text) !== lcmInt(A, B) || (A * B) / h !== lcmInt(A, B)) p.push('LCM');
      return p;
    }
    let best = 0;
    for (let d = 1; d <= v.nums[0]; d++) if (v.nums.every((n) => n % d === 0)) best = d;
    const want = v.level === 'foundational' ? best : v.nums.reduce((s, n) => s + n / best, 0);
    if (answers[0].text !== `${want}`) p.push('answer');
    return p;
  },

  key: (v) => `${v.nums}|${v.ea}|${v.eb}`,
});
