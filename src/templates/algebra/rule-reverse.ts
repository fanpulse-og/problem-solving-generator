import { defineTemplate } from '../../engine/types';
import { box, lines, part, single, step, text, TIMES, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure, hoursMinutes, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';
import { HIRE_RULES } from '../../contexts/scenarios';

/**
 * Modelled on Set 22 2F Q4 (Jakub's chicken) and Set 23 2F Q6 (cement mixer):
 * a rule in words used forwards, then backwards. Core adds a unit conversion
 * (hours and minutes) or rounding in context; stretch finds the rule from two
 * known cases first.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  kind: 'cook' | 'hire';
  name: string;
  name2: string;
  food: string;
  hire: { item: string; unit: string; units: string };
  currency: '£' | 'euros';
  rate: number; // minutes per kg, or cost per unit
  fixed: number;
  x1: Q; // forward input (kg or units)
  x2: Q; // reverse input (the answer)
  budget: number; // hire core: money available (answer = floor)
  known: [Q, Q]; // stretch: two inputs with known outputs
}

const out = (v: V, x: Q) => x.mul(v.rate).add(v.fixed);

function cost(v: V, amount: Q | number): string {
  const s = amount instanceof Q ? dec(amount) : int(amount);
  return v.currency === '£' ? `£${s}` : `${s} euros`;
}

export default defineTemplate<V>({
  id: 'alg-rule-reverse',
  title: 'Using a rule forwards and backwards',
  strand: 'Algebra',
  subtopic: 'Forming & using formulae',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'backwards',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [name, name2] = names(rng, 2);
    const kind = rng.chance(0.5) ? 'cook' : 'hire';
    let rate: number, fixed: number, x1: Q, x2: Q;
    if (kind === 'cook') {
      rate = calc === 'non-calc' || tier === 'KS3' ? rng.pick([30, 40, 50]) : rng.pick([35, 40, 45, 50]);
      fixed = rng.pick([15, 20, 25, 30]);
      const tenth = () => (tier === 'KS3' ? Q.of(rng.int(2, 8), 2) : Q.of(rng.int(12, 35), 10));
      x1 = tenth();
      x2 = tenth();
    } else {
      rate = rng.int(tier === 'KS3' ? 5 : 6, tier === 'KS3' ? 12 : 28);
      fixed = rng.int(3, 20);
      x1 = Q.of(0); // set below once the hire item is known
      x2 = Q.of(0);
    }
    const hire = rng.pick(HIRE_RULES);
    if (kind === 'hire') {
      const max = hire.unit === 'hour' ? 8 : 12;
      x1 = Q.of(rng.int(2, Math.min(6, max)));
      x2 = Q.of(rng.int(3, max));
    }
    ensure(!x1.eq(x2), 'use two different inputs');
    const v: V = {
      level,
      kind,
      name,
      name2,
      food: rng.pick(['chicken', 'turkey', 'joint of beef', 'leg of lamb']),
      hire,
      currency: rng.pick(['£', 'euros'] as const),
      rate,
      fixed,
      x1,
      x2,
      budget: 0,
      known: [Q.of(0), Q.of(0)],
    };
    ensure(out(v, x1).isInt() && out(v, x2).isInt(), 'outputs must be whole');
    if (kind === 'cook' && level !== 'foundational') ensure(out(v, x2).toInt() >= 70, 'time should be over an hour');
    if (kind === 'hire' && level === 'core') {
      // Budget that is NOT an exact number of days, so rounding down matters.
      v.budget = out(v, x2).toInt() + rng.int(1, rate - 1);
    }
    if (level === 'stretch') {
      const a = kind === 'cook' ? Q.of(rng.int(2, 3)) : Q.of(rng.int(2, 4));
      const b = a.add(kind === 'cook' ? rng.pick([1, 2]) : rng.int(2, 4));
      v.known = [a, b];
      ensure(![a, b].some((k) => k.eq(x2)), 'asked input must be new');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.rate <= 0 || v.fixed <= 0) p.push('rule must be positive');
    if (!out(v, v.x2).isInt()) p.push('non-integer output');
    if (v.kind === 'hire' && v.level === 'core' && Q.of(v.budget - v.fixed).div(v.rate).isInt()) p.push('budget divides exactly');
    return p;
  },

  render(v) {
    if (v.kind === 'cook') {
      const rule = box(`Cooking time: ${v.rate} minutes for each kilogram`, `plus an extra ${v.fixed} minutes`);
      if (v.level === 'stretch') {
        const [a, b] = v.known;
        return {
          stem: lines(
            `${v.name} uses a rule of this form to work out the time it takes to cook a ${v.food}.`,
          ).concat(
            box('Cooking time: … minutes for each kilogram', 'plus an extra … minutes'),
            ...lines(
              `Using the rule, a ${v.food} of weight ${dec(a)} kg takes ${hoursMinutes(out(v, a).toInt())} to cook.`,
              `Using the rule, a ${v.food} of weight ${dec(b)} kg takes ${hoursMinutes(out(v, b).toInt())} to cook.`,
            ),
          ),
          parts: [single(4, text(`Work out how long it will take to cook a ${v.food} of weight ${dec(v.x2)} kg.`), text('Give your answer in hours and minutes.'))],
        };
      }
      const stem = [text(`${v.name} is going to use this rule to work out the number of minutes it will take to cook a ${v.food}.`), rule];
      const t2 = out(v, v.x2).toInt();
      return {
        stem,
        parts: [
          part('a', 2, text(`The weight of ${v.name}’s ${v.food} is ${dec(v.x1)} kg`), text(`Use the rule to work out the number of minutes it will take to cook ${v.name}’s ${v.food}.`)),
          v.level === 'foundational'
            ? part('b', 2, text(`${v.name2} uses the rule and works out that it will take ${int(t2)} minutes to cook a ${v.food}.`), text(`Work out the weight of ${v.name2}’s ${v.food}.`))
            : part('b', 3, text(`${v.name2} uses the rule and works out that it will take ${hoursMinutes(t2)} to cook a ${v.food}.`), text(`Work out the weight of ${v.name2}’s ${v.food}.`)),
        ],
      };
    }
    const { item, unit, units } = v.hire;
    const rule = box(`Total cost = ${cost(v, v.rate)} per ${unit} plus ${cost(v, v.fixed)}`);
    if (v.level === 'stretch') {
      const [a, b] = v.known;
      return {
        stem: lines(
          `A shop uses a rule of this form to work out the total cost of hiring ${item}.`,
        ).concat(
          box(`Total cost = … per ${unit} plus …`),
          ...lines(
            `Hiring ${item} for ${dec(a)} ${units} costs ${cost(v, out(v, a))}`,
            `Hiring ${item} for ${dec(b)} ${units} costs ${cost(v, out(v, b))}`,
          ),
        ),
        parts: [single(4, text(`${v.name} hires ${item} for ${dec(v.x2)} ${units}.`), text('Work out the total cost.'))],
      };
    }
    const stem = [text(`The following rule is used to work out the total cost of hiring ${item}.`), rule];
    return {
      stem,
      parts: [
        part('a', 2, text(`${v.name} hires ${item} for ${dec(v.x1)} ${units}.`), text(`Work out the total cost.`)),
        v.level === 'foundational'
          ? part('b', 2, text(`The total cost to ${v.name2} of hiring ${item} is ${cost(v, out(v, v.x2))}`), text(`For how many ${units} does ${v.name2} hire ${item}?`))
          : part('b', 3, text(`${v.name2} has ${cost(v, v.budget)} to spend on hiring ${item}.`), text(`Work out the greatest number of ${units} for which ${v.name2} can hire ${item}.`)),
      ],
    };
  },

  answer(v) {
    const unitWord = v.kind === 'cook' ? 'kg' : v.hire.units;
    if (v.level === 'stretch') {
      return [{ text: v.kind === 'cook' ? hoursMinutes(out(v, v.x2).toInt()) : cost(v, out(v, v.x2)) }];
    }
    const a = v.kind === 'cook' ? `${int(out(v, v.x1).toInt())} minutes` : cost(v, out(v, v.x1));
    const b = v.kind === 'hire' && v.level === 'core' ? `${Q.of(v.budget - v.fixed).div(v.rate).floor()} ${unitWord}` : `${dec(v.x2)} ${unitWord}`;
    return [{ text: a }, { text: b }];
  },

  markScheme(v) {
    const o1 = out(v, v.x1);
    const o2 = out(v, v.x2).toInt();
    const fmtOut = (q: Q | number) => (q instanceof Q ? dec(q) : int(q));
    if (v.level === 'stretch') {
      const [a, b] = v.known;
      const oa = out(v, a).toInt();
      const ob = out(v, b).toInt();
      const diffX = b.sub(a);
      const per = v.kind === 'cook' ? 'kilogram' : v.hire.unit;
      return [
        [
          step('P1', `${fmtOut(ob)} ${MINUS} ${fmtOut(oa)} = ${fmtOut(ob - oa)} for ${dec(diffX)} extra ${v.kind === 'cook' ? 'kg' : v.hire.units}, so ${fmtOut(v.rate)} for each ${per}`, v.kind === 'cook' ? 'Change the times to minutes first. The difference comes only from the extra weight.' : 'The difference in cost comes only from the extra time.'),
          step('P1', `${fmtOut(oa)} ${MINUS} ${dec(a)} ${TIMES} ${fmtOut(v.rate)} = ${fmtOut(v.fixed)} extra`, 'Use one of the cases to find the fixed part of the rule.'),
          step('P1', `${dec(v.x2)} ${TIMES} ${fmtOut(v.rate)} + ${fmtOut(v.fixed)} = ${fmtOut(o2)}${v.kind === 'cook' ? ' minutes' : ''}`, 'Now use the rule forwards.'),
          step('A1', v.kind === 'cook' ? `${int(o2)} minutes = ${hoursMinutes(o2)}` : cost(v, o2), v.kind === 'cook' ? 'Divide by 60 for the hours; the remainder is the minutes.' : 'Remember the currency.'),
        ],
      ];
    }
    const partA = [
      step('M1', `${dec(v.x1)} ${TIMES} ${fmtOut(v.rate)} + ${fmtOut(v.fixed)}`, 'Multiply first, then add on the extra.'),
      step('A1', `= ${v.kind === 'cook' ? `${dec(o1)} minutes` : cost(v, o1)}`, v.kind === 'cook' ? 'Give the units: minutes.' : 'Remember the currency.'),
    ];
    if (v.kind === 'hire' && v.level === 'core') {
      const avail = v.budget - v.fixed;
      const exact = Q.of(avail, v.rate);
      return [
        partA,
        [
          step('P1', `${fmtOut(v.budget)} ${MINUS} ${fmtOut(v.fixed)} = ${fmtOut(avail)}`, 'Take off the fixed charge first: it is paid only once.'),
          step('P1', `${int(avail)} ${DIV} ${v.rate} = ${exact.isInt() ? int(exact.toInt()) : `${exact.floor()} remainder ${avail - Number(exact.floor()) * v.rate}`}`, `Each ${v.hire.unit} costs ${fmtOut(v.rate)}.`),
          step('A1', `${exact.floor()} ${v.hire.units}`, `Round DOWN: there isn’t enough money for another full ${v.hire.unit}.`),
        ],
      ];
    }
    const partB = [
      ...(v.level === 'core'
        ? [step('P1', `${hoursMinutes(o2)} = ${int(o2)} minutes`, 'Change the time into minutes, because the rule uses minutes.')]
        : []),
      step('M1', `${fmtOut(o2)} ${MINUS} ${fmtOut(v.fixed)} = ${fmtOut(o2 - v.fixed)}, then ${DIV} ${fmtOut(v.rate)}`, 'Work backwards: undo “add” by subtracting, undo “multiply” by dividing.'),
      step('A1', `= ${dec(v.x2)} ${v.kind === 'cook' ? 'kg' : v.hire.units}`, 'Check it forwards using the rule.'),
    ];
    if (v.level === 'core') partB[1] = { ...partB[1], code: 'P1' };
    return [partA, partB];
  },

  check(v, answers) {
    const p: string[] = [];
    // Forwards: the answer fed through the rule must reproduce the given output.
    if (v.level === 'stretch') {
      // Recover the rule from the two known cases by solving simultaneously.
      const [a, b] = v.known;
      const rate = out(v, b).sub(out(v, a)).div(b.sub(a));
      const fixed = out(v, a).sub(rate.mul(a));
      if (!rate.eq(v.rate) || !fixed.eq(v.fixed)) p.push('rule not recovered');
      const o = v.x2.mul(rate).add(fixed);
      const expect = v.kind === 'cook' ? hoursMinutes(o.toInt()) : cost(v, o);
      if (answers[0].text !== expect) p.push('stretch answer');
      return p;
    }
    if (v.kind === 'hire' && v.level === 'core') {
      // Brute force: the largest n whose cost fits the budget.
      let n = 0;
      while (out(v, Q.of(n + 1)).toNumber() <= v.budget) n++;
      if (answers[1].text !== `${n} ${v.hire.units}`) p.push('budget days');
      return p;
    }
    const given = out(v, v.x2);
    const back = given.sub(v.fixed).div(v.rate);
    if (!back.eq(v.x2)) p.push('reverse mismatch');
    if (!answers[1].text.startsWith(dec(back) + ' ')) p.push('answer b');
    return p;
  },

  key: (v) => `${v.kind}|${v.rate}|${v.fixed}|${v.x1}|${v.x2}|${v.budget}|${v.known}`,
});
