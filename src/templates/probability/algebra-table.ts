import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, table, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { dec, ensure, frac, fracRaw, int } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';
import { names } from '../../contexts/names';
import { SURVEY_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 23 2H Q4 (library survey: probabilities 0.24, 0.40, 3x, x;
 * 48 answered comedy; how many answered mystery?) and Set 24 2H Q8 (counters
 * x + 7, x − 11, 3x, P(red) = 1/4, find P(yellow)).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof SURVEY_CONTEXTS)[number];
  N: number;
  counts: number[]; // four counts, sum N (survey) — order matches ctx.options
  k: number; // count[2] = k × count[3] (core); 1 for foundational
  // stretch (counters)
  name: string;
  T: number;
  redFrac: Q;
  a: number; // red = x + a
  b: number; // blue = x − b
  m: number; // green = m x
  x: number;
}

export default defineTemplate<V>({
  id: 'prob-algebra-table',
  title: 'Probability tables with an unknown',
  strand: 'Probability',
  subtopic: 'Probability tables',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'either',

  generate({ rng, tier, level }) {
    const ctx = rng.pick(SURVEY_CONTEXTS);
    const [name] = names(rng, 1);
    const base: V = { level, ctx, N: 0, counts: [], k: 1, name, T: 0, redFrac: Q.of(0), a: 0, b: 0, m: 0, x: 0 };
    if (level === 'stretch') {
      const redFrac = rng.pick([Q.of(1, 4), Q.of(1, 5), Q.of(3, 10), Q.of(1, 3), Q.of(2, 5)]);
      const T = rng.step(40, 150, Number(redFrac.d));
      const red = redFrac.mul(T).toInt();
      const a = rng.int(2, 12);
      const x = red - a;
      const b = rng.int(1, 12);
      const m = rng.int(2, 3);
      ensure(x - b >= 2, 'blue must be positive');
      const yellow = T - red - (x - b) - m * x;
      ensure(yellow >= 2, 'yellow must be positive');
      return { ...base, T, redFrac, a, b, m, x };
    }
    const N = rng.pick(tier === 'KS3' ? [50, 100, 200] : [50, 100, 150, 200, 250, 300, 400, 500]);
    const g = N / gcdInt(N, 100); // counts must be multiples of g for 2 d.p. probabilities
    const U = N / g;
    const k = level === 'foundational' ? 1 : rng.int(2, 4);
    const xu = rng.int(1, Math.floor(U / (k + 3)));
    // x appears once in the foundational table, k + 1 times otherwise.
    const rest = U - (level === 'foundational' ? 1 : k + 1) * xu;
    ensure(rest >= (level === 'foundational' ? 6 : 4), 'room for the known options');
    const c1u = rng.int(2, rest - 2);
    const c2u = rest - c1u;
    let counts: number[];
    if (level === 'foundational') {
      // Three known, one unknown x.
      ensure(c2u >= 2, 'room for a third known option');
      const third = rng.int(1, c2u - 1);
      counts = [c1u, c2u - third, third, xu].map((u) => u * g);
    } else counts = [c1u, c2u, k * xu, xu].map((u) => u * g);
    ensure(new Set(counts).size === 4, 'four different counts');
    return { ...base, N, counts, k };
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      const red = v.redFrac.mul(v.T);
      if (!red.isInt() || !red.eq(v.x + v.a)) p.push('red count');
      return p;
    }
    if (v.counts.reduce((s, c) => s + c, 0) !== v.N) p.push('counts must sum to N');
    if (v.counts.some((c) => !Q.of(c, v.N).terminatesWithin(2))) p.push('probability not 2 d.p.');
    return p;
  },

  render(v) {
    if (v.level === 'stretch') {
      const { T, a, b, m, redFrac } = v;
      return {
        stem: lines(
          'In a bag, there are only red counters, blue counters, green counters and yellow counters.',
          `The total number of counters in the bag is ${T}`,
          'In the bag',
          `the number of red counters is $x + ${a}$`,
          `the number of blue counters is $x - ${b}$`,
          `the number of green counters is $${m}x$`,
          `${v.name} takes at random a counter from the bag.`,
          `The probability that the counter is red is ${frac(redFrac)}`,
        ),
        parts: [single(4, text(`Work out the probability that ${v.name} takes a yellow counter.`))],
      };
    }
    const opts = v.ctx.options;
    const prob = (i: number) => dec(Q.of(v.counts[i], v.N));
    const row = v.level === 'foundational' ? [prob(0), prob(1), prob(2), '$x$'] : [prob(0), prob(1), `$${v.k}x$`, '$x$'];
    const stem = [
      text(v.ctx.who),
      text(`One of the ${v.ctx.group} is chosen at random.`),
      text(`The table shows information about the probability of the ${v.ctx.header.toLowerCase()} that this person ${v.ctx.verb}.`),
      table({ header: [v.ctx.header, ...opts], rows: [['Probability', ...row]], rowHeaders: true }),
    ];
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 2, text('Work out the value of $x$')),
          part('b', 2, text(`${int(v.N)} ${v.ctx.group} were asked altogether.`), text(`Work out how many of the ${v.ctx.group} ${v.ctx.verb} ${opts[3]}.`)),
        ],
      };
    }
    stem.push(text(`${int(v.counts[0])} ${v.ctx.group} ${v.ctx.verb} ${opts[0]}.`));
    return { stem, parts: [single(4, text(`Work out how many of the ${v.ctx.group} ${v.ctx.verb} ${opts[2]}.`))] };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const yellow = v.T - (v.x + v.a) - (v.x - v.b) - v.m * v.x;
      return [{ text: frac(Q.of(yellow, v.T)) }];
    }
    if (v.level === 'foundational') return [{ text: `$x$ = ${dec(Q.of(v.counts[3], v.N))}` }, { text: int(v.counts[3]) }];
    return [{ text: int(v.counts[2]) }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const { T, a, b, m, x } = v;
      const red = x + a;
      const blue = x - b;
      const green = m * x;
      const yellow = T - red - blue - green;
      return [
        [
          step('P1', `${frac(v.redFrac)} ${TIMES} ${T} = ${red} red counters`, 'Use the probability to find how many red counters there are.'),
          step('P1', `$x + ${a} = ${red}$, so $x = ${x}$`, 'Set the red expression equal to the number of red counters.'),
          step('P1', `blue = ${x} ${MINUS} ${b} = ${blue}, green = ${m} ${TIMES} ${x} = ${green}, yellow = ${T} ${MINUS} ${red} ${MINUS} ${blue} ${MINUS} ${green} = ${yellow}`, 'Substitute $x$ to find the other colours; yellow is what is left.'),
          step('A1', `${fracRaw(yellow, T)}${gcdInt(yellow, T) > 1 ? ` = ${frac(Q.of(yellow, T))}` : ''}`, 'Probability = yellow counters ÷ total counters.'),
        ],
      ];
    }
    const prob = (i: number) => dec(Q.of(v.counts[i], v.N));
    if (v.level === 'foundational') {
      const knownSum = Q.of(v.counts[0] + v.counts[1] + v.counts[2], v.N);
      return [
        [step('M1', `$x$ = 1 ${MINUS} (${prob(0)} + ${prob(1)} + ${prob(2)})`, 'The probabilities add up to 1.'), step('A1', `$x$ = 1 ${MINUS} ${dec(knownSum)} = ${prob(3)}`, '')].map((s) => (s.note ? s : { ...s, note: 'Check: all four add to 1.' })),
        [step('M1', `${prob(3)} ${TIMES} ${int(v.N)}`, 'Probability × number of people asked.'), step('A1', `= ${int(v.counts[3])}`, 'The answer must be a whole number of people.')],
      ];
    }
    const known = Q.of(v.counts[0] + v.counts[1], v.N);
    const x = Q.of(v.counts[3], v.N);
    return [
      [
        step('P1', `${v.k}$x$ + $x$ = 1 ${MINUS} ${prob(0)} ${MINUS} ${prob(1)} = ${dec(Q.of(1).sub(known))}`, 'All the probabilities add up to 1, and $x$ appears ' + `${v.k + 1} times altogether.`),
        step('P1', `$x$ = ${dec(Q.of(1).sub(known))} ${DIV} ${v.k + 1} = ${dec(x)}, so P(${v.ctx.options[2]}) = ${v.k} ${TIMES} ${dec(x)} = ${prob(2)}`, `Find $x$, then the probability for ${v.ctx.options[2]}.`),
        step('P1', `${int(v.counts[0])} ${DIV} ${prob(0)} = ${int(v.N)} ${v.ctx.group} altogether`, `${int(v.counts[0])} is the ${prob(0)} share, so divide to find the total.`),
        step('A1', `${prob(2)} ${TIMES} ${int(v.N)} = ${int(v.counts[2])}`, 'Probability × total gives the number of people.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Brute force x over a range: the only x giving P(red) as stated.
      const sols: number[] = [];
      for (let x = 1; x < v.T; x++) if (Q.of(x + v.a, v.T).eq(v.redFrac)) sols.push(x);
      if (sols.length !== 1 || sols[0] !== v.x) p.push('x not unique');
      const counts = [v.x + v.a, v.x - v.b, v.m * v.x];
      const y = v.T - counts.reduce((s, c) => s + c, 0);
      if (counts.some((c) => c <= 0) || y <= 0) p.push('non-positive count');
      if (answers[0].text !== frac(Q.of(y, v.T))) p.push('yellow');
      return p;
    }
    // Solve from the displayed decimals only.
    const p0 = Q.of(dec(Q.of(v.counts[0], v.N)));
    const p1 = Q.of(dec(Q.of(v.counts[1], v.N)));
    if (v.level === 'foundational') {
      const p2 = Q.of(dec(Q.of(v.counts[2], v.N)));
      const x = Q.of(1).sub(p0).sub(p1).sub(p2);
      if (answers[0].text !== `$x$ = ${dec(x)}`) p.push('x');
      if (answers[1].text !== int(x.mul(v.N).toInt())) p.push('count');
      return p;
    }
    const x = Q.of(1).sub(p0).sub(p1).div(v.k + 1);
    const total = Q.of(v.counts[0]).div(p0);
    const want = x.mul(v.k).mul(total);
    if (!want.isInt() || answers[0].text !== int(want.toInt())) p.push('count');
    return p;
  },

  key: (v) => (v.level === 'stretch' ? `${v.T}|${v.redFrac}|${v.a}|${v.b}|${v.m}` : `${v.N}|${v.counts.join(',')}|${v.k}`),
});

