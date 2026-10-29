import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, int, ratio } from '../../engine/format';
import { gcdInt, lcmInt } from '../../engine/rational';
import { LINKED_RATIO_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 23 2H Q15 (green : orange = 2 : 3, orange : yellow = 1 : 5,
 * 280 sweets). Foundational has a shared middle term so no scaling is needed;
 * stretch gives a difference instead of the total.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof LINKED_RATIO_CONTEXTS)[number];
  p: number;
  q: number;
  r: number;
  s: number;
  unit: number;
}

function combined(v: Pick<V, 'p' | 'q' | 'r' | 's'>): [number, number, number] {
  const L = lcmInt(v.q, v.r);
  const c: [number, number, number] = [(v.p * L) / v.q, L, (v.s * L) / v.r];
  const g = gcdInt(gcdInt(c[0], c[1]), c[2]);
  return [c[0] / g, c[1] / g, c[2] / g];
}

export default defineTemplate<V>({
  id: 'ratio-linked',
  title: 'Linked ratios',
  strand: 'Ratio & Proportion',
  subtopic: 'Sharing in a ratio',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  calculator: 'either',

  generate({ rng, tier, level }) {
    const ctx = rng.pick(LINKED_RATIO_CONTEXTS);
    const max = tier === 'KS3' ? 5 : 7;
    const coprimePair = () => {
      for (;;) {
        const a = rng.int(1, max);
        const b = rng.int(1, max);
        if (a !== b && gcdInt(a, b) === 1) return [a, b];
      }
    };
    const [p, q] = coprimePair();
    let [r, s] = coprimePair();
    if (level === 'foundational') {
      r = q;
      s = rng.int(1, max + 2);
      ensure(gcdInt(r, s) === 1 && s !== r, 'second ratio simplest form');
    } else {
      ensure(r !== q && lcmInt(q, r) > Math.max(q, r) - 0 && lcmInt(q, r) <= 30, 'needs scaling, but not huge');
    }
    const c = combined({ p, q, r, s });
    ensure(new Set(c).size === 3, 'three different amounts');
    const total = c[0] + c[1] + c[2];
    // Keep the total realistic for the context (a bouquet is not 360 flowers).
    const cap = Math.min(ctx.max, tier === 'KS3' ? 150 : 400);
    ensure(total * 2 <= cap, 'ratio too big for this context');
    const unit = rng.int(2, Math.max(2, Math.floor(cap / total)));
    const v: V = { level, ctx, p, q, r, s, unit };
    if (level === 'stretch') ensure(c[2] !== c[0], 'need a difference');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (gcdInt(v.p, v.q) !== 1 || gcdInt(v.r, v.s) !== 1) p.push('given ratios not simplest');
    const c = combined(v);
    if (c[0] * v.q !== c[1] * v.p || c[1] * v.s !== c[2] * v.r) p.push('combined ratio wrong');
    return p;
  },

  render(v) {
    const [g, o, y] = v.ctx.items;
    const c = combined(v);
    const total = (c[0] + c[1] + c[2]) * v.unit;
    const rel = [`the number of ${g} : the number of ${o} = ${ratio(v.p, v.q)}`, 'and', `the number of ${o} : the number of ${y} = ${ratio(v.r, v.s)}`];
    if (v.level === 'stretch') {
      const more = c[2] > c[0] ? [y, g] : [g, y];
      const D = Math.abs(c[2] - c[0]) * v.unit;
      return {
        stem: lines(`${v.ctx.container} ${g}, ${o} and ${y}.`, ...rel, `There are ${int(D)} more ${more[0]} than ${more[1]}.`),
        parts: [single(4, text(`Work out the total number of ${v.ctx.noun} ${v.ctx.where}.`))],
      };
    }
    const stem = lines(`${v.ctx.container} ${g}, ${o} and ${y}.`, `There are ${int(total)} ${v.ctx.noun} ${v.ctx.where} so that`, ...rel);
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 1, text(`Write down the ratio  number of ${g} : number of ${o} : number of ${y}`)),
          part('b', 2, text(`Work out how many ${g} there are ${v.ctx.where}.`)),
        ],
      };
    }
    return { stem, parts: [single(3, text(`Work out how many ${g} there are ${v.ctx.where}.`))] };
  },

  answer(v) {
    const c = combined(v);
    const total = (c[0] + c[1] + c[2]) * v.unit;
    if (v.level === 'foundational') return [{ text: ratio(...c) }, { text: int(c[0] * v.unit) }];
    if (v.level === 'stretch') return [{ text: int(total) }];
    return [{ text: int(c[0] * v.unit) }];
  },

  markScheme(v) {
    const c = combined(v);
    const sumC = c[0] + c[1] + c[2];
    const L = lcmInt(v.q, v.r);
    const combine =
      v.q === v.r
        ? `The ${v.ctx.items[1]} number is ${v.q} in both, so ${ratio(...c)}`
        : `${ratio(v.p, v.q)} = ${ratio(v.p * (L / v.q), L)} and ${ratio(v.r, v.s)} = ${ratio(L, v.s * (L / v.r))}, so ${ratio(...c)}`;
    const combineNote = v.q === v.r ? 'The middle quantity matches, so the ratios join straight together.' : `Make the ${v.ctx.items[1]} numbers the same (${L}) so the ratios can be joined.`;
    if (v.level === 'foundational') {
      return [
        [step('B1', ratio(...c), combineNote)],
        [step('M1', `${sumC} parts, ${int(sumC * v.unit)} ${DIV} ${sumC} = ${v.unit}`, 'Add the parts and find one part.'), step('A1', `${c[0]} ${TIMES} ${v.unit} = ${int(c[0] * v.unit)}`, `The ${v.ctx.items[0]} have ${c[0]} part${c[0] === 1 ? '' : 's'}.`)],
      ];
    }
    if (v.level === 'stretch') {
      const dParts = Math.abs(c[2] - c[0]);
      return [
        [
          step('P1', combine, combineNote),
          step('P1', `${Math.max(c[2], c[0])} ${MINUS} ${Math.min(c[2], c[0])} = ${dParts} part${dParts === 1 ? '' : 's'}, ${int(dParts * v.unit)} ${DIV} ${dParts} = ${v.unit}`, 'The difference is worth this many parts, so find one part.'),
          step('P1', `${sumC} ${TIMES} ${v.unit}`, `There are ${sumC} parts altogether.`),
          step('A1', int(sumC * v.unit), 'Check one of the ratios with your numbers.'),
        ],
      ];
    }
    return [
      [
        step('P1', combine, combineNote),
        step('P1', `${int(sumC * v.unit)} ${DIV} ${sumC} = ${v.unit}`, 'Add the parts of the three-part ratio, then find one part.'),
        step('A1', `${c[0]} ${TIMES} ${v.unit} = ${int(c[0] * v.unit)}`, `The ${v.ctx.items[0]} have ${c[0]} part${c[0] === 1 ? '' : 's'}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Brute-force: search counts (g, o, y) matching every statement.
    const c = combined(v);
    const total = (c[0] + c[1] + c[2]) * v.unit;
    const sols: number[][] = [];
    for (let o = 1; o < total; o++) {
      if ((o * v.p) % v.q || (o * v.s) % v.r) continue;
      const g = (o * v.p) / v.q;
      const y = (o * v.s) / v.r;
      const fits = v.level === 'stretch' ? Math.abs(y - g) === Math.abs(c[2] - c[0]) * v.unit : g + o + y === total;
      if (fits) sols.push([g, o, y]);
    }
    if (sols.length !== 1) p.push(`${sols.length} solutions`);
    else {
      const [g, o, y] = sols[0];
      const want = v.level === 'stretch' ? int(g + o + y) : int(g);
      if (answers[answers.length - 1].text !== want) p.push('answer');
    }
    return p;
  },

  key: (v) => `${v.p}:${v.q}|${v.r}:${v.s}|${v.unit}`,
});
