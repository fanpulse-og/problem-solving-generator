import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { ensure, int, ratio } from '../../engine/format';
import { gcdInt } from '../../engine/rational';
import { names } from '../../contexts/names';
import { THREE_WAY_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 24 2F Q20 / 2H Q6 (C grams of chocolate shared 2 : 5 : 8,
 * largest − smallest = 390 g). Stretch gives the ratio as "twice as much"
 * statements that must be turned into a ratio first.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  people: string[];
  ctx: (typeof THREE_WAY_CONTEXTS)[number];
  r: [number, number, number];
  unit: number;
  ask: 'total' | 'middle';
  // stretch multipliers: A = m × B, C = n × A
  m: number;
  n: number;
  // foundational (a)
  fr: [number, number, number];
  fUnit: number;
}

const sum = (r: number[]) => r.reduce((a, b) => a + b, 0);
const q = (v: V, x: number) => `${int(x)} ${v.ctx.unit}`;

function pickRatio(rng: { int(a: number, b: number): number }, max: number): [number, number, number] {
  for (;;) {
    const r: [number, number, number] = [rng.int(1, max), rng.int(1, max), rng.int(1, max)];
    if (new Set(r).size === 3 && gcdInt(gcdInt(r[0], r[1]), r[2]) === 1) return r;
  }
}

export default defineTemplate<V>({
  id: 'ratio-three-part',
  title: 'Three-part ratio from a difference',
  strand: 'Ratio & Proportion',
  subtopic: 'Sharing in a ratio',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  calculator: 'either',

  generate({ rng, tier, level }) {
    const people = names(rng, 3);
    const ctx = rng.pick(THREE_WAY_CONTEXTS);
    const max = tier === 'KS3' ? 6 : 9;
    let r = pickRatio(rng, max);
    let m = 0,
      n = 0;
    if (level === 'stretch') {
      m = rng.int(2, 4);
      n = rng.int(2, 3);
      r = [m, 1, m * n];
    }
    const unit = ctx.unitShort === 'g' ? rng.step(5, 80, 5) : rng.int(2, tier === 'KS3' ? 10 : 20);
    const v: V = { level, people, ctx, r, unit, ask: level === 'core' && rng.chance(0.3) ? 'middle' : 'total', m, n, fr: [1, 1, 1], fUnit: 0 };
    if (level === 'foundational') {
      v.fr = pickRatio(rng, 5);
      v.fUnit = ctx.unitShort === 'g' ? rng.step(10, 50, 10) : rng.int(2, 10);
      ensure(v.fr.join() !== r.join(), 'different ratio for (a)');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (Math.max(...v.r) === Math.min(...v.r)) p.push('no difference');
    if (v.unit <= 0) p.push('unit');
    return p;
  },

  render(v) {
    const [A, B, C] = v.people;
    const between = `${A}, ${B} and ${C}`;
    const D = (Math.max(...v.r) - Math.min(...v.r)) * v.unit;
    const totalAsk = `Work out the total amount of ${v.ctx.what} shared.`;
    if (v.level === 'stretch') {
      const big = v.people[v.r.indexOf(Math.max(...v.r))];
      const small = v.people[v.r.indexOf(Math.min(...v.r))];
      return {
        stem: lines(
          `Some ${v.ctx.what} is shared between ${between}.`,
          `${A} gets ${times(v.m)} as much ${v.ctx.what} as ${B}.`,
          `${C} gets ${times(v.n)} as much ${v.ctx.what} as ${A}.`,
          `${big} gets ${q(v, D)} more ${v.ctx.what} than ${small}.`,
        ),
        parts: [single(4, text(totalAsk))],
      };
    }
    const stemLine = `${v.ctx.symbol} ${v.ctx.unit} of ${v.ctx.what} is shared between ${between} in the ratio ${ratio(...v.r)}`;
    const diffLine = `The difference between the largest share and the smallest share is ${q(v, D)}.`;
    if (v.level === 'foundational') {
      const T = sum(v.fr) * v.fUnit;
      return {
        stem: [],
        parts: [
          part('a', 2, text(`${int(T)} ${v.ctx.unit} of ${v.ctx.what} is shared between ${between} in the ratio ${ratio(...v.fr)}`), text(`Work out the largest share.`)),
          part('b', 2, text(stemLine), text(diffLine), text(`Work out the value of ${v.ctx.symbol}`)),
        ],
      };
    }
    return {
      stem: lines(stemLine, diffLine),
      parts: [single(3, text(v.ask === 'total' ? `Work out the value of ${v.ctx.symbol}` : `Work out the amount of ${v.ctx.what} that ${B} gets.`))],
    };
  },

  answer(v) {
    const total = sum(v.r) * v.unit;
    if (v.level === 'foundational') return [{ text: q(v, Math.max(...v.fr) * v.fUnit) }, { text: `${v.ctx.symbol} = ${int(total)}` }];
    if (v.level === 'stretch') return [{ text: q(v, total) }];
    return [{ text: v.ask === 'total' ? `${v.ctx.symbol} = ${int(total)}` : q(v, v.r[1] * v.unit) }];
  },

  markScheme(v) {
    const hi = Math.max(...v.r);
    const lo = Math.min(...v.r);
    const D = (hi - lo) * v.unit;
    const total = sum(v.r) * v.unit;
    const onePart = step('P1', `${hi} ${MINUS} ${lo} = ${hi - lo} parts, ${int(D)} ${DIV} ${hi - lo} = ${int(v.unit)}`, `The difference is ${hi - lo} parts of the ratio, so find one part.`);
    const scale = step('P1', `${v.r.join(' + ')} = ${sum(v.r)} parts, ${sum(v.r)} ${TIMES} ${int(v.unit)}`, 'All the parts together make the total.');
    if (v.level === 'foundational') {
      const T = sum(v.fr) * v.fUnit;
      const fh = Math.max(...v.fr);
      return [
        [step('M1', `${int(T)} ${DIV} ${sum(v.fr)} = ${int(v.fUnit)}`, 'Add up the ratio to get the number of parts, then find one part.'), step('A1', `${fh} ${TIMES} ${int(v.fUnit)} = ${q(v, fh * v.fUnit)}`, 'The largest share has the most parts.')],
        [step('M1', `${int(D)} ${DIV} (${hi} ${MINUS} ${lo}) = ${int(v.unit)}`, 'One part is the difference divided by the difference in parts.'), step('A1', `${sum(v.r)} ${TIMES} ${int(v.unit)} = ${int(total)}`, '')],
      ].map((ps) => ps.map((s) => (s.note ? s : { ...s, note: 'Multiply one part by the total number of parts.' })));
    }
    if (v.level === 'stretch') {
      const [A, B, C] = v.people;
      return [
        [
          step('P1', `${B} = 1 part, ${A} = ${v.m} parts, ${C} = ${v.m} ${TIMES} ${v.n} = ${v.m * v.n} parts, so ${A} : ${B} : ${C} = ${ratio(...v.r)}`, `Let the person who gets the least have 1 part.`),
          onePart,
          scale,
          step('A1', q(v, total), 'Check the difference using your shares.'),
        ],
      ];
    }
    if (v.ask === 'middle') {
      return [[onePart, step('P1', `${v.people[1]} gets ${v.r[1]} parts: ${v.r[1]} ${TIMES} ${int(v.unit)}`, `${v.people[1]} is the second number in the ratio.`), step('A1', q(v, v.r[1] * v.unit), '')].map((s) => (s.note ? s : { ...s, note: 'Remember the units.' }))];
    }
    return [[onePart, scale, step('A1', `${v.ctx.symbol} = ${int(total)}`, 'Check: the largest share minus the smallest share should give the difference.')]];
  },

  check(v, answers) {
    const p: string[] = [];
    const shares = v.r.map((x) => x * v.unit);
    const D = Math.max(...shares) - Math.min(...shares);
    // Recover the unit from the difference by trial (independent of the formula).
    let u = 0;
    for (let t = 1; t <= 10000; t++) if ((Math.max(...v.r) - Math.min(...v.r)) * t === D) u = t;
    if (u !== v.unit) p.push('unit not recovered');
    if (v.level === 'stretch') {
      const [a, b, c] = shares;
      if (a !== v.m * b || c !== v.n * a) p.push('statements broken');
    }
    const last = answers[answers.length - 1].text;
    const total = shares[0] + shares[1] + shares[2];
    if (v.level !== 'core' || v.ask === 'total') {
      if (!last.includes(int(total))) p.push('total answer');
    } else if (last !== q(v, shares[1])) p.push('middle answer');
    return p;
  },

  key: (v) => `${v.r.join(':')}|${v.unit}|${v.ask}|${v.fr.join(':')}|${v.fUnit}`,
});

function times(k: number): string {
  return k === 2 ? 'twice' : k === 3 ? 'three times' : k === 4 ? 'four times' : `${k} times`;
}
