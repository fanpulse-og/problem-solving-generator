import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 24 2H Q16 (length L increased by 20%, width W decreased by
 * 35%: percentage reduction in area). Reskinned as price × number sold.
 * Stretch works backwards to the change needed in the second quantity.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: 'rectangle' | 'revenue';
  a: number; // signed % change to the first quantity
  b: number; // signed % change to the second quantity
  L: number; // foundational: actual dimensions
  W: number;
}

const m = (p: number) => Q.of(100 + p, 100);
const total = (v: V) => m(v.a).mul(m(v.b)); // combined multiplier
const change = (p: number) => `${p > 0 ? 'increased' : 'decreased'} by ${Math.abs(p)}%`;
const pctChange = (q: Q) => q.sub(1).mul(100); // signed

export default defineTemplate<V>({
  id: 'ratio-percentage-change-area',
  title: 'Percentage change of a product (area, takings)',
  strand: 'Ratio & Proportion',
  subtopic: 'Percentages',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const friendly = calc === 'non-calc';
    const pick = () => (friendly ? rng.step(5, 40, 5) : rng.int(3, 40)) * (rng.chance(0.5) ? 1 : -1);
    const a = pick();
    const b = pick();
    ensure(Math.sign(a) !== Math.sign(b) || rng.chance(0.3), 'mostly one up, one down');
    const v: V = { level, ctx: level === 'foundational' ? 'rectangle' : rng.pick(['rectangle', 'revenue']), a, b, L: 0, W: 0 };
    ensure(!total(v).eq(1), 'must actually change');
    if (level === 'stretch') ensure(pctChange(total(v)).isInt() || pctChange(total(v)).mul(10).isInt(), 'given change to at most 1 d.p.');
    if (level === 'foundational') {
      v.L = rng.step(20, 120, 20);
      v.W = rng.step(10, 80, 10);
      ensure(v.L !== v.W, 'a proper rectangle');
      ensure(m(a).mul(v.L).isInt() && m(b).mul(v.W).isInt(), 'whole-number new lengths');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.a <= -100 || v.b <= -100) p.push('cannot lose 100% or more');
    if (total(v).eq(1)) p.push('no change');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A rectangle has length ${v.L} cm and width ${v.W} cm.`, `The length is ${change(v.a)}.`, `The width is ${change(v.b)}.`),
        parts: [part('a', 2, text('Work out the new length and the new width of the rectangle.')), part('b', 2, text('Work out the percentage change in the area of the rectangle.'), text('State whether it is an increase or a decrease.'))],
      };
    }
    const first = v.ctx === 'rectangle' ? 'A rectangle has length $L$ and width $W$.' : 'A theatre sells tickets for a show.';
    const q1 = v.ctx === 'rectangle' ? `$L$ is ${change(v.a)}` : `The price of a ticket is ${change(v.a)}.`;
    const what = v.ctx === 'rectangle' ? 'the area of the rectangle' : 'the total money taken from ticket sales';
    if (v.level === 'stretch') {
      const c = pctChange(total(v));
      const second = v.ctx === 'rectangle' ? '$W$ is changed' : 'The number of tickets sold changes';
      return {
        stem: lines(first, q1, `${second} so that ${what} ${c.gt(0) ? 'increases' : 'decreases'} by ${dec(c.gt(0) ? c : c.neg())}%.`),
        parts: [single(3, text(v.ctx === 'rectangle' ? 'Work out the percentage change in $W$' : 'Work out the percentage change in the number of tickets sold.'), text('State whether it is an increase or a decrease.'))],
      };
    }
    const q2 = v.ctx === 'rectangle' ? `$W$ is ${change(v.b)}` : `The number of tickets sold ${v.b > 0 ? 'increases' : 'decreases'} by ${Math.abs(v.b)}%.`;
    return {
      stem: lines(first, q1, q2),
      parts: [single(3, text(`Calculate the percentage change in ${what}.`), text('State whether it is an increase or a decrease.'))],
    };
  },

  answer(v) {
    const desc = (q: Q) => `${dec(q.gt(0) ? q : q.neg())}% ${q.gt(0) ? 'increase' : 'decrease'}`;
    if (v.level === 'stretch') return [{ text: desc(Q.of(v.b)) }];
    const c = pctChange(total(v));
    if (v.level === 'foundational') return [{ text: `${dec(m(v.a).mul(v.L))} cm and ${dec(m(v.b).mul(v.W))} cm` }, { text: desc(c) }];
    return [{ text: desc(c) }];
  },

  markScheme(v) {
    const ma = dec(m(v.a));
    const mb = dec(m(v.b));
    const c = pctChange(total(v));
    const word = (q: Q) => (q.gt(0) ? 'increase' : 'decrease');
    if (v.level === 'foundational') {
      const L2 = m(v.a).mul(v.L);
      const W2 = m(v.b).mul(v.W);
      const A1 = v.L * v.W;
      const A2 = L2.mul(W2);
      return [
        [step('B1', `${v.L} ${TIMES} ${ma} = ${dec(L2)} cm`, `Multiplier for “${change(v.a)}” is ${ma}.`), step('B1', `${v.W} ${TIMES} ${mb} = ${dec(W2)} cm`, `Multiplier for “${change(v.b)}” is ${mb}.`)],
        [
          step('M1', `Old area ${int(A1)} cm², new area ${dec(A2)} cm²; (${dec(A2)} ${MINUS} ${int(A1)}) ${DIV} ${int(A1)} ${TIMES} 100`, 'Percentage change = change ÷ original × 100.'),
          step('A1', `${dec(c.gt(0) ? c : c.neg())}% ${word(c)}`, 'Say whether it went up or down.'),
        ],
      ];
    }
    if (v.level === 'stretch') {
      const mt = total(v);
      return [
        [
          step('P1', `${v.ctx === 'rectangle' ? '$L$' : 'Price'} × ${ma}, ${v.ctx === 'rectangle' ? 'area' : 'money taken'} × ${dec(mt)}`, `${dec(c.gt(0) ? c : c.neg())}% ${word(c)} means multiply by ${dec(mt)}.`),
          step('P1', `${dec(mt)} ${DIV} ${ma} = ${mb}`, 'The two multipliers multiply together, so divide to find the missing one.'),
          step('A1', `${mb} means a ${Math.abs(v.b)}% ${v.b > 0 ? 'increase' : 'decrease'}`, 'Turn the multiplier back into a percentage change.'),
        ],
      ];
    }
    return [
      [
        step('P1', `Multipliers ${ma} and ${mb}`, 'Turn each percentage change into a multiplier.'),
        step('P1', `${ma} ${TIMES} ${mb} = ${dec(total(v))}`, v.ctx === 'rectangle' ? 'Area = length × width, so multiply the multipliers.' : 'Money taken = price × number sold, so multiply the multipliers.'),
        step('A1', `${dec(c.gt(0) ? c : c.neg())}% ${word(c)}`, 'Compare with 1: above 1 is an increase, below 1 is a decrease.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Use concrete numbers (100 by 100) instead of multipliers.
    const before = Q.of(100 * 100);
    const after = Q.of(100).add(v.a).mul(Q.of(100).add(v.b));
    const pct = after.sub(before).div(before).mul(100);
    const desc = `${dec(pct.gt(0) ? pct : pct.neg())}% ${pct.gt(0) ? 'increase' : 'decrease'}`;
    if (v.level === 'stretch') {
      // From the stated total change and the first change, recover the second.
      const needed = Q.of(100).add(pct).mul(100).div(Q.of(100).add(v.a)).sub(100);
      if (!needed.eq(v.b)) p.push('reverse');
      if (answers[0].text !== `${Math.abs(v.b)}% ${v.b > 0 ? 'increase' : 'decrease'}`) p.push('stretch answer');
    } else if (answers[answers.length - 1].text !== desc) p.push('percentage change');
    return p;
  },

  key: (v) => `${v.a}|${v.b}|${v.L}|${v.W}`,
});
