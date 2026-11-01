import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { DYDX, lineTex } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0: implicit differentiation with a tangent or a point where the
 * gradient is zero, and a parabola given parametrically whose normal meets the
 * curve again. Each level is one self-contained question from the papers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  k: number;
  px: number;
  py: number;
  t: number;
}

const curve = (v: V) => `x^2 ${v.a < 0 ? '-' : '+'} ${Math.abs(v.a) === 1 ? '' : Math.abs(v.a)}xy + ${v.b === 1 ? '' : v.b}y^2 = ${v.k}`;

export default defineTemplate<V>({
  id: 'y13-implicit-parametric',
  title: 'Implicit and parametric differentiation',
  strand: 'Pure',
  subtopic: 'Parametric equations',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'form-solve', stretch: 'geometry-chain' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base: V = { level, a: 0, b: 0, k: 0, px: 0, py: 0, t: 0 };
    if (level === 'foundational') {
      const a = nz(1, 5);
      const b = rng.int(1, 4);
      const px = nz(1, 4);
      const py = nz(1, 4);
      const k = px * px + a * px * py + b * py * py;
      const top = 2 * px + a * py;
      const bot = a * px + 2 * b * py;
      ensure(k > 0 && top !== 0 && bot !== 0, 'a real gradient that is not zero or vertical');
      return { ...base, a, b, k, px, py };
    }
    if (level === 'core') {
      // x² + 2xy + by² = k: the gradient is zero when y = −x.
      const b = rng.int(2, 5);
      const x0 = rng.int(1, 5);
      return { ...base, a: 2, b, k: (b - 1) * x0 * x0, px: x0, py: -x0 };
    }
    return { ...base, a: rng.int(1, 5), t: rng.pick([1, 2, -1, -2]) };
  },

  validate(v) {
    return v.level === 'stretch' ? [] : v.px * v.px + v.a * v.px * v.py + v.b * v.py * v.py === v.k ? [] : ['the point must be on the curve'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`A curve has equation  $${curve(v)}$`, `The point $P(${v.px}, ${v.py})$ lies on the curve.`),
        parts: [
          part('a', 4, text(`Find $${DYDX}$ in terms of $x$ and $y$`)),
          part('b', 3, text('Find an equation of the tangent to the curve at $P$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A curve has equation  $${curve(v)}$`),
        parts: [
          part('a', 4, text(`Find $${DYDX}$ in terms of $x$ and $y$`)),
          part('b', 4, text('Find the coordinates of the points on the curve where the tangent is parallel to the $x$-axis.')),
        ],
      };
    }
    return {
      stem: lines(`A curve has parametric equations  $x = ${v.a === 1 ? '' : v.a}t^2$,  $y = ${2 * v.a}t$`, `The point $P$ on the curve has parameter  $t = ${v.t}$`),
      parts: [
        part('a', 2, text(`Find $${DYDX}$ in terms of $t$`)),
        part('b', 3, text('Find an equation of the normal to the curve at $P$, in the form  $ax + by + c = 0$  where $a$, $b$ and $c$ are integers.')),
        part('c', 3, text('The normal meets the curve again at the point $Q$.'), text('Find the coordinates of $Q$.')),
      ],
    };
  },

  answer(v) {
    const grad = (x: string, y: string) => `$${DYDX} = -\\frac{2${x} ${v.a < 0 ? '-' : '+'} ${Math.abs(v.a) === 1 ? '' : Math.abs(v.a)}${y}}{${v.a === 1 ? '' : v.a === -1 ? '-' : v.a}${x} + ${2 * v.b}${y}}$`;
    if (v.level === 'foundational') {
      const top = 2 * v.px + v.a * v.py;
      const bot = v.a * v.px + 2 * v.b * v.py;
      // Tangent: top(x − px) + bot(y − py) = 0
      return [{ text: grad('x', 'y') }, { text: `$${lineTex(top, bot, -(top * v.px + bot * v.py))}$` }];
    }
    if (v.level === 'core') return [{ text: `$${DYDX} = -\\frac{x + y}{x + ${v.b}y}$` }, { text: `$(${v.px}, ${v.py})$ and $(${-v.px}, ${-v.py})$` }];
    const [a, t] = [v.a, v.t];
    const [px, py] = [a * t * t, 2 * a * t];
    const T = Q.of(-t).sub(Q.of(2, t));
    return [{ text: `$${DYDX} = \\frac{1}{t}$` }, { text: `$${lineTex(t, 1, -(t * px + py))}$` }, { text: `$(${fracTex(T.mul(T).mul(a))}, ${fracTex(T.mul(2 * a))})$` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const [a, t] = [v.a, v.t];
      const [px, py] = [a * t * t, 2 * a * t];
      const T = Q.of(-t).sub(Q.of(2, t));
      return [
        [step('M1', `$\\frac{\\mathrm{d}x}{\\mathrm{d}t} = ${2 * a}t$, $\\frac{\\mathrm{d}y}{\\mathrm{d}t} = ${2 * a}$`, 'Differentiate each equation with respect to t.'), step('A1', `$${DYDX} = \\frac{${2 * a}}{${2 * a}t} = \\frac{1}{t}$`, 'dy/dt divided by dx/dt.')],
        [
          step('M1', `At $t = ${t}$: tangent gradient $${fracTex(Q.of(1, t))}$, normal gradient $${-t}$`, 'Perpendicular gradients multiply to −1.'),
          step('M1', `$y - (${py}) = ${-t}(x - ${px})$`, `P is (${px}, ${py}).`),
          step('A1', `$${lineTex(t, 1, -(t * px + py))}$`, 'Rearrange to the required form.'),
        ],
        [
          step('M1', `$${t}(${a}T^2) + ${2 * a}T - ${t * px + py} = 0$`, 'Substitute x = at² and y = 2at, with T for the new parameter, into the normal.'),
          step('M1', `$(T - ${t})(${t}T ${2 + t * t < 0 ? '-' : '+'} ${Math.abs(2 + t * t)}) = 0$, so $T = ${fracTex(T)}$`, 'T = t is the point P, so it must be a factor.'),
          step('A1', `$Q(${fracTex(T.mul(T).mul(a))}, ${fracTex(T.mul(2 * a))})$`, 'Substitute T back into both equations.'),
        ],
      ];
    }
    const diff = [
      step('M1', `$2x ${v.a < 0 ? '-' : '+'} ${Math.abs(v.a) === 1 ? '' : Math.abs(v.a)}\\left(x${DYDX} + y\\right) + ${2 * v.b}y${DYDX} = 0$`, 'Differentiate every term with respect to x. The xy term needs the product rule.'),
      step('A1', `The term in $y^2$ gives $${2 * v.b}y${DYDX}$`, 'y² differentiates to 2y dy/dx by the chain rule.'),
      step('M1', `$${DYDX}(${v.a === 1 ? '' : v.a === -1 ? '-' : v.a}x + ${2 * v.b}y) = -(2x ${v.a < 0 ? '-' : '+'} ${Math.abs(v.a) === 1 ? '' : Math.abs(v.a)}y)$`, 'Collect the dy/dx terms on one side.'),
      step('A1', v.level === 'core' ? `$${DYDX} = -\\frac{x + y}{x + ${v.b}y}$` : `$${DYDX} = -\\frac{2x ${v.a < 0 ? '-' : '+'} ${Math.abs(v.a) === 1 ? '' : Math.abs(v.a)}y}{${v.a === 1 ? '' : v.a === -1 ? '-' : v.a}x + ${2 * v.b}y}$`, 'Divide, then cancel any common factor.'),
    ];
    if (v.level === 'foundational') {
      const top = 2 * v.px + v.a * v.py;
      const bot = v.a * v.px + 2 * v.b * v.py;
      return [
        diff,
        [
          step('M1', `Gradient at $P$ $= ${fracTex(Q.of(-top, bot))}$`, 'Substitute both coordinates.'),
          step('M1', `$y - (${v.py}) = ${fracTex(Q.of(-top, bot))}(x - (${v.px}))$`, 'Use the point P.'),
          step('A1', `$${lineTex(top, bot, -(top * v.px + bot * v.py))}$`, 'Clear the fraction.'),
        ],
      ];
    }
    return [
      diff,
      [
        step('M1', '$2x + 2y = 0$, so $y = -x$', 'Parallel to the x-axis means the gradient is zero, so the top of the fraction is zero.'),
        step('M1', `$x^2 - 2x^2 + ${v.b}x^2 = ${v.k}$`, 'Substitute y = −x into the curve.'),
        step('A1', `$${v.b - 1 === 1 ? '' : v.b - 1}x^2 = ${v.k}$, so $x = \\pm ${v.px}$`, 'Two values of x.'),
        step('A1', `$(${v.px}, ${v.py})$ and $(${-v.px}, ${-v.py})$`, 'Both points.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'stretch') {
      const [a, t] = [v.a, v.t];
      const T = -t - 2 / t;
      // Q is on the curve (y² = 4ax) and on the normal, and it is not P.
      const [qx, qy] = [a * T * T, 2 * a * T];
      const [px, py] = [a * t * t, 2 * a * t];
      if (Math.abs(qy * qy - 4 * a * qx) > 1e-9) return ['Q on curve'];
      return Math.abs(t * qx + qy - (t * px + py)) < 1e-9 && Math.abs(T - t) > 1e-9 ? [] : ['Q on normal'];
    }
    // Numeric gradient from walking along the curve: solve the quadratic in y near the point.
    const yAt = (x: number) => {
      const [A, B, C] = [v.b, v.a * x, x * x - v.k];
      const d = Math.sqrt(B * B - 4 * A * C);
      const r1 = (-B + d) / (2 * A);
      const r2 = (-B - d) / (2 * A);
      return Math.abs(r1 - v.py) < Math.abs(r2 - v.py) ? r1 : r2;
    };
    const num = (yAt(v.px + 1e-5) - yAt(v.px - 1e-5)) / 2e-5;
    const exact = -(2 * v.px + v.a * v.py) / (v.a * v.px + 2 * v.b * v.py);
    if (Math.abs(num - exact) > 1e-3) return [`gradient ${num} ${exact}`];
    return answers.length === 2 ? [] : ['parts'];
  },

  key: (v) => `${v.a}|${v.b}|${v.k}|${v.px}|${v.py}|${v.t}`,
});
