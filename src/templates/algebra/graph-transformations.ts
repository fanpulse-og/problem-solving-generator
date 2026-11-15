import { defineTemplate } from '../../engine/types';
import { part, single, step, text } from '../../engine/blocks';
import { ensure, polyTex } from '../../engine/format';

/**
 * Transformations of y = f(x). Practice and Apply track one point through
 * translations and reflections; Extend translates a quadratic curve and asks
 * for its new equation. check() applies each transformation to a test function
 * (or compares values of the two quadratics), rather than using the rules.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number; // the point (a, b) on y = f(x)
  b: number;
  h: number; // shift right by h (may be negative)
  k: number; // shift up by k (may be negative)
  p: number; // stretch: y = x² + px + q
  q: number;
}

const pt = (x: number, y: number) => `$(${x}, ${y})$`;
/** f(x ± h) with the sign the right way round for a shift of h to the right. */
const inner = (h: number) => `x ${h > 0 ? '-' : '+'} ${Math.abs(h)}`;
const plus = (k: number) => `${k > 0 ? '+' : '-'} ${Math.abs(k)}`;
const vec = (h: number, k: number) => `\\begin{pmatrix} ${h} \\\\ ${k} \\end{pmatrix}`;
/** Coefficients of the quadratic after translating by (h, k). */
const moved = (v: V) => [1, v.p - 2 * v.h, v.h * v.h - v.p * v.h + v.q + v.k];

export default defineTemplate<V>({
  id: 'alg-graph-transformations',
  title: 'Transformations of graphs',
  strand: 'Algebra',
  subtopic: 'Graph transformations',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const nz = (hi: number) => rng.int(1, hi) * rng.pick([1, -1]);
    const v: V = { level, a: nz(8), b: nz(9), h: nz(6), k: nz(7), p: nz(8), q: nz(9) };
    ensure(Math.abs(v.a) !== Math.abs(v.b) && Math.abs(v.h) !== Math.abs(v.k), 'coordinates that cannot be mixed up');
    if (level === 'stretch') ensure(moved(v).every((c) => c !== 0) && Math.abs(moved(v)[2]) <= 60, 'every term present');
    return v;
  },

  validate() {
    return [];
  },

  render(v) {
    const on = text(`The point $P$ with coordinates ${pt(v.a, v.b)} lies on the curve with equation $y = \\mathrm{f}(x)$`);
    const ask = (eq: string) => text(`Write down the coordinates of the point that $P$ is mapped to on the curve with equation $y = ${eq}$`);
    if (v.level === 'foundational') {
      return { stem: [on], parts: [part('a', 1, ask(`\\mathrm{f}(x) ${plus(v.k)}`)), part('b', 1, ask(`\\mathrm{f}(${inner(v.h)})`)), part('c', 1, ask('-\\mathrm{f}(x)'))] };
    }
    if (v.level === 'core') {
      return { stem: [on], parts: [part('a', 1, ask('\\mathrm{f}(-x)')), part('b', 2, ask(`\\mathrm{f}(${inner(v.h)}) ${plus(v.k)}`)), part('c', 2, ask(`-\\mathrm{f}(${inner(v.h)})`))] };
    }
    return {
      stem: [text(`The curve $C$ has equation $y = ${polyTex([1, v.p, v.q])}$`), text(`$C$ is translated by the vector $${vec(v.h, v.k)}$ to give the curve $D$.`)],
      parts: [single(4, text('Find an equation of $D$.'), text('Give your answer in the form $y = x^2 + bx + c$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: pt(v.a, v.b + v.k) }, { text: pt(v.a + v.h, v.b) }, { text: pt(v.a, -v.b) }];
    if (v.level === 'core') return [{ text: pt(-v.a, v.b) }, { text: pt(v.a + v.h, v.b + v.k) }, { text: pt(v.a + v.h, -v.b) }];
    return [{ text: `$y = ${polyTex(moved(v))}$` }];
  },

  markScheme(v) {
    const dir = (n: number, pos: string, neg: string) => `${Math.abs(n)} ${n > 0 ? pos : neg}`;
    if (v.level === 'foundational') {
      return [
        [step('B1', pt(v.a, v.b + v.k), `A number added outside the bracket moves the graph ${dir(v.k, 'up', 'down')}. Only y changes.`)],
        [step('B1', pt(v.a + v.h, v.b), `A number inside the bracket moves the graph sideways, the opposite way to the sign: ${dir(v.h, 'right', 'left')}. Only x changes.`)],
        [step('B1', pt(v.a, -v.b), 'A minus outside the bracket reflects the graph in the x-axis. The sign of y changes.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('B1', pt(-v.a, v.b), 'A minus inside the bracket reflects the graph in the y-axis. The sign of x changes.')],
        [step('M1', `x: ${v.a} ${plus(v.h)} = ${v.a + v.h}`, `Inside the bracket: ${dir(v.h, 'right', 'left')}.`), step('A1', pt(v.a + v.h, v.b + v.k), `Outside the bracket: ${dir(v.k, 'up', 'down')}.`)],
        [step('M1', `x: ${v.a} ${plus(v.h)} = ${v.a + v.h}`, `Inside the bracket: ${dir(v.h, 'right', 'left')}.`), step('A1', pt(v.a + v.h, -v.b), 'The minus outside then reflects in the x-axis, so the sign of y changes.')],
      ];
    }
    const sq = polyTex([1, -2 * v.h, v.h * v.h]);
    return [
      [
        step('M1', `$y = (${inner(v.h)})^2 ${v.p > 0 ? '+' : '-'} ${Math.abs(v.p) === 1 ? '' : Math.abs(v.p)}(${inner(v.h)}) ${plus(v.q)}$`, `Moving ${dir(v.h, 'right', 'left')} replaces every $x$ with $(${inner(v.h)})$.`),
        step('M1', `$y = ${sq} ${v.p > 0 ? '+' : '-'} ${Math.abs(v.p) === 1 ? '' : Math.abs(v.p)}x ${plus(-v.p * v.h)} ${plus(v.q)}$`, 'Expand both brackets.'),
        step('M1', `$y = ${polyTex([1, v.p - 2 * v.h, v.h * v.h - v.p * v.h + v.q])} ${plus(v.k)}$`, `Collect the terms, then move ${dir(v.k, 'up', 'down')} by ${v.k > 0 ? `adding ${v.k}` : `subtracting ${-v.k}`}.`),
        step('A1', `$y = ${polyTex(moved(v))}$`, 'Check with a point: the turning point should have moved by the vector.'),
      ],
    ];
  },

  check(v, answers) {
    const read = (s: string) => /\((-?\d+), (-?\d+)\)/.exec(s)!.slice(1).map(Number);
    if (v.level === 'stretch') {
      const m = /y = x\^2 ([+-]) (\d*)x ([+-]) (\d+)/.exec(answers[0].text);
      if (!m) return ['format'];
      const b = (m[2] === '' ? 1 : Number(m[2])) * (m[1] === '-' ? -1 : 1);
      const c = Number(m[4]) * (m[3] === '-' ? -1 : 1);
      // A point (x, y) on C moves to (x + h, y + k), which must be on D.
      for (const x of [-3, 0, 2, 5]) {
        const y = x * x + v.p * x + v.q;
        const X = x + v.h;
        if (X * X + b * X + c !== y + v.k) return ['translated point is not on D'];
      }
      return [];
    }
    // A test function through P. For each new curve y = g(x), the image (X, Y) must satisfy Y = g(X).
    const f = (x: number) => (x - v.a) ** 3 + 2 * (x - v.a) + v.b;
    const curves: ((x: number) => number)[] =
      v.level === 'foundational' ? [(x) => f(x) + v.k, (x) => f(x - v.h), (x) => -f(x)] : [(x) => f(-x), (x) => f(x - v.h) + v.k, (x) => -f(x - v.h)];
    const bad: string[] = [];
    curves.forEach((g, i) => {
      const [X, Y] = read(answers[i].text);
      if (g(X) !== Y) bad.push(`part ${i + 1}`);
    });
    return bad;
  },

  key: (v) => `${v.level}|${v.a}|${v.b}|${v.h}|${v.k}|${v.p}|${v.q}`,
});
