import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, linTex, polyTex } from '../../engine/format';
import { surdTex } from '../../engine/pure';

/**
 * Simultaneous equations where one is not linear, on nearly every Higher
 * series: a line with a quadratic curve (Practice), a line with a circle
 * centred on the origin (Apply), and the length of the chord a line cuts
 * from a curve, as a simplified surd (Extend).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // Line y = mx + k.
  m: number;
  k: number;
  // foundational, stretch: curve y = x² + bx + c.
  b: number;
  c: number;
  // core: circle x² + y² = n.
  n: number;
}

/** Whole-number points on both graphs, found by trying every x. */
function meets(v: V): [number, number][] {
  const out: [number, number][] = [];
  for (let x = -60; x <= 60; x++) {
    const y = v.m * x + v.k;
    if (v.level === 'core' ? x * x + y * y === v.n : y === x * x + v.b * x + v.c) out.push([x, y]);
  }
  return out;
}
const curve = (v: V) => (v.level === 'core' ? `x^2 + y^2 = ${v.n}` : `y = ${polyTex([1, v.b, v.c])}`);
const line = (v: V) => `y = ${linTex(v.m, v.k)}`;
const pairs = (pts: [number, number][]) => pts.map(([x, y]) => `$x = ${x}$, $y = ${y}$`).join(' or ');
/** The quadratic in x after substituting, as [A, B, C]. */
const quad = (v: V): [number, number, number] => (v.level === 'core' ? [1 + v.m * v.m, 2 * v.m * v.k, v.k * v.k - v.n] : [1, v.b - v.m, v.c - v.k]);
const bracket = (r: number) => `(${linTex(1, -r)})`;

export default defineTemplate<V>({
  id: 'alg-nonlinear-simultaneous',
  title: 'Simultaneous equations: a line and a curve',
  strand: 'Algebra',
  subtopic: 'Simultaneous equations',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, m: 1, k: 0, b: 0, c: 0, n: 0 };
    if (level === 'core') {
      // Two whole-number points on a circle, joined by a line with a whole-number gradient.
      const n = rng.pick([5, 10, 13, 17, 20, 25, 26, 29, 34, 37, 40, 41, 45, 50, 52, 53, 58, 61, 65, 73, 74, 80, 85, 100]);
      const pts: [number, number][] = [];
      for (let x = -10; x <= 10; x++) for (let y = -10; y <= 10; y++) if (x * x + y * y === n) pts.push([x, y]);
      const [p, q] = rng.sample(pts, 2);
      ensure(p[0] !== q[0] && (q[1] - p[1]) % (q[0] - p[0]) === 0, 'a whole-number gradient');
      const m = (q[1] - p[1]) / (q[0] - p[0]);
      const k = p[1] - m * p[0];
      ensure(m !== 0 && Math.abs(m) <= 3 && k !== 0, 'a sloping line that misses the origin');
      return { ...base, n, m, k };
    }
    const x1 = rng.int(-6, 4);
    const x2 = x1 + rng.int(1, 7);
    const m = rng.int(1, 4) * rng.pick([1, 1, -1]);
    const k = rng.int(-9, 9);
    const b = m - (x1 + x2);
    const c = k + x1 * x2;
    ensure(b !== 0 && c !== 0 && k !== 0 && Math.abs(c) <= 30 && x1 !== 0 && x2 !== 0, 'every term present');
    if (level === 'stretch') ensure(m !== 1 || x2 - x1 > 1, 'a chord worth simplifying');
    return { ...base, m, k, b, c };
  },

  validate(v) {
    return meets(v).length === 2 ? [] : ['the line must meet the curve at exactly two whole-number points'];
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: [text(`The curve with equation  $${curve(v)}$  meets the line with equation  $${line(v)}$  at the points $A$ and $B$.`)],
        parts: [single(6, text('Find the exact length of $AB$.'), text('Give your answer as a surd in its simplest form.'))],
      };
    }
    return { stem: [text('Solve algebraically the simultaneous equations'), text(`$${curve(v)}$`), text(`$${line(v)}$`)], parts: [single(v.level === 'core' ? 5 : 4, text('Show clear algebraic working.'))] };
  },

  answer(v) {
    const pts = meets(v);
    if (v.level !== 'stretch') return [{ text: pairs(pts) }];
    const [[x1, y1], [x2, y2]] = pts;
    return [{ text: `$${surdTex((x2 - x1) ** 2 + (y2 - y1) ** 2)}$` }];
  },

  markScheme(v) {
    const pts = meets(v);
    const [[x1, y1], [x2, y2]] = pts;
    const [A, B, C] = quad(v);
    const simple = [1, B / A, C / A];
    const solveX = [
      step('M1', `$${polyTex(simple)} = 0$`, A === 1 ? 'Collect every term on one side.' : `Collect every term on one side, then divide through by ${A}.`),
      step('M1', `$${bracket(x1)}${bracket(x2)} = 0$, so $x = ${x1}$ or $x = ${x2}$`, 'Factorise and solve.'),
    ];
    if (v.level === 'core') {
      return [
        [
          step('M1', `$x^2 + (${linTex(v.m, v.k)})^2 = ${v.n}$`, 'Substitute the line into the circle, keeping the bracket.'),
          step('M1', `$${polyTex([A, B, C])} = 0$`, 'Expand the bracket (three terms, not two) and simplify.'),
          ...solveX,
          step('A1', pairs(pts), 'Put each x into the LINE to find its y. Pair the answers up.'),
        ],
      ];
    }
    const equate = step('M1', `$${polyTex([1, v.b, v.c])} = ${linTex(v.m, v.k)}$`, 'Both expressions equal y, so set them equal.');
    if (v.level === 'foundational') return [[equate, ...solveX, step('A1', pairs(pts), 'Put each x into the line to find its y. Pair the answers up.')]];
    const d2 = (x2 - x1) ** 2 + (y2 - y1) ** 2;
    return [
      [
        equate,
        ...solveX,
        step('A1', `$A(${x1}, ${y1})$ and $B(${x2}, ${y2})$`, 'Put each x into the line to find its y.'),
        step('M1', `$AB^2 = ${x2 - x1}^2 + ${y2 - y1 < 0 ? `(${y2 - y1})` : y2 - y1}^2 = ${d2}$`, 'Pythagoras on the differences in x and in y.'),
        step('A1', `$AB = \\sqrt{${d2}} = ${surdTex(d2)}$`, 'Take out the largest square factor.'),
      ],
    ];
  },

  check(v, answers) {
    // Solve the substituted quadratic with the formula rather than by trial.
    const [A, B, C] = quad(v);
    const root = Math.sqrt(B * B - 4 * A * C);
    const xs = [(-B - root) / (2 * A), (-B + root) / (2 * A)];
    const want = xs.map((x) => [x, v.m * x + v.k]);
    if (v.level === 'stretch') {
      const m = /^\$(\d*)\\sqrt\{(\d+)\}\$$/.exec(answers[0].text);
      if (!m) return ['format'];
      const shown = Number(m[1] || 1) ** 2 * Number(m[2]);
      const d2 = (want[1][0] - want[0][0]) ** 2 + (want[1][1] - want[0][1]) ** 2;
      return Math.abs(shown - d2) < 1e-9 ? [] : [`AB² should be ${d2}`];
    }
    const got = [...answers[0].text.matchAll(/x = (-?\d+)\$, \$y = (-?\d+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
    return got.length === 2 && got.every(([x, y], i) => Math.abs(x - want[i][0]) < 1e-9 && Math.abs(y - want[i][1]) < 1e-9) ? [] : [`expected ${want}`];
  },

  key: (v) => `${v.m}|${v.k}|${v.b}|${v.c}|${v.n}`,
});
