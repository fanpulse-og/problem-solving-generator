import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, roundFloatDp } from '../../engine/format';
import { DEG, coef, inRange, signed, signedCoef } from '../../engine/pure';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Modelled on 9MA0 trigonometry: exact values from the double angle formulae,
 * cos 2x leading to a quadratic in sin x, and proving an identity then using it
 * with sec²θ = 1 + tan²θ to solve an equation.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  opp: number;
  adj: number;
  hyp: number;
  a: number;
  b: number;
  c: number;
  n: number;
  m: number;
  w: number;
  t1: number;
}

const coreRoots = (v: V) => {
  const s = Math.asin(v.m / v.n) / DEG;
  return inRange([s, 180 - s], 0, 360);
};
const stretchRoots = (v: V) => [Math.atan(v.t1) / DEG, 180 + Math.atan(1 - v.t1) / DEG].sort((a, b) => a - b);
const list = (xs: number[], u: string) => xs.map((x) => `$${u} = ${roundFloatDp(x, 1)}^\\circ$`).join(', ');

export default defineTemplate<V>({
  id: 'y13-double-angle',
  title: 'Double angle formulae and identities',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, opp: 0, adj: 0, hyp: 0, a: 0, b: 0, c: 0, n: 0, m: 0, w: 0, t1: 0 };
    if (level === 'foundational') {
      const [opp, adj, hyp] = rng.pick([[3, 4, 5], [4, 3, 5], [5, 12, 13], [12, 5, 13], [8, 15, 17], [15, 8, 17]] as [number, number, number][]);
      return { ...base, opp, adj, hyp };
    }
    if (level === 'core') {
      const n = rng.pick([2, 4, 6]);
      const m = rng.int(1, n - 1) * rng.pick([1, -1]);
      ensure(gcdInt(n, m) === 1, 'the fraction is in lowest terms, so the quadratic is in its simplest form');
      const w = rng.pick([2, 3, -2, -3]);
      const a = n / 2;
      const b = n * w + m;
      const c = -m * w - a;
      ensure(b !== 0 && c !== 0, 'all terms appear');
      coreRoots({ ...base, n, m }).forEach((x) => roundFloatDp(x, 1));
      return { ...base, a, b, c, n, m, w };
    }
    return { ...base, t1: rng.int(2, 5) };
  },

  validate(v) {
    return v.level === 'foundational' && v.opp ** 2 + v.adj ** 2 !== v.hyp ** 2 ? ['a right-angled triangle is needed'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`Given that  $\\sin A = \\frac{${v.opp}}{${v.hyp}}$  where $A$ is acute,`),
        parts: [
          part('a', 2, text('find the exact value of $\\sin 2A$')),
          part('b', 2, text('find the exact value of $\\cos 2A$')),
          part('c', 1, text('hence find the exact value of $\\tan 2A$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`$${coef(v.a, '\\cos 2x')} ${signedCoef(v.b, '\\sin x')} ${signed(v.c)} = 0$`),
        parts: [
          part('a', 2, text(`Show that this equation can be written as  $${v.n}\\sin^2 x ${signedCoef(-v.b, '\\sin x')} ${signed(v.m * v.w)} = 0$`)),
          part('b', 4, text('Hence solve the equation for  $0 \\leqslant x < 360^\\circ$,  giving your answers to 1 decimal place.')),
        ],
      };
    }
    const c = v.t1 * v.t1 - v.t1 + 1;
    return {
      stem: [],
      parts: [
        part('a', 3, text('Prove that  $\\frac{1 - \\cos 2\\theta}{\\sin 2\\theta} \\equiv \\tan\\theta$,  where $\\theta$ is not a multiple of $90^\\circ$.')),
        part('b', 4, text('Hence solve, for  $0 < \\theta < 180^\\circ$,  $\\theta \\neq 90^\\circ$,  the equation'), text(`$\\frac{1 - \\cos 2\\theta}{\\sin 2\\theta} = \\sec^2\\theta - ${c}$`), text('giving your answers to 1 decimal place.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const s2 = Q.of(2 * v.opp * v.adj, v.hyp * v.hyp);
      const c2 = Q.of(v.hyp * v.hyp - 2 * v.opp * v.opp, v.hyp * v.hyp);
      return [{ text: `$${fracTex(s2)}$` }, { text: `$${fracTex(c2)}$` }, { text: `$${fracTex(s2.div(c2))}$` }];
    }
    if (v.level === 'core') return [{ text: 'Shown' }, { text: list(coreRoots(v), 'x') }];
    return [{ text: 'Proof' }, { text: list(stretchRoots(v), '\\theta') }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const s2 = Q.of(2 * v.opp * v.adj, v.hyp * v.hyp);
      const c2 = Q.of(v.hyp * v.hyp - 2 * v.opp * v.opp, v.hyp * v.hyp);
      return [
        [step('M1', `$\\cos A = \\frac{${v.adj}}{${v.hyp}}$, so $\\sin 2A = 2 \\times \\frac{${v.opp}}{${v.hyp}} \\times \\frac{${v.adj}}{${v.hyp}}$`, 'Find cos A from a right-angled triangle; A is acute, so it is positive.'), step('A1', `$${fracTex(s2)}$`, 'Multiply and simplify.')],
        [step('M1', `$\\cos 2A = 1 - 2\\sin^2 A = 1 - 2 \\times \\frac{${v.opp * v.opp}}{${v.hyp * v.hyp}}$`, 'Any of the three forms of cos 2A works.'), step('A1', `$${fracTex(c2)}$`, 'A negative value means 2A is obtuse.')],
        [step('B1', `$${fracTex(s2.div(c2))}$`, 'tan 2A = sin 2A ÷ cos 2A.')],
      ];
    }
    if (v.level === 'core') {
      const s = Q.of(v.m, v.n);
      return [
        [step('M1', `$${coef(v.a, '(1 - 2\\sin^2 x)')} ${signedCoef(v.b, '\\sin x')} ${signed(v.c)} = 0$`, 'Use cos 2x = 1 − 2sin²x, the form with only sin x in it.'), step('A1', `$${v.n}\\sin^2 x ${signedCoef(-v.b, '\\sin x')} ${signed(v.m * v.w)} = 0$`, 'Expand and collect, then multiply through by −1. This is the printed answer.')],
        [
          step('M1', `$(${v.n}\\sin x ${signed(-v.m)})(\\sin x ${signed(-v.w)}) = 0$`, 'Factorise as a quadratic in sin x.'),
          step('A1', `$\\sin x = ${fracTex(s)}$`, `sin x = ${v.w} has no solutions.`),
          step('M1', `$x = \\arcsin\\left(${fracTex(s)}\\right)$`, 'Inverse sine, then the second solution in the range.'),
          step('A1', list(coreRoots(v), 'x'), 'Both values.'),
        ],
      ];
    }
    const c = v.t1 * v.t1 - v.t1 + 1;
    return [
      [
        step('M1', '$\\frac{1 - (1 - 2\\sin^2\\theta)}{2\\sin\\theta\\cos\\theta}$', 'Use the double angle formulae on top and bottom.'),
        step('M1', '$\\frac{2\\sin^2\\theta}{2\\sin\\theta\\cos\\theta}$', 'Simplify the top.'),
        step('A1', '$\\frac{\\sin\\theta}{\\cos\\theta} \\equiv \\tan\\theta$', 'Cancel. Start from one side and do not assume the result.'),
      ],
      [
        step('M1', `$\\tan\\theta = 1 + \\tan^2\\theta - ${c}$`, 'Use part (a), and sec²θ = 1 + tan²θ.'),
        step('M1', `$\\tan^2\\theta - \\tan\\theta - ${c - 1} = 0$`, 'Collect into a quadratic in tan θ.'),
        step('A1', `$\\tan\\theta = ${v.t1}$ or $\\tan\\theta = ${1 - v.t1}$`, 'Factorise.'),
        step('A1', list(stretchRoots(v), '\\theta'), 'A negative tan gives an angle between 90° and 180° in this range.'),
      ],
    ];
  },

  check(v, answers) {
    const shown = [...answers[answers.length - 1].text.matchAll(/= (-?[\d.]+)\^/g)].map((m) => Number(m[1]));
    if (v.level === 'foundational') {
      const A = Math.asin(v.opp / v.hyp);
      const value = (t: string) => {
        const m = t.match(/(-?)\\frac\{(\d+)\}\{(\d+)\}/);
        return m ? (m[1] ? -1 : 1) * (Number(m[2]) / Number(m[3])) : Number(t.replace(/\$/g, ''));
      };
      return Math.abs(value(answers[0].text) - Math.sin(2 * A)) < 1e-9 && Math.abs(value(answers[1].text) - Math.cos(2 * A)) < 1e-9 && Math.abs(value(answers[2].text) - Math.tan(2 * A)) < 1e-9 ? [] : ['exact values'];
    }
    if (shown.length !== 2) return ['two solutions'];
    for (const x of shown) {
      const r = x * DEG;
      if (v.level === 'core' && Math.abs(v.a * Math.cos(2 * r) + v.b * Math.sin(r) + v.c) > 0.1) return ['core'];
      const c = v.t1 * v.t1 - v.t1 + 1;
      if (v.level === 'stretch' && Math.abs((1 - Math.cos(2 * r)) / Math.sin(2 * r) - (1 / Math.cos(r) ** 2 - c)) > 0.5) return ['stretch'];
    }
    return [];
  },

  key: (v) => `${v.opp}|${v.hyp}|${v.n}|${v.m}|${v.w}|${v.t1}`,
});
