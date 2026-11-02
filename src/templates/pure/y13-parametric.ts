import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, fracTex } from '../../engine/format';
import { coef, terms } from '../../engine/pure';
import { Q } from '../../engine/rational';

/**
 * Modelled on 9MA0 parametric equations: a Cartesian equation and gradient (June 2025
 * P2 Q5), an ellipse with its tangent at t = π/4 using exact values, and the area
 * under a parametric curve by integrating y dx/dt with respect to t.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  p: number;
  x0: number;
}

export default defineTemplate<V>({
  id: 'y13-parametric',
  title: 'Parametric equations: Cartesian form and area',
  strand: 'Pure',
  subtopic: 'Parametric equations',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'geometry-chain' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, c: 0, p: 0, x0: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 5);
      const b = rng.int(1, 9) * rng.pick([1, -1]);
      const c = rng.int(1, 9) * rng.pick([1, -1]);
      const t0 = rng.int(1, 5) * rng.pick([1, -1]);
      return { ...base, a, b, c, x0: a * t0 + b };
    }
    if (level === 'core') {
      const a = rng.int(2, 9);
      const b = rng.int(2, 9);
      ensure(a !== b, 'an ellipse, not a circle');
      return { ...base, a, b };
    }
    return { ...base, a: rng.int(2, 6), p: rng.int(1, 4) };
  },

  validate(v) {
    return v.a > 0 ? [] : ['a must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines('The curve $C$ has parametric equations', `$x = ${terms([[v.a, 1], [v.b, 0]], 't')}$,   $y = t^2 ${v.c < 0 ? '-' : '+'} ${Math.abs(v.c)}$`, `The point $P$ on $C$ has $x$ coordinate $${v.x0}$`),
        parts: [
          part('a', 2, text('Find the $y$ coordinate of $P$.')),
          part('b', 2, text('Find a Cartesian equation for $C$, in the form  $y = \\mathrm{f}(x)$')),
          part('c', 3, text('Find the gradient of $C$ at $P$.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines('The curve $C$ has parametric equations', `$x = ${v.a}\\cos t$,   $y = ${v.b}\\sin t$,   $0 \\leqslant t < 2\\pi$`),
        parts: [
          part('a', 2, text('Find a Cartesian equation for $C$.')),
          part('b', 2, text('Find $\\frac{\\mathrm{d}y}{\\mathrm{d}x}$ in terms of $t$.')),
          part('c', 3, text('Find an equation of the tangent to $C$ at the point where  $t = \\frac{\\pi}{4}$,  in the form  $px + qy = r\\sqrt{2}$  where $p$, $q$ and $r$ are integers.')),
        ],
      };
    }
    const X = (t: number) => v.p * t * t;
    const Y = (t: number) => v.a * t - t * t;
    const pts: [number, number][] = Array.from({ length: 61 }, (_, i) => [X((v.a * i) / 60), Y((v.a * i) / 60)]);
    const right = X(v.a);
    const top = (v.a * v.a) / 4;
    return {
      stem: [
        diagram({
          type: 'graph',
          x: [-0.12 * right, 1.25 * right],
          y: [-0.3 * top, 1.4 * top],
          curves: [{ points: pts }],
          shade: pts,
          marks: [{ at: [right, 0], label: 'A', dx: 2, dy: 16 }, { at: [X((v.a * 2) / 3), Y((v.a * 2) / 3) * 0.45], label: 'R', dy: 4 }],
        }),
        ...lines('The diagram shows a sketch of the curve $C$ with parametric equations', `$x = ${coef(v.p, 't^2')}$,   $y = ${terms([[v.a, 1], [-1, 2]], 't')}$,   $t \\geqslant 0$`, 'The curve meets the $x$-axis at the origin and at the point $A$.', 'The finite region $R$, shown shaded, is bounded by $C$ and the $x$-axis.'),
      ],
      parts: [
        part('a', 2, text('Find the coordinates of $A$.')),
        part('b', 2, text(`Show that the area of $R$ is given by  $\\int_0^{${v.a}} ${2 * v.p}t(${terms([[v.a, 1], [-1, 2]], 't')})\\,\\mathrm{d}t$`)),
        part('c', 3, text('Find the exact area of $R$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const t0 = Q.of(v.x0 - v.b, v.a);
      const co = [Q.of(1, v.a * v.a), Q.of(-2 * v.b, v.a * v.a), Q.of(v.b * v.b, v.a * v.a).add(v.c)];
      return [{ text: `$${fracTex(t0.mul(t0).add(v.c))}$` }, { text: `$y = ${terms([[co[0], 2], [co[1], 1], [co[2], 0]])}$` }, { text: `$${fracTex(t0.mul(2).div(v.a))}$` }];
    }
    if (v.level === 'core') {
      return [
        { text: `$\\frac{x^2}{${v.a * v.a}} + \\frac{y^2}{${v.b * v.b}} = 1$` },
        { text: `$-\\frac{${v.b}\\cos t}{${v.a}\\sin t}$` },
        { text: `$${v.b}x + ${v.a}y = ${v.a * v.b}\\sqrt{2}$` },
      ];
    }
    return [{ text: `$A(${v.p * v.a * v.a}, 0)$` }, { text: 'Shown' }, { text: `$${fracTex(Q.of(v.p * v.a ** 4, 6))}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const t0 = Q.of(v.x0 - v.b, v.a);
      const co = [Q.of(1, v.a * v.a), Q.of(-2 * v.b, v.a * v.a), Q.of(v.b * v.b, v.a * v.a).add(v.c)];
      return [
        [step('M1', `$${terms([[v.a, 1], [v.b, 0]], 't')} = ${v.x0}$, so $t = ${fracTex(t0)}$`, 'Find t from the x equation.'), step('A1', `$y = ${fracTex(t0.mul(t0).add(v.c))}$`, 'Substitute into y.')],
        [step('M1', `$t = \\frac{x ${v.b < 0 ? '+' : '-'} ${Math.abs(v.b)}}{${v.a}}$`, 'Rearrange the simpler equation for t.'), step('A1', `$y = ${terms([[co[0], 2], [co[1], 1], [co[2], 0]])}$`, 'Substitute and expand.')],
        [
          step('M1', `$\\frac{\\mathrm{d}y}{\\mathrm{d}t} = 2t$, $\\frac{\\mathrm{d}x}{\\mathrm{d}t} = ${v.a}$`, 'Differentiate each with respect to t.'),
          step('M1', `$\\frac{\\mathrm{d}y}{\\mathrm{d}x} = \\frac{2t}{${v.a}}$`, 'dy/dt divided by dx/dt.'),
          step('A1', `$${fracTex(t0.mul(2).div(v.a))}$`, `Use t = ${t0.isInt() ? t0.toString() : 'the value from part (a)'}.`),
        ],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', `$\\cos t = \\frac{x}{${v.a}}$, $\\sin t = \\frac{y}{${v.b}}$`, 'Rearrange each equation.'), step('A1', `$\\frac{x^2}{${v.a * v.a}} + \\frac{y^2}{${v.b * v.b}} = 1$`, 'Use cos²t + sin²t = 1.')],
        [step('M1', `$\\frac{\\mathrm{d}x}{\\mathrm{d}t} = -${v.a}\\sin t$, $\\frac{\\mathrm{d}y}{\\mathrm{d}t} = ${v.b}\\cos t$`, 'Differentiate each one.'), step('A1', `$-\\frac{${v.b}\\cos t}{${v.a}\\sin t}$`, 'Divide.')],
        [
          step('M1', `At $t = \\frac{\\pi}{4}$: gradient $-\\frac{${v.b}}{${v.a}}$`, 'sin and cos are equal at π/4.'),
          step('M1', `$y - \\frac{${v.b}}{\\sqrt{2}} = -\\frac{${v.b}}{${v.a}}\\left(x - \\frac{${v.a}}{\\sqrt{2}}\\right)$`, 'The point is found from the two equations.'),
          step('A1', `$${v.b}x + ${v.a}y = ${v.a * v.b}\\sqrt{2}$`, 'Multiply through; 2 ÷ √2 is √2.'),
        ],
      ];
    }
    return [
      [step('M1', `$${terms([[v.a, 1], [-1, 2]], 't')} = 0$, so $t = ${v.a}$`, 'y = 0 at the x-axis; t = 0 is the origin.'), step('A1', `$A(${v.p * v.a * v.a}, 0)$`, 'Find x from t.')],
      [step('M1', `$\\frac{\\mathrm{d}x}{\\mathrm{d}t} = ${2 * v.p}t$`, 'Differentiate x.'), step('A1', `Area $= \\int y\\frac{\\mathrm{d}x}{\\mathrm{d}t}\\,\\mathrm{d}t$, which gives the result.`, 'The limits are the t values at O and A. This is the printed answer.')],
      [
        step('M1', `$\\int_0^{${v.a}} (${2 * v.p * v.a}t^2 - ${2 * v.p}t^3)\\,\\mathrm{d}t$`, 'Expand the bracket first.'),
        step('A1', `$\\left[${fracTex(Q.of(2 * v.p * v.a, 3))}t^3 - ${fracTex(Q.of(v.p, 2))}t^4\\right]_0^{${v.a}}$`, 'Integrate each term.'),
        step('A1', `$${fracTex(Q.of(v.p * v.a ** 4, 6))}$`, 'Substitute. The lower limit gives 0.'),
      ],
    ];
  },

  check(v) {
    if (v.level === 'foundational') {
      const t = (v.x0 - v.b) / v.a;
      const y = (x: number) => ((x - v.b) / v.a) ** 2 + v.c;
      const g = (y(v.x0 + 1e-5) - y(v.x0 - 1e-5)) / 2e-5;
      return Math.abs(g - (2 * t) / v.a) < 1e-5 ? [] : ['gradient'];
    }
    if (v.level === 'core') {
      // Tangent through the point, with the same gradient as a nearby chord.
      const [X, Y] = [(t: number) => v.a * Math.cos(t), (t: number) => v.b * Math.sin(t)];
      const t = Math.PI / 4;
      const onLine = Math.abs(v.b * X(t) + v.a * Y(t) - v.a * v.b * Math.SQRT2) < 1e-9;
      const chord = (Y(t + 1e-5) - Y(t - 1e-5)) / (X(t + 1e-5) - X(t - 1e-5));
      return onLine && Math.abs(chord + v.b / v.a) < 1e-5 ? [] : ['tangent'];
    }
    // Area by trapezia in x, using the parametric points.
    let area = 0;
    const n = 20000;
    for (let i = 0; i < n; i++) {
      const [t1, t2] = [(v.a * i) / n, (v.a * (i + 1)) / n];
      area += ((v.a * t1 - t1 * t1 + (v.a * t2 - t2 * t2)) / 2) * (v.p * t2 * t2 - v.p * t1 * t1);
    }
    return Math.abs(area - (v.p * v.a ** 4) / 6) < 1e-4 ? [] : ['area'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.p}|${v.x0}`,
});
