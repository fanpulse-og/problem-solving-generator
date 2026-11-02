import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 equations and inequalities: linear and quadratic inequalities
 * together, a line meeting a curve solved simultaneously, and a shaded region
 * described by inequalities (8MA0/01 asks for regions in this way).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  alpha: number;
  beta: number;
  m: number;
  k: number;
  below: boolean;
}

const sample = (f: (x: number) => number, x0: number, x1: number, n = 48): [number, number][] => Array.from({ length: n + 1 }, (_, i) => [x0 + ((x1 - x0) * i) / n, f(x0 + ((x1 - x0) * i) / n)]);

export default defineTemplate<V>({
  id: 'y12-inequalities',
  title: 'Simultaneous equations and inequalities',
  strand: 'Pure',
  subtopic: 'Equations & inequalities',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'geometry-chain' },
  calculator: 'calc',

  generate({ rng, level }) {
    const alpha = rng.int(-6, 3);
    const beta = alpha + rng.int(2, 8);
    const base: V = { level, a: 1, b: 0, c: 0, alpha, beta, m: 0, k: 0, below: false };
    if (level === 'foundational') {
      const a = rng.int(2, 6);
      const b = rng.int(-20, 20);
      const c = rng.int(1, 30);
      const below = rng.chance(0.5);
      ensure(b !== 0, 'a real shift');
      ensure(!below || Q.of(c - b, a).lt(beta), 'at least some values satisfy both');
      return { ...base, a, b, c, below };
    }
    // Curve y = x² + bx + c and line y = mx + k meeting at x = α, β.
    const m = rng.int(1, 5) * rng.pick([1, -1]);
    const k = rng.int(-9, 9);
    const b = m - alpha - beta;
    const c = k + alpha * beta;
    ensure(alpha !== 0 && beta !== 0 && b !== 0 && c !== 0 && k !== 0, 'all terms appear');
    return { ...base, b, c, m, k };
  },

  validate(v) {
    return v.beta > v.alpha ? [] : ['the roots must be in order'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          part('a', 2, text(`Solve  $${v.a}x ${v.b < 0 ? '-' : '+'} ${Math.abs(v.b)} > ${v.c}$`)),
          part('b', 3, text(`Solve  $${polyTex([1, -(v.alpha + v.beta), v.alpha * v.beta])} ${v.below ? '<' : '>'} 0$`)),
          part('c', 2, text('Write down the set of values of $x$ that satisfy both inequalities, using set notation.')),
        ],
      };
    }
    const curve = polyTex([1, v.b, v.c]);
    const line = terms([[v.m, 1], [v.k, 0]]);
    if (v.level === 'core') {
      return {
        stem: lines(`A curve has equation  $y = ${curve}$`, `A line has equation  $y = ${line}$`),
        parts: [
          part('a', 5, text('Using algebra, find the coordinates of the points where the line meets the curve.')),
          part('b', 2, text('Find the set of values of $x$ for which the curve is below the line.')),
        ],
      };
    }
    const f = (x: number) => x * x + v.b * x + v.c;
    const g = (x: number) => v.m * x + v.k;
    const pad = 1.2;
    const xs = [v.alpha - pad, v.beta + pad, 0];
    const ys = [...xs.map(f), ...xs.map(g), 0];
    const [x0, x1] = [Math.min(...xs) - 0.4, Math.max(...xs) + 0.6];
    const [y0, y1] = [Math.min(...ys, f(-v.b / 2)) - 1, Math.max(...ys) + 2];
    return {
      stem: [
        diagram({
          type: 'graph',
          x: [x0, x1],
          y: [y0, y1],
          curves: [{ points: sample(f, v.alpha - pad, v.beta + pad), label: 'C', labelAt: [v.beta + pad + 0.2, f(v.beta + pad)] }, { points: sample(g, v.alpha - pad, v.beta + pad, 2), label: 'l', labelAt: [v.beta + pad + 0.2, g(v.beta + pad) - 0.5] }],
          shade: sample(f, v.alpha, v.beta),
          marks: [{ at: [(v.alpha + v.beta) / 2, (f((v.alpha + v.beta) / 2) + g((v.alpha + v.beta) / 2)) / 2], label: 'R', dy: 4 }],
        }),
        ...lines(`The diagram shows the curve $C$ with equation  $y = ${curve}$  and the line $l$ with equation  $y = ${line}$`, 'The finite region $R$ is shown shaded.'),
      ],
      parts: [
        part('a', 4, text('Using algebra, find the $x$ coordinates of the points where $l$ meets $C$.')),
        part('b', 2, text('Use inequalities to define the region $R$.')),
        part('c', 3, text(`The line  $y = ${terms([[v.m, 1]])} + t$,  where $t$ is a constant, is a tangent to $C$.`), text('Find the value of $t$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const lim = Q.of(v.c - v.b, v.a);
      const [lo, hi] = [v.alpha, v.beta];
      const both = bothSet(v, lim);
      return [{ text: `$x > ${fracTex(lim)}$` }, { text: v.below ? `$${lo} < x < ${hi}$` : `$x < ${lo}$ or $x > ${hi}$` }, { text: `$${both}$` }];
    }
    const [ya, yb] = [v.m * v.alpha + v.k, v.m * v.beta + v.k];
    if (v.level === 'core') return [{ text: `$(${v.alpha}, ${ya})$ and $(${v.beta}, ${yb})$` }, { text: `$${v.alpha} < x < ${v.beta}$` }];
    const t = Q.of(v.c).sub(Q.of((v.b - v.m) ** 2, 4));
    return [{ text: `$x = ${v.alpha}$ and $x = ${v.beta}$` }, { text: `$y > ${polyTex([1, v.b, v.c])}$ and $y < ${terms([[v.m, 1], [v.k, 0]])}$` }, { text: `$t = ${fracTex(t)}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const lim = Q.of(v.c - v.b, v.a);
      return [
        [step('M1', `$${v.a}x > ${v.c - v.b}$`, 'Collect the numbers on one side.'), step('A1', `$x > ${fracTex(lim)}$`, 'Divide by a positive number: the sign stays the same.')],
        [
          step('M1', `$(x ${v.alpha > 0 ? '-' : '+'} ${Math.abs(v.alpha)})(x ${v.beta > 0 ? '-' : '+'} ${Math.abs(v.beta)}) = 0$`.replace('x + 0', 'x').replace('x - 0', 'x'), 'Factorise to find the critical values.'),
          step('M1', `$x = ${v.alpha}$ or $x = ${v.beta}$`, 'A sketch of the parabola shows which side you need.'),
          step('A1', v.below ? `$${v.alpha} < x < ${v.beta}$` : `$x < ${v.alpha}$ or $x > ${v.beta}$`, v.below ? 'Below the axis is between the roots.' : 'Above the axis is outside the roots.'),
        ],
        [step('M1', 'Draw both on a number line', 'Only where both are true counts.'), step('A1', `$${bothSet(v, lim)}$`, 'Use curly brackets in set notation.')],
      ];
    }
    const curve = polyTex([1, v.b, v.c]);
    const line = terms([[v.m, 1], [v.k, 0]]);
    const [ya, yb] = [v.m * v.alpha + v.k, v.m * v.beta + v.k];
    const quad = polyTex([1, -(v.alpha + v.beta), v.alpha * v.beta]);
    const fact = `$(x ${v.alpha > 0 ? '-' : '+'} ${Math.abs(v.alpha)})(x ${v.beta > 0 ? '-' : '+'} ${Math.abs(v.beta)}) = 0$`;
    if (v.level === 'core') {
      return [
        [
          step('M1', `$${curve} = ${line}$`, 'Set the two expressions for y equal.'),
          step('M1', `$${quad} = 0$`, 'Collect into one quadratic.'),
          step('A1', fact, 'Factorise.'),
          step('A1', `$x = ${v.alpha}$ or $x = ${v.beta}$`, 'Both values of x.'),
          step('A1', `$(${v.alpha}, ${ya})$ and $(${v.beta}, ${yb})$`, 'Find y from the line, as it is simpler.'),
        ],
        [step('M1', `$${quad} < 0$`, 'Curve below line means curve minus line is negative.'), step('A1', `$${v.alpha} < x < ${v.beta}$`, 'Between the two roots.')],
      ];
    }
    const t = Q.of(v.c).sub(Q.of((v.b - v.m) ** 2, 4));
    return [
      [step('M1', `$${curve} = ${line}$`, 'Set them equal.'), step('M1', `$${quad} = 0$`, 'Collect into one quadratic.'), step('A1', fact, 'Factorise.'), step('A1', `$x = ${v.alpha}$ and $x = ${v.beta}$`, 'Both values.')],
      [step('B1', `$y > ${curve}$`, 'R is above the curve.'), step('B1', `$y < ${line}$`, 'R is below the line.')],
      [
        step('M1', `$x^2 + (${v.b} - ${v.m < 0 ? `(${v.m})` : v.m})x + ${v.c} - t = 0$`, 'Set the curve equal to the new line.'),
        step('M1', `$(${v.b - v.m})^2 - 4(${v.c} - t) = 0$`, 'A tangent means the discriminant is zero.'),
        step('A1', `$t = ${fracTex(t)}$`, 'Solve for t.'),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') return [];
    const f = (x: number) => x * x + v.b * x + v.c;
    const g = (x: number) => v.m * x + v.k;
    if (f(v.alpha) !== g(v.alpha) || f(v.beta) !== g(v.beta)) return ['intersection'];
    if (!(f((v.alpha + v.beta) / 2) < g((v.alpha + v.beta) / 2))) return ['below'];
    if (v.level === 'stretch') {
      // At the tangent, the gradient of the curve equals m and the line touches the curve.
      const x = (v.m - v.b) / 2;
      const t = f(x) - v.m * x;
      return Math.abs(t - (v.c - (v.b - v.m) ** 2 / 4)) < 1e-9 ? [] : ['tangent'];
    }
    return [];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.alpha}|${v.beta}|${v.m}|${v.k}|${v.below}`,
});

/** The set of x satisfying both x > lim and the quadratic inequality, in set notation. */
function bothSet(v: V, lim: Q): string {
  const L = fracTex(lim);
  if (v.below) {
    if (lim.cmp(v.beta) >= 0) return '\\varnothing';
    if (lim.cmp(v.alpha) <= 0) return `\\{x : ${v.alpha} < x < ${v.beta}\\}`;
    return `\\{x : ${L} < x < ${v.beta}\\}`;
  }
  if (lim.cmp(v.beta) >= 0) return `\\{x : x > ${L}\\}`;
  if (lim.cmp(v.alpha) >= 0) return `\\{x : x > ${v.beta}\\}`;
  return `\\{x : ${L} < x < ${v.alpha}\\} \\cup \\{x : x > ${v.beta}\\}`;
}
