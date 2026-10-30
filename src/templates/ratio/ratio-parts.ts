import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, frac, money, ratio } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 1F Q25 / 1H Q3 (160 cars and vans in the ratio 3 : 7;
 * ⅛ of the cars use electricity, 25% diesel, the rest petrol), November 2022
 * 1F Q18 (cans in the ratio 5 : 3 : 2, some removed: cola as a percentage of
 * what is left) and June 2022 2H Q15 (pay in the ratio 6 : 5; both rise by
 * £1.50 and the ratio becomes 13 : 11). The examiner reports note that
 * students took the fraction and the percentage one after the other instead
 * of both from the same total.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  name: string;
  other: string;
  total: number;
  r: number[]; // ratio parts
  fr: Q; // foundational: fraction of the first group
  pc: number; // foundational: percentage of the first group
  rem: [Q, Q]; // core: fractions removed from parts 2 and 3
  x: number; // stretch: one share (pence or years)
  k: number; // stretch: the increase
  after: [number, number];
}

const SPLIT = [
  { intro: 'A delivery company has a total of {n} cars and vans.', a: 'cars', b: 'vans', f: 'use electricity', p: 'use diesel', rest: 'use petrol', ask: 'cars that use petrol' },
  { intro: 'A cinema sold {n} tickets for a film.', a: 'adult tickets', b: 'child tickets', f: 'were VIP tickets', p: 'were bought online', rest: 'were bought at the cinema', ask: 'adult tickets that were bought at the cinema' },
  { intro: 'A garden centre has {n} trees and shrubs.', a: 'trees', b: 'shrubs', f: 'are apple trees', p: 'are pear trees', rest: 'are cherry trees', ask: 'cherry trees' },
];
const THREE = [
  { what: 'cans of drink', on: 'on a shelf', onThe: 'on the shelf', names: ['cola', 'lemonade', 'orange'], noun: 'cans' },
  { what: 'books', on: 'in a classroom', onThe: 'in the classroom', names: ['fiction', 'non-fiction', 'poetry'], noun: 'books' },
];

export default defineTemplate<V>({
  id: 'ratio-parts',
  title: 'Ratio with fractions, percentages and changes',
  strand: 'Ratio & Proportion',
  subtopic: 'Sharing in a ratio',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const [name, other] = names(rng, 2);
    const base: V = { level, ctx: 0, name, other, total: 0, r: [], fr: Q.of(0), pc: 0, rem: [Q.of(0), Q.of(0)], x: 0, k: 0, after: [0, 0] };
    if (level === 'foundational') {
      const r = [rng.int(1, 7), rng.int(1, 9)];
      ensure(gcdInt(r[0], r[1]) === 1 && r[0] !== r[1], 'ratio in simplest form');
      const fr = rng.pick([Q.of(1, 8), Q.of(1, 4), Q.of(1, 5), Q.of(1, 3), Q.of(2, 5), Q.of(3, 8)]);
      const pc = rng.pick([10, 20, 25, 30, 40, 15]);
      ensure(fr.add(Q.of(pc, 100)).lt(Q.of(9, 10)), 'some are left over');
      const unit = rng.int(4, 30);
      const total = unit * (r[0] + r[1]);
      const first = unit * r[0];
      ensure(fr.mul(first).isInt() && Q.of(pc * first, 100).isInt() && total <= 400, 'whole numbers');
      ensure(first >= 20 && total >= 60, 'big enough to need working');
      return { ...base, ctx: rng.int(0, SPLIT.length - 1), r, fr, pc, total };
    }
    if (level === 'core') {
      const r = [rng.int(2, 7), rng.int(1, 5), rng.int(1, 5)];
      ensure(gcdInt(gcdInt(r[0], r[1]), r[2]) === 1 && r[1] !== r[2], 'ratio in simplest form');
      const rem: [Q, Q] = [rng.pick([Q.of(1, 2), Q.of(1, 3), Q.of(2, 3), Q.of(1, 4), Q.of(3, 4)]), rng.pick([Q.of(1, 2), Q.of(1, 3), Q.of(1, 4), Q.of(1, 5)])];
      const unit = rng.int(5, 40);
      const total = unit * (r[0] + r[1] + r[2]);
      const parts = r.map((p) => p * unit);
      ensure(rem[0].mul(parts[1]).isInt() && rem[1].mul(parts[2]).isInt() && total <= 480, 'whole numbers removed');
      const left = total - rem[0].mul(parts[1]).toInt() - rem[1].mul(parts[2]).toInt();
      ensure(Q.of(parts[0] * 100, left).terminatesWithin(1), 'a percentage to at most 1 dp');
      return { ...base, ctx: rng.int(0, THREE.length - 1), r, rem, total };
    }
    // Stretch: a : b becomes c : d when k is added to both.
    const isPay = rng.chance(0.5);
    const [a, b] = rng.pick([[6, 5], [5, 4], [4, 3], [7, 5], [5, 3], [7, 6], [3, 2], [8, 5]]);
    const x = isPay ? rng.int(150, 400) : rng.int(2, 9); // pence per part, or years per part
    const k = isPay ? rng.step(50, 300, 25) : rng.int(2, 15);
    const A = a * x + k;
    const B = b * x + k;
    const g = gcdInt(A, B);
    const after: [number, number] = [A / g, B / g];
    ensure(after[0] <= 30 && after[1] <= 30 && !(after[0] === a && after[1] === b), 'a new ratio with small numbers');
    if (isPay) ensure((a * x) % 5 === 0 && (b * x) % 5 === 0, 'pay in multiples of 5p');
    return { ...base, ctx: isPay ? 0 : 1, r: [a, b], x, k, after };
  },

  validate(v) {
    return v.level === 'stretch' && v.after[0] * v.r[1] === v.after[1] * v.r[0] ? ['ratio unchanged'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      const c = SPLIT[v.ctx];
      return {
        stem: lines(c.intro.replace('{n}', String(v.total)), `the number of ${c.a} : the number of ${c.b} = ${ratio(...v.r)}`, `${frac(v.fr)} of the ${c.a} ${c.f}.`, `${v.pc}% of the ${c.a} ${c.p}.`, `The rest of the ${c.a} ${c.rest}.`),
        parts: [single(4, text(`Work out the number of ${c.ask}.`), text('You must show all your working.'))],
      };
    }
    if (v.level === 'core') {
      const c = THREE[v.ctx];
      const [n1, n2, n3] = c.names;
      return {
        stem: lines(`There are ${v.total} ${c.what} ${c.on}.`, `Each one is ${n1} or ${n2} or ${n3}.`, `the number of ${n1} ${c.noun} : the number of ${n2} ${c.noun} : the number of ${n3} ${c.noun} = ${ratio(...v.r)}`, `${frac(v.rem[0])} of the ${n2} ${c.noun} and ${frac(v.rem[1])} of the ${n3} ${c.noun} are removed.`),
        parts: [single(5, text(`Work out the number of ${n1} ${c.noun} as a percentage of the total number of ${c.noun} left ${c.onThe}.`))],
      };
    }
    const [a, b] = v.r;
    if (v.ctx === 0) {
      return {
        stem: lines(`The ratio of ${v.name}’s hourly pay to ${v.other}’s hourly pay is ${ratio(a, b)}`, `Both ${v.name} and ${v.other} get an increase of ${money(v.k, true)} in their hourly pay.`, `The ratio of ${v.name}’s hourly pay to ${v.other}’s hourly pay is now ${ratio(...v.after)}`),
        parts: [single(4, text(`Work out ${v.name}’s hourly pay before the increase.`))],
      };
    }
    return {
      stem: lines(`The ratio of ${v.name}’s age to ${v.other}’s age is ${ratio(a, b)}`, `In ${v.k} years’ time, the ratio of their ages will be ${ratio(...v.after)}`),
      parts: [single(4, text(`Work out ${v.name}’s age now.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const first = (v.total * v.r[0]) / (v.r[0] + v.r[1]);
      return [{ text: `${first - v.fr.mul(first).toInt() - (first * v.pc) / 100}` }];
    }
    if (v.level === 'core') {
      const { parts, left } = coreNums(v);
      return [{ text: `${dec(Q.of(parts[0] * 100, left))}%` }];
    }
    return [{ text: v.ctx === 0 ? money(v.r[0] * v.x, true) : `${v.r[0] * v.x} years` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const c = SPLIT[v.ctx];
      const s = v.r[0] + v.r[1];
      const first = (v.total * v.r[0]) / s;
      const f = v.fr.mul(first).toInt();
      const p = (first * v.pc) / 100;
      return [
        [
          step('P1', `${v.total} ${DIV} ${s} = ${v.total / s}, ${v.total / s} ${TIMES} ${v.r[0]} = ${first} ${c.a}`, `Share ${v.total} in the ratio ${ratio(...v.r)}: ${s} parts altogether.`),
          step('P1', `${frac(v.fr)} of ${first} = ${f}`, `The fraction is of the ${first} ${c.a}, not of all ${v.total}.`),
          step('P1', `${v.pc}% of ${first} = ${p}`, `The percentage is ALSO of the ${first}: don’t take it from what is left.`),
          step('A1', `${first} − ${f} − ${p} = ${first - f - p}`, 'The rest is what is left.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const c = THREE[v.ctx];
      const [n1, n2, n3] = c.names;
      const { parts, removed, left } = coreNums(v);
      const s = v.r.reduce((x, y) => x + y, 0);
      return [
        [
          step('P1', `${v.total} ${DIV} ${s} = ${v.total / s}; ${n1} ${parts[0]}, ${n2} ${parts[1]}, ${n3} ${parts[2]}`, `${s} parts altogether: find each amount.`),
          step('P1', `${frac(v.rem[0])} ${TIMES} ${parts[1]} = ${removed[0]}, ${frac(v.rem[1])} ${TIMES} ${parts[2]} = ${removed[1]}`, 'Work out how many are removed of each.'),
          step('P1', `${v.total} − ${removed[0]} − ${removed[1]} = ${left}`, `The total ${c.onThe} afterwards. The ${n1} ${c.noun} are all still there.`),
          step('P1', `$\\frac{${parts[0]}}{${left}} \\times 100$`, 'As a percentage of what is LEFT, not of the original total.'),
          step('A1', `${dec(Q.of(parts[0] * 100, left))}%`, 'Check it is less than 100%.'),
        ],
      ];
    }
    const [a, b] = v.r;
    const [c, d] = v.after;
    const k = v.k;
    const unit = v.ctx === 0 ? (n: number) => money(n, true) : (n: number) => `${n}`;
    return [
      [
        step('P1', `${v.name} = ${a}x, ${v.other} = ${b}x`, 'Use x for one share of the first ratio.'),
        step('P1', `$\\frac{${a}x + ${v.ctx === 0 ? dec(Q.of(k, 100)) : k}}{${b}x + ${v.ctx === 0 ? dec(Q.of(k, 100)) : k}} = \\frac{${c}}{${d}}$`, `Add ${unit(k)} to both, then set the new ratio equal to ${ratio(c, d)}.`),
        step('P1', `$${d}(${a}x + ${v.ctx === 0 ? dec(Q.of(k, 100)) : k}) = ${c}(${b}x + ${v.ctx === 0 ? dec(Q.of(k, 100)) : k})$, so $x = ${v.ctx === 0 ? dec(Q.of(v.x, 100)) : v.x}$`, 'Cross-multiply, expand and solve.'),
        step('A1', v.ctx === 0 ? money(a * v.x, true) : `${a * v.x} years`, v.ctx === 0 ? `Check: the new pay is ${unit(a * v.x + k)} and ${unit(b * v.x + k)}, in the ratio ${ratio(c, d)}` : `Check: in ${k} years they will be ${a * v.x + k} and ${b * v.x + k}, in the ratio ${ratio(c, d)}`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Count the vehicles one category at a time with exact fractions.
      const first = Q.of(v.total * v.r[0], v.r[0] + v.r[1]);
      const rest = first.mul(Q.of(1).sub(v.fr).sub(Q.of(v.pc, 100)));
      if (!rest.eq(Q.of(answers[0].text))) p.push('rest');
      return p;
    }
    if (v.level === 'core') {
      const s = v.r.reduce((x, y) => x + y, 0);
      const share = (i: number) => Q.of(v.total * v.r[i], s);
      const left = Q.of(v.total).sub(share(1).mul(v.rem[0])).sub(share(2).mul(v.rem[1]));
      if (!share(0).div(left).mul(100).eq(Q.of(answers[0].text.replace('%', '')))) p.push('percentage');
      return p;
    }
    // Search every whole number of pence / years for the first amount.
    const shown = v.ctx === 0 ? Math.round(Number(answers[0].text.replace(/[£,]/g, '')) * 100) : Number(answers[0].text.replace(' years', ''));
    const [a, b] = v.r;
    if (shown % a !== 0) return ['not a multiple of the first part'];
    const B = (shown / a) * b;
    if ((shown + v.k) * v.after[1] !== (B + v.k) * v.after[0]) p.push('new ratio');
    return p;
  },

  key: (v) => `${v.ctx}|${v.total}|${v.r}|${v.fr}|${v.pc}|${v.rem}|${v.x}|${v.k}`,
});

function coreNums(v: V) {
  const s = v.r.reduce((x, y) => x + y, 0);
  const parts = v.r.map((p) => (v.total / s) * p);
  const removed = [v.rem[0].mul(parts[1]).toInt(), v.rem[1].mul(parts[2]).toInt()];
  return { parts, removed, left: v.total - removed[0] - removed[1] };
}
