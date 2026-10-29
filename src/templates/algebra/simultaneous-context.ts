import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, money } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Simultaneous equations from a context (forming as well as solving, as in the
 * papers' AO3 questions). Foundational: equations that subtract directly;
 * core: equations that need scaling; stretch: form both equations from a total
 * number of tickets and a total amount of money.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  items: (typeof ITEMS)[number];
  x: number; // price of item 1 (pence)
  y: number; // price of item 2 (pence)
  e1: [number, number];
  e2: [number, number];
  // stretch
  n1: number;
  n2: number;
}

// Realistic price ranges in pence for each item.
const ITEMS = [
  { one: 'coffee', ones: 'coffees', two: 'cake', twos: 'cakes', place: 'a café', p1: [180, 420], p2: [120, 380] },
  { one: 'adult ticket', ones: 'adult tickets', two: 'child ticket', twos: 'child tickets', place: 'a theme park', p1: [2000, 4500], p2: [1200, 3000] },
  { one: 'notebook', ones: 'notebooks', two: 'pen', twos: 'pens', place: 'a stationery shop', p1: [150, 600], p2: [40, 250] },
  { one: 'large bag of popcorn', ones: 'large bags of popcorn', two: 'drink', twos: 'drinks', place: 'a cinema', p1: [400, 750], p2: [150, 400] },
] as const;

const total = (v: V, [a, b]: [number, number]) => a * v.x + b * v.y;
const buy = (v: V, [a, b]: [number, number]) => `${a} ${a === 1 ? v.items.one : v.items.ones} and ${b} ${b === 1 ? v.items.two : v.items.twos}`;

export default defineTemplate<V>({
  id: 'alg-simultaneous-context',
  title: 'Simultaneous equations in context',
  strand: 'Algebra',
  subtopic: 'Simultaneous equations',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const items = rng.pick(ITEMS);
    const friendly = calc === 'non-calc';
    const price = (lo: number, hi: number) => (friendly ? rng.step(lo, hi, 5) : rng.step(lo, hi, 1));
    const x = price(items.p1[0], items.p1[1]);
    const y = price(items.p2[0], items.p2[1]);
    ensure(Math.abs(x - y) >= 30, 'clearly different prices');
    const base: V = { level, name, items, x, y, e1: [0, 0], e2: [0, 0], n1: 0, n2: 0 };
    if (level === 'foundational') {
      const b = rng.int(1, 4);
      const a1 = rng.int(2, 5);
      const a2 = rng.int(1, a1 - 1);
      return { ...base, e1: [a1, b], e2: [a2, b] };
    }
    if (level === 'core') {
      const e1: [number, number] = [rng.int(2, 5), rng.int(1, 5)];
      const e2: [number, number] = [rng.int(1, 5), rng.int(2, 6)];
      ensure(e1[0] * e2[1] !== e1[1] * e2[0], 'independent equations');
      ensure(e1[0] !== e2[0] && e1[1] !== e2[1], 'needs scaling, not straight subtraction');
      return { ...base, e1, e2 };
    }
    const n1 = rng.int(20, 120);
    const n2 = rng.int(20, 120);
    return { ...base, x: rng.step(items.p1[0], items.p1[1], friendly ? 50 : 10), y: rng.step(items.p2[0], items.p2[1], friendly ? 50 : 10), n1, n2 };
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'stretch' && Math.abs(v.x - v.y) < 30) p.push('prices must differ');
    return p;
  },

  render(v) {
    const { items } = v;
    if (v.level === 'stretch') {
      return {
        stem: lines(`${capital(items.place)} sells ${items.ones} and ${items.twos}.`, `Each ${items.one} costs ${money(v.x, true)}`, `Each ${items.two} costs ${money(v.y, true)}`, `On Saturday, ${v.n1 + v.n2} ${items.ones} and ${items.twos} were sold altogether.`, `The total money taken was ${money(v.n1 * v.x + v.n2 * v.y, true)}`),
        parts: [single(4, text(`Work out how many ${items.twos} were sold.`), text('You must show your working.'))],
      };
    }
    const stem = lines(`At ${items.place}, ${buy(v, v.e1)} cost a total of ${money(total(v, v.e1), true)}`, `${capital(buy(v, v.e2))} cost a total of ${money(total(v, v.e2), true)}`);
    if (v.level === 'foundational') {
      return { stem, parts: [part('a', 2, text(`Work out the cost of one ${items.one}.`)), part('b', 1, text(`Work out the cost of one ${items.two}.`))] };
    }
    return { stem, parts: [single(4, text(`Work out the cost of one ${items.one} and the cost of one ${items.two}.`), text('You must show your working.'))] };
  },

  answer(v) {
    const { items } = v;
    if (v.level === 'stretch') return [{ text: `${v.n2} ${items.twos}` }];
    if (v.level === 'foundational') return [{ text: money(v.x, true) }, { text: money(v.y, true) }];
    return [{ text: `${capital(items.one)} ${money(v.x, true)}, ${items.two} ${money(v.y, true)}` }];
  },

  markScheme(v) {
    const { items } = v;
    const eq = ([a, b]: [number, number], t: number) => `$${a === 1 ? '' : a}x + ${b === 1 ? '' : b}y = ${t}$`;
    if (v.level === 'foundational') {
      const [a1, b] = v.e1;
      const [a2] = v.e2;
      return [
        [step('M1', `${money(total(v, v.e1), true)} ${MINUS} ${money(total(v, v.e2), true)} = ${money(total(v, v.e1) - total(v, v.e2), true)} for ${a1 - a2} ${a1 - a2 === 1 ? items.one : items.ones}`, `Both buys have ${b} ${b === 1 ? items.two : items.twos}, so the difference is just the extra ${items.ones}.`), step('A1', `${money(total(v, v.e1) - total(v, v.e2), true)} ${DIV} ${a1 - a2} = ${money(v.x, true)}`, 'Share between the extra items.')],
        [step('B1', `(${money(total(v, v.e2), true)} ${MINUS} ${a2} ${TIMES} ${money(v.x, true)}) ${DIV} ${b} = ${money(v.y, true)}`, 'Substitute back into one of the purchases.')],
      ];
    }
    if (v.level === 'core') {
      const [a1, b1] = v.e1;
      const [a2, b2] = v.e2;
      return [
        [
          step('M1', `${eq(v.e1, total(v, v.e1))}, ${eq(v.e2, total(v, v.e2))} (in pence)`, `Let x = cost of a ${items.one} and y = cost of a ${items.two}.`),
          step('M1', `× ${b2} and × ${b1}: $${a1 * b2}x - ${a2 * b1}x = ${total(v, v.e1) * b2} - ${total(v, v.e2) * b1}$`, 'Make the y terms match, then subtract to eliminate y.'),
          step('A1', `$x$ = ${v.x}, so a ${items.one} costs ${money(v.x, true)}`, 'Solve for x.'),
          step('A1', `$y$ = ${v.y}, so a ${items.two} costs ${money(v.y, true)}`, 'Substitute back to find y, then check in the other equation.'),
        ],
      ];
    }
    const N = v.n1 + v.n2;
    const T = v.n1 * v.x + v.n2 * v.y;
    return [
      [
        step('P1', `$a + c = ${N}$`, `Let a = number of ${items.ones} and c = number of ${items.twos}.`),
        step('P1', `$${v.x}a + ${v.y}c = ${T}$ (in pence)`, 'Form a second equation from the money.'),
        step('P1', `$${v.x}(${N} - c) + ${v.y}c = ${T}$, so $${Math.abs(v.x - v.y)}c = ${Math.abs(v.x * N - T)}$`, 'Substitute a = ' + `${N} − c and solve.`),
        step('A1', `$c$ = ${v.n2}`, `Check: ${v.n1} × ${money(v.x, true)} + ${v.n2} × ${money(v.y, true)} = ${money(T, true)}`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Try every split of the total number sold.
      const N = v.n1 + v.n2;
      const T = v.n1 * v.x + v.n2 * v.y;
      const sols: number[] = [];
      for (let c = 0; c <= N; c++) if ((N - c) * v.x + c * v.y === T) sols.push(c);
      if (sols.length !== 1 || answers[0].text !== `${sols[0]} ${v.items.twos}`) p.push('count');
      return p;
    }
    // Cramer's rule.
    const [a1, b1] = v.e1;
    const [a2, b2] = v.e2;
    const t1 = total(v, v.e1);
    const t2 = total(v, v.e2);
    const det = a1 * b2 - a2 * b1;
    const x = (t1 * b2 - t2 * b1) / det;
    const y = (a1 * t2 - a2 * t1) / det;
    if (x !== v.x || y !== v.y) p.push('solution');
    return p;
  },

  key: (v) => `${v.x}|${v.y}|${v.e1}|${v.e2}|${v.n1}|${v.n2}`,
});

function capital(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
