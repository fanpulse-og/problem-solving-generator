import { defineTemplate } from '../../engine/types';
import { part, single, step, table, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, int } from '../../engine/format';
import { gcdInt } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2F Q8 / Set 24 2F Q5 (number sequences: next term,
 * 13th term, "explain why 467 cannot be a term") and Set 23 2F Q3 (patterns).
 * Stretch: a pattern of sticks; the largest pattern that can be made from a
 * given number of sticks, and how many are left over.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  start: number;
  diff: number;
  nth: number; // foundational: which term to find
  notTerm: number; // a number that is not in the sequence
  name: string;
  thing: string;
  sticks: number; // stretch: sticks available
}

const zeroth = (v: V) => v.start - v.diff;
const term = (v: V, n: number) => v.start + (n - 1) * v.diff;

function nthTex(v: V): string {
  const c = zeroth(v);
  return `${v.diff}n${c === 0 ? '' : c > 0 ? ` + ${c}` : ` - ${-c}`}`;
}

function parityReason(v: V): string | null {
  if (v.diff % 2 !== 0) return null;
  const termsOdd = v.start % 2 !== 0;
  const nOdd = v.notTerm % 2 !== 0;
  if (termsOdd === nOdd) return null;
  return `All the terms are ${termsOdd ? 'odd' : 'even'} numbers, but ${int(v.notTerm)} is ${nOdd ? 'odd' : 'even'}.`;
}

export default defineTemplate<V>({
  id: 'alg-sequence-explain',
  title: 'Linear sequences: next term and explaining',
  strand: 'Algebra',
  subtopic: 'Forming & using formulae',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, tier, level }) {
    const diff = tier === 'KS3' ? rng.int(2, 6) : rng.int(2, 9);
    const start = rng.int(1, tier === 'H' ? 15 : 10);
    const nth = rng.pick([10, 12, 13, 15, 20]);
    // A number of the wrong form, preferring a parity clash when diff is even.
    let notTerm = 0;
    for (let tries = 0; tries < 50; tries++) {
      const cand = rng.int(tier === 'KS3' ? 60 : 120, tier === 'KS3' ? 200 : 500);
      if ((cand - start) % diff === 0) continue;
      notTerm = cand;
      if (diff % 2 === 0 && cand % 2 !== start % 2) break;
      if (diff % 2 !== 0) break;
    }
    ensure(notTerm > 0, 'no non-term found');
    const [name] = names(rng, 1);
    const sticks = rng.int(term({ start, diff } as V, 12), term({ start, diff } as V, 30));
    const v: V = { level, start, diff, nth, notTerm, name, thing: rng.pick(['sticks', 'counters', 'tiles', 'straws']), sticks };
    if (level === 'stretch') {
      ensure((sticks - zeroth(v)) % diff !== 0, 'want some left over');
      ensure(zeroth(v) !== 0, 'want a constant term');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.diff <= 0) p.push('diff must be positive');
    if ((v.notTerm - v.start) % v.diff === 0) p.push('notTerm is actually a term');
    return p;
  },

  render(v) {
    const first5 = [1, 2, 3, 4, 5].map((n) => int(term(v, n))).join('\u2003\u2003');
    if (v.level === 'stretch') {
      return {
        stem: [
          text(`Here is a sequence of patterns made from ${v.thing}.`),
          table({ header: ['Pattern number', '1', '2', '3', '4'], rows: [[`Number of ${v.thing}`, ...[1, 2, 3, 4].map((n) => int(term(v, n)))]], rowHeaders: true }),
          text(`The patterns continue in the same way.`),
          text(`${v.name} has ${int(v.sticks)} ${v.thing}.`),
          text(`${v.name} makes the pattern with the largest pattern number possible using these ${v.thing}.`),
        ],
        parts: [single(4, text(`Work out the pattern number of this pattern and the number of ${v.thing} left over.`))],
      };
    }
    const stem = [text('Here are the first five terms of a number sequence.'), text(first5)];
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a(i)', 1, text('Write down the next term of the sequence.')),
          part('a(ii)', 1, text('Explain how you worked out your answer.')),
          part('b', 1, text(`Work out the ${ordinal(v.nth)} term of the sequence.`)),
        ],
      };
    }
    return {
      stem,
      parts: [
        part('a', 2, text('Find an expression, in terms of $n$, for the $n$th term of the sequence.')),
        part('b', 1, text(`Explain why ${int(v.notTerm)} cannot be a number in the sequence.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const n = Math.floor((v.sticks - zeroth(v)) / v.diff);
      return [{ text: `Pattern number ${n}, with ${int(v.sticks - term(v, n))} ${v.thing} left over` }];
    }
    if (v.level === 'foundational') {
      return [{ text: int(term(v, 6)) }, { text: `Add ${v.diff} to the previous term` }, { text: int(term(v, v.nth)) }];
    }
    const reason = parityReason(v) ?? `$${nthTex(v)} = ${v.notTerm}$ gives $n$ = ${fracOrDec(v.notTerm - zeroth(v), v.diff)}, which is not a whole number.`;
    return [{ text: `$${nthTex(v)}$` }, { text: reason }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const c = zeroth(v);
      const n = Math.floor((v.sticks - c) / v.diff);
      return [
        [
          step('P1', `Goes up by ${v.diff} each time, so $n$th term = $${nthTex(v)}$`, `Use the difference between patterns for the number in front of $n$.`),
          step('P1', `$${nthTex(v)} \\le ${v.sticks}$, so $n \\le$ (${int(v.sticks)} ${c > 0 ? MINUS : '+'} ${Math.abs(c)}) ${DIV} ${v.diff}`, `The pattern can’t use more ${v.thing} than ${v.name} has.`),
          step('A1', `$n$ = ${n}`, 'Round down: the next pattern needs too many.'),
          step('A1', `Pattern ${n} uses ${v.diff} ${TIMES} ${n} ${c > 0 ? '+' : MINUS} ${Math.abs(c)} = ${int(term(v, n))}, so ${int(v.sticks)} ${MINUS} ${int(term(v, n))} = ${int(v.sticks - term(v, n))} left over`, 'Work out how many that pattern uses, then subtract.'),
        ],
      ];
    }
    if (v.level === 'foundational') {
      return [
        [step('B1', int(term(v, 6)), `${int(term(v, 5))} + ${v.diff}`)],
        [step('C1', `The terms go up by ${v.diff} each time`, 'Say what you do to get from one term to the next.')],
        [step('B1', `${int(v.start)} + ${v.nth - 1} ${TIMES} ${v.diff} = ${int(term(v, v.nth))}`, `The ${ordinal(v.nth)} term is ${v.nth - 1} jumps of ${v.diff} after the first term.`)],
      ];
    }
    const pr = parityReason(v);
    return [
      [
        step('M1', `$${v.diff}n$`, `The terms go up by ${v.diff}, so start with ${v.diff}$n$.`),
        step('A1', `$${nthTex(v)}$`, `Check: when $n$ = 1, ${v.diff} ${zeroth(v) >= 0 ? '+' : MINUS} ${Math.abs(zeroth(v))} = ${v.start}`),
      ],
      [
        step(
          'C1',
          pr ?? `$${nthTex(v)} = ${v.notTerm}$ gives $n$ = ${fracOrDec(v.notTerm - zeroth(v), v.diff)}, not a whole number`,
          pr ? 'Look at whether the terms are odd or even.' : `Set the $n$th term equal to ${int(v.notTerm)}. The term number must be a whole number.`,
        ),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Brute force: list terms and look for the number.
    const terms: number[] = [];
    for (let n = 1; n <= 31 || term(v, n) <= Math.max(v.notTerm, v.sticks) + v.diff; n++) terms.push(term(v, n));
    if (terms.includes(v.notTerm)) p.push('notTerm appears in the sequence');
    if (v.level === 'stretch') {
      const usable = terms.filter((t) => t <= v.sticks);
      const n = usable.length;
      const left = v.sticks - usable[usable.length - 1];
      if (answers[0].text !== `Pattern number ${n}, with ${int(left)} ${v.thing} left over`) p.push('stretch answer');
    }
    if (v.level === 'foundational') {
      if (answers[0].text !== int(terms[5])) p.push('next term');
      if (answers[2].text !== int(terms[v.nth - 1])) p.push('nth term value');
    }
    return p;
  },

  key: (v) => `${v.start}|${v.diff}|${v.level === 'core' ? v.notTerm : ''}|${v.level === 'stretch' ? v.sticks : v.nth}`,
});

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const r = n % 100;
  return `${n}${s[(r - 20) % 10] ?? s[r] ?? s[0]}`;
}

function fracOrDec(num: number, den: number): string {
  // Mixed number in simplest form, e.g. 30⅔ as "$30\frac{2}{3}$".
  const whole = Math.floor(num / den);
  const rem = num - whole * den;
  const g = gcdInt(rem, den);
  return `$${whole}\\frac{${rem / g}}{${den / g}}$`;
}
