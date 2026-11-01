import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex, roundFloatDp, roundFloatSf } from '../../engine/format';

import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 June 2018 Q6: a quadratic profit model with a maximum,
 * written as A − a(x − p)², then the price range that gives a target profit and
 * the smallest price in pence. Core follows the projectile-style models in the
 * mocks. Limitations of the model always earn a mark, so one is asked for.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: Q;
  p: number;
  top: number; // the maximum value A
  start: number; // core: height at x = 0
  d: number; // stretch: known point is x = p + d
  low: number; // stretch: value at x = p + d
  target: number; // stretch: the target profit
}

const form = (v: V) => `${v.top} - ${v.a.eq(1) ? '' : fracTex(v.a)}(x - ${v.p})^2`;

export default defineTemplate<V>({
  id: 'y12-quadratic-model',
  title: 'Modelling with a quadratic',
  strand: 'Pure',
  subtopic: 'Quadratics',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base = { level, a: Q.of(1), p: 0, top: 0, start: 0, d: 0, low: 0, target: 0 };
    if (level === 'foundational') {
      return { ...base, a: Q.of(rng.int(2, 6)), p: rng.int(6, 15), top: rng.step(100, 600, 10) };
    }
    if (level === 'core') {
      const p = rng.pick([4, 5, 8, 10, 12]);
      const top = rng.int(6, 18);
      const start = rng.int(1, 3);
      const a = Q.of(top - start, p * p);
      ensure(!/\.0+$/.test(roundFloatSf(p + Math.sqrt(top / a.toNumber()), 3)), 'no trailing zero in the answer');
      return { ...base, a, p, top, start };
    }
    const top = rng.step(60, 140, 5);
    const d = rng.int(2, 5);
    const low = top - rng.int(2, 8) * d * d;
    ensure(low > 0, 'the known profit must be positive');
    const a = Q.of(top - low, d * d);
    const target = top - rng.int(3, 20);
    ensure(target > low && Number.isInteger(a.toNumber()), 'the target lies between the two profits');
    const p = rng.int(6, 12);
    const lower = p - Math.sqrt((top - target) / a.toNumber());
    // The answer is the next whole penny, so the root must not land on one.
    const pence = lower * 100;
    ensure(Math.abs(pence - Math.round(pence)) > 1e-4, 'root on a whole penny');
    return { ...base, a, p, top, d, low, target };
  },

  validate(v) {
    return v.a.isPositive() ? [] : ['the model needs a maximum'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const a = v.a.toInt();
      const c = v.top - a * v.p * v.p;
      return {
        stem: lines('A small business sells one product.', `The profit, £$P$, made in a week when the product is sold at £$x$ is modelled by`, `$P = ${polyTex([-a, 2 * a * v.p, c])}$`),
        parts: [
          part('a', 3, text('Write $P$ in the form  $A - B(x - C)^2$  where $A$, $B$ and $C$ are constants to be found.')),
          part('b', 2, text('Using your answer to part (a), state the maximum weekly profit and the selling price that gives it.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(
          'A ball is thrown from a point above horizontal ground.',
          'At a horizontal distance of $x$ metres from the point of release, the height of the ball above the ground is $h$ metres.',
          `The ball is released at a height of ${v.start} m and reaches a maximum height of ${v.top} m when $x = ${v.p}$`,
          'The height is modelled as a quadratic function of $x$.',
        ),
        parts: [
          part('a', 3, text('Find an equation for $h$ in terms of $x$')),
          part('b', 3, text('Find, according to the model, the horizontal distance from the point of release to where the ball hits the ground. Give your answer to 3 significant figures.')),
          part('c', 1, text('State one limitation of the model.')),
        ],
      };
    }
    return {
      stem: lines(
        'A company sells a game at £$x$ each.',
        `The annual profit, £$P$ thousand, is modelled by  $P = A - B(x - ${v.p})^2$  where $A$ and $B$ are constants.`,
        `The maximum profit of £${v.top} thousand is made when $x = ${v.p}$`,
        `When $x = ${v.p + v.d}$ the profit is £${v.low} thousand.`,
      ),
      parts: [
        part('a', 2, text('Find the value of $B$')),
        part('b', 3, text(`Find the range of values of $x$ for which the profit is more than £${v.target} thousand. Give each limit to 2 decimal places.`)),
        part('c', 2, text(`Find the lowest price, to the nearest penny, that gives a profit of more than £${v.target} thousand.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$P = ${form(v)}$` }, { text: `£${v.top} when $x = ${v.p}$` }];
    if (v.level === 'core') {
      const dist = v.p + Math.sqrt(v.top / v.a.toNumber());
      return [{ text: `$h = ${form(v)}$` }, { text: `${roundFloatSf(dist, 3)} m` }, { text: 'For example, the ball is treated as a particle, or air resistance is ignored.' }];
    }
    const w = Math.sqrt((v.top - v.target) / v.a.toNumber());
    const penny = Math.ceil((v.p - w) * 100);
    return [{ text: `$B = ${fracTex(v.a)}$` }, { text: `$${roundFloatDp(v.p - w, 2)} < x < ${roundFloatDp(v.p + w, 2)}$` }, { text: `£${(penny / 100).toFixed(2)}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const a = v.a.toInt();
      const c = v.top - a * v.p * v.p;
      return [
        [
          step('M1', `$P = -${a}(x^2 - ${2 * v.p}x) ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`, 'Take the coefficient of x² out of the first two terms.'),
          step('M1', `$P = -${a}[(x - ${v.p})^2 - ${v.p * v.p}] ${c < 0 ? '-' : '+'} ${Math.abs(c)}$`, 'Complete the square inside the bracket.'),
          step('A1', `$P = ${form(v)}$`, 'Multiply out the square bracket and collect the numbers.'),
        ],
        [step('B1', `Maximum profit = £${v.top}`, 'The squared term is never negative, so P is largest when that term is 0.'), step('B1', `$x = ${v.p}$, so a price of £${v.p}`, 'This makes the bracket zero.')],
      ];
    }
    if (v.level === 'core') {
      const dist = v.p + Math.sqrt(v.top / v.a.toNumber());
      return [
        [
          step('M1', `$h = ${v.top} - B(x - ${v.p})^2$`, 'Use the maximum point to write the model in completed-square form.'),
          step('M1', `$${v.start} = ${v.top} - B(0 - ${v.p})^2$`, `The ball starts at x = 0 with height ${v.start}.`),
          step('A1', `$h = ${form(v)}$`, `So B = ${v.top - v.start} ÷ ${v.p * v.p}, written in its simplest form.`),
        ],
        [
          step('M1', `$0 = ${form(v)}$`, 'The ball hits the ground when h = 0.'),
          step('M1', `$x = ${v.p} \\pm \\sqrt{${v.top} \\div ${fracTex(v.a)}}$`, 'Rearrange and take the square root of both sides.'),
          step('A1', `$x = ${roundFloatSf(dist, 3)}$ m`, 'Take the positive root: the other is behind the thrower.'),
        ],
        [step('B1', 'For example, air resistance is ignored.', 'Any sensible limitation: the ball is not a particle, spin, wind or uneven ground.')],
      ];
    }
    const w = Math.sqrt((v.top - v.target) / v.a.toNumber());
    const penny = Math.ceil((v.p - w) * 100);
    return [
      [step('M1', `$${v.low} = ${v.top} - B(${v.p + v.d} - ${v.p})^2$`, 'Substitute the known point.'), step('A1', `$B = ${fracTex(v.a)}$`, `${v.top - v.low} ÷ ${v.d * v.d}`)],
      [
        step('M1', `$${form(v)} > ${v.target}$`, 'Set up the inequality with the values of A and B.'),
        step('M1', `$(x - ${v.p})^2 < ${fracTex(Q.of(v.top - v.target).div(v.a))}$`, 'Rearrange. Dividing by the positive number keeps the sign the same.'),
        step('A1', `$${roundFloatDp(v.p - w, 2)} < x < ${roundFloatDp(v.p + w, 2)}$`, 'The values of x lie between the two square roots.'),
      ],
      [
        step('M1', `$x > ${(v.p - w).toFixed(4)}\\ldots$`, 'Use the unrounded lower limit.'),
        step('A1', `£${(penny / 100).toFixed(2)}`, 'Round up: rounding down would give a profit below the target.'),
      ],
    ];
  },

  check(v, answers) {
    const P = (x: number) => v.top - v.a.toNumber() * (x - v.p) ** 2;
    if (v.level === 'foundational') {
      // Vertex from the expanded form, by calculus.
      const a = v.a.toInt();
      const peak = (2 * a * v.p) / (2 * a);
      return peak === v.p && P(peak) === v.top ? [] : ['vertex'];
    }
    if (v.level === 'core') {
      const x = Number(answers[1].text.replace(/[^\d.]/g, ''));
      if (Math.abs(P(0) - v.start) > 1e-9) return ['start'];
      return Math.abs(P(x)) < 0.3 + Math.abs(2 * v.a.toNumber() * (x - v.p)) * 0.01 ? [] : ['landing'];
    }
    const pounds = Number(answers[2].text.replace('£', ''));
    return P(pounds) > v.target && P(pounds - 0.01) <= v.target ? [] : ['penny'];
  },

  key: (v) => `${v.a}|${v.p}|${v.top}|${v.start}|${v.d}|${v.low}|${v.target}`,
});
