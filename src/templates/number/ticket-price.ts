import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, TIMES, DIV, MINUS } from '../../engine/blocks';
import { ensure, frac, int, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';
import { TICKET_EVENTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 23 2F Q1 (Sandeep's tickets): find the price of a child
 * ticket from the total takings, a fraction of child tickets and the adult price.
 * Stretch works backwards: the child ticket is £d cheaper, find the adult price.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  event: string;
  total: number; // tickets
  childShare: Q; // fraction of tickets that are child tickets
  usePercent: boolean;
  child: number;
  adult: number;
  adultP: number; // pence
  childP: number; // pence
  takingsP: number; // pence
}

const FRACTIONS = {
  KS3: [Q.of(1, 2), Q.of(1, 4), Q.of(1, 5), Q.of(1, 10)],
  F: [Q.of(1, 4), Q.of(1, 5), Q.of(3, 4), Q.of(2, 5), Q.of(3, 10), Q.of(1, 3)],
  H: [Q.of(3, 8), Q.of(2, 3), Q.of(3, 5), Q.of(5, 8), Q.of(3, 10), Q.of(2, 5)],
};
const PERCENTS = [20, 25, 30, 35, 40, 45, 60];

export default defineTemplate<V>({
  id: 'num-ticket-price',
  title: 'Ticket prices from total takings',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [name] = names(rng, 1);
    const usePercent = level === 'stretch';
    const childShare = usePercent ? Q.of(rng.pick(PERCENTS), 100) : rng.pick(FRACTIONS[tier as 'KS3' | 'F' | 'H']);
    const d = Number(childShare.d);
    const [lo, hi] = tier === 'KS3' ? [40, 300] : tier === 'F' ? [200, 800] : [300, 1200];
    const total = rng.step(lo, hi, d * (calc === 'non-calc' ? 10 : 2) * (usePercent ? 1 : 1));
    const child = childShare.mul(total).toInt();
    const adult = total - child;
    let adultP: number;
    let childP: number;
    if (tier === 'KS3') {
      adultP = rng.step(400, 1200, 100);
      childP = rng.step(200, adultP - 100, 100);
    } else if (calc === 'non-calc') {
      adultP = rng.step(600, 2000, 50);
      childP = rng.step(300, adultP - 150, 50);
    } else {
      adultP = rng.step(800, 2500, 10);
      childP = rng.step(300, adultP - 150, 10);
    }
    ensure(childP < adultP && childP > 0, 'child must be cheaper');
    const takingsP = adult * adultP + child * childP;
    return { level, name, event: rng.pick(TICKET_EVENTS), total, childShare, usePercent, child, adult, adultP, childP, takingsP };
  },

  validate(v) {
    const p: string[] = [];
    if (v.child <= 0 || v.adult <= 0) p.push('need both ticket types');
    if (!Number.isInteger(v.child)) p.push('child count not whole');
    if (v.childP >= v.adultP) p.push('child price must be lower');
    return p;
  },

  render(v) {
    const share = v.usePercent ? `${int(v.childShare.mul(100).toInt())}%` : frac(v.childShare);
    const stem = lines(
      `${v.name} sells ${int(v.total)} tickets for ${v.event}.`,
      `${v.name} receives a total of ${money(v.takingsP)} from selling the tickets.`,
      `${share} of the tickets sold are child tickets.`,
      'The rest of the tickets sold are adult tickets.',
    );
    if (v.level === 'stretch') {
      stem.push(text(`A child ticket costs ${money(v.adultP - v.childP)} less than an adult ticket.`));
      return { stem, parts: [single(4, text('Work out the cost of an adult ticket.'))] };
    }
    stem.push(text(`The cost of an adult ticket is ${money(v.adultP)}`));
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 1, text('Work out the number of child tickets sold.')),
          part('b', 3, text('Work out the cost of a child ticket.')),
        ],
      };
    }
    return { stem, parts: [single(4, text('Work out the cost of a child ticket.'))] };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: money(v.adultP) }];
    if (v.level === 'foundational') return [{ text: `${int(v.child)}` }, { text: money(v.childP) }];
    return [{ text: money(v.childP) }];
  },

  markScheme(v) {
    const share = v.usePercent ? `${int(v.childShare.mul(100).toInt())}%` : frac(v.childShare);
    const counts = step(
      'P1',
      `${share} ${TIMES} ${int(v.total)} = ${int(v.child)} child tickets, so ${int(v.total)} ${MINUS} ${int(v.child)} = ${int(v.adult)} adult tickets`,
      'First find how many of each type of ticket were sold.',
    );
    const adultMoney = v.adult * v.adultP;
    const childMoney = v.child * v.childP;
    if (v.level === 'stretch') {
      const diff = v.adultP - v.childP;
      return [
        [
          counts,
          step(
            'P1',
            `If every ticket were an adult ticket the total would be ${money(v.takingsP)} + ${int(v.child)} ${TIMES} ${money(diff)} = ${money(v.takingsP + v.child * diff)}`,
            'Each child ticket is cheaper, so add the “missing” amount back on for every child ticket.',
          ),
          step('P1', `${money(v.takingsP + v.child * diff)} ${DIV} ${int(v.total)}`, 'Now share that total equally over all the tickets.'),
          step('A1', `= ${money(v.adultP)}`, 'Check: the adult price minus the difference gives the child price.'),
        ],
      ];
    }
    const adultStep = step('P1', `${int(v.adult)} ${TIMES} ${money(v.adultP)} = ${money(adultMoney)}`, 'Money taken from the adult tickets.');
    const restStep = step(
      'P1',
      `${money(v.takingsP)} ${MINUS} ${money(adultMoney)} = ${money(childMoney)}`,
      'Whatever is left must have come from the child tickets.',
    );
    const final = step('A1', `${money(childMoney)} ${DIV} ${int(v.child)} = ${money(v.childP)}`, 'Share the child money between the child tickets.');
    if (v.level === 'foundational') {
      return [
        [step('B1', `${share} ${TIMES} ${int(v.total)} = ${int(v.child)}`, 'Find the fraction of the total number of tickets.')],
        [
          step('P1', `${int(v.total)} ${MINUS} ${int(v.child)} = ${int(v.adult)} adult tickets, ${int(v.adult)} ${TIMES} ${money(v.adultP)} = ${money(adultMoney)}`, 'Work out the money from adult tickets.'),
          restStep,
          final,
        ],
      ];
    }
    return [[counts, adultStep, restStep, final]];
  },

  check(v, answers) {
    // Substitute the answer back into the story.
    const p: string[] = [];
    if (v.childShare.mul(v.total).toInt() !== v.child) p.push('child count');
    if (v.adult + v.child !== v.total) p.push('ticket total');
    if (v.adult * v.adultP + v.child * v.childP !== v.takingsP) p.push('takings do not match');
    if (v.level === 'stretch') {
      const diff = v.adultP - v.childP;
      const a = Q.of(v.takingsP + v.child * diff, v.total);
      if (!a.eq(v.adultP)) p.push('stretch adult price');
      if (answers[0].text !== money(a.toInt())) p.push('stretch answer text');
    } else {
      const c = Q.of(v.takingsP - v.adult * v.adultP, v.child);
      if (!c.eq(v.childP)) p.push('child price');
      if (answers[answers.length - 1].text !== money(c.toInt())) p.push('answer text');
    }
    return p;
  },

  key: (v) => `${v.total}|${v.childShare}|${v.adultP}|${v.childP}`,
});
