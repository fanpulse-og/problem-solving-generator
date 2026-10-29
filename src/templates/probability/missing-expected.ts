import { defineTemplate } from '../../engine/types';
import { part, sentence, single, step, table, text, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';
import { SPINNER_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 22 2F Q11 / 1H Q1 (biased spinner: P(red or yellow), then
 * an estimate for purple in 300 spins). Stretch has two missing probabilities
 * linked by "twice as likely".
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof SPINNER_CONTEXTS)[number];
  name: string;
  p: number[]; // hundredths, sum 100
  missing: number[]; // indices hidden in the table
  mult: number; // stretch: p[missing[0]] = mult × p[missing[1]]
  trials: number;
  ask: number; // index of the outcome asked about in the expected-frequency part
  orPair: [number, number]; // core (a)
}

const P = (h: number) => dec(Q.of(h, 100));

export default defineTemplate<V>({
  id: 'prob-missing-expected',
  title: 'Missing probability and expected frequency',
  strand: 'Probability',
  subtopic: 'Probability tables',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const ctx = rng.pick(SPINNER_CONTEXTS);
    const [name] = names(rng, 1);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    const stepP = tier === 'KS3' ? 10 : friendly ? 5 : 1;
    const idx = rng.shuffle([0, 1, 2, 3]);
    let p: number[];
    let missing: number[];
    let mult = 0;
    if (level === 'stretch') {
      mult = rng.int(2, 4);
      const known = [rng.step(5, 40, stepP), rng.step(5, 40, stepP)];
      const rest = 100 - known[0] - known[1];
      ensure(rest > 0 && rest % (mult + 1) === 0, 'rest must split');
      const x = rest / (mult + 1);
      p = [0, 0, 0, 0];
      p[idx[0]] = known[0];
      p[idx[1]] = known[1];
      p[idx[2]] = mult * x;
      p[idx[3]] = x;
      missing = [idx[2], idx[3]];
    } else {
      const known = [rng.step(5, 40, stepP), rng.step(5, 40, stepP), rng.step(5, 40, stepP)];
      const last = 100 - known.reduce((a, b) => a + b, 0);
      ensure(last >= 5, 'missing probability must be positive');
      p = [0, 0, 0, 0];
      known.forEach((k, i) => (p[idx[i]] = k));
      p[idx[3]] = last;
      missing = [idx[3]];
    }
    ensure(new Set(p).size >= 3, 'mostly different probabilities');
    const ask = level === 'foundational' ? idx[0] : missing[0];
    const trialChoices = [50, 80, 120, 150, 200, 250, 300, 400, 500, 600];
    const usable = trialChoices.filter((n) => (n * p[ask]) % 100 === 0 && (!friendly || n % 50 === 0 || n % 20 === 0));
    ensure(usable.length > 0, 'expected frequency must be whole');
    const trials = rng.pick(usable);
    const orPair = [idx[0], idx[1]].sort() as [number, number];
    return { level, ctx, name, p, missing, mult, trials, ask, orPair };
  },

  validate(v) {
    const p: string[] = [];
    if (v.p.reduce((a, b) => a + b, 0) !== 100) p.push('probabilities must sum to 1');
    if (v.p.some((x) => x <= 0 || x >= 100)) p.push('each probability strictly between 0 and 1');
    if ((v.trials * v.p[v.ask]) % 100 !== 0) p.push('expected count not whole');
    return p;
  },

  render(v) {
    const o = v.ctx.outcomes;
    const known = o.filter((_, i) => !v.missing.includes(i));
    const cells = v.p.map((x, i) => (v.missing.includes(i) ? '' : P(x)));
    const stem = [
      text(v.ctx.intro),
      text(`${v.ctx.once} ${known.join(' or ')} are given in the table.`),
      table({ header: [v.ctx.header, ...o], rows: [['Probability', ...cells]], rowHeaders: true }),
    ];
    const trials = text(v.ctx.trials(v.name, int(v.trials)));
    if (v.level === 'stretch') {
      const [a, b] = v.missing;
      stem.push(text(sentence(`The probability that ${v.ctx.event(o[a])} is ${mult(v.mult)} the probability that ${v.ctx.event(o[b])}`)));
      return { stem, parts: [single(4, trials, text(sentence(`Work out an estimate for the number of times ${v.ctx.event(o[a])}`)))] };
    }
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 2, text(sentence(`Work out the probability that ${v.ctx.event(o[v.missing[0]])}`))),
          part('b', 2, trials, text(sentence(`Work out an estimate for the number of times ${v.ctx.event(o[v.ask])}`))),
        ],
      };
    }
    const [i, j] = v.orPair;
    return {
      stem,
      parts: [
        part('a', 1, text(sentence(`Work out the probability that ${v.ctx.event(o[i])} or ${o[j]}`))),
        part('b', 3, trials, text(sentence(`Work out an estimate for the number of times ${v.ctx.event(o[v.ask])}`))),
      ],
    };
  },

  answer(v) {
    const expected = int((v.trials * v.p[v.ask]) / 100);
    if (v.level === 'stretch') return [{ text: expected }];
    if (v.level === 'foundational') return [{ text: P(v.p[v.missing[0]]) }, { text: expected }];
    return [{ text: P(v.p[v.orPair[0]] + v.p[v.orPair[1]]) }, { text: expected }];
  },

  markScheme(v) {
    const o = v.ctx.outcomes;
    const knownIdx = [0, 1, 2, 3].filter((i) => !v.missing.includes(i));
    const knownSum = knownIdx.reduce((s, i) => s + v.p[i], 0);
    const sumStep = `${knownIdx.map((i) => P(v.p[i])).join(' + ')} = ${P(knownSum)}`;
    const expected = (v.trials * v.p[v.ask]) / 100;
    const expStep = step('A1', `${P(v.p[v.ask])} ${TIMES} ${int(v.trials)} = ${int(expected)}`, 'Expected number = probability × number of trials.');
    if (v.level === 'stretch') {
      const [a, b] = v.missing;
      const rest = 100 - knownSum;
      return [
        [
          step('P1', `${sumStep}, so 1 ${MINUS} ${P(knownSum)} = ${P(rest)} for ${o[a]} and ${o[b]} together`, 'All the probabilities add up to 1.'),
          step('P1', `${o[b]} = $x$, ${o[a]} = ${v.mult}$x$, so ${v.mult + 1}$x$ = ${P(rest)}`, `“${mult(v.mult)[0].toUpperCase() + mult(v.mult).slice(1)}” means ${v.mult} lots of the other probability.`),
          step('P1', `$x$ = ${P(v.p[b])}, so P(${o[a]}) = ${v.mult} ${TIMES} ${P(v.p[b])} = ${P(v.p[a])}`, 'Solve, then find the probability you need.'),
          expStep,
        ],
      ];
    }
    if (v.level === 'foundational') {
      return [
        [step('M1', `1 ${MINUS} (${sumStep})`, 'The probabilities of all the outcomes add up to 1.'), step('A1', P(v.p[v.missing[0]]), '')].map((s) => (s.note ? s : { ...s, note: 'Check all four now add to 1.' })),
        [step('M1', `${P(v.p[v.ask])} ${TIMES} ${int(v.trials)}`, 'Multiply the probability by the number of trials.'), { ...expStep, working: `= ${int(expected)}`, note: 'This is an estimate, so it won’t always happen exactly.' }],
      ];
    }
    const [i, j] = v.orPair;
    return [
      [step('B1', `${P(v.p[i])} + ${P(v.p[j])} = ${P(v.p[i] + v.p[j])}`, '“Or” means add the probabilities.')],
      [step('P1', sumStep, 'Add the probabilities you know.'), step('P1', `1 ${MINUS} ${P(knownSum)} = ${P(v.p[v.ask])}`, 'The missing probability makes the total up to 1.'), expStep],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Recover the hidden probabilities from the table and the rule only.
    const known = v.p.map((x, i) => (v.missing.includes(i) ? null : Q.of(x, 100)));
    const rest = Q.of(1).sub(known.reduce<Q>((s, x) => (x ? s.add(x) : s), Q.of(0)));
    let target: Q;
    if (v.level === 'stretch') target = rest.mul(v.mult).div(v.mult + 1);
    else target = v.ask === v.missing[0] ? rest : known[v.ask]!;
    const exp = target.mul(v.trials);
    if (!exp.isInt()) p.push('expected not whole');
    if (answers[answers.length - 1].text !== int(exp.toInt())) p.push('expected answer');
    if (v.level === 'foundational' && answers[0].text !== dec(rest)) p.push('missing probability');
    if (v.level === 'core' && answers[0].text !== dec(Q.of(v.p[v.orPair[0]] + v.p[v.orPair[1]], 100))) p.push('or answer');
    return p;
  },

  key: (v) => `${v.p.join(',')}|${v.missing.join(',')}|${v.trials}|${v.ask}`,
});

function mult(k: number): string {
  return k === 2 ? 'twice' : k === 3 ? 'three times' : 'four times';
}
