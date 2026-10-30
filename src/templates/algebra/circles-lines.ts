import { defineTemplate } from '../../engine/types';
import { single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { gcdInt } from '../../engine/rational';

/**
 * Modelled on November 2022 2H Q24 (the tangent to x² + y² = 12.25 at a point),
 * June 2022 1H Q20 (circle centre (−1, 3) through A(6, 8): the tangent at A in
 * the form ax + by + c = 0) and June 2022 3H Q22 (where a line meets a curve,
 * using algebra). The examiner report notes that marks were lost for not
 * giving the requested form ax + by + c = 0, so the A1 note insists on it.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  r2: number;
  c: [number, number]; // centre
  p: [number, number]; // point on the circle
  q: [number, number]; // stretch: second intersection point
}

const pt = ([x, y]: [number, number]) => `(${x}, ${y})`;
/** Lattice points on x² + y² = r2. */
const lattice = (r2: number) => {
  const out: [number, number][] = [];
  const r = Math.floor(Math.sqrt(r2));
  for (let x = -r; x <= r; x++)
    for (let y = -r; y <= r; y++) if (x * x + y * y === r2) out.push([x, y]);
  return out;
};
/** ax + by + c with integer coefficients, simplest form, a > 0 (or b > 0 if a = 0). */
function normal(a: number, b: number, c: number): [number, number, number] {
  const g = gcdInt(gcdInt(a, b), c) || 1;
  let [A, B, C] = [a / g, b / g, c / g];
  if (A < 0 || (A === 0 && B < 0)) [A, B, C] = [-A, -B, -C];
  return [A, B, C];
}
const lineTex = ([a, b, c]: [number, number, number]) => {
  const xs = polyTex([a, 0]).replace(/^0$/, '');
  const ys = b === 0 ? '' : `${xs ? (b < 0 ? ' - ' : ' + ') : b < 0 ? '-' : ''}${Math.abs(b) === 1 ? '' : Math.abs(b)}y`;
  const cs = c === 0 ? '' : ` ${c < 0 ? '-' : '+'} ${Math.abs(c)}`;
  return `${xs}${ys}${cs} = 0`;
};

export default defineTemplate<V>({
  id: 'alg-circles-lines',
  title: 'Tangents to circles and where lines meet circles',
  strand: 'Algebra',
  subtopic: 'Straight-line graphs',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, r2: 0, c: [0, 0], p: [0, 0], q: [0, 0] };
    if (level === 'foundational') {
      const r2 = rng.pick([25, 100, 169, 20, 40, 45, 52, 58, 65, 85]);
      const pts = lattice(r2).filter(([x, y]) => x !== 0 && y !== 0);
      ensure(pts.length > 0, 'a point with no zero coordinate');
      return { ...base, r2, p: rng.pick(pts) };
    }
    if (level === 'core') {
      const c: [number, number] = [rng.int(-5, 5), rng.int(-5, 5)];
      const d: [number, number] = [rng.int(-8, 8), rng.int(-8, 8)];
      ensure(d[0] !== 0 && d[1] !== 0 && gcdInt(d[0], d[1]) <= 2, 'a slanted radius');
      const p: [number, number] = [c[0] + d[0], c[1] + d[1]];
      ensure(c[0] !== 0 || c[1] !== 0, 'not centred at the origin');
      return { ...base, c, p, r2: d[0] * d[0] + d[1] * d[1] };
    }
    // Stretch: two lattice points on the circle joined by a line with whole-number gradient and intercept.
    const r2 = rng.pick([25, 50, 65, 85, 100, 125, 130, 145, 169, 170]);
    const pts = lattice(r2);
    const pairs: [[number, number], [number, number]][] = [];
    for (const A of pts)
      for (const B of pts) {
        if (A[0] >= B[0]) continue;
        const m = (B[1] - A[1]) / (B[0] - A[0]);
        const c = A[1] - m * A[0];
        if (Number.isInteger(m) && Number.isInteger(c) && m !== 0 && c !== 0 && Math.abs(m) <= 4 && A.every((t) => t !== 0) && B.every((t) => t !== 0)) pairs.push([A, B]);
      }
    ensure(pairs.length > 0, 'a line through two lattice points');
    const [p, q] = rng.pick(pairs);
    return { ...base, r2, p, q };
  },

  validate(v) {
    if (v.level === 'stretch') return v.p[0] ** 2 + v.p[1] ** 2 === v.r2 && v.q[0] ** 2 + v.q[1] ** 2 === v.r2 ? [] : ['points on the circle'];
    return (v.p[0] - v.c[0]) ** 2 + (v.p[1] - v.c[1]) ** 2 === v.r2 ? [] : ['point on the circle'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return { stem: [text(`A circle has equation $x^2 + y^2 = ${v.r2}$`), text(`The point $P(${v.p[0]}, ${v.p[1]})$ lies on the circle.`)], parts: [single(3, text('Find an equation of the tangent to the circle at $P$.'), text('Give your answer in the form $y = mx + c$'))] };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`The centre of a circle is the point with coordinates ${pt(v.c)}`.replace(/-/g, '−')), text(`The point $A$ with coordinates ${pt(v.p)} lies on the circle.`.replace(/-(\d)/g, '−$1'))],
        parts: [single(4, text('Find an equation of the tangent to the circle at $A$.'), text('Give your answer in the form $ax + by + c = 0$ where $a$, $b$ and $c$ are integers.'))],
      };
    }
    const m = (v.q[1] - v.p[1]) / (v.q[0] - v.p[0]);
    const c = v.p[1] - m * v.p[0];
    return {
      stem: [text(`$\\mathbf{C}$ is the circle with equation $x^2 + y^2 = ${v.r2}$`), text(`$\\mathbf{L}$ is the straight line with equation $y = ${polyTex([m, c])}$`)],
      parts: [single(5, text('Using algebra, find the coordinates of the points where $\\mathbf{L}$ meets $\\mathbf{C}$.'), text('You must show all your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `$y = ${tangentSlopeTex(v)}$` }];
    if (v.level === 'core') return [{ text: `$${lineTex(coreLine(v))}$` }];
    const [a, b] = [v.p, v.q].sort((s, t) => s[0] - t[0]);
    return [{ text: `$${pt(a)}$ and $${pt(b)}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [a, b] = v.p;
      return [
        [
          step('M1', `Gradient of $OP = ${fracS(b, a)}$`, 'The radius goes from the centre (0, 0) to P.'),
          step('M1', `Gradient of tangent $= ${fracS(-a, b)}$`, 'The tangent is perpendicular to the radius: flip and change sign.'),
          step('A1', `$${b} = ${fracS(-a, b)} \\times ${par(a)} + c$, so $y = ${tangentSlopeTex(v)}$`, 'Substitute P to find c.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const [dx, dy] = [v.p[0] - v.c[0], v.p[1] - v.c[1]];
      return [
        [
          step('M1', `Gradient of radius $= \\frac{${v.p[1]} - ${par(v.c[1])}}{${v.p[0]} - ${par(v.c[0])}} = ${fracS(dy, dx)}$`, 'Use BOTH the centre and A.'),
          step('M1', `Gradient of tangent $= ${fracS(-dx, dy)}$`, 'Perpendicular: the gradients multiply to −1.'),
          step('M1', `$y - ${par(v.p[1])} = ${fracS(-dx, dy)}(x - ${par(v.p[0])})$`, 'Equation of a line through A with this gradient.'),
          step('A1', `$${lineTex(coreLine(v))}$`, 'Multiply out and rearrange into the form asked for: ax + by + c = 0 with integers.'),
        ],
      ];
    }
    const m = (v.q[1] - v.p[1]) / (v.q[0] - v.p[0]);
    const c = v.p[1] - m * v.p[0];
    const A = 1 + m * m;
    const B = 2 * m * c;
    const C = c * c - v.r2;
    const [x1, x2] = [v.p[0], v.q[0]].sort((s, t) => s - t);
    return [
      [
        step('M1', `$x^2 + (${polyTex([m, c])})^2 = ${v.r2}$`, 'Substitute the line into the circle to get an equation in x only.'),
        step('M1', `$x^2 + ${polyTex([m * m, 2 * m * c, c * c])} = ${v.r2}$`, `Expand the bracket carefully: (${polyTex([m, c])})² has THREE terms.`.replace(/-/g, '−')),
        step('M1', `$${polyTex([A, B, C])} = 0$${A !== 1 ? `, so $${polyTex([1, -(x1 + x2), x1 * x2])} = 0$` : ''}, so $(x ${x1 < 0 ? '+' : '-'} ${Math.abs(x1)})(x ${x2 < 0 ? '+' : '-'} ${Math.abs(x2)}) = 0$`, `Collect terms${A !== 1 ? ` and divide by ${A}` : ''}, then factorise.`),
        step('A1', `$x = ${x1}$ or $x = ${x2}$`, 'Two solutions: the line crosses the circle twice.'),
        step('A1', `$${pt([x1, m * x1 + c])}$ and $${pt([x2, m * x2 + c])}$`, 'Substitute each x back into the LINE to find y.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const nums = (answers[0].text.match(/-?\d+/g) ?? []).map(Number);
    if (v.level === 'foundational') {
      // y = mx + c read back: P on the line, and line perpendicular to OP (dot product zero).
      const m = parseSlope(answers[0].text);
      if (!m) return ['format'];
      const [mn, md, c] = m;
      if (v.p[1] * md !== mn * v.p[0] + c) p.push('P not on tangent');
      if (v.p[0] * md + v.p[1] * mn !== 0) p.push('not perpendicular');
      return p;
    }
    if (v.level === 'core') {
      const coeffs = /\$(-?\d*)x ([+-]) (\d*)y(?: ([+-]) (\d+))? = 0\$/.exec(answers[0].text);
      if (!coeffs) return ['format'];
      const a = coeffs[1] === '' ? 1 : coeffs[1] === '-' ? -1 : Number(coeffs[1]);
      const b = (coeffs[2] === '-' ? -1 : 1) * (coeffs[3] === '' ? 1 : Number(coeffs[3]));
      const c = coeffs[4] ? (coeffs[4] === '-' ? -1 : 1) * Number(coeffs[5]) : 0;
      if (a * v.p[0] + b * v.p[1] + c !== 0) p.push('A not on tangent');
      // The line's normal (a, b) must be parallel to the radius.
      if (a * (v.p[1] - v.c[1]) !== b * (v.p[0] - v.c[0])) p.push('not perpendicular to the radius');
      if (gcdInt(gcdInt(a, b), c) !== 1) p.push('not in simplest form');
      return p;
    }
    // Both points on the circle and on the line, and different.
    const [x1, y1, x2, y2] = nums;
    const m = (v.q[1] - v.p[1]) / (v.q[0] - v.p[0]);
    const c = v.p[1] - m * v.p[0];
    for (const [x, y] of [[x1, y1], [x2, y2]]) {
      if (x * x + y * y !== v.r2) p.push('not on circle');
      if (y !== m * x + c) p.push('not on line');
    }
    if (x1 === x2) p.push('same point twice');
    return p;
  },

  key: (v) => `${v.r2}|${v.c}|${v.p}|${v.q}`,
});

const par = (n: number) => (n < 0 ? `(${n})` : `${n}`);
/** −a/b as KaTeX, simplified. */
function fracS(n: number, d: number): string {
  const g = gcdInt(n, d) || 1;
  let [a, b] = [n / g, d / g];
  if (b < 0) [a, b] = [-a, -b];
  return b === 1 ? `${a}` : `${a < 0 ? '-' : ''}\\frac{${Math.abs(a)}}{${b}}`;
}
/** Tangent to x² + y² = r² at (a, b): y = (−a/b)x + r²/b. */
function tangentSlopeTex(v: V): string {
  const [a, b] = v.p;
  const m = fracS(-a, b);
  const cn = v.r2;
  const c = fracS(cn, b);
  const mx = m === '1' ? 'x' : m === '-1' ? '-x' : `${m}x`;
  return `${mx} ${c.startsWith('-') ? '-' : '+'} ${c.replace(/^-/, '')}`;
}
/** Tangent at A to the circle with centre C: (A − C)·(X − A) = 0. */
function coreLine(v: V): [number, number, number] {
  const [dx, dy] = [v.p[0] - v.c[0], v.p[1] - v.c[1]];
  return normal(dx, dy, -(dx * v.p[0] + dy * v.p[1]));
}
/** Read "y = -\frac{3}{4}x + \frac{25}{4}" as [slope numerator, common denominator, intercept numerator]. */
function parseSlope(s: string): [number, number, number] | null {
  const m = /y = (-?)(?:\\frac\{(\d+)\}\{(\d+)\}|(\d*))x ([+-]) (?:\\frac\{(\d+)\}\{(\d+)\}|(\d+))/.exec(s);
  if (!m) return null;
  const sn = (m[1] ? -1 : 1) * (m[2] ? Number(m[2]) : m[4] ? Number(m[4]) : 1);
  const sd = m[3] ? Number(m[3]) : 1;
  const cn = (m[5] === '-' ? -1 : 1) * (m[6] ? Number(m[6]) : Number(m[8]));
  const cd = m[7] ? Number(m[7]) : 1;
  // Common denominator.
  return [sn * cd, sd * cd, cn * sd];
}
