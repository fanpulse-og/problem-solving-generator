import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, TIMES, DIV, MINUS } from '../../engine/blocks';
import { ensure, frac, fracRaw, int } from '../../engine/format';
import { Q, lcmInt } from '../../engine/rational';
import { names } from '../../contexts/names';
import { COUNTABLE_GIFTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 24 2F Q4 (Asif's 200 beads): fractions of an amount given
 * away plus a fixed number, then the fraction left. Stretch reverses it: from
 * the number left, find the starting amount.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  giver: string;
  others: string[];
  item: { plural: string; single: string };
  start: number;
  fracs: Q[]; // fractions of the START given away
  fixed: number; // number given away outright
  left: number;
}

const DENOMS = { KS3: [2, 4, 5, 10], F: [3, 4, 5, 6, 8, 10], H: [3, 4, 5, 6, 8, 9, 10, 12] };

export default defineTemplate<V>({
  id: 'num-fraction-left',
  title: 'Fractions of an amount given away',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level }) {
    const [giver, ...others] = names(rng, 4);
    const nFracs = level === 'foundational' ? 1 : 2;
    const denoms = rng.sample(DENOMS[tier], nFracs);
    const fracs = denoms.map((d) => {
      const maxN = Math.max(1, Math.floor((d - 1) / (nFracs + 1)));
      return Q.of(rng.int(1, maxN), d);
    });
    ensure(fracs.length < 2 || !fracs[0].eq(fracs[1]), 'fractions must differ');
    const sumF = fracs.reduce((s, f) => s.add(f), Q.of(0));
    ensure(sumF.lt(Q.of(4, 5)), 'too much given away');
    const l = denoms.reduce((a, b) => lcmInt(a, b), 1);
    const [lo, hi] = tier === 'KS3' ? [20, 120] : [60, 400];
    const start = rng.step(Math.max(lo, l), hi, l);
    const remainingBeforeFixed = Q.of(1).sub(sumF).mul(start).toInt();
    ensure(remainingBeforeFixed >= 6, 'too few remain');
    const fixed = rng.int(Math.max(1, Math.floor(remainingBeforeFixed * 0.15)), Math.floor(remainingBeforeFixed * 0.6));
    const left = remainingBeforeFixed - fixed;
    ensure(left > 0, 'none left');
    return { level, giver, others, item: rng.pick(COUNTABLE_GIFTS), start, fracs, fixed, left };
  },

  validate(v) {
    const p: string[] = [];
    v.fracs.forEach((f) => {
      if (!f.mul(v.start).isInt()) p.push('fraction of start not whole');
    });
    if (v.left <= 0) p.push('nothing left');
    if (v.fixed <= 0) p.push('fixed amount must be positive');
    return p;
  },

  render(v) {
    const { giver, item } = v;
    if (v.level === 'stretch') {
      return {
        stem: lines(
          `${giver} has some ${item.plural}.`,
          ...v.fracs.map((f, i) => `${giver} gives ${frac(f)} of the ${item.plural} to ${v.others[i]}.`),
          `${giver} then gives ${int(v.fixed)} ${item.plural} to ${v.others[v.fracs.length]}.`,
          `${giver} now has ${int(v.left)} ${item.plural} left.`,
        ),
        parts: [single(4, text(`How many ${item.plural} did ${giver} have at the start?`))],
      };
    }
    const stem = lines(
      `${giver} has ${int(v.start)} ${item.plural}.`,
      ...v.fracs.map((f, i) => `${giver} gives ${frac(f)} of the ${int(v.start)} ${item.plural} to ${v.others[i]}.`),
      `${giver} gives ${int(v.fixed)} ${item.plural} to ${v.others[v.fracs.length]}.`,
    );
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 2, text(`Work out how many ${item.plural} ${giver} has left.`)),
          part('b', 1, text(`What fraction of the ${int(v.start)} ${item.plural} does ${giver} have left?`), text('Give your answer in its simplest form.')),
        ],
      };
    }
    return { stem, parts: [single(4, text(`What fraction of the ${int(v.start)} ${item.plural} does ${giver} have left?`), text('Give your answer in its simplest form.'))] };
  },

  answer(v) {
    const f = frac(Q.of(v.left, v.start));
    if (v.level === 'stretch') return [{ text: int(v.start) }];
    if (v.level === 'foundational') return [{ text: int(v.left) }, { text: f }];
    return [{ text: f }];
  },

  markScheme(v) {
    const given = v.fracs.map((f) => f.mul(v.start).toInt());
    const givenWork = v.fracs.map((f, i) => `${frac(f)} ${TIMES} ${int(v.start)} = ${int(given[i])}`).join(',  ');
    const totalGiven = given.reduce((a, b) => a + b, 0) + v.fixed;
    const subtract = `${int(v.start)} ${MINUS} ${[...given, v.fixed].map(int).join(` ${MINUS} `)} = ${int(v.left)}`;
    const simplest = frac(Q.of(v.left, v.start));
    if (v.level === 'foundational') {
      return [
        [
          step('M1', givenWork, `Find ${frac(v.fracs[0])} of ${int(v.start)}: divide by the bottom, times by the top.`),
          step('A1', subtract, `Take away everything that was given away.`),
        ],
        [step('B1', `${fracRaw(v.left, v.start)} = ${simplest}`, 'Put the amount left over the starting amount, then cancel down.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('P1', givenWork, 'Work out how many each fraction is worth.'),
          step('P1', `${int(totalGiven)} given away in total, ${subtract}`, `Don’t forget the ${int(v.fixed)} given away as well.`),
          step('P1', fracRaw(v.left, v.start), 'Write the amount left as a fraction of the start.'),
          step('A1', simplest, 'Cancel down fully.'),
        ],
      ];
    }
    const sumF = v.fracs.reduce((s, f) => s.add(f), Q.of(0));
    const rest = Q.of(1).sub(sumF);
    return [
      [
        step('P1', `1 ${MINUS} ${v.fracs.map(frac).join(' − ')} = ${frac(rest)}`, `After the fractions are given away, ${frac(rest)} of the ${v.item.plural} are left.`),
        step('P1', `${int(v.left)} + ${int(v.fixed)} = ${int(v.left + v.fixed)}`, `Undo the last step: add back the ${int(v.fixed)} given away.`),
        step('P1', `${frac(rest)} of the start = ${int(v.left + v.fixed)}, so start = ${int(v.left + v.fixed)} ${DIV} ${frac(rest)}`, `Divide by ${frac(rest)} (or find one part and scale up).`),
        step('A1', `= ${int(v.start)}`, 'Check by working forwards from this number.'),
      ],
    ];
  },

  check(v, answers) {
    // Work forwards from the start independently.
    let n = Q.of(v.start);
    const p: string[] = [];
    for (const f of v.fracs) {
      const g = f.mul(v.start);
      if (!g.isInt()) p.push('non-integer share');
      n = n.sub(g);
    }
    n = n.sub(v.fixed);
    if (!n.eq(v.left)) p.push('left mismatch');
    // Reverse route gives the same start.
    const rest = Q.of(1).sub(v.fracs.reduce((s, f) => s.add(f), Q.of(0)));
    if (!Q.of(v.left + v.fixed).div(rest).eq(v.start)) p.push('reverse mismatch');
    const last = answers[answers.length - 1].text;
    if (v.level === 'stretch' ? last !== int(v.start) : last !== frac(n.div(v.start))) p.push('answer text');
    return p;
  },

  key: (v) => `${v.start}|${v.fracs.join(',')}|${v.fixed}`,
});
