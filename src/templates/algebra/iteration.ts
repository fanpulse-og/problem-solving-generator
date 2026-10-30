import { defineTemplate } from '../../engine/types';
import { part, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int, money, roundDp } from '../../engine/format';
import { Q, roundQ } from '../../engine/rational';

/**
 * Modelled on November 2022 2H Q12 (P(n+1) = 1.13 P(n): how many years for the
 * population to double?) and June 2022 3H Q20 (P(n+1) = aP(n) + 800; use two
 * years' profits to find a, then predict a later year). The examiner reports
 * say many students multiplied 1.13 by the number of years instead of using
 * the formula repeatedly, so the notes show each step.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  k: Q; // multiplier
  c: Q; // added constant
  p0: Q; // starting value
  year0: number; // core: first year shown
  target: Q; // stretch: threshold
}

const GROW = [
  { what: 'number of insects in a population', unit: '', at: 'at the start of year', thing: 'insects' },
  { what: 'number of bacteria in a dish', unit: '', at: 'after hour', thing: 'bacteria' },
  { what: 'number of members of a club', unit: '', at: 'at the start of year', thing: 'members' },
];

/** Nearest whole number, exactly (half up). */
const nearest = (q: Q) => roundQ(q, 0).toInt();
const iterate = (v: V, x: Q) => v.k.mul(x).add(v.c);

export default defineTemplate<V>({
  id: 'alg-iteration',
  title: 'Iterative growth and decay',
  strand: 'Algebra',
  subtopic: 'Sequences & iteration',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, ctx: rng.int(0, GROW.length - 1), k: Q.of(1), c: Q.of(0), p0: Q.of(0), year0: 0, target: Q.of(0) };
    if (level === 'foundational') {
      const k = Q.of(rng.int(105, 135), 100);
      const p0 = Q.of(rng.step(200, 5000, 50));
      // P3 to the nearest whole number must not sit on .5.
      const p3 = k.pow(2).mul(p0);
      ensure(!p3.sub(Q.of(p3.floor())).eq(Q.of(1, 2)), 'no rounding tie');
      return { ...base, k, p0 };
    }
    if (level === 'core') {
      const k = Q.of(rng.int(105, 140), 100);
      const c = Q.of(rng.step(200, 2000, 100));
      const p0 = Q.of(rng.step(10000, 60000, 1000));
      const year0 = rng.int(2018, 2023);
      const p3 = iterate({ ...base, k, c }, iterate({ ...base, k, c }, iterate({ ...base, k, c }, p0)));
      ensure(!p3.sub(Q.of(p3.floor())).eq(Q.of(1, 2)), 'no rounding tie');
      return { ...base, k, c, p0, year0 };
    }
    // Stretch: cooling, T(n+1) = kT(n) + c with k < 1; when does it first fall below the target?
    const k = Q.of(rng.int(70, 92), 100);
    const c = Q.of(rng.int(2, 6));
    const p0 = Q.of(rng.int(80, 98));
    const limit = c.div(Q.of(1).sub(k));
    const target = Q.of(Math.ceil(limit.toNumber()) + rng.int(3, 12));
    ensure(limit.lt(30) && target.lt(p0.sub(20)), 'room-temperature limit, a target well below the start');
    // The value must not land exactly on the target, and should take 3 to 15 steps.
    let t = p0;
    let n = 0;
    while (t.cmp(target) >= 0 && n < 50) {
      t = iterate({ ...base, k, c }, t);
      n++;
      ensure(!t.eq(target), 'never exactly on the target');
    }
    ensure(n >= 3 && n <= 15, 'a sensible number of minutes');
    return { ...base, k, c, p0, target, ctx: 0 };
  },

  validate(v) {
    return v.k.isPositive() ? [] : ['multiplier'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const g = GROW[v.ctx];
      const unitWord = g.at.split(' ').pop();
      return {
        stem: [text(`The ${g.what} ${g.at} $n$ is $P_n$`), text(`$P_{n+1} = ${dec(v.k)}P_n$`), text(`$P_1 = ${int(v.p0.toInt())}$`)],
        parts: [
          part('a', 2, text('Work out the value of $P_3$'), text('Give your answer to the nearest whole number.')),
          part('b', 2, text(`How many ${unitWord}s does it take for the number of ${g.thing} to more than double from $P_1$?`)),
        ],
      };
    }
    if (v.level === 'core') {
      const p1 = iterate(v, v.p0);
      return {
        stem: [
          text('The profit made by a shop increases each year.'),
          text('The profit made by the shop in year $n$ is £$P_n$'),
          text(`$P_{n+1} = aP_n + ${int(v.c.toInt())}$, where $a$ is a constant.`),
          text(`The profit in ${v.year0} was ${money(v.p0.mul(100).toInt())}`),
          text(`The profit in ${v.year0 + 1} was ${money(p1.mul(100).toInt(), !p1.isInt())}`),
        ],
        parts: [part('a', 2, text('Work out the value of $a$.')), part('b', 2, text(`Work out the profit made by the shop in ${v.year0 + 3}`), text('Give your answer to the nearest pound.'))],
      };
    }
    return {
      stem: [text('A cup of tea is left to cool.'), text('The temperature of the tea, in °C, $n$ minutes after it is made is $T_n$'), text(`$T_{n+1} = ${dec(v.k)}T_n + ${dec(v.c)}$`), text(`$T_0 = ${dec(v.p0)}$`)],
      parts: [
        part('a', 3, text(`Work out how many minutes it takes for the temperature of the tea to fall below ${dec(v.target)}°C.`)),
        part('b', 2, text('The temperature of the tea gets closer and closer to a fixed value.'), text('Work out this value.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const p3 = v.k.pow(2).mul(v.p0);
      return [{ text: int(nearest(p3)) }, { text: `${doublingSteps(v)} ${GROW[v.ctx].at.split(' ').pop()}s` }];
    }
    if (v.level === 'core') {
      const p3 = iterate(v, iterate(v, iterate(v, v.p0)));
      return [{ text: `$a = ${dec(v.k)}$` }, { text: money(nearest(p3) * 100) }];
    }
    const [n] = coolSteps(v);
    const limit = v.c.div(Q.of(1).sub(v.k));
    return [{ text: `${n} minutes` }, { text: `${limit.terminatesWithin(2) ? dec(limit) : roundDp(limit, 2)}°C` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const p2 = v.k.mul(v.p0);
      const p3 = v.k.mul(p2);
      const n = doublingSteps(v);
      return [
        [step('M1', `$P_2 = ${dec(v.k)} \\times ${int(v.p0.toInt())} = ${dec(p2)}$`, 'Use the formula once to get P₂ …'), step('A1', `$P_3 = ${dec(v.k)} \\times ${dec(p2)} = ${dec(p3)}$, so ${int(nearest(p3))}`, '… then again to get P₃. Round only at the end.')],
        [step('M1', `$${dec(v.k)}^{${n - 1}} = ${roundDp(v.k.pow(n - 1), 3)}$, $${dec(v.k)}^{${n}} = ${roundDp(v.k.pow(n), 3)}$`, `Each step multiplies by ${dec(v.k)}: after n steps it is ${dec(v.k)}ⁿ times bigger. Not ${dec(v.k)} × n.`), step('A1', `${n}`, `${dec(v.k)}^${n} is the first power above 2.`)],
      ];
    }
    if (v.level === 'core') {
      const p1 = iterate(v, v.p0);
      const p2 = iterate(v, p1);
      const p3 = iterate(v, p2);
      return [
        [step('M1', `$${dec(p1)} = ${int(v.p0.toInt())}a + ${int(v.c.toInt())}$`, `Substitute the two profits: P(${v.year0 + 1}) = a × P(${v.year0}) + ${int(v.c.toInt())}.`), step('A1', `$a = (${dec(p1)} - ${int(v.c.toInt())}) ${DIV} ${int(v.p0.toInt())} = ${dec(v.k)}$`, 'Subtract first, then divide.')],
        [step('M1', `${v.year0 + 2}: ${dec(v.k)} ${TIMES} ${dec(p1)} + ${int(v.c.toInt())} = ${dec(p2)}`, `Use the formula again for ${v.year0 + 2} …`), step('A1', `${v.year0 + 3}: ${dec(v.k)} ${TIMES} ${dec(p2)} + ${int(v.c.toInt())} = ${dec(p3)} → ${money(nearest(p3) * 100)}`, `… and again for ${v.year0 + 3}. Don’t stop one year early.`)],
      ];
    }
    const [n, prev, now] = coolSteps(v);
    const limit = v.c.div(Q.of(1).sub(v.k));
    return [
      [
        step('M1', `$T_1 = ${dec(v.k)} \\times ${dec(v.p0)} + ${dec(v.c)} = ${roundDp(iterate(v, v.p0), 2)}$`, 'Use the formula repeatedly (the ANS key on a calculator helps).'),
        step('M1', `$T_{${n - 1}} = ${roundDp(prev, 2)}…$, $T_{${n}} = ${roundDp(now, 2)}…$`, `Keep going until the value drops below ${dec(v.target)}.`),
        step('A1', `${n} minutes`, `T${n} is the first value below ${dec(v.target)}.`),
      ],
      [step('M1', `$L = ${dec(v.k)}L + ${dec(v.c)}$`, 'When the temperature stops changing, T(n+1) = T(n) = L.'), step('A1', `$L = \\frac{${dec(v.c)}}{1 - ${dec(v.k)}} = ${limit.terminatesWithin(2) ? dec(limit) : roundDp(limit, 2)}$°C`, 'Solve for L.')],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Closed form: P_n = k^(n−1) × P_1.
      const p3 = v.k.pow(2).mul(v.p0).toNumber();
      if (Number(answers[0].text.replace(/[\s ]/g, '')) !== Math.round(p3)) p.push('P3');
      let n = 0;
      while (v.k.toNumber() ** n <= 2) n++;
      if (!answers[1].text.startsWith(`${n} `)) p.push('doubling');
      return p;
    }
    if (v.level === 'core') {
      const p1 = iterate(v, v.p0);
      const a = Q.of(answers[0].text.replace(/[^\d.]/g, ''));
      if (!a.mul(v.p0).add(v.c).eq(p1)) p.push('a');
      // Closed form for the third step: k³P0 + c(k² + k + 1).
      const k = v.k.toNumber();
      const p3 = k ** 3 * v.p0.toNumber() + v.c.toNumber() * (k * k + k + 1);
      if (Math.abs(Number(answers[1].text.replace(/[£\s ]/g, '')) - p3) > 0.5 + 1e-6) p.push('profit');
      return p;
    }
    // Closed form T_n = L + (T0 − L)k^n.
    const L = v.c.toNumber() / (1 - v.k.toNumber());
    let n = 0;
    while (L + (v.p0.toNumber() - L) * v.k.toNumber() ** n >= v.target.toNumber()) n++;
    if (answers[0].text !== `${n} minutes`) p.push('minutes');
    if (Math.abs(parseFloat(answers[1].text) - L) > 0.005 + 1e-9) p.push('limit');
    return p;
  },

  key: (v) => `${v.ctx}|${v.k}|${v.c}|${v.p0}|${v.year0}|${v.target}`,
});

/** Steps of ×k until the value is more than double. */
function doublingSteps(v: V): number {
  let x = Q.of(1);
  let n = 0;
  while (x.cmp(2) <= 0) {
    x = x.mul(v.k);
    n++;
  }
  return n;
}
/** [first n with T_n < target, T_{n−1}, T_n] */
function coolSteps(v: V): [number, Q, Q] {
  let prev = v.p0;
  let t = v.p0;
  let n = 0;
  while (t.cmp(v.target) >= 0) {
    prev = t;
    t = iterate(v, t);
    n++;
  }
  return [n, prev, t];
}
