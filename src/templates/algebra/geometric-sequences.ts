import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, int } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Geometric and Fibonacci-type sequences, which appear on both tiers.
 * Practice: the common ratio and a later term. Apply: a Fibonacci-type
 * sequence in a and b, leading to simultaneous equations. Extend (Higher):
 * a geometric sequence known only from its 2nd and 4th terms.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // foundational, stretch: first term a, common ratio rn/rd.
  a: number;
  rn: number;
  rd: number;
  // core: Fibonacci-type sequence starting a, b.
  b: number;
}

const term = (v: V, n: number) => Q.of(v.rn, v.rd).pow(n - 1).mul(v.a);
const show = (q: Q) => (q.isInt() ? int(q.toInt()) : `$${fracTex(q)}$`);

export default defineTemplate<V>({
  id: 'alg-geometric-sequences',
  title: 'Geometric and Fibonacci-type sequences',
  strand: 'Algebra',
  subtopic: 'Sequences & iteration',
  tiers: ['F', 'H'],
  levelsByTier: { F: ['foundational', 'core'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'backwards' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const base: V = { level, a: 1, rn: 2, rd: 1, b: 1 };
    if (level === 'foundational') {
      const halves = tier === 'H' && rng.chance(0.4);
      const [rn, rd] = halves ? [1, 2] : [rng.int(2, tier === 'H' ? 5 : 3), 1];
      // A halving sequence starts at a multiple of 32, so six terms stay whole.
      const a = halves ? 32 * rng.int(1, 12) : rng.int(1, 6);
      ensure(term({ ...base, a, rn, rd }, 6).lt(5000), 'a sixth term of sensible size');
      return { ...base, a, rn, rd };
    }
    if (level === 'core') {
      const a = rng.int(1, 9);
      const b = rng.int(1, 9);
      ensure(a !== b, 'two different starting terms');
      return { ...base, a, b };
    }
    const [rn, rd] = rng.pick([[2, 1], [3, 1], [1, 2], [1, 3], [3, 2], [2, 3]] as const);
    const a = rd ** 4 * rng.int(1, rd === 1 ? 7 : rd === 2 ? 6 : 2);
    ensure(a * rn ** 4 <= 3000 * rd ** 4, 'terms of sensible size');
    return { ...base, a, rn, rd };
  },

  validate(v) {
    return v.level === 'core' || term(v, 5).isInt() ? [] : ['terms must be whole numbers'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const first = [1, 2, 3, 4].map((n) => show(term(v, n))).join('  ');
      return {
        stem: [text('Here are the first four terms of a geometric sequence.'), text(first)],
        parts: [part('a', 1, text('Write down the term-to-term rule for the sequence.')), part('b', 2, text('Work out the 6th term of the sequence.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text('Here are the first three terms of a Fibonacci-type sequence.'), text('$a$  $b$  $a + b$'), text('Each term is the sum of the two terms before it.')],
        parts: [
          part('a', 2, text('Show that the 6th term of the sequence is  $3a + 5b$')),
          part('b', 3, text(`The 3rd term of the sequence is ${v.a + v.b}`), text(`The 6th term of the sequence is ${3 * v.a + 5 * v.b}`), text('Find the value of $a$ and the value of $b$.')),
        ],
      };
    }
    return {
      stem: [text('All the terms of a geometric sequence are positive.'), text(`The 2nd term of the sequence is ${show(term(v, 2))}`), text(`The 4th term of the sequence is ${show(term(v, 4))}`)],
      parts: [single(4, text('Work out the 1st term and the 5th term of the sequence.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: v.rd === 1 ? `Multiply by ${v.rn}` : `Divide by ${v.rd}` }, { text: show(term(v, 6)) }];
    if (v.level === 'core') return [{ text: 'Shown' }, { text: `$a = ${v.a}$, $b = ${v.b}$` }];
    return [{ text: `1st term ${show(term(v, 1))}, 5th term ${show(term(v, 5))}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const rule = v.rd === 1 ? `Multiply by ${v.rn}` : `Divide by ${v.rd}`;
      return [
        [step('B1', rule, `${show(term(v, 2))} ÷ ${show(term(v, 1))} tells you what each term is multiplied by. Check it works for the next pair too.`)],
        [step('M1', `5th term = ${show(term(v, 5))}`, 'Carry the rule on from the 4th term.'), step('A1', show(term(v, 6)), 'Apply the rule once more.')],
      ];
    }
    if (v.level === 'core') {
      const s = v.a + v.b;
      const t = 3 * v.a + 5 * v.b;
      return [
        [step('M1', '4th term $= b + (a + b) = a + 2b$,  5th term $= (a + b) + (a + 2b) = 2a + 3b$', 'Add the two terms before, collecting like terms each time.'), step('A1', '6th term $= (a + 2b) + (2a + 3b) = 3a + 5b$', 'This is the printed answer, so show the addition.')],
        [
          step('M1', `$a + b = ${s}$  and  $3a + 5b = ${t}$`, 'Write the two facts as simultaneous equations.'),
          step('M1', `$3a + 3b = ${3 * s}$, so $2b = ${t - 3 * s}$`, 'Multiply the first equation by 3, then subtract it from the second.'),
          step('A1', `$a = ${v.a}$, $b = ${v.b}$`, 'Find b, then use a + b to find a.'),
        ],
      ];
    }
    const r = Q.of(v.rn, v.rd);
    return [
      [
        step('M1', `$r^2 = ${show(term(v, 4)).replace(/\$/g, '')} \\div ${show(term(v, 2)).replace(/\$/g, '')} = ${fracTex(r.mul(r))}$`, 'From the 2nd term to the 4th term you multiply by the common ratio twice.'),
        step('A1', `$r = ${fracTex(r)}$`, 'Take the positive square root, because every term is positive.'),
        step('A1', `1st term $= ${show(term(v, 2)).replace(/\$/g, '')} \\div ${fracTex(r)} = ${show(term(v, 1)).replace(/\$/g, '')}$`, 'Go back one term by dividing by the common ratio.'),
        step('A1', `5th term $= ${show(term(v, 4)).replace(/\$/g, '')} \\times ${fracTex(r)} = ${show(term(v, 5)).replace(/\$/g, '')}$`, 'Go on one term by multiplying.'),
      ],
    ];
  },

  check(v, answers) {
    const numbers = (s: string) => [...s.replace(/[  ](?=\d{3})/g, '').matchAll(/\d+/g)].map((m) => Number(m[0]));
    if (v.level === 'foundational') {
      // Repeated multiplication, six terms.
      let t = Q.of(v.a);
      for (let i = 0; i < 5; i++) t = t.mul(v.rn).div(v.rd);
      return t.eq(numbers(answers[1].text)[0]) ? [] : ['6th term'];
    }
    if (v.level === 'core') {
      // Build the sequence term by term from the answer.
      const [a, b] = numbers(answers[1].text);
      const seq = [a, b];
      while (seq.length < 6) seq.push(seq[seq.length - 1] + seq[seq.length - 2]);
      return seq[2] === v.a + v.b && seq[5] === 3 * v.a + 5 * v.b ? [] : ['a and b'];
    }
    // The five terms must have a constant, positive ratio.
    const [first, fifth] = numbers(answers[0].text.replace(/1st|5th/g, ''));
    const seq = [Q.of(first), term(v, 2), term(v, 3), term(v, 4), Q.of(fifth)];
    const ratio = seq[1].div(seq[0]);
    return ratio.isPositive() && seq.every((t, i) => i === 0 || t.div(seq[i - 1]).eq(ratio)) ? [] : ['constant ratio'];
  },

  key: (v) => `${v.a}|${v.rn}|${v.rd}|${v.b}`,
});
