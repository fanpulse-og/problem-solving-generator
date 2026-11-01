import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp } from '../../engine/format';
import { DEG, coef, inRange, surdTex } from '../../engine/pure';

/**
 * Modelled on 9MA0 trigonometry: a sin x + b cos x written as R sin(x + α), then
 * its maximum and an equation, and a tide or temperature model where the angle is
 * a multiple of the time.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  m: number; // core: right-hand side
  mean: number;
  rate: number; // stretch: degrees per hour
  ctx: number;
}

const R = (v: V) => Math.hypot(v.a, v.b);
const ALPHA = (v: V) => Math.atan2(v.b, v.a) / DEG;
const sum = (v: V, s: string, c: string) => `${coef(v.a, s)} + ${coef(v.b, c)}`;
const PLACES = [
  { what: 'depth of water in a harbour', unit: 'metres', sym: 'D' },
  { what: 'temperature of a greenhouse', unit: '$^\\circ$C', sym: 'T' },
];

const solveCore = (v: V) => {
  const s = Math.asin(v.m / R(v)) / DEG;
  return inRange([s, 180 - s], ALPHA(v), 360 + ALPHA(v)).map((x) => x - ALPHA(v));
};

export default defineTemplate<V>({
  id: 'y13-r-form',
  title: 'The form R sin(x + α)',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'measures' },
  calculator: 'calc',

  generate({ rng, level }) {
    const a = rng.int(1, 9);
    const b = rng.int(1, 9);
    ensure(a !== b, 'the angle is not 45 degrees');
    const base: V = { level, a, b, m: 0, mean: 0, rate: 0, ctx: rng.int(0, 1) };
    if (level === 'core') {
      const r = Math.hypot(a, b);
      const m = rng.int(1, Math.max(1, Math.floor(r) - 1));
      ensure(m < r - 0.2 && m !== b, 'solutions must exist, and x = 0 is too easy to spot');
      return { ...base, m };
    }
    if (level === 'stretch') return { ...base, mean: rng.int(8, 25), rate: rng.pick([15, 20, 30]) };
    return base;
  },

  validate(v) {
    return R(v) > 0 ? [] : ['R must be positive'];
  },

  render(v) {
    const expressR = (l: string) => part(l, 3, text(`Express  $${sum(v, '\\sin x', '\\cos x')}$  in the form  $R\\sin(x + \\alpha)$  where $R > 0$ and  $0 < \\alpha < 90^\\circ$`), text('Give the exact value of $R$ and the value of $\\alpha$ to 2 decimal places.'));
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [expressR('a'), part('b', 2, text(`Hence write down the maximum value of  $${sum(v, '\\sin x', '\\cos x')}$  and the smallest positive value of $x$ at which it occurs.`))],
      };
    }
    if (v.level === 'core') {
      return { stem: [], parts: [expressR('a'), part('b', 4, text(`Hence solve, for  $0 \\leqslant x < 360^\\circ$,  the equation  $${sum(v, '\\sin x', '\\cos x')} = ${v.m}$`), text('giving your answers to 1 decimal place.'))] };
    }
    const c = PLACES[v.ctx];
    return {
      stem: lines(`The ${c.what}, $${c.sym}$ ${c.unit}, $t$ hours after midnight is modelled by`, `$${c.sym} = ${v.mean} + ${sum(v, `\\sin(${v.rate}t)^\\circ`, `\\cos(${v.rate}t)^\\circ`)}$`),
      parts: [
        part('a', 3, text(`Express  $${sum(v, `\\sin(${v.rate}t)^\\circ`, `\\cos(${v.rate}t)^\\circ`)}$  in the form  $R\\sin(${v.rate}t + \\alpha)^\\circ$  where $R > 0$ and  $0 < \\alpha < 90$`), text('Give the exact value of $R$ and the value of $\\alpha$ to 2 decimal places.')),
        part('b', 3, text(`Find the maximum value of $${c.sym}$ and the first time after midnight at which it occurs. Give the maximum and the number of hours to 2 decimal places.`)),
      ],
    };
  },

  answer(v) {
    const r = v.a * v.a + v.b * v.b;
    const first = { text: `$${surdTex(r)}\\sin(x + ${roundFloatDp(ALPHA(v), 2)}^\\circ)$` };
    if (v.level === 'foundational') return [first, { text: `Maximum $${surdTex(r)}$ at $x = ${roundFloatDp(90 - ALPHA(v), 2)}^\\circ$` }];
    if (v.level === 'core') return [first, { text: solveCore(v).map((x) => `$x = ${roundFloatDp(x, 1)}^\\circ$`).join(', ') }];
    const t = (90 - ALPHA(v)) / v.rate;
    return [{ text: `$${surdTex(r)}\\sin(${v.rate}t + ${roundFloatDp(ALPHA(v), 2)})^\\circ$` }, { text: `Maximum $${roundFloatDp(v.mean + R(v), 2)}$ at $t = ${roundFloatDp(t, 2)}$ hours` }];
  },

  markScheme(v) {
    const r = v.a * v.a + v.b * v.b;
    const a = [
      step('B1', `$R = \\sqrt{${v.a}^2 + ${v.b}^2} = ${surdTex(r)}$`, 'Pythagoras on the two coefficients.'),
      step('M1', `$\\tan\\alpha = \\frac{${v.b}}{${v.a}}$`, 'R sin(x + α) = R cos α sin x + R sin α cos x, so compare coefficients.'),
      step('A1', `$\\alpha = ${roundFloatDp(ALPHA(v), 2)}^\\circ$`, 'Check the angle is between 0 and 90 degrees.'),
    ];
    if (v.level === 'foundational') {
      return [a, [step('B1', `Maximum $= ${surdTex(r)}$`, 'The sine of anything is at most 1.'), step('B1', `$x + ${roundFloatDp(ALPHA(v), 2)}^\\circ = 90^\\circ$, so $x = ${roundFloatDp(90 - ALPHA(v), 2)}^\\circ$`, 'Sine reaches 1 when its angle is 90 degrees.')]];
    }
    if (v.level === 'core') {
      const xs = solveCore(v);
      const s = Math.asin(v.m / R(v)) / DEG;
      return [
        a,
        [
          step('M1', `$\\sin(x + ${roundFloatDp(ALPHA(v), 2)}^\\circ) = \\frac{${v.m}}{${surdTex(r)}}$`, 'Replace the left side and divide by R.'),
          step('M1', `$x + ${roundFloatDp(ALPHA(v), 2)}^\\circ = ${roundFloatDp(s, 1)}^\\circ$ or $${roundFloatDp(180 - s, 1)}^\\circ$`, 'Both values for the bracket: inverse sine and 180° minus it.'),
          step('A1', `$x = ${roundFloatDp(xs[0], 1)}^\\circ$`, 'Subtract α. Stay in the range.'),
          step('A1', `$x = ${roundFloatDp(xs[1], 1)}^\\circ$`, 'The second solution.'),
        ],
      ];
    }
    const t = (90 - ALPHA(v)) / v.rate;
    return [
      [a[0], a[1], step('A1', `$\\alpha = ${roundFloatDp(ALPHA(v), 2)}$`, 'Check the angle is between 0 and 90.')],
      [
        step('B1', `$${v.mean} + ${surdTex(r)} = ${roundFloatDp(v.mean + R(v), 2)}$`, 'The sine term is at most 1, so its largest value is R.'),
        step('M1', `$${v.rate}t + ${roundFloatDp(ALPHA(v), 2)} = 90$`, 'The maximum happens when the sine is 1.'),
        step('A1', `$t = ${roundFloatDp(t, 2)}$ hours`, 'Divide by the rate.'),
      ],
    ];
  },

  check(v, answers) {
    const f = (x: number) => v.a * Math.sin(x * DEG) + v.b * Math.cos(x * DEG);
    // The R form must agree with the original at several angles.
    for (const x of [0, 17, 60, 133, 250]) if (Math.abs(R(v) * Math.sin((x + ALPHA(v)) * DEG) - f(x)) > 1e-9) return ['identity'];
    if (v.level === 'core') {
      const shown = [...answers[1].text.matchAll(/= (-?[\d.]+)\^/g)].map((m) => Number(m[1]));
      if (shown.length !== 2) return ['two solutions'];
      for (const x of shown) if (Math.abs(f(x) - v.m) > 0.05 * R(v)) return ['solution'];
      return [];
    }
    // Scan for the maximum on the first cycle.
    let best = 0;
    let bestF = -1e9;
    for (let i = 0; i < 36000; i++) {
      const y = f(i / 100);
      if (y > bestF) {
        bestF = y;
        best = i / 100;
      }
    }
    return Math.abs(best - (90 - ALPHA(v))) < 0.02 && Math.abs(bestF - R(v)) < 1e-6 ? [] : ['maximum'];
  },

  key: (v) => `${v.a}|${v.b}|${v.m}|${v.mean}|${v.rate}`,
});
