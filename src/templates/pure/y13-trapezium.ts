import { defineTemplate } from '../../engine/types';
import { lines, part, step, table, text } from '../../engine/blocks';
import { dec, ensure, roundFloatDp } from '../../engine/format';
import { sf3 } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on the 9MA0 trapezium rule questions: complete a table, apply the rule,
 * compare with the exact value from integration by parts, and adapt the estimate
 * to a related integral without doing any more calculation.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  c: number; // foundational: y = √(x³ + c); otherwise y = x ln x
  lo: number;
  strips: number;
  h: Q;
  gap: number; // index of the blank in the table
  add: number; // stretch: ∫(add + 2x ln x)
}

const f = (v: V, x: number) => (v.level === 'foundational' ? Math.sqrt(x ** 3 + v.c) : x * Math.log(x));
const xs = (v: V) => Array.from({ length: v.strips + 1 }, (_, i) => Q.of(v.lo).add(v.h.mul(i)));
/** Table values to 4 decimal places, as the question shows them. */
const ys = (v: V) => xs(v).map((x) => roundFloatDp(f(v, x.toNumber()), 4));
const trap = (v: V) => {
  const y = ys(v).map(Number);
  const middle = y.slice(1, -1).reduce((s, t) => s + t, 0);
  return (v.h.toNumber() / 2) * (y[0] + y[y.length - 1] + 2 * middle);
};
const exact = (v: V) => {
  const a = v.lo + v.h.toNumber() * v.strips;
  const F = (x: number) => (x * x * Math.log(x)) / 2 - (x * x) / 4;
  return F(a) - F(v.lo);
};

export default defineTemplate<V>({
  id: 'y13-trapezium',
  title: 'The trapezium rule',
  strand: 'Pure',
  subtopic: 'Numerical methods',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level }) {
    const strips = rng.pick([4, 5, 6]);
    const h = level === 'foundational' ? rng.pick([Q.of(1, 2), Q.of(1)]) : Q.of(1, 2);
    const v: V = { level, c: level === 'foundational' ? rng.int(1, 9) : 0, lo: level === 'foundational' ? rng.int(0, 2) : 1, strips, h, gap: rng.int(1, strips - 1), add: level === 'stretch' ? rng.int(2, 9) : 0 };
    ensure(!/\.0+$/.test(sf3(trap(v))), 'no trailing zero');
    return v;
  },

  validate(v) {
    return f(v, v.lo) >= 0 ? [] : ['the curve must be above the axis'];
  },

  render(v) {
    const fn = v.level === 'foundational' ? `\\sqrt{x^3 + ${v.c}}` : 'x\\ln x';
    const hi = dec(Q.of(v.lo).add(v.h.mul(v.strips)));
    const tab = table({
      rowHeaders: true,
      rows: [
        ['$x$', ...xs(v).map((x) => dec(x))],
        ['$y$', ...ys(v).map((y, i) => (i === v.gap ? '' : y))],
      ],
    });
    const parts = [
      part('a', 1, text('Complete the table, giving the missing value of $y$ to 4 decimal places.')),
      part('b', 3, text(`Use the trapezium rule with all the values of $y$ in the table to find an estimate for  $\\int_{${v.lo}}^{${hi}} ${fn}\\,\\mathrm{d}x$`), text('giving your answer to 3 significant figures.')),
    ];
    if (v.level === 'core') parts.push(part('c', 3, text(`The exact value of the integral is  $\\left[\\frac{x^2}{2}\\ln x - \\frac{x^2}{4}\\right]_{${v.lo}}^{${hi}}$`), text('Find the percentage error in your estimate, giving your answer to 2 significant figures.')));
    if (v.level === 'stretch') {
      parts.push(part('c', 1, text('Using the shape of the curve, state whether your answer to part (b) is an overestimate or an underestimate.')));
      parts.push(part('d', 2, text(`Using your answer to part (b), find an estimate for  $\\int_{${v.lo}}^{${hi}} (${v.add} + 2x\\ln x)\\,\\mathrm{d}x$`)));
    }
    return { stem: [...lines(`The table shows corresponding values of $x$ and $y$ for  $y = ${fn}$`), tab], parts };
  },

  answer(v) {
    const est = trap(v);
    const base = [{ text: ys(v)[v.gap] }, { text: sf3(est) }];
    if (v.level === 'core') return [...base, { text: `${roundFloatPct(est, exact(v))}%` }];
    if (v.level === 'stretch') {
      const range = v.h.toNumber() * v.strips;
      return [...base, { text: 'Overestimate: the curve is convex, so the trapezia lie above it.' }, { text: sf3(v.add * range + 2 * est) }];
    }
    return base;
  },

  markScheme(v) {
    const y = ys(v);
    const est = trap(v);
    const a = [step('B1', y[v.gap], `Substitute x = ${dec(xs(v)[v.gap])}, with your calculator in the right mode.`)];
    const b = [
      step('B1', `$h = ${dec(v.h)}$`, 'The width of each strip.'),
      step('M1', `$\\frac{${dec(v.h)}}{2}\\left[${y[0]} + ${y[y.length - 1]} + 2(${y.slice(1, -1).join(' + ')})\\right]$`, 'First and last once; all the others twice.'),
      step('A1', sf3(est), 'To 3 significant figures.'),
    ];
    if (v.level === 'core') {
      const ex = exact(v);
      return [a, b, [step('M1', `Exact value $= ${roundFloatDp(ex, 4)}$`, 'Substitute the limits, with x = 1 making the ln term zero.'), step('M1', `$\\frac{${roundFloatDp(est, 4)} - ${roundFloatDp(ex, 4)}}{${roundFloatDp(ex, 4)}} \\times 100$`, 'Error over exact value.'), step('A1', `${roundFloatPct(est, ex)}%`, 'To 2 significant figures.')]];
    }
    if (v.level === 'stretch') {
      const range = v.h.toNumber() * v.strips;
      return [
        a,
        b,
        [step('B1', 'Overestimate: the curve is convex, so the trapezia lie above it.', 'The second derivative of x ln x is 1/x, which is positive.')],
        [step('M1', `$${v.add} \\times ${dec(Q.of(v.h.toNumber() * v.strips * 2, 2))} + 2 \\times ${sf3(est)}$`, 'The constant integrates to the constant times the width; the rest is twice part (b).'), step('A1', sf3(v.add * range + 2 * est), 'No further trapezium rule is needed.')],
      ];
    }
    return [a, b];
  },

  check(v, answers) {
    const est = trap(v);
    // With many strips the rule tends to the true area: a convex curve must be overestimated by few strips.
    const a = v.lo;
    const b = v.lo + v.h.toNumber() * v.strips;
    let fine = 0;
    const n = 4000;
    for (let i = 0; i < n; i++) fine += ((f(v, a + ((b - a) * i) / n) + f(v, a + ((b - a) * (i + 1)) / n)) / 2) * ((b - a) / n);
    if (Math.abs(fine - est) / fine > 0.05) return ['estimate far from the true area'];
    if (v.level !== 'foundational' && Math.abs(fine - exact(v)) > 1e-4) return ['exact value'];
    if (v.level === 'stretch' && est <= fine) return ['should overestimate'];
    return answers.length ? [] : ['answers'];
  },

  key: (v) => `${v.c}|${v.lo}|${v.strips}|${v.h}|${v.gap}|${v.add}`,
});

function roundFloatPct(est: number, ex: number): string {
  const p = (Math.abs(est - ex) / ex) * 100;
  ensure(p > 0.001, 'an error too small to show');
  return Number(p.toPrecision(2)).toString();
}
