import { defineTemplate } from '../../engine/types';
import { cards, lines, part, single, step, text, MINUS, TIMES, DIV } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 22 2F Q13 / 2H Q1 (five cards, the mean is 12, find x).
 * Stretch puts algebraic expressions on the cards, so an equation must be
 * formed and solved.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  known: number[]; // numbers on the other cards
  x: number;
  mean: Q;
  // stretch: cards are x, x + a, k x, then the known numbers
  a: number;
  k: number;
}

const count = (v: V) => v.known.length + (v.level === 'stretch' ? 3 : 1);
const total = (v: V) => v.mean.mul(count(v));

export default defineTemplate<V>({
  id: 'stats-mean-missing',
  title: 'Missing value from a mean',
  strand: 'Statistics',
  subtopic: 'Averages & range',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'averages',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const max = tier === 'KS3' ? 20 : 40;
    if (level === 'stretch') {
      const a = rng.int(1, 9);
      const k = rng.int(2, 3);
      const x = rng.int(2, 15);
      const known = [rng.int(1, max), rng.int(1, max)];
      const sum = x + (x + a) + k * x + known[0] + known[1];
      ensure(sum % 5 === 0, 'whole-number mean');
      const vals = [x, x + a, k * x, ...known];
      ensure(new Set(vals).size === 5, 'different numbers on the cards');
      return { level, known, x, mean: Q.of(sum, 5), a, k };
    }
    const n = level === 'foundational' || tier === 'KS3' ? 5 : rng.pick([5, 6, 7]);
    const known = Array.from({ length: n - 1 }, () => rng.int(1, max));
    const x = rng.int(1, max);
    const sum = known.reduce((s, y) => s + y, 0) + x;
    const mean = Q.of(sum, n);
    if (calc === 'non-calc' || tier === 'KS3') ensure(mean.isInt(), 'whole-number mean');
    else ensure(mean.terminatesWithin(1), 'mean to at most 1 d.p.');
    ensure(!known.includes(x), 'x should be a new number');
    return { level, known, x, mean, a: 0, k: 0 };
  },

  validate(v) {
    const p: string[] = [];
    if (v.x <= 0) p.push('x must be positive');
    const shown = v.level === 'stretch' ? v.x + (v.x + v.a) + v.k * v.x : v.x;
    if (!total(v).eq(v.known.reduce((s, y) => s + y, 0) + shown)) p.push('mean does not match');
    return p;
  },

  render(v) {
    const n = count(v);
    const word = ['', '', 'two', 'three', 'four', 'five', 'six', 'seven'][n];
    const faces = v.level === 'stretch' ? [`$x$`, `$x + ${v.a}$`, `$${v.k}x$`, ...v.known.map(int)] : [...v.known.map(int), '$x$'];
    const order = v.level === 'stretch' ? [0, 3, 1, 4, 2].map((i) => faces[i]) : faces;
    const stem = [...lines(`Here are ${word} cards.`, 'Each card has a number written on it.'), cards(order), text(`The mean of the ${word} numbers is ${dec(v.mean)}`)];
    if (v.level === 'foundational') {
      return { stem, parts: [part('a', 1, text(`Work out the total of the ${word} numbers.`)), part('b', 2, text('Work out the value of $x$'))] };
    }
    return { stem, parts: [single(v.level === 'stretch' ? 4 : 3, text('Work out the value of $x$'))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: dec(total(v)) }, { text: `$x$ = ${v.x}` }];
    return [{ text: `$x$ = ${v.x}` }];
  },

  markScheme(v) {
    const n = count(v);
    const T = dec(total(v));
    const knownSum = v.known.reduce((s, y) => s + y, 0);
    const totalStep = (code: 'B1' | 'P1') => step(code, `${n} ${TIMES} ${dec(v.mean)} = ${T}`, 'Mean × how many numbers = the total of the numbers.');
    if (v.level === 'stretch') {
      const xs = 2 + v.k;
      return [
        [
          totalStep('P1'),
          step('P1', `$x + x + ${v.a} + ${v.k}x + ${v.known.join(' + ')} = ${T}$`, 'Add up everything on the cards and set it equal to the total.'),
          step('P1', `$${xs}x + ${v.a + knownSum} = ${T}$, so $${xs}x = ${total(v).toInt() - v.a - knownSum}$`, 'Collect the $x$ terms and the numbers, then subtract.'),
          step('A1', `$x$ = ${total(v).toInt() - v.a - knownSum} ${DIV} ${xs} = ${v.x}`, `Check: the cards add up to ${T}.`),
        ],
      ];
    }
    const sub = step(v.level === 'core' ? 'P1' : 'M1', `${T} ${MINUS} (${v.known.map(int).join(' + ')}) = ${T} ${MINUS} ${knownSum}`, 'Take away the numbers you already know.');
    const fin = step('A1', `$x$ = ${v.x}`, `Check: the ${n} numbers add up to ${T}.`);
    if (v.level === 'foundational') return [[totalStep('B1')], [sub, fin]];
    return [[totalStep('P1'), sub, fin]];
  },

  check(v, answers) {
    const p: string[] = [];
    // Brute force x: the only positive integer that gives this mean.
    const sols: number[] = [];
    for (let x = 1; x <= 200; x++) {
      const vals = v.level === 'stretch' ? [x, x + v.a, v.k * x, ...v.known] : [...v.known, x];
      if (Q.of(vals.reduce((s, y) => s + y, 0), vals.length).eq(v.mean)) sols.push(x);
    }
    if (sols.length !== 1) p.push(`${sols.length} solutions`);
    if (answers[answers.length - 1].text !== `$x$ = ${sols[0]}`) p.push('x');
    return p;
  },

  key: (v) => `${v.known.join(',')}|${v.x}|${v.a}|${v.k}`,
});
