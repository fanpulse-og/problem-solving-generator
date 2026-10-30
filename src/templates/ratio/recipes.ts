import { defineTemplate } from '../../engine/types';
import { box, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on November 2022 3F Q20 (ingredients for 10 scones; Martin has some
 * of each and wants to make 25: he has not got enough — which ingredient?).
 * The examiner report notes that students scale correctly but then lose track
 * when comparing with what they have, so the stretch question asks for the
 * greatest number that can be made.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  r: number; // recipe index
  amounts: number[]; // per batch
  have: number[];
  target: number; // core: wants to make this many
}

const RECIPES = [
  { item: 'scones', batch: 10, ings: [['butter', 'g', 60, 100, 5], ['self-raising flour', 'g', 250, 400, 25], ['sugar', 'g', 20, 50, 5], ['milk', 'ml', 120, 200, 10]] },
  { item: 'pancakes', batch: 8, ings: [['plain flour', 'g', 100, 160, 10], ['milk', 'ml', 250, 350, 25], ['eggs', '', 2, 3, 1], ['butter', 'g', 15, 30, 5]] },
  { item: 'flapjacks', batch: 12, ings: [['oats', 'g', 200, 300, 25], ['butter', 'g', 100, 150, 25], ['sugar', 'g', 75, 125, 25], ['golden syrup', 'g', 50, 100, 25]] },
] as const;

const qty = (n: Q | number, unit: string) => `${dec(n instanceof Q ? n : Q.of(n))}${unit ? ` ${unit}` : ''}`;
const ingLine = (name: string, unit: string, n: number | Q) => (unit ? `${qty(n, unit)} ${name}` : `${dec(n instanceof Q ? n : Q.of(n))} ${name}`);

export default defineTemplate<V>({
  id: 'ratio-recipes',
  title: 'Recipes and best value of ingredients',
  strand: 'Ratio & Proportion',
  subtopic: 'Direct & inverse proportion',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'ratio-reasoning',
  styleByLevel: { core: 'decide' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const r = rng.int(0, RECIPES.length - 1);
    const R = RECIPES[r];
    const amounts = R.ings.map(([, , lo, hi, st]) => rng.step(lo as number, hi as number, st as number));
    // Scale factors a student can handle: halves and quarters (non-calculator), any whole number of items (calculator).
    const factors = calc === 'non-calc' ? [Q.of(3, 2), Q.of(5, 2), Q.of(1, 2), Q.of(3), Q.of(5, 4), Q.of(7, 4)] : [Q.of(3, 2), Q.of(5, 2), Q.of(7, 5), Q.of(9, 5), Q.of(13, 10), Q.of(11, 4)];
    const f = rng.pick(factors);
    const target = f.mul(R.batch);
    ensure(target.isInt() && amounts.every((a) => f.mul(a).terminatesWithin(1)), 'tidy amounts');
    const isEgg = (i: number) => R.ings[i][0] === 'eggs';
    ensure(amounts.every((a, i) => !isEgg(i) || f.mul(a).isInt()), 'whole eggs');
    const v: V = { level, name, r, amounts, have: [], target: target.toInt() };
    if (level === 'foundational') return v;
    // What they have: plenty of most things, and (core) exactly one ingredient short, or none.
    const need = amounts.map((a) => f.mul(a));
    const short = level === 'core' ? (rng.chance(0.75) ? rng.int(0, amounts.length - 1) : -1) : rng.int(0, amounts.length - 1);
    v.have = need.map((n, i) => {
      const st = isEgg(i) ? 1 : (R.ings[i][4] as number);
      if (i === short) return Math.max(st, Math.floor((n.toNumber() * rng.pick([0.7, 0.8, 0.9])) / st) * st);
      return Math.ceil((n.toNumber() * rng.pick([1.1, 1.3, 1.6, 2])) / st) * st;
    });
    ensure(v.have.every((h, i) => (i === short ? Q.of(h).lt(need[i]) : Q.of(h).cmp(need[i]) >= 0)), 'exactly the intended shortage');
    if (level === 'stretch') {
      // The limiting ingredient must give a clear answer that is not a whole batch.
      const most = maxItems(v);
      ensure(most >= 2 && most % R.batch !== 0, 'the answer is not a whole number of batches');
    }
    return v;
  },

  validate(v) {
    return v.amounts.every((a) => a > 0) ? [] : ['amounts'];
  },

  render(v) {
    const R = RECIPES[v.r];
    const recipe = box(`Ingredients for ${R.batch} ${R.item}`, ...R.ings.map(([n, u], i) => ingLine(n as string, u as string, v.amounts[i])));
    if (v.level === 'foundational') {
      return { stem: [text(`Here is a list of ingredients for making ${R.batch} ${R.item}.`), recipe], parts: [single(3, text(`Work out the amount of each ingredient needed to make ${v.target} ${R.item}.`))] };
    }
    const has = box(`${v.name} has`, ...R.ings.map(([n, u], i) => ingLine(n as string, u as string, v.have[i])));
    if (v.level === 'core') {
      return {
        stem: [text(`Here is a list of ingredients for making ${R.batch} ${R.item}.`), recipe, text(`${v.name} wants to make ${v.target} ${R.item}.`), has],
        parts: [single(4, text(`Has ${v.name} got enough of each ingredient to make ${v.target} ${R.item}?`), text('You must show how you get your answer.'))],
      };
    }
    return {
      stem: [text(`Here is a list of ingredients for making ${R.batch} ${R.item}.`), recipe, has],
      parts: [single(4, text(`Work out the greatest number of ${R.item} that ${v.name} can make.`))],
    };
  },

  answer(v) {
    const R = RECIPES[v.r];
    const f = Q.of(v.target, R.batch);
    if (v.level === 'foundational') return [{ text: R.ings.map(([n, u], i) => ingLine(n as string, u as string, f.mul(v.amounts[i]))).join(', ') }];
    if (v.level === 'core') {
      const shortI = R.ings.findIndex((_, i) => Q.of(v.have[i]).lt(f.mul(v.amounts[i])));
      if (shortI < 0) return [{ text: 'Yes: there is enough of every ingredient' }];
      const [n, u] = R.ings[shortI];
      return [{ text: `No: ${v.name} needs ${qty(f.mul(v.amounts[shortI]), u as string)} of ${n} but only has ${qty(v.have[shortI], u as string)}`.replace(/needs (\d+(?:\.\d+)?) of eggs but only has (\d+)/, 'needs $1 eggs but only has $2') }];
    }
    return [{ text: `${maxItems(v)} ${R.item}` }];
  },

  markScheme(v) {
    const R = RECIPES[v.r];
    const f = Q.of(v.target, R.batch);
    const scale = `${v.target} ${DIV} ${R.batch} = ${dec(f)}`;
    if (v.level === 'foundational') {
      return [
        [
          step('M1', scale, `Scale factor: how many lots of ${R.batch} ${R.item} you need.`),
          step('M1', R.ings.map(([n], i) => `${n}: ${v.amounts[i]} ${TIMES} ${dec(f)}`).join(', '), 'Multiply every ingredient by the same scale factor.'),
          step('A1', R.ings.map(([n, u], i) => ingLine(n as string, u as string, f.mul(v.amounts[i]))).join(', '), 'All the ingredients, with units.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const shortI = R.ings.findIndex((_, i) => Q.of(v.have[i]).lt(f.mul(v.amounts[i])));
      return [
        [
          step('P1', scale, `Scale up from ${R.batch} to ${v.target}.`),
          step('P1', R.ings.map(([n, u], i) => `${n} ${qty(f.mul(v.amounts[i]), u as string)}`).join(', '), 'Work out how much of EACH ingredient is needed.'),
          step('A1', R.ings.map(([, u], i) => `${qty(f.mul(v.amounts[i]), u as string)} ${Q.of(v.have[i]).cmp(f.mul(v.amounts[i])) >= 0 ? '⩽' : '>'} ${qty(v.have[i], u as string)}`).join('; '), 'Compare each one with what is available.'),
          step('C1', shortI < 0 ? 'Yes, there is enough of everything' : `No, not enough ${R.ings[shortI][0]}`, 'Say which ingredient is short, with the numbers that show it.'),
        ],
      ];
    }
    const per = R.ings.map((_, i) => Math.floor((v.have[i] * R.batch) / v.amounts[i]));
    const lim = per.indexOf(Math.min(...per));
    const [ln, lu] = R.ings[lim];
    return [
      [
        step('P1', R.ings.map(([n], i) => `${n}: ${v.have[i]} ${DIV} ${v.amounts[i]} = ${approx(Q.of(v.have[i], v.amounts[i]))}`).join(', '), 'How many batches each ingredient would make on its own.'),
        step('P1', `${ln} runs out first`, 'The ingredient that makes the fewest batches limits the number of items.'),
        step('P1', `${v.have[lim]}${lu ? ` ${lu}` : ''} ${DIV} ${v.amounts[lim]} ${TIMES} ${R.batch} = ${approx(Q.of(v.have[lim] * R.batch, v.amounts[lim]))}`, `Convert to a number of ${R.item}.`),
        step('A1', `${maxItems(v)} ${R.item}`, 'Round DOWN: you cannot make part of one.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const R = RECIPES[v.r];
    if (v.level === 'foundational') {
      // Unitary method: amount for one item, then times the target.
      const got = (answers[0].text.match(/\d+(?:\.\d+)?/g) ?? []).map((s) => Q.of(s));
      R.ings.forEach((_, i) => {
        if (!got[i] || !got[i].eq(Q.of(v.amounts[i], R.batch).mul(v.target))) p.push(`ingredient ${i}`);
      });
      return p;
    }
    // Try making 1, 2, 3, … items until something runs out.
    const canMake = (n: number) => R.ings.every((_, i) => v.amounts[i] * n <= v.have[i] * R.batch);
    if (v.level === 'core') {
      if (answers[0].text.startsWith('Yes') !== canMake(v.target)) p.push('decision');
      return p;
    }
    let n = 0;
    while (canMake(n + 1)) n++;
    if (answers[0].text !== `${n} ${R.item}`) p.push(`expected ${n}`);
    return p;
  },

  key: (v) => `${v.r}|${v.amounts}|${v.have}|${v.target}`,
});

function maxItems(v: V): number {
  const R = RECIPES[v.r];
  return Math.min(...R.ings.map((_, i) => Math.floor((v.have[i] * R.batch) / v.amounts[i])));
}
