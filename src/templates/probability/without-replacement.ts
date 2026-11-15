import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, frac, fracTex, plural } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Two items taken without replacement. Practice: two colours, both the same
 * then different; Apply: three colours, same colour; Extend: the total is
 * unknown and a given probability leads to a quadratic equation.
 * check() counts ordered pairs of individual items.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  item: [string, string]; // singular, container
  colours: [string, string, string];
  counts: [number, number, number]; // third is 0 with two colours
}

const ITEMS: [string, string][] = [
  ['counter', 'bag'],
  ['sweet', 'bag'],
  ['bead', 'box'],
  ['marble', 'jar'],
  ['pen', 'pencil case'],
];
const COLOURS = ['red', 'blue', 'green', 'yellow', 'black', 'white'];
const total = (v: V) => v.counts[0] + v.counts[1] + v.counts[2];
const both = (k: number, n: number) => Q.of(k * (k - 1), n * (n - 1));
const pBothFirst = (v: V) => both(v.counts[0], total(v));
const pSame = (v: V) => v.counts.reduce((s, k) => s.add(both(k, total(v))), Q.of(0));
/** k/n × (k−1)/(n−1) written out. */
const product = (k: number, n: number) => `\\frac{${k}}{${n}} \\times \\frac{${k - 1}}{${n - 1}}`;

export default defineTemplate<V>({
  id: 'prob-without-replacement',
  title: 'Probability without replacement',
  strand: 'Probability',
  subtopic: 'Conditional probability',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const item = rng.pick(ITEMS);
    const colours = rng.sample(COLOURS, 3) as [string, string, string];
    const max = calc === 'calc' ? 9 : 6;
    const a = rng.int(2, max);
    const b = rng.int(2, max);
    const c = level === 'core' ? rng.int(2, max) : 0;
    const v: V = { level, name, item, colours, counts: [a, b, c] };
    ensure(a !== b && a !== c && b !== c, 'different numbers of each colour');
    if (level === 'core') ensure(total(v) <= (calc === 'calc' ? 20 : 12), 'a manageable total');
    if (level === 'stretch') {
      ensure(a >= 3 && total(v) >= 8, 'enough items for a quadratic');
      // No other whole-number total gives the same probability.
      ensure(Number(pBothFirst(v).n) > 1 || a > 3, 'a probability that needs the algebra');
    }
    return v;
  },

  validate(v) {
    return v.counts[0] >= 2 && v.counts[1] >= 2 ? [] : ['at least two of each colour'];
  },

  render(v) {
    const [it, box] = v.item;
    const [c0, c1, c2] = v.colours;
    const [a, b, c] = v.counts;
    const taking = `${v.name} takes at random two ${it}s from the ${box}, without replacement.`;
    if (v.level === 'foundational') {
      return {
        stem: [text(`There are ${a} ${c0} ${it}s and ${b} ${c1} ${it}s in a ${box}.`), text(taking)],
        parts: [part('a', 2, text(`Work out the probability that both ${it}s are ${c0}.`)), part('b', 3, text(`Work out the probability that the two ${it}s are different colours.`))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`There are only ${c0} ${it}s, ${c1} ${it}s and ${c2} ${it}s in a ${box}.`), text(`There are ${a} ${c0} ${it}s, ${b} ${c1} ${it}s and ${plural(c, `${c2} ${it}`)}.`), text(taking)],
        parts: [single(4, text(`Work out the probability that the two ${it}s are the same colour.`))],
      };
    }
    return {
      stem: [text(`There are $n$ ${it}s in a ${box}.`), text(`${a} of the ${it}s are ${c0}. The rest are ${c1}.`), text(taking), text(`The probability that both ${it}s are ${c0} is ${frac(pBothFirst(v))}`)],
      parts: [single(5, text('Work out the value of $n$.'), text('Show your working clearly.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: frac(pBothFirst(v)) }, { text: frac(Q.of(1).sub(pSame(v))) }];
    if (v.level === 'core') return [{ text: frac(pSame(v)) }];
    return [{ text: `$n = ${total(v)}$` }];
  },

  markScheme(v) {
    const n = total(v);
    const [a, b, c] = v.counts;
    const [c0, c1, c2] = v.colours;
    if (v.level === 'foundational') {
      const diff = Q.of(1).sub(pSame(v));
      return [
        [step('M1', `$${product(a, n)}$`, `After one ${c0} is taken there are ${a - 1} ${c0} left out of ${n - 1}.`), step('A1', frac(pBothFirst(v)), 'Multiply along the branches. Simplifying is not essential.')],
        [
          step('M1', `$\\frac{${a}}{${n}} \\times \\frac{${b}}{${n - 1}}$ or $\\frac{${b}}{${n}} \\times \\frac{${a}}{${n - 1}}$`, `One way round: ${c0} then ${c1}, or ${c1} then ${c0}.`),
          step('M1', `$\\frac{${a * b}}{${n * (n - 1)}} + \\frac{${a * b}}{${n * (n - 1)}}$`, 'There are two orders, so add both.'),
          step('A1', frac(diff), 'Or work out 1 − P(same colour).'),
        ],
      ];
    }
    if (v.level === 'core') {
      const d = n * (n - 1);
      return [
        [
          step('M1', `$${product(a, n)}$`, `Both ${c0}: the second fraction has one fewer on the top and on the bottom.`),
          step('M1', `$${product(b, n)}$ and $${product(c, n)}$`, `Both ${c1} and both ${c2}, in the same way.`),
          step('M1', `$\\frac{${a * (a - 1)}}{${d}} + \\frac{${b * (b - 1)}}{${d}} + \\frac{${c * (c - 1)}}{${d}}$`, 'Any of the three would do, so add them.'),
          step('A1', frac(pSame(v)), 'Simplifying is not essential.'),
        ],
      ];
    }
    const p = pBothFirst(v);
    const K = n * (n - 1);
    return [
      [
        step('M1', `$\\frac{${a}}{n} \\times \\frac{${a - 1}}{n - 1}$`, `The probability of two ${c0}, written with n.`),
        step('M1', `$\\frac{${a * (a - 1)}}{n(n - 1)} = ${fracTex(p)}$`, 'Set it equal to the probability you are told.'),
        step('M1', `$n(n - 1) = ${K}$, so $n^2 - n - ${K} = 0$`, 'Cross-multiply and rearrange into a quadratic equal to zero.'),
        step('M1', `$(n - ${n})(n + ${n - 1}) = 0$`, 'Factorise: two numbers that multiply to the constant and differ by 1.'),
        step('A1', `$n = ${n}$`, `n cannot be negative, so reject $n = -${n - 1}$.`),
      ],
    ];
  },

  check(v, answers) {
    // Count ordered pairs of individual items.
    const n = total(v);
    const bag = v.counts.flatMap((k, i) => Array<number>(k).fill(i));
    let same = 0;
    let first = 0;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        if (bag[i] === bag[j]) same++;
        if (bag[i] === 0 && bag[j] === 0) first++;
      }
    const pairs = n * (n - 1);
    if (v.level === 'foundational') return answers[0].text === frac(Q.of(first, pairs)) && answers[1].text === frac(Q.of(pairs - same, pairs)) ? [] : ['probabilities'];
    if (v.level === 'core') return answers[0].text === frac(Q.of(same, pairs)) ? [] : ['same colour'];
    // The stated probability must pin down n uniquely.
    const p = Q.of(first, pairs);
    const fits = [];
    for (let m = v.counts[0]; m <= 400; m++) if (both(v.counts[0], m).eq(p)) fits.push(m);
    return fits.length === 1 && answers[0].text === `$n = ${fits[0]}$` ? [] : ['n'];
  },

  key: (v) => `${v.level}|${v.counts}`,
});
