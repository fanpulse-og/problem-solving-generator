import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, int, money, ratio } from '../../engine/format';
import { gcdInt } from '../../engine/rational';
import { names } from '../../contexts/names';
import { SHARE_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 22 2F Q21 (Bella receives £10.50 more than Millie) and
 * Set 23 2F Q16 (Jaya scored 39 more goals). Stretch: after sharing, one gives
 * the other an amount and they end up equal.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: string;
  b: string;
  ctx: (typeof SHARE_CONTEXTS)[number];
  r1: number;
  r2: number;
  unit: number; // value of one part (pence for money)
  ask: 'total' | 'smaller' | 'larger';
  // foundational (a): a separate forward share
  fTotal: number;
  fr: [number, number];
  fUnit: number;
}

const amt = (v: V, x: number) => (v.ctx.unitIsMoney ? money(x) : `${int(x)} ${v.ctx.noun}`);
const bare = (v: V, x: number) => (v.ctx.unitIsMoney ? money(x) : int(x));

function pickRatio(rng: { int(a: number, b: number): number }, max: number): [number, number] {
  for (;;) {
    const r1 = rng.int(2, max);
    const r2 = rng.int(1, r1 - 1);
    if (gcdInt(r1, r2) === 1) return [r1, r2];
  }
}

export default defineTemplate<V>({
  id: 'ratio-difference',
  title: 'Sharing in a ratio from a difference',
  strand: 'Ratio & Proportion',
  subtopic: 'Sharing in a ratio',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [a, b] = names(rng, 2);
    const ctx = rng.pick(SHARE_CONTEXTS);
    const [r1, r2] = pickRatio(rng, tier === 'KS3' ? 5 : tier === 'F' ? 9 : 11);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    let unit: number;
    if (ctx.unitIsMoney) unit = friendly ? rng.step(100, 1500, 50) : rng.step(110, 2500, 10);
    else unit = rng.int(tier === 'KS3' ? 2 : 3, tier === 'KS3' ? 12 : 25);
    const v: V = { level, a, b, ctx, r1, r2, unit, ask: level === 'core' ? rng.pick(['total', 'total', 'smaller', 'larger'] as const) : 'total', fTotal: 0, fr: [1, 1], fUnit: 0 };
    if (level === 'stretch') ensure(((r1 - r2) * unit) % 2 === 0, 'the amount given must be whole');
    if (level === 'stretch' && !ctx.unitIsMoney) ensure((r1 - r2) * unit >= 4, 'give at least 2');
    if (level === 'foundational') {
      v.fr = pickRatio(rng, tier === 'KS3' ? 5 : 7);
      v.fUnit = ctx.unitIsMoney ? rng.step(100, 1000, friendly ? 100 : 50) : rng.int(2, 15);
      v.fTotal = (v.fr[0] + v.fr[1]) * v.fUnit;
      ensure(v.fr[0] !== r1 || v.fr[1] !== r2, 'use a different ratio in part (a)');
      v.ask = 'smaller';
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.r1 <= v.r2) p.push('r1 must be larger');
    if (v.unit <= 0) p.push('unit must be positive');
    if (v.level === 'stretch' && ((v.r1 - v.r2) * v.unit) % 2 !== 0) p.push('odd transfer');
    return p;
  },

  render(v) {
    const share = `${v.a} and ${v.b} ${v.ctx.verb} in the ratio ${ratio(v.r1, v.r2)}`;
    const D = (v.r1 - v.r2) * v.unit;
    if (v.level === 'stretch') {
      const g = D / 2;
      return {
        stem: lines(share, `${v.a} then gives ${amt(v, g)} to ${v.b}.`, `${v.a} and ${v.b} now have the same amount${v.ctx.unitIsMoney ? ' of money' : ` of ${v.ctx.noun}`}.`),
        parts: [single(4, text(v.ctx.unitIsMoney ? 'Work out the total amount of money they shared.' : `Work out the total number of ${v.ctx.noun} they shared.`))],
      };
    }
    const more = `${v.a} receives ${amt(v, D)} more than ${v.b}.`;
    if (v.level === 'foundational') {
      const fShare = `${v.a} and ${v.b} ${v.ctx.verb} in the ratio ${ratio(...v.fr)}`;
      return {
        stem: [],
        parts: [
          part('a', 2, text(`${fShare}`), text(`They share ${amt(v, v.fTotal)} altogether.`), text(`Work out how ${v.ctx.unitIsMoney ? 'much money' : `many ${v.ctx.noun}`} ${v.a} receives.`)),
          part('b', 2, text(`Another time, ${v.a} and ${v.b} ${v.ctx.verb} in the ratio ${ratio(v.r1, v.r2)}`), text(more), text(`Work out how ${v.ctx.unitIsMoney ? 'much money' : `many ${v.ctx.noun}`} ${v.b} receives.`)),
        ],
      };
    }
    const q =
      v.ask === 'total'
        ? v.ctx.unitIsMoney
          ? 'Work out the total amount of money they share.'
          : `Work out the total number of ${v.ctx.noun} they share.`
        : `Work out how ${v.ctx.unitIsMoney ? 'much money' : `many ${v.ctx.noun}`} ${v.ask === 'smaller' ? v.b : v.a} receives.`;
    return { stem: lines(share, more), parts: [single(3, text(q))] };
  },

  answer(v) {
    const total = (v.r1 + v.r2) * v.unit;
    if (v.level === 'foundational') return [{ text: amt(v, v.fr[0] * v.fUnit) }, { text: amt(v, v.r2 * v.unit) }];
    if (v.ask === 'smaller') return [{ text: amt(v, v.r2 * v.unit) }];
    if (v.ask === 'larger') return [{ text: amt(v, v.r1 * v.unit) }];
    return [{ text: amt(v, total) }];
  },

  markScheme(v) {
    const D = (v.r1 - v.r2) * v.unit;
    const onePart = step('P1', `${v.r1} ${MINUS} ${v.r2} = ${v.r1 - v.r2} parts, ${bare(v, D)} ${DIV} ${v.r1 - v.r2} = ${bare(v, v.unit)} for one part`, `The difference between their shares is ${v.r1 - v.r2} part${v.r1 - v.r2 === 1 ? '' : 's'} of the ratio.`);
    if (v.level === 'foundational') {
      const [f1, f2] = v.fr;
      return [
        [
          step('M1', `${f1} + ${f2} = ${f1 + f2} parts, ${bare(v, v.fTotal)} ${DIV} ${f1 + f2} = ${bare(v, v.fUnit)}`, 'Add the ratio to find the number of parts, then find one part.'),
          step('A1', `${f1} ${TIMES} ${bare(v, v.fUnit)} = ${amt(v, f1 * v.fUnit)}`, `${v.a} gets ${f1} parts.`),
        ],
        [
          step('M1', `${bare(v, D)} ${DIV} ${v.r1 - v.r2} = ${bare(v, v.unit)}`, `${v.a} has ${v.r1 - v.r2} more part${v.r1 - v.r2 === 1 ? '' : 's'} than ${v.b}, worth ${bare(v, D)}.`),
          step('A1', `${v.r2} ${TIMES} ${bare(v, v.unit)} = ${amt(v, v.r2 * v.unit)}`, `${v.b} gets ${v.r2} part${v.r2 === 1 ? '' : 's'}.`),
        ],
      ];
    }
    const total = (v.r1 + v.r2) * v.unit;
    if (v.level === 'stretch') {
      const g = D / 2;
      return [
        [
          step('P1', `${v.a} had ${bare(v, g)} + ${bare(v, g)} = ${bare(v, D)} more than ${v.b}`, `Giving away ${bare(v, g)} makes ${v.a} go down AND ${v.b} go up, so the gap was twice ${bare(v, g)}.`),
          onePart,
          step('P1', `${v.r1} + ${v.r2} = ${v.r1 + v.r2} parts, ${v.r1 + v.r2} ${TIMES} ${bare(v, v.unit)}`, 'Scale up to the whole amount.'),
          step('A1', amt(v, total), `Check: ${v.a} ${bare(v, v.r1 * v.unit)}, ${v.b} ${bare(v, v.r2 * v.unit)}; after giving, both have ${bare(v, v.r1 * v.unit - g)}.`),
        ],
      ];
    }
    const finalAmt = v.ask === 'total' ? total : v.ask === 'smaller' ? v.r2 * v.unit : v.r1 * v.unit;
    const parts = v.ask === 'total' ? v.r1 + v.r2 : v.ask === 'smaller' ? v.r2 : v.r1;
    return [
      [
        onePart,
        step('P1', `${v.ask === 'total' ? `${v.r1} + ${v.r2} = ${v.r1 + v.r2} parts, ` : ''}${parts} ${TIMES} ${bare(v, v.unit)}`, v.ask === 'total' ? 'The total is all the parts.' : `${v.ask === 'smaller' ? v.b : v.a} gets ${parts} part${parts === 1 ? '' : 's'}.`),
        step('A1', amt(v, finalAmt), 'Check the difference between the two shares.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Shares must be in the ratio and differ by the stated amount.
    const A = v.r1 * v.unit;
    const B = v.r2 * v.unit;
    if (A * v.r2 !== B * v.r1) p.push('not in ratio');
    const D = A - B;
    if (v.level === 'stretch') {
      const g = D / 2;
      if (A - g !== B + g) p.push('not equal after gift');
      if (answers[0].text !== amt(v, A + B)) p.push('total');
    } else if (v.level === 'core') {
      const expect = v.ask === 'total' ? A + B : v.ask === 'smaller' ? B : A;
      if (answers[0].text !== amt(v, expect)) p.push('core answer');
    } else {
      const fa = (v.fTotal * v.fr[0]) / (v.fr[0] + v.fr[1]);
      if (answers[0].text !== amt(v, fa)) p.push('foundational a');
      if (answers[1].text !== amt(v, B)) p.push('foundational b');
    }
    return p;
  },

  key: (v) => `${v.r1}:${v.r2}|${v.unit}|${v.ask}|${v.ctx.unitIsMoney}|${v.fTotal}`,
});
