import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';
import { shift } from '../../engine/pure';

/**
 * Modelled on 8MA0/01 questions using the factor theorem: show a linear factor,
 * factorise fully, then a substitution such as f(2^y) = 0 that tests whether the
 * student connects the root with the new variable.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  r: number;
  a: number;
  b: number;
  c: number;
  coeffs: number[];
  second: [number, number]; // quadratic factor as (ax − m)(x − s): [m, s]
}

const expand = (r: number, a: number, b: number, c: number) => [a, b - a * r, c - b * r, -c * r];
const evalAt = (co: number[], x: number) => co.reduce((s, k) => s * x + k, 0);
const quad = (a: number, m: number, s: number) => `${a === 1 ? shift(m / a) : `(${polyTex([a, -m])})`}${shift(s)}`;

export default defineTemplate<V>({
  id: 'y12-factor-theorem',
  title: 'The factor theorem',
  strand: 'Pure',
  subtopic: 'Polynomials',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'backwards', stretch: 'decide' },
  calculator: 'calc',

  generate({ rng, level }) {
    if (level === 'stretch') {
      const r = rng.pick([2, 4, 8]);
      const a = rng.int(1, 3);
      const b = rng.int(-5, 5);
      const c = rng.int(2, 9);
      ensure(b * b - 4 * a * c < 0 && b !== 0, 'the quadratic factor has no real roots');
      return { level, r, a, b, c, coeffs: expand(r, a, b, c), second: [0, 0] };
    }
    const a = level === 'core' ? rng.pick([2, 3]) : 1;
    const r = rng.int(1, 5) * rng.pick([1, -1]);
    const m = rng.int(1, 7) * rng.pick([1, -1]);
    const s = rng.int(1, 6) * rng.pick([1, -1]);
    ensure(r !== s && r * a !== m && s * a !== m && (a === 1 || m % a !== 0), 'three different roots');
    // (ax − m)(x − s) = ax² − (as + m)x + ms
    const b = -(a * s + m);
    const c = m * s;
    const coeffs = expand(r, a, b, c);
    ensure(coeffs.every((k) => k !== 0), 'every power appears');
    return { level, r, a, b, c, coeffs, second: [m, s] };
  },

  validate(v) {
    return evalAt(v.coeffs, v.r) === 0 ? [] : ['r must be a root'];
  },

  render(v) {
    const [a, k, q, t] = v.coeffs;
    if (v.level === 'foundational') {
      return {
        stem: lines(`$\\mathrm{f}(x) = ${polyTex(v.coeffs)}$`),
        parts: [
          part('a', 2, text(`Use the factor theorem to show that $${shift(v.r)}$ is a factor of $\\mathrm{f}(x)$`)),
          part('b', 3, text('Hence write $\\mathrm{f}(x)$ as a product of three linear factors.')),
        ],
      };
    }
    if (v.level === 'core') {
      const known = polyTex([a, 0, q, t]).replace(`${a}x^3`, `${a}x^3 + kx^2`);
      return {
        stem: lines(`$\\mathrm{f}(x) = ${known}$`, 'where $k$ is a constant.', `Given that $${shift(v.r)}$ is a factor of $\\mathrm{f}(x)$,`),
        parts: [
          part('a', 2, text('find the value of $k$')),
          part('b', 3, text('write $\\mathrm{f}(x)$ as a product of three linear factors,')),
          part('c', 1, text('hence solve the equation  $\\mathrm{f}(x) = 0$')),
        ],
      };
    }
    void k;
    return {
      stem: lines(`$\\mathrm{f}(x) = ${polyTex(v.coeffs)}$`),
      parts: [
        part('a', 2, text(`Use the factor theorem to show that $${shift(v.r)}$ is a factor of $\\mathrm{f}(x)$`)),
        part('b', 2, text(`Write $\\mathrm{f}(x)$ in the form  $${shift(v.r)}(ax^2 + bx + c)$  where $a$, $b$ and $c$ are integers to be found.`)),
        part('c', 2, text('Hence show that the equation  $\\mathrm{f}(x) = 0$  has only one real root.')),
        part('d', 2, text('Using your answers, solve  $\\mathrm{f}(2^y) = 0$')),
      ],
    };
  },

  answer(v) {
    const product = v.level === 'stretch' ? '' : `${shift(v.r)}${quad(v.a, v.second[0], v.second[1])}`;
    if (v.level === 'foundational') return [{ text: `$\\mathrm{f}(${v.r}) = 0$, so $${shift(v.r)}$ is a factor` }, { text: `$\\mathrm{f}(x) = ${product}$` }];
    if (v.level === 'core') {
      const [m, s] = v.second;
      const root = m % v.a === 0 ? `${m / v.a}` : `${m < 0 ? '-' : ''}\\frac{${Math.abs(m)}}{${v.a}}`;
      return [{ text: `$k = ${v.coeffs[1]}$` }, { text: `$\\mathrm{f}(x) = ${product}$` }, { text: `$x = ${v.r}$, $x = ${s}$, $x = ${root}$` }];
    }
    return [
      { text: `$\\mathrm{f}(${v.r}) = 0$, so $${shift(v.r)}$ is a factor` },
      { text: `$\\mathrm{f}(x) = ${shift(v.r)}(${polyTex([v.a, v.b, v.c])})$` },
      { text: `The discriminant of the quadratic is $${v.b * v.b - 4 * v.a * v.c} < 0$, so $x = ${v.r}$ is the only real root.` },
      { text: `$y = ${Math.log2(v.r)}$` },
    ];
  },

  markScheme(v) {
    const [a, k, q, t] = v.coeffs;
    const sub = `$\\mathrm{f}(${v.r}) = ${a}(${v.r})^3 ${k < 0 ? '-' : '+'} ${Math.abs(k)}(${v.r})^2 ${q < 0 ? '-' : '+'} ${Math.abs(q)}(${v.r}) ${t < 0 ? '-' : '+'} ${Math.abs(t)}$`;
    const show = [step('M1', sub, `Substitute x = ${v.r}: the factor is (x − ${v.r}), so use the value that makes it zero.`), step('A1', `$= 0$, so $${shift(v.r)}$ is a factor`, 'State the conclusion: this is what earns the mark.')];
    const longDiv = step('M1', `$\\mathrm{f}(x) = ${shift(v.r)}(${polyTex([v.a, v.b, v.c])})$`, 'Divide, or compare coefficients, to get the quadratic factor.');
    if (v.level === 'foundational') {
      return [show, [longDiv, step('M1', `$${polyTex([v.a, v.b, v.c])} = ${quad(v.a, v.second[0], v.second[1])}$`, 'Factorise the quadratic.'), step('A1', `$\\mathrm{f}(x) = ${shift(v.r)}${quad(v.a, v.second[0], v.second[1])}$`, 'Write all three factors together.')]];
    }
    if (v.level === 'core') {
      const [m, s] = v.second;
      const root = m % v.a === 0 ? `${m / v.a}` : `${m < 0 ? '-' : ''}\\frac{${Math.abs(m)}}{${v.a}}`;
      return [
        [step('M1', `$\\mathrm{f}(${v.r}) = 0$:  $${a}(${v.r})^3 + k(${v.r})^2 ${q < 0 ? '-' : '+'} ${Math.abs(q)}(${v.r}) ${t < 0 ? '-' : '+'} ${Math.abs(t)} = 0$`, 'A factor means this value of x makes f(x) zero.'), step('A1', `$k = ${k}$`, 'Solve the linear equation.')],
        [longDiv, step('M1', `$${polyTex([v.a, v.b, v.c])} = ${quad(v.a, m, s)}$`, 'Factorise the quadratic.'), step('A1', `$\\mathrm{f}(x) = ${shift(v.r)}${quad(v.a, m, s)}$`, 'Write all three factors together.')],
        [step('B1', `$x = ${v.r}$, $x = ${s}$, $x = ${root}$`, 'Each bracket equal to zero gives one solution.')],
      ];
    }
    const d = v.b * v.b - 4 * v.a * v.c;
    return [
      show,
      [longDiv, step('A1', `$a = ${v.a}$, $b = ${v.b}$, $c = ${v.c}$`, 'Check by expanding.')],
      [step('M1', `$b^2 - 4ac = (${v.b})^2 - 4 \\times ${v.a} \\times ${v.c} = ${d}$`, 'Test the quadratic factor for roots.'), step('A1', `$${d} < 0$, so the quadratic has no real roots and $x = ${v.r}$ is the only real root.`, 'The conclusion needs the reason.')],
      [step('M1', `$2^y = ${v.r}$`, 'Replace x by 2^y. The quadratic factor still has no real roots.'), step('A1', `$y = ${Math.log2(v.r)}$`, `Write ${v.r} as a power of 2.`)],
    ];
  },

  check(v, answers) {
    // Rebuild the polynomial from the shown factors and compare values at several x.
    if (v.level === 'stretch') {
      for (let x = -5; x <= 5; x++) if ((x - v.r) * (v.a * x * x + v.b * x + v.c) !== evalAt(v.coeffs, x)) return ['product'];
      return 2 ** Math.log2(v.r) === v.r ? [] : ['y'];
    }
    const [m, s] = v.second;
    for (let x = -5; x <= 5; x++) if ((x - v.r) * (v.a * x - m) * (x - s) !== evalAt(v.coeffs, x)) return ['product'];
    return answers.length ? [] : ['answers'];
  },

  key: (v) => v.coeffs.join('|'),
});
