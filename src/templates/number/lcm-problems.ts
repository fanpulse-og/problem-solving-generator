import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { clock, ensure, money } from '../../engine/format';
import { gcdInt, lcmInt } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1F Q22 (buses leave every 12 and 20 minutes from 08 00:
 * when do they next leave together?) and the familiar "packs of buns and
 * packs of burgers" LCM question. Every pair shares a factor and neither
 * divides the other, so multiplying the two numbers gives the wrong answer.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number; // context index for the level
  sizes: number[]; // pack sizes / intervals
  pricesP: number[]; // stretch: price of one pack of each, in pence
  start: number; // foundational buses: minutes after midnight
}

const TIMED = [
  { kind: 'clock', lines: (a: number, b: number, t: string) => [`Bus A leaves the bus station every ${a} minutes.`, `Bus B leaves the bus station every ${b} minutes.`, `Both buses leave the bus station at ${t}`], ask: 'At what time will both buses next leave the bus station at the same time?' },
  { kind: 'seconds', lines: (a: number, b: number) => [`Two lights flash on a sign.`, `The red light flashes every ${a} seconds.`, `The blue light flashes every ${b} seconds.`, `The two lights flash at the same time.`], ask: 'After how many seconds will the two lights next flash at the same time?' },
] as const;

const PAIRS = [
  ['cups', 'plates'],
  ['bread rolls', 'burgers'],
  ['hot dog buns', 'sausages'],
  ['candles', 'candle holders'],
  ['paper bags', 'party hats'],
] as const;

const TRIPLES = [
  { items: ['cups', 'plates', 'napkins'] as const, event: 'a party' },
  { items: ['pencils', 'rulers', 'rubbers'] as const, event: 'a maths club' },
  { items: ['bread rolls', 'burgers', 'cheese slices'] as const, event: 'a barbecue' },
] as const;

const lcmAll = (xs: number[]) => xs.reduce((a, b) => lcmInt(a, b), 1);
const sharesFactor = (a: number, b: number) => gcdInt(a, b) > 1 && a % b !== 0 && b % a !== 0;

export default defineTemplate<V>({
  id: 'num-lcm-problems',
  title: 'Lowest common multiple in context',
  strand: 'Number',
  subtopic: 'Factors, multiples & primes',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, tier, level }) {
    const [name] = names(rng, 1);
    const hi = tier === 'KS3' ? 15 : 24;
    if (level === 'stretch') {
      const sizes = rng.sample([4, 5, 6, 8, 9, 10, 12, 15, 16, 18, 20, 24].filter((s) => s <= hi), 3);
      ensure(sizes.every((a, i) => sizes.every((b, j) => i === j || (a % b !== 0 && b % a !== 0))), 'no size divides another');
      ensure(gcdInt(sizes[0], sizes[1]) > 1 || gcdInt(sizes[1], sizes[2]) > 1, 'sizes share factors');
      const L = lcmAll(sizes);
      ensure(L <= 144 && L < sizes[0] * sizes[1] * sizes[2], 'sensible number of each item');
      const pricesP = sizes.map(() => rng.step(80, 450, 5));
      return { level, name, ctx: rng.int(0, TRIPLES.length - 1), sizes, pricesP, start: 0 };
    }
    const a = rng.int(4, hi);
    const b = rng.int(4, hi);
    ensure(a < b && sharesFactor(a, b), 'pair shares a factor');
    const L = lcmInt(a, b);
    ensure(L <= (level === 'foundational' ? 120 : 180), 'not too far ahead');
    if (level === 'foundational') {
      const ctx = rng.int(0, TIMED.length - 1);
      return { level, name, ctx, sizes: [a, b], pricesP: [], start: rng.step(6 * 60, 10 * 60, 5) };
    }
    return { level, name, ctx: rng.int(0, PAIRS.length - 1), sizes: [a, b], pricesP: [], start: 0 };
  },

  validate(v) {
    return v.sizes.every((s) => s >= 2) ? [] : ['sizes'];
  },

  render(v) {
    const [a, b] = v.sizes;
    if (v.level === 'foundational') {
      const c = TIMED[v.ctx];
      return { stem: lines(...c.lines(a, b, clock(v.start))), parts: [single(3, text(c.ask))] };
    }
    if (v.level === 'core') {
      const [p, q] = PAIRS[v.ctx];
      return {
        stem: lines(`${cap(p)} are sold in packs of ${a}`, `${cap(q)} are sold in packs of ${b}`, `${v.name} wants to buy exactly the same number of ${p} and ${q}.`),
        parts: [single(3, text(`What is the smallest number of packs of ${p} and the smallest number of packs of ${q} that ${v.name} can buy?`))],
      };
    }
    const t = TRIPLES[v.ctx];
    return {
      stem: [
        text(`${v.name} is buying ${t.items[0]}, ${t.items[1]} and ${t.items[2]} for ${t.event}.`),
        ...t.items.map((it, i) => text(`${cap(it)} are sold in packs of ${v.sizes[i]}. Each pack costs ${money(v.pricesP[i])}`)),
        text(`${v.name} wants to buy exactly the same number of ${t.items[0]}, ${t.items[1]} and ${t.items[2]}.`),
      ],
      parts: [single(4, text(`Work out the least amount of money ${v.name} can spend.`))],
    };
  },

  answer(v) {
    const L = lcmAll(v.sizes);
    if (v.level === 'foundational') return [{ text: TIMED[v.ctx].kind === 'clock' ? clock(v.start + L) : `${L} seconds` }];
    if (v.level === 'core') {
      const [p, q] = PAIRS[v.ctx];
      return [{ text: `${L / v.sizes[0]} packs of ${p} and ${L / v.sizes[1]} packs of ${q}` }];
    }
    return [{ text: money(v.sizes.reduce((s, n, i) => s + (L / n) * v.pricesP[i], 0)) }];
  },

  markScheme(v) {
    const L = lcmAll(v.sizes);
    const list = (n: number) => Array.from({ length: L / n }, (_, i) => (i + 1) * n).join(', ');
    const lists = v.sizes.map((n) => `${n}: ${list(n)}`).join(';  ');
    const lcmStep = step('M1', lists, 'List the multiples of each number until you find one in every list.');
    if (v.level === 'foundational') {
      const isClock = TIMED[v.ctx].kind === 'clock';
      return [
        [
          lcmStep,
          step('A1', `LCM = ${L}`, isClock ? `They next leave together ${L} minutes later.` : 'The lowest common multiple is the first time they match again.'),
          isClock ? step('B1', `${clock(v.start)} + ${L} minutes = ${clock(v.start + L)}`, 'Add the time on to the start time.') : step('B1', `${L} seconds`, `Not ${v.sizes[0]} × ${v.sizes[1]} = ${v.sizes[0] * v.sizes[1]}: that is a common multiple but not the lowest.`),
        ],
      ];
    }
    if (v.level === 'core') {
      const [p, q] = PAIRS[v.ctx];
      return [
        [
          lcmStep,
          step('A1', `LCM = ${L}, so ${L} of each`, `${L} is the smallest number in both lists.`),
          step('A1', `${L} ${DIV} ${v.sizes[0]} = ${L / v.sizes[0]} packs of ${p}, ${L} ${DIV} ${v.sizes[1]} = ${L / v.sizes[1]} packs of ${q}`, 'The question asks for the number of packs, not the number of items.'),
        ],
      ];
    }
    const t = TRIPLES[v.ctx];
    const packs = v.sizes.map((n) => L / n);
    const total = packs.reduce((s, k, i) => s + k * v.pricesP[i], 0);
    return [
      [
        step('P1', v.sizes.map((n) => `${n} = ${primeForm(n)}`).join(',  '), 'Write each pack size as a product of primes (or list multiples).'),
        step('P1', `LCM = ${primeForm(L)} = ${L}`, 'Take the highest power of each prime: this is the smallest number in every list.'),
        step('P1', packs.map((k, i) => `${L} ${DIV} ${v.sizes[i]} = ${k} packs of ${t.items[i]}`).join(', '), 'Work out how many packs of each.'),
        step('A1', `${packs.map((k, i) => `${k} ${TIMES} ${money(v.pricesP[i])}`).join(' + ')} = ${money(total)}`, 'Multiply by the price of a pack and add.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Search upwards for the first number every size divides into.
    let n = 1;
    while (!v.sizes.every((s) => n % s === 0)) n++;
    if (v.level === 'foundational') {
      const want = TIMED[v.ctx].kind === 'clock' ? clock(v.start + n) : `${n} seconds`;
      if (answers[0].text !== want) p.push('first common time');
    } else if (v.level === 'core') {
      const nums = answers[0].text.match(/\d+/g)!.map(Number);
      if (nums[0] * v.sizes[0] !== n || nums[1] * v.sizes[1] !== n) p.push('packs');
    } else {
      let pence = 0;
      v.sizes.forEach((s, i) => {
        for (let k = 0; k < n; k += s) pence += v.pricesP[i];
      });
      if (answers[0].text !== money(pence)) p.push('cost');
    }
    return p;
  },

  key: (v) => `${v.sizes}|${v.pricesP}|${v.start}|${v.ctx}`,
});

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

/** 72 → "2³ × 3²" */
function primeForm(n: number): string {
  const out: string[] = [];
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  for (let p = 2; n > 1; p++) {
    let k = 0;
    while (n % p === 0) {
      n /= p;
      k++;
    }
    if (k) out.push(k === 1 ? `${p}` : `${p}${String(k).split('').map((d) => sup[+d]).join('')}`);
  }
  return out.join(' × ');
}

