import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex, polyTex } from '../../engine/format';
import { shift, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 functions: composite and inverse functions (June 2024 P1 Q8),
 * the modulus graph y = a|x − p| + q with its vertex and a line through a fixed
 * point (June 2024 P1 Q6), and the inverse of a restricted quadratic.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  p: number;
  q: number;
  k: number;
  h: number;
  m: number;
}

export default defineTemplate<V>({
  id: 'y13-functions',
  title: 'Functions, inverses and modulus',
  strand: 'Pure',
  subtopic: 'Functions & modulus',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base: V = { level, a: 0, b: 0, c: 0, d: 0, e: 0, p: 0, q: 0, k: 0, h: 0, m: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 6);
      const b = nz(1, 9);
      const c = rng.int(2, 12);
      const d = rng.int(1, 5);
      const e = rng.int(1, 6);
      ensure(e + d !== 0, 'g(e) must be defined');
      return { ...base, a, b, c, d, e };
    }
    if (level === 'core') {
      const a = rng.int(2, 4);
      const p = rng.int(2, 6);
      const q = rng.int(1, 6) * rng.pick([1, -1]);
      ensure(a * p + q >= 3, 'room for the line to start below the graph');
      const k = rng.int(1, a * p + q - 1);
      ensure(k < a * p + q && k > q, 'the point lies below the left arm and above the vertex');
      const m = q + rng.int(2, 8);
      return { ...base, a, p, q, k, m };
    }
    // f(x) = (x − s)² + q for x ≥ s. f(x) = x has roots r and 2s + 1 − r; only r is in the domain.
    const c = rng.int(1, 4);
    const r = c + rng.int(2, 5);
    const other = 2 * c + 1 - r;
    const q = r * other - c * c;
    ensure(q !== 0, 'the constant must appear');
    return { ...base, h: -c, q, p: r, k: other };
  },

  validate(v) {
    return v.level === 'core' && v.k >= v.a * v.p + v.q ? ['the point must be below the graph'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('The functions f and g are defined by', `$\\mathrm{f}(x) = ${polyTex([v.a, v.b])},\\ x \\in \\mathbb{R}$`, `$\\mathrm{g}(x) = \\frac{${v.c}}{x + ${v.d}},\\ x > 0$`),
        parts: [
          part('a', 2, text(`Find  $\\mathrm{fg}(${v.e})$`)),
          part('b', 3, text('Find $\\mathrm{g}^{-1}(x)$')),
          part('c', 2, text('Find the range of g.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`The graph with equation  $y = ${v.a}|x - ${v.p}| ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)}$  has its vertex at the point $V$.`),
        parts: [
          part('a', 2, text('Find the coordinates of $V$.')),
          part('b', 3, text(`Solve the equation  $${v.a}|x - ${v.p}| ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)} = ${v.m}$`)),
          part('c', 3, text(`A line $l$ has equation  $y = cx + ${v.k}$  where $c$ is a constant.`), text('Given that $l$ meets the graph at 2 distinct points, find the range of possible values of $c$.')),
        ],
      };
    }
    const fx = `${shift(-v.h)}^2 ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)}`;
    return {
      stem: lines(`The function f is defined by  $\\mathrm{f}(x) = ${fx},\\ x \\geqslant ${-v.h}$`),
      parts: [
        part('a', 1, text('Write down the range of f.')),
        part('b', 3, text('Find $\\mathrm{f}^{-1}(x)$, stating its domain.')),
        part('c', 3, text('Using algebra, solve  $\\mathrm{f}(x) = \\mathrm{f}^{-1}(x)$')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const fg = Q.of(v.c, v.e + v.d).mul(v.a).add(v.b);
      return [{ text: `$${fracTex(fg)}$` }, { text: `$\\mathrm{g}^{-1}(x) = \\frac{${v.c}}{x} - ${v.d}$` }, { text: `$0 < \\mathrm{g}(x) < ${fracTex(Q.of(v.c, v.d))}$` }];
    }
    if (v.level === 'core') {
      const w = Q.of(v.m - v.q, v.a);
      const low = Q.of(v.q - v.k, v.p);
      return [
        { text: `$V(${v.p}, ${v.q})$` },
        { text: `$x = ${fracTex(Q.of(v.p).sub(w))}$ or $x = ${fracTex(Q.of(v.p).add(w))}$` },
        { text: `$${fracTex(low)} < c < ${v.a}$` },
      ];
    }
    return [{ text: `$\\mathrm{f}(x) \\geqslant ${v.q}$` }, { text: `$\\mathrm{f}^{-1}(x) = \\sqrt{x ${v.q < 0 ? '+' : '-'} ${Math.abs(v.q)}} + ${-v.h},\\ x \\geqslant ${v.q}$` }, { text: `$x = ${v.p}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const g = Q.of(v.c, v.e + v.d);
      const fg = g.mul(v.a).add(v.b);
      return [
        [step('M1', `$\\mathrm{g}(${v.e}) = ${fracTex(g)}$`, 'Work from the inside: apply g first.'), step('A1', `$\\mathrm{f}\\left(${fracTex(g)}\\right) = ${fracTex(fg)}$`, 'Then put the result into f.')],
        [
          step('M1', `$y = \\frac{${v.c}}{x + ${v.d}}$, so $x + ${v.d} = \\frac{${v.c}}{y}$`, 'Rearrange to make x the subject.'),
          step('M1', `$x = \\frac{${v.c}}{y} - ${v.d}$`, 'Finish the rearranging.'),
          step('A1', `$\\mathrm{g}^{-1}(x) = \\frac{${v.c}}{x} - ${v.d}$`, 'Swap y back to x and use the correct notation.'),
        ],
        [step('M1', `$\\mathrm{g}(0) = ${fracTex(Q.of(v.c, v.d))}$`, 'g is decreasing, so the upper bound comes from the end of the domain.'), step('A1', `$0 < \\mathrm{g}(x) < ${fracTex(Q.of(v.c, v.d))}$`, 'x > 0 and the fraction never reaches 0, so both inequalities are strict.')],
      ];
    }
    if (v.level === 'core') {
      const w = Q.of(v.m - v.q, v.a);
      const low = Q.of(v.q - v.k, v.p);
      return [
        [step('M1', `$x = ${v.p}$`, 'The modulus is smallest, 0, when the inside is zero.'), step('A1', `$V(${v.p}, ${v.q})$`, 'Find y.')],
        [
          step('M1', `$|x - ${v.p}| = ${fracTex(w)}$`, 'Get the modulus on its own first.'),
          step('M1', `$x - ${v.p} = \\pm ${fracTex(w)}$`, 'A modulus gives two cases.'),
          step('A1', `$x = ${fracTex(Q.of(v.p).sub(w))}$ or $x = ${fracTex(Q.of(v.p).add(w))}$`, 'Both values.'),
        ],
        [
          step('M1', `Line through $(0, ${v.k})$ and $V$:  gradient $= ${fracTex(low)}$`, 'A sketch helps: the line turns about (0, k).'),
          step('M1', `Parallel to the right-hand branch: gradient $= ${v.a}$`, 'Steeper than this and the line misses the right-hand branch.'),
          step('A1', `$${fracTex(low)} < c < ${v.a}$`, 'Both ends are strict: at those gradients there is only 1 point.'),
        ],
      ];
    }
    const fx = terms([[1, 2], [2 * v.h - 1, 1], [v.h * v.h + v.q, 0]]);
    return [
      [step('B1', `$\\mathrm{f}(x) \\geqslant ${v.q}$`, 'The smallest output is at the vertex.')],
      [
        step('M1', `$y = ${shift(-v.h)}^2 ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)}$, so $${shift(-v.h)} = \\sqrt{y ${v.q < 0 ? '+' : '-'} ${Math.abs(v.q)}}$`, 'Take the positive root because of the domain of f.'),
        step('A1', `$\\mathrm{f}^{-1}(x) = \\sqrt{x ${v.q < 0 ? '+' : '-'} ${Math.abs(v.q)}} + ${-v.h}$`, 'Swap the letters.'),
        step('B1', `$x \\geqslant ${v.q}$`, 'The domain of the inverse is the range of f.'),
      ],
      [
        step('M1', '$\\mathrm{f}(x) = x$', 'A function and its inverse meet on the line y = x (for an increasing function).'),
        step('M1', `$${fx} = 0$`, 'Expand and collect.'),
        step('A1', `$x = ${v.p}$`, `The quadratic also gives x = ${v.k}, which is rejected: the domain needs x ≥ ${-v.h}.`),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      // Inverse really undoes g, at several points.
      for (const x of [0.5, 1, 2, 7]) {
        const y = v.c / (x + v.d);
        if (Math.abs(v.c / y - v.d - x) > 1e-9) return ['inverse'];
      }
      return [];
    }
    if (v.level === 'core') {
      // Count intersections by brute force, either side of each end of the range.
      const count = (c: number) => {
        let n = 0;
        const f = (x: number) => v.a * Math.abs(x - v.p) + v.q - (c * x + v.k);
        // The offset keeps the grid off exact crossings; the wide range reaches a shallow crossing far away.
        for (let i = -20000; i < 20000; i++) if (f((i + 0.137) / 20) * f((i + 1.137) / 20) < 0) n++;
        return n;
      };
      const low = (v.q - v.k) / v.p;
      const mid = (low + v.a) / 2;
      return count(mid) === 2 && count(low - 0.05) !== 2 && count(v.a + 0.2) !== 2 ? [] : ['range'];
    }
    const f = (x: number) => (x + v.h) ** 2 + v.q;
    const inv = (x: number) => Math.sqrt(x - v.q) - v.h;
    if (Math.abs(f(v.p) - v.p) > 1e-9 || Math.abs(inv(v.p) - v.p) > 1e-9) return ['intersection'];
    return v.k < -v.h && Math.abs(f(v.k) - v.k) < 1e-9 ? [] : ['the other root'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.d}|${v.e}|${v.p}|${v.q}|${v.k}|${v.h}|${v.m}`,
});
