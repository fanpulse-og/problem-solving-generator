import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, int, roundFloatDp, roundFloatSf } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 exponential models: a value with a long-term limit, finding
 * a rate from one data point using logs, and a straight-line graph of log y
 * against t that gives the constants in y = ab^t.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: number;
  A: number;
  B: number;
  k: Q;
  t1: number;
  y1: number;
  t2: number;
  target: number;
  c: Q; // stretch: intercept of log10 y
  m: Q; // stretch: gradient of log10 y
}

const THINGS = ['the number of bacteria in a culture', 'the number of rabbits on an island', 'the number of followers of a video channel'];
const COOL = ['a cup of tea', 'a bowl of soup', 'a pan of water'];

export default defineTemplate<V>({
  id: 'y12-exponential-model',
  title: 'Exponential models',
  strand: 'Pure',
  subtopic: 'Exponentials & logarithms',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'data' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, ctx: rng.int(0, 2), A: 0, B: 0, k: Q.of(0), t1: 0, y1: 0, t2: 0, target: 0, c: Q.of(0), m: Q.of(0) };
    if (level === 'foundational') {
      const B = rng.step(15, 25, 5);
      const A = rng.step(50, 75, 5);
      const k = Q.of(rng.int(2, 9), 100);
      const target = B + rng.step(10, A - 10, 5);
      const t1 = rng.int(5, 20);
      ensure(!/\.0$/.test(roundFloatDp(Math.log(A / (target - B)) / k.toNumber(), 1)), 'no trailing zero in the answer');
      return { ...base, A, B, k, t1, target };
    }
    if (level === 'core') {
      const A = rng.step(200, 900, 50);
      const t1 = rng.int(2, 8);
      const y1 = A + rng.step(100, 900, 50);
      const t2 = t1 + rng.int(2, 10);
      const target = y1 * rng.int(2, 4);
      ensure(A * (y1 / A) ** (t2 / t1) < 10000, 'keep the prediction to a sensible size');
      // "First exceeds" needs the crossing to fall between two whole weeks.
      const weeks = (Math.log(target / A) * t1) / Math.log(y1 / A);
      ensure(Math.abs(weeks - Math.round(weeks)) > 0.01, 'the crossing is not on a whole week');
      return { ...base, A, t1, y1, t2, target };
    }
    const c = Q.of(rng.int(11, 35), 10);
    const m = Q.of(rng.int(4, 30), 100);
    const t1 = rng.int(4, 12);
    const target = rng.step(10000, 90000, 5000);
    ensure(Math.log10(target) > c.toNumber(), 'the target is later than the start');
    return { ...base, c, m, t1, target };
  },

  validate(v) {
    return v.level === 'foundational' && v.target >= v.A + v.B ? ['the target must be below the starting value'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The temperature, $\\theta\\,^\\circ$C, of ${COOL[v.ctx]} is modelled by`, `$\\theta = ${v.B} + ${v.A}\\mathrm{e}^{-${dec(v.k)}t}$`, 'where $t$ minutes is the time since it started to cool.'),
        parts: [
          part('a', 1, text('State the initial temperature, according to the model.')),
          part('b', 2, text(`Find the temperature after ${v.t1} minutes, giving your answer to 3 significant figures.`)),
          part('c', 3, text(`Find the time taken for the temperature to fall to ${v.target}$^\\circ$C, giving your answer to the nearest tenth of a minute.`)),
          part('d', 1, text(`Explain the significance of the constant ${v.B} in the model.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A scientist models ${THINGS[v.ctx]}, $N$, by  $N = A\\mathrm{e}^{kt}$`, 'where $A$ and $k$ are constants and $t$ is the time in weeks.', `At the start of the study, $N = ${v.A}$`, `After ${v.t1} weeks,  $N = ${v.y1}$`),
        parts: [
          part('a', 1, text('Write down the value of $A$')),
          part('b', 3, text('Find the value of $k$, giving your answer to 3 significant figures.')),
          part('c', 2, text(`Find, according to the model, the value of $N$ after ${v.t2} weeks. Give your answer to the nearest whole number.`)),
          part('d', 2, text(`Find the number of complete weeks after which $N$ first exceeds ${v.target}`)),
        ],
      };
    }
    return {
      stem: lines(`The value, £$V$, of a collectable item is modelled by  $V = ab^t$`, 'where $a$ and $b$ are constants and $t$ is the time in years since it was made.', `A plot of $\\log_{10} V$ against $t$ gives a straight line with gradient ${dec(v.m)} which meets the vertical axis at ${dec(v.c)}`),
      parts: [
        part('a', 2, text('Show that the model gives a straight line when $\\log_{10} V$ is plotted against $t$.')),
        part('b', 3, text('Find the values of $a$ and $b$, giving your answers to 3 significant figures.')),
        part('c', 1, text('Give a practical interpretation of the constant $b$.')),
        part('d', 2, text(`Find, according to the model, the age of the item when its value reaches £${int(v.target)}. Give your answer to the nearest year.`)),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const k = v.k.toNumber();
      return [
        { text: `${v.A + v.B}$^\\circ$C` },
        { text: `${sf3(v.B + v.A * Math.exp(-k * v.t1))}$^\\circ$C` },
        { text: `${roundFloatDp(Math.log(v.A / (v.target - v.B)) / k, 1)} minutes` },
        { text: `The temperature tends to ${v.B}$^\\circ$C in the long term (room temperature).` },
      ];
    }
    if (v.level === 'core') {
      const k = Math.log(v.y1 / v.A) / v.t1;
      const weeks = Math.floor(Math.log(v.target / v.A) / k) + 1;
      return [{ text: `${v.A}` }, { text: `$k = ${sf3(k)}$` }, { text: `${Math.round(v.A * Math.exp(k * v.t2))}` }, { text: `${weeks} weeks` }];
    }
    const a = 10 ** v.c.toNumber();
    const b = 10 ** v.m.toNumber();
    const t = (Math.log10(v.target) - v.c.toNumber()) / v.m.toNumber();
    return [
      { text: 'Shown' },
      { text: `$a = ${roundFloatSf(a, 3)}$, $b = ${roundFloatSf(b, 3)}$` },
      { text: `The value is multiplied by ${roundFloatSf(b, 3)} each year.` },
      { text: `${Math.round(t)} years` },
    ];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const k = v.k.toNumber();
      const t = Math.log(v.A / (v.target - v.B)) / k;
      return [
        [step('B1', `${v.A + v.B}$^\\circ$C`, 'Put t = 0: e to the power 0 is 1.')],
        [step('M1', `$\\theta = ${v.B} + ${v.A}\\mathrm{e}^{-${dec(v.k)} \\times ${v.t1}}$`, 'Substitute the time.'), step('A1', `${sf3(v.B + v.A * Math.exp(-k * v.t1))}$^\\circ$C`, 'Round at the end.')],
        [
          step('M1', `$\\mathrm{e}^{-${dec(v.k)}t} = \\frac{${v.target - v.B}}{${v.A}}$`, 'Get the exponential on its own first.'),
          step('M1', `$-${dec(v.k)}t = \\ln\\left(\\frac{${v.target - v.B}}{${v.A}}\\right)$`, 'Take natural logs of both sides.'),
          step('A1', `$t = ${roundFloatDp(t, 1)}$ minutes`, 'Both sides are negative, so t is positive.'),
        ],
        [step('B1', `As $t \\to \\infty$, $\\theta \\to ${v.B}$`, 'The exponential term tends to 0, so the temperature approaches this value.')],
      ];
    }
    if (v.level === 'core') {
      const k = Math.log(v.y1 / v.A) / v.t1;
      const weeks = Math.floor(Math.log(v.target / v.A) / k) + 1;
      return [
        [step('B1', `$A = ${v.A}$`, 'At t = 0 the exponential is 1.')],
        [
          step('M1', `$${v.y1} = ${v.A}\\mathrm{e}^{${v.t1}k}$`, 'Substitute the known point.'),
          step('M1', `$${v.t1}k = \\ln\\left(\\frac{${v.y1}}{${v.A}}\\right)$`, 'Divide, then take logs.'),
          step('A1', `$k = ${sf3(k)}$`, 'Keep the unrounded value on your calculator.'),
        ],
        [step('M1', `$N = ${v.A}\\mathrm{e}^{${v.t2}k}$`, 'Use the unrounded k.'), step('A1', `$${Math.round(v.A * Math.exp(k * v.t2))}$`, 'To the nearest whole number.')],
        [step('M1', `$t > \\frac{\\ln(${v.target} \\div ${v.A})}{k} = ${roundFloatSf(Math.log(v.target / v.A) / k, 4)}$`, 'Solve the inequality with logs.'), step('A1', `${weeks} weeks`, 'Round up: it must have gone past the value.')],
      ];
    }
    const a = 10 ** v.c.toNumber();
    const b = 10 ** v.m.toNumber();
    const t = (Math.log10(v.target) - v.c.toNumber()) / v.m.toNumber();
    return [
      [step('M1', `$\\log_{10} V = \\log_{10} a + \\log_{10} b^t$`, 'Take logs and use the product law.'), step('A1', `$\\log_{10} V = t\\log_{10} b + \\log_{10} a$, which has the form  $y = mx + c$`, 'The power comes down as a multiplier. The conclusion needs stating.')],
      [
        step('M1', `$\\log_{10} a = ${dec(v.c)}$ and $\\log_{10} b = ${dec(v.m)}$`, 'Match the intercept and the gradient.'),
        step('A1', `$a = 10^{${dec(v.c)}} = ${roundFloatSf(a, 3)}$`, 'Undo the log.'),
        step('A1', `$b = 10^{${dec(v.m)}} = ${roundFloatSf(b, 3)}$`, 'Undo the log.'),
      ],
      [step('B1', `The value is multiplied by ${roundFloatSf(b, 3)} each year.`, 'b is the yearly multiplier. Mention that it applies each year.')],
      [step('M1', `$\\log_{10} ${v.target} = ${dec(v.m)}t + ${dec(v.c)}$`, 'Use the straight-line form.'), step('A1', `${Math.round(t)} years`, 'To the nearest year.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // Bisection on the original model instead of logs.
      let lo = 0;
      let hi = 2000;
      const f = (t: number) => v.B + v.A * Math.exp(-v.k.toNumber() * t) - v.target;
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) > 0) lo = mid;
        else hi = mid;
      }
      return Math.abs(lo - Number(answers[2].text.split(' ')[0])) <= 0.051 ? [] : ['time'];
    }
    if (v.level === 'core') {
      const r = (v.y1 / v.A) ** (1 / v.t1);
      const N = Number(answers[2].text);
      if (Math.abs(N - v.A * r ** v.t2) > 0.51) return ['prediction'];
      const w = Number(answers[3].text.split(' ')[0]);
      return v.A * r ** w > v.target && v.A * r ** (w - 1) <= v.target ? [] : ['weeks'];
    }
    const t = Number(answers[3].text.split(' ')[0]);
    const a = 10 ** v.c.toNumber();
    const b = 10 ** v.m.toNumber();
    return a * b ** (t + 0.51) >= v.target && a * b ** (t - 0.51) <= v.target ? [] : ['age'];
  },

  key: (v) => `${v.A}|${v.B}|${v.k}|${v.t1}|${v.y1}|${v.t2}|${v.target}|${v.c}|${v.m}`,
});
