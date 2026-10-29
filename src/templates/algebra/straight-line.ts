import { defineTemplate } from '../../engine/types';
import { single, step, text, DIV, MINUS } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 1F Q24 / 1H Q9 (equation of the line through two points),
 * Set 22 1H Q12 (line parallel to 2y = 6x + 5 through a point: does it pass
 * through another point?) and Set 24 1H Q18 (perpendicular bisector of AB).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: 'KS3' | 'F' | 'H';
  A: [number, number];
  B: [number, number];
  // core: L is ay = bx + c; the parallel line passes through P; is R on it?
  a: number;
  b: number;
  c: number;
  P: [number, number];
  R: [number, number];
}

const pt = ([x, y]: [number, number]) => `(${x}, ${y})`.replace(/-/g, '−');
const neg = (n: number) => (n < 0 ? `(${n})` : `${n}`);
/** "y = 3x - 2", "y = -\frac{1}{2}x + 4", "y = 5" */
function lineTex(m: Q, c: Q): string {
  const mx = m.eq(0) ? '' : m.eq(1) ? 'x' : m.eq(-1) ? '-x' : `${fracTex(m)}x`;
  const cs = c.eq(0) ? '' : mx === '' ? fracTex(c) : c.lt(0) ? ` - ${fracTex(c.neg())}` : ` + ${fracTex(c)}`;
  return `y = ${mx}${cs || (mx === '' ? '0' : '')}`;
}
const slope = (A: [number, number], B: [number, number]) => Q.of(B[1] - A[1], B[0] - A[0]);

export default defineTemplate<V>({
  id: 'alg-straight-line',
  title: 'Equations of straight lines',
  strand: 'Algebra',
  subtopic: 'Straight-line graphs',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const base: V = { level, tier, A: [0, 0], B: [0, 0], a: 1, b: 0, c: 0, P: [0, 0], R: [0, 0] };
    const r = () => rng.int(-8, 8);
    if (level === 'core') {
      const a = tier === 'H' ? rng.pick([1, 2, 3]) : 1;
      const m = rng.pick([-4, -3, -2, 2, 3, 4, 5]);
      const c = rng.int(-9, 9);
      const P: [number, number] = [rng.int(-5, 6), 0];
      const c2 = rng.int(-9, 9);
      ensure(c2 !== c && c !== 0, 'a different, parallel line');
      P[1] = m * P[0] + c2;
      const Rx = rng.int(-6, 9);
      ensure(Rx !== P[0] && Rx !== 0, 'a different point');
      const on = rng.chance(0.5);
      const R: [number, number] = [Rx, m * Rx + c2 + (on ? 0 : rng.pick([-2, -1, 1, 2]))];
      ensure([P, R].every(([, y]) => Math.abs(y) <= 30), 'points near the origin');
      // On L itself would be a giveaway: R must not lie on L.
      ensure(R[1] !== m * R[0] + c, 'R not on L');
      return { ...base, a, b: a * m, c, P, R };
    }
    const A: [number, number] = [r(), r()];
    const B: [number, number] = [r(), r()];
    ensure(A[0] !== B[0] && A[1] !== B[1], 'not horizontal or vertical');
    const m = slope(A, B);
    if (level === 'foundational') {
      ensure(m.isInt() && Math.abs(m.toNumber()) <= 5, 'whole-number gradient');
      ensure(Math.abs(A[1] - m.toNumber() * A[0]) <= 12, 'sensible intercept');
      return { ...base, A, B };
    }
    if (tier === 'H') {
      // Perpendicular bisector of AB: midpoint with whole-number coordinates.
      ensure((A[0] + B[0]) % 2 === 0 && (A[1] + B[1]) % 2 === 0, 'whole-number midpoint');
      ensure(m.d <= 4n && m.n !== 0n && !m.eq(1) && !m.eq(-1), 'friendly gradient');
      return { ...base, A, B };
    }
    // Foundation stretch: where the line through A and B crosses the x-axis.
    ensure(m.isInt() && Math.abs(m.toNumber()) <= 6, 'whole-number gradient');
    const c = Q.of(A[1]).sub(m.mul(A[0]));
    ensure(!c.eq(0) && Q.of(c.neg()).div(m).d <= 4n, 'friendly x-intercept');
    ensure(A[1] !== 0 && B[1] !== 0, 'crossing not given');
    return { ...base, A, B };
  },

  validate(v) {
    return v.level !== 'core' && v.A[0] === v.B[0] ? ['vertical line'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return { stem: [text(`A straight line passes through the points ${pt(v.A)} and ${pt(v.B)}`)], parts: [single(3, text('Find an equation of the line.'))] };
    }
    if (v.level === 'core') {
      const L = `${v.a === 1 ? '' : v.a}y = ${linear(v.b, v.c)}`;
      return {
        stem: [text(`The line $\\mathbf{L}$ has equation $${L}$`), text(`The line $\\mathbf{M}$ is parallel to $\\mathbf{L}$ and passes through the point ${pt(v.P)}`)],
        parts: [single(4, text(`Does the line $\\mathbf{M}$ pass through the point ${pt(v.R)}?`), text('You must show how you get your answer.'))],
      };
    }
    if (v.tier === 'H') {
      return {
        stem: [text(`$A$ is the point ${pt(v.A)} and $B$ is the point ${pt(v.B)}`), text('The line $\\mathbf{L}$ is perpendicular to $AB$ and passes through the midpoint of $AB$.')],
        parts: [single(4, text('Find the coordinates of the point where $\\mathbf{L}$ crosses the $y$-axis.'))],
      };
    }
    return {
      stem: [text(`A straight line passes through the points ${pt(v.A)} and ${pt(v.B)}`)],
      parts: [single(4, text('Find the coordinates of the point where the line crosses the $x$-axis.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const m = slope(v.A, v.B);
      return [{ text: `$${lineTex(m, Q.of(v.A[1]).sub(m.mul(v.A[0])))}$` }];
    }
    if (v.level === 'core') {
      const yes = onM(v);
      return [{ text: `${yes ? 'Yes' : 'No'}: M is $${lineTex(Q.of(v.b, v.a), Q.of(cM(v)))}$; when $x = ${v.R[0]}$, $y = ${mAt(v, v.R[0])}$${yes ? '' : `, not $${v.R[1]}$`}` }];
    }
    const k = v.tier === 'H' ? perpIntercept(v) : xIntercept(v);
    return [{ text: v.tier === 'H' ? `$(0, ${fracTex(k)})$` : `$(${fracTex(k)}, 0)$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const m = slope(v.A, v.B);
      const c = Q.of(v.A[1]).sub(m.mul(v.A[0]));
      return [
        [
          step('M1', `gradient $= \\frac{${v.B[1]} - ${neg(v.A[1])}}{${v.B[0]} - ${neg(v.A[0])}} = \\frac{${v.B[1] - v.A[1]}}{${v.B[0] - v.A[0]}} = ${fracTex(m)}$`, 'Gradient = change in y ÷ change in x.'),
          step('M1', `$${v.A[1]} = ${fracTex(m)} \\times ${neg(v.A[0])} + c$, so $c = ${fracTex(c)}$`, 'Substitute one of the points into y = mx + c to find c.'),
          step('A1', `$${lineTex(m, c)}$`, `Check with the other point: ${fracTex(m)} × ${neg(v.B[0])} ${c.lt(0) ? MINUS : '+'} ${Math.abs(c.toNumber())} = ${v.B[1]}`.replace(/-/g, '−')),
        ],
      ];
    }
    if (v.level === 'core') {
      const m = v.b / v.a;
      const yes = onM(v);
      return [
        [
          step('M1', v.a === 1 ? `Gradient of L $= ${m}$` : `$y = ${lineTex(Q.of(v.b, v.a), Q.of(v.c, v.a)).slice(4)}$, so the gradient of L $= ${m}$`, v.a === 1 ? 'In y = mx + c the gradient is m.' : `Divide by ${v.a} to get y = … : the gradient is ${v.b} ${DIV} ${v.a} = ${m}.`.replace(/-/g, MINUS)),
          step('M1', `$${v.P[1]} = ${m} \\times ${neg(v.P[0])} + c$, so $c = ${cM(v)}$`, 'Parallel lines have the same gradient. Substitute the point to find c.'),
          step('A1', `$${lineTex(Q.of(m), Q.of(cM(v)))}$`, 'This is the equation of M.'),
          step('C1', `$x = ${v.R[0]}$: $y = ${m} \\times ${neg(v.R[0])} ${cM(v) < 0 ? '-' : '+'} ${Math.abs(cM(v))} = ${mAt(v, v.R[0])}$, ${yes ? `so yes` : `not $${v.R[1]}$, so no`}`, 'Substitute the x-coordinate and compare the y-coordinates.'),
        ],
      ];
    }
    const m = slope(v.A, v.B);
    if (v.tier === 'H') {
      const M: [number, number] = [(v.A[0] + v.B[0]) / 2, (v.A[1] + v.B[1]) / 2];
      const pm = Q.of(-1).div(m);
      const k = perpIntercept(v);
      return [
        [
          step('P1', `Gradient of $AB = \\frac{${v.B[1] - v.A[1]}}{${v.B[0] - v.A[0]}} = ${fracTex(m)}$, midpoint $= ${pt(M)}$`, 'Midpoint: add the coordinates and halve.'),
          step('P1', `Gradient of L $= ${fracTex(pm)}$`, 'Perpendicular gradients multiply to −1: flip the fraction and change the sign.'),
          step('P1', `$${M[1]} = ${fracTex(pm)} \\times ${neg(M[0])} + c$`, 'Substitute the midpoint into y = mx + c.'),
          step('A1', `$c = ${fracTex(k)}$, so $(0, ${fracTex(k)})$`, 'L crosses the y-axis at y = c.'),
        ],
      ];
    }
    const c = Q.of(v.A[1]).sub(m.mul(v.A[0]));
    const x0 = xIntercept(v);
    return [
      [
        step('P1', `gradient $= \\frac{${v.B[1] - v.A[1]}}{${v.B[0] - v.A[0]}} = ${fracTex(m)}$`, 'Change in y ÷ change in x.'),
        step('P1', `$${lineTex(m, c)}$`, 'Substitute a point to find c.'),
        step('P1', `$0 = ${lineTex(m, c).slice(4)}$`, 'The line crosses the x-axis where y = 0.'),
        step('A1', `$x = ${fracTex(x0)}$, so $(${fracTex(x0)}, 0)$`, 'Solve for x, then write it as coordinates.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const t = answers[0].text;
    const num = (s: string) => {
      const f = /(-?)\\frac\{(\d+)\}\{(\d+)\}/.exec(s);
      return f ? Q.of(Number(f[2]), Number(f[3])).mul(f[1] ? -1 : 1) : Q.of(s.trim());
    };
    if (v.level === 'foundational') {
      // Both points must satisfy the line shown.
      const m = /y = (-?)(\d*)x(?: ([+-]) (\d+))?/.exec(t);
      if (!m) return ['format'];
      const grad = (m[1] ? -1 : 1) * (m[2] === '' ? 1 : Number(m[2]));
      const c = m[3] ? (m[3] === '-' ? -1 : 1) * Number(m[4]) : 0;
      for (const [x, y] of [v.A, v.B]) if (grad * x + c !== y) p.push('point not on line');
    } else if (v.level === 'core') {
      // Parallel through P: (y − Py) = (b/a)(x − Px). Test R with cross-multiplication.
      const lhs = v.a * (v.R[1] - v.P[1]);
      const rhs = v.b * (v.R[0] - v.P[0]);
      if (t.startsWith('Yes') !== (lhs === rhs)) p.push('decision');
    } else {
      const m = /\((.+), (.+)\)/.exec(t.replace(/\$/g, ''));
      if (!m) return ['format'];
      const X = num(m[1]);
      const Y = num(m[2]);
      if (v.tier === 'H') {
        // On the y-axis and equidistant from A and B.
        const d2 = (P: [number, number]) => X.sub(P[0]).mul(X.sub(P[0])).add(Y.sub(P[1]).mul(Y.sub(P[1])));
        if (!X.eq(0) || !d2(v.A).eq(d2(v.B))) p.push('not on the perpendicular bisector');
      } else {
        // On the x-axis and collinear with A and B.
        if (!Y.eq(0) || !X.sub(v.A[0]).mul(v.B[1] - v.A[1]).eq(Q.of(0 - v.A[1]).mul(v.B[0] - v.A[0]))) p.push('not on line');
      }
    }
    return p;
  },

  key: (v) => `${v.tier}|${v.A}|${v.B}|${v.a}|${v.b}|${v.c}|${v.P}|${v.R}`,
});

/** "6x + 5" (plain integers) */
const linear = (b: number, c: number) => `${b === 1 ? '' : b === -1 ? '-' : b}x${c === 0 ? '' : c < 0 ? ` - ${-c}` : ` + ${c}`}`;
const cM = (v: V) => v.P[1] - (v.b / v.a) * v.P[0];
const mAt = (v: V, x: number) => (v.b / v.a) * x + cM(v);
const onM = (v: V) => mAt(v, v.R[0]) === v.R[1];
function perpIntercept(v: V): Q {
  const m = slope(v.A, v.B);
  const pm = Q.of(-1).div(m);
  return Q.of(v.A[1] + v.B[1], 2).sub(pm.mul(Q.of(v.A[0] + v.B[0], 2)));
}
function xIntercept(v: V): Q {
  const m = slope(v.A, v.B);
  const c = Q.of(v.A[1]).sub(m.mul(v.A[0]));
  return c.neg().div(m);
}
