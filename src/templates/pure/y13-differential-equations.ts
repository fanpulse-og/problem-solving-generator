import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, hoursMinutes, roundFloatDp } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 differential equations: separating variables with an initial
 * condition, Newton's law of cooling (form the model, then find k), and a tank
 * whose depth falls at an exponentially changing rate (June 2024 P1 Q7).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  y0: number;
  x1: number;
  T0: number;
  Ta: number;
  t1: number;
  T1: number;
  target: number;
  p: Q;
  q: Q;
  H0: Q;
  H1: Q;
}

export default defineTemplate<V>({
  id: 'y13-differential-equations',
  title: 'Differential equations',
  strand: 'Pure',
  subtopic: 'Differential equations',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'measures', stretch: 'measures' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, y0: 0, x1: 0, T0: 0, Ta: 0, t1: 0, T1: 0, target: 0, p: Q.of(0), q: Q.of(0), H0: Q.of(0), H1: Q.of(0) };
    if (level === 'foundational') {
      const a = 2 * rng.int(1, 3);
      const x1 = rng.int(1, 2);
      ensure((a / 2) * x1 * x1 <= 4, 'keep the answer to a sensible size');
      return { ...base, a, y0: rng.int(2, 9), x1 };
    }
    if (level === 'core') {
      const Ta = rng.step(15, 25, 5);
      const T0 = rng.step(70, 95, 5);
      const t1 = rng.int(5, 15);
      const T1 = rng.int(Ta + 15, T0 - 10);
      const target = rng.int(Ta + 5, T1 - 5);
      return { ...base, Ta, T0, t1, T1, target };
    }
    const q = Q.of(rng.int(1, 5), 10);
    const p = q.mul(rng.pick([Q.of(4, 10), Q.of(5, 10), Q.of(6, 10), Q.of(8, 10), Q.of(1)]));
    const H0 = Q.of(rng.int(12, 25), 10);
    const drop = p.div(q);
    const hole = H0.sub(drop);
    ensure(hole.isPositive(), 'the hole is above the floor');
    const H1 = hole.add(rng.pick([Q.of(1, 10), Q.of(2, 10), Q.of(3, 10)]));
    ensure(H1.lt(H0), 'the target depth is lower than the start');
    return { ...base, p, q, H0, H1 };
  },

  validate(v) {
    return v.level === 'core' && !(v.T0 > v.T1 && v.T1 > v.target && v.target > v.Ta) ? ['the temperatures must fall in order'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`Given that  $\\frac{\\mathrm{d}y}{\\mathrm{d}x} = ${v.a}xy,\\ y > 0$,  and that  $y = ${v.y0}$  when  $x = 0$,`),
        parts: [
          part('a', 4, text('solve the differential equation, giving $y$ in terms of $x$.')),
          part('b', 2, text(`Find the value of $y$ when  $x = ${v.x1}$,  giving your answer to 3 significant figures.`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(
          `A hot drink is left to cool in a room at a constant temperature of ${v.Ta}$^\\circ$C.`,
          'The rate of change of the temperature, $\\theta\\,^\\circ$C, of the drink is proportional to the difference between the temperature of the drink and the temperature of the room.',
          `At the start, the temperature of the drink is ${v.T0}$^\\circ$C. After ${v.t1} minutes it is ${v.T1}$^\\circ$C.`,
        ),
        parts: [
          part('a', 2, text('Write down a differential equation for this model, using a positive constant $k$.')),
          part('b', 3, text(`Show that  $\\theta = ${v.Ta} + ${v.T0 - v.Ta}\\mathrm{e}^{-kt}$`)),
          part('c', 2, text('Find the value of $k$, giving your answer to 3 significant figures.')),
          part('d', 2, text(`Find the time taken for the drink to cool to ${v.target}$^\\circ$C. Give your answer to the nearest minute.`)),
        ],
      };
    }
    return {
      stem: lines(`A tank is initially filled with water to a depth of ${dec(v.H0)} m.`, 'Water leaks from a small hole in the side of the tank.', 'The depth of the water, $H$ metres, $t$ hours after the leak starts is modelled by', `$\\frac{\\mathrm{d}H}{\\mathrm{d}t} = -${dec(v.p)}\\mathrm{e}^{-${dec(v.q)}t}$`),
      parts: [
        part('a', 3, text('Show that  $H = A + B\\mathrm{e}^{-' + dec(v.q) + 't}$  where $A$ and $B$ are constants to be found.')),
        part('b', 3, text(`Find the time taken for the depth to fall to ${dec(v.H1)} m. Give your answer in hours and minutes, to the nearest minute.`)),
        part('c', 2, text('In the long term the water level falls to the height of the hole.'), text('Find, according to the model, the height of the hole above the bottom of the tank.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const e = v.a / 2;
      return [{ text: `$y = ${v.y0}\\mathrm{e}^{${e === 1 ? '' : e}x^2}$` }, { text: `$${sf3(v.y0 * Math.exp(e * v.x1 * v.x1))}$` }];
    }
    if (v.level === 'core') {
      const k = Math.log((v.T0 - v.Ta) / (v.T1 - v.Ta)) / v.t1;
      return [
        { text: `$\\frac{\\mathrm{d}\\theta}{\\mathrm{d}t} = -k(\\theta - ${v.Ta})$` },
        { text: 'Shown' },
        { text: `$k = ${sf3(k)}$` },
        { text: `${Math.round(Math.log((v.T0 - v.Ta) / (v.target - v.Ta)) / k)} minutes` },
      ];
    }
    const B = v.p.div(v.q);
    const A = v.H0.sub(B);
    const t = Math.log(B.toNumber() / v.H1.sub(A).toNumber()) / v.q.toNumber();
    return [{ text: `$A = ${dec(A)}$, $B = ${dec(B)}$` }, { text: hoursMinutes(Math.round(t * 60)) }, { text: `${dec(A)} m` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const e = v.a / 2;
      return [
        [
          step('M1', `$\\int \\frac{1}{y}\\,\\mathrm{d}y = \\int ${v.a}x\\,\\mathrm{d}x$`, 'Separate the variables: everything in y on one side.'),
          step('A1', `$\\ln y = ${e === 1 ? '' : e}x^2 + c$`, 'Integrate both sides, with one constant.'),
          step('M1', `$\\ln ${v.y0} = c$`, 'Use the initial condition.'),
          step('A1', `$y = ${v.y0}\\mathrm{e}^{${e === 1 ? '' : e}x^2}$`, 'Take exponentials of both sides.'),
        ],
        [step('M1', `$${v.y0}\\mathrm{e}^{${e} \\times ${v.x1}^2}$`, 'Substitute x.'), step('A1', `$${sf3(v.y0 * Math.exp(e * v.x1 * v.x1))}$`, 'To 3 significant figures.')],
      ];
    }
    if (v.level === 'core') {
      const k = Math.log((v.T0 - v.Ta) / (v.T1 - v.Ta)) / v.t1;
      const t = Math.log((v.T0 - v.Ta) / (v.target - v.Ta)) / k;
      return [
        [step('M1', `$\\frac{\\mathrm{d}\\theta}{\\mathrm{d}t} \\propto (\\theta - ${v.Ta})$`, 'Proportional to the difference.'), step('A1', `$\\frac{\\mathrm{d}\\theta}{\\mathrm{d}t} = -k(\\theta - ${v.Ta})$`, 'The drink is cooling, so the rate is negative.')],
        [
          step('M1', `$\\int \\frac{1}{\\theta - ${v.Ta}}\\,\\mathrm{d}\\theta = \\int -k\\,\\mathrm{d}t$`, 'Separate the variables.'),
          step('M1', `$\\ln(\\theta - ${v.Ta}) = -kt + c$, with $c = \\ln ${v.T0 - v.Ta}$`, 'Integrate, then use the start temperature.'),
          step('A1', `$\\theta = ${v.Ta} + ${v.T0 - v.Ta}\\mathrm{e}^{-kt}$`, 'Printed answer: show the steps.'),
        ],
        [step('M1', `$${v.T1} = ${v.Ta} + ${v.T0 - v.Ta}\\mathrm{e}^{-${v.t1}k}$`, 'Use the second piece of information.'), step('A1', `$k = ${sf3(k)}$`, 'Keep the full value.')],
        [step('M1', `$${v.target} = ${v.Ta} + ${v.T0 - v.Ta}\\mathrm{e}^{-kt}$`, 'Substitute the target temperature.'), step('A1', `${Math.round(t)} minutes`, 'To the nearest minute.')],
      ];
    }
    const B = v.p.div(v.q);
    const A = v.H0.sub(B);
    const t = Math.log(B.toNumber() / v.H1.sub(A).toNumber()) / v.q.toNumber();
    return [
      [
        step('M1', `$H = \\int -${dec(v.p)}\\mathrm{e}^{-${dec(v.q)}t}\\,\\mathrm{d}t = ${dec(B)}\\mathrm{e}^{-${dec(v.q)}t} + A$`, 'Integrate: dividing by the negative power makes the coefficient positive.'),
        step('M1', `$t = 0$:  $${dec(v.H0)} = A + ${dec(B)}$`, 'Use the starting depth.'),
        step('A1', `$A = ${dec(A)}$, $B = ${dec(B)}$`, 'Check them.'),
      ],
      [
        step('M1', `$${dec(v.H1)} = ${dec(A)} + ${dec(B)}\\mathrm{e}^{-${dec(v.q)}t}$`, 'Substitute the depth.'),
        step('M1', `$t = ${roundFloatDp(t, 3)}$ hours`, 'Rearrange and take logs.'),
        step('A1', hoursMinutes(Math.round(t * 60)), 'Change the decimal part into minutes.'),
      ],
      [step('M1', `As $t \\to \\infty$, $\\mathrm{e}^{-${dec(v.q)}t} \\to 0$`, 'Long term means t gets very large.'), step('A1', `${dec(A)} m`, 'That leaves just A.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // Euler steps from the differential equation itself.
      let y = v.y0;
      const n = 200000;
      for (let i = 0; i < n; i++) y += (v.a * (i / n) * v.x1 * y * v.x1) / n;
      return Math.abs(y - v.y0 * Math.exp((v.a / 2) * v.x1 * v.x1)) / y < 1e-3 ? [] : ['euler'];
    }
    if (v.level === 'core') {
      const k = Math.log((v.T0 - v.Ta) / (v.T1 - v.Ta)) / v.t1;
      const theta = (t: number) => v.Ta + (v.T0 - v.Ta) * Math.exp(-k * t);
      if (Math.abs(theta(v.t1) - v.T1) > 1e-9) return ['second point'];
      // Bisection on the model instead of logs: the shown time is within half a minute of the crossing.
      let [lo, hi] = [0, 1000];
      for (let i = 0; i < 80; i++) {
        const mid = (lo + hi) / 2;
        if (theta(mid) > v.target) lo = mid;
        else hi = mid;
      }
      return Math.abs(lo - Number(answers[3].text.split(' ')[0])) <= 0.5 + 1e-9 ? [] : ['time'];
    }
    // Integrate the rate numerically from the start and confirm the depth.
    const B = v.p.div(v.q).toNumber();
    const t = Math.log(B / (v.H1.toNumber() - v.H0.toNumber() + B)) / v.q.toNumber();
    let H = v.H0.toNumber();
    const n = 20000;
    for (let i = 0; i < n; i++) H -= v.p.toNumber() * Math.exp(-v.q.toNumber() * ((i + 0.5) * t) / n) * (t / n);
    return Math.abs(H - v.H1.toNumber()) < 1e-6 ? [] : ['depth'];
  },

  key: (v) => `${v.a}|${v.y0}|${v.x1}|${v.T0}|${v.Ta}|${v.t1}|${v.T1}|${v.target}|${v.p}|${v.q}|${v.H0}|${v.H1}`,
});
