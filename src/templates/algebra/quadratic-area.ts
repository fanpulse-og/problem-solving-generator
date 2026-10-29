import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text } from '../../engine/blocks';
import { dec, ensure, int, polyTex, roundFloatSf } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Modelled on Set 22 1H Q17 (rectangle (x + 4) by (x − 1) with area 36:
 * show that x² + 3x − 40 = 0, then find the perimeter), Set 24 1H Q16
 * (2x by (x + 5) rectangle) and Set 23 2H Q19 (right-angled triangle with
 * sides x, x + 7 and x + 8, solved with the formula). Roots are chosen first;
 * the other root always gives a negative length.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  k: number; // coefficient of x in the length (1 or 2)
  p: number; // length = kx + p
  r: number; // width = x + r
  x: number; // foundational / core: the positive root
  area: number;
  a: number; // stretch: sides x, x + a, hypotenuse x + b
  b: number;
  calc: boolean;
}

/** Plain-text linear expression for diagram labels: "2x + 3", "x − 1". */
const lin = (k: number, c: number) => `${k === 1 ? '' : k}x${c === 0 ? '' : c > 0 ? ` + ${c}` : ` − ${-c}`}`;

export default defineTemplate<V>({
  id: 'alg-quadratic-area',
  title: 'Forming and solving quadratic equations',
  strand: 'Algebra',
  subtopic: 'Quadratic equations',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'either',

  generate({ rng, level, calc }) {
    const base: V = { level, k: 1, p: 0, r: 0, x: 0, area: 0, a: 0, b: 0, calc: calc === 'calc' };
    if (level === 'stretch') {
      const a = rng.int(1, 9);
      const b = rng.int(a + 1, a + 9);
      // x² − 2(b − a)x − (b² − a²) = 0. Calculator: irrational root (formula);
      // non-calculator: the quadratic factorises.
      const disc = (b - a) ** 2 + (b * b - a * a);
      ensure(Number.isInteger(Math.sqrt(disc)) === (calc === 'non-calc'), 'formula for calculator, factorising without');
      ensure(stretchX({ ...base, a, b }) <= 60, 'sensible size');
      if (calc === 'calc') ensure(!/\.0+$/.test(roundFloatSf(stretchArea({ ...base, a, b }), 3)), 'no trailing zero after rounding');
      return { ...base, a, b };
    }
    const k = level === 'core' ? 2 : 1;
    const x = rng.int(3, 12);
    const p = rng.int(-4, 9);
    const r = rng.int(-4, 9);
    ensure(p !== r && p !== 0 && r !== 0, 'two different, non-trivial sides');
    ensure(k * x + p >= 3 && x + r >= 2, 'positive lengths');
    const area = (k * x + p) * (x + r);
    ensure(area <= 200, 'sensible area');
    // The other root of kx² + (p + kr)x + pr − area = 0 is −(p + kr)/k − x; it must make a side negative.
    const other = Q.of(-(p + k * r), k).sub(x);
    ensure(other.mul(k).add(p).toNumber() <= 0 || other.add(r).toNumber() <= 0, 'other root impossible');
    ensure(!other.eq(x), 'distinct roots');
    ensure(p + k * r !== 0, 'an x term (not just a difference of two squares)');
    ensure(gcdInt(gcdInt(k, p + k * r), p * r - area) === 1, 'equation in simplest form');
    return { ...base, k, p, r, x, area };
  },

  validate(v) {
    if (v.level === 'stretch') return v.b > v.a ? [] : ['hypotenuse longest'];
    return (v.k * v.x + v.p) * (v.x + v.r) === v.area ? [] : ['area'];
  },

  render(v) {
    if (v.level === 'stretch') {
      return {
        stem: [
          text('The diagram shows a right-angled triangle.'),
          diagram({
            type: 'figure',
            points: { _A: [0, 0], _B: [4, 0], _C: [0, 3] },
            segments: [['_A', '_B'], ['_B', '_C'], ['_C', '_A']],
            edgeLabels: [{ a: '_C', b: '_A', text: 'x cm' }, { a: '_A', b: '_B', text: `(${lin(1, v.a)}) cm` }, { a: '_B', b: '_C', text: `(${lin(1, v.b)}) cm` }],
            rightAngles: [{ at: '_A', from: '_B', to: '_C' }],
            notAccurate: true,
          }),
        ],
        parts: [single(5, text('Work out the area of the triangle.'), ...(v.calc ? [text('Give your answer correct to 3 significant figures.')] : []))],
      };
    }
    // Drawn proportions are kept moderate (it is NOT accurately drawn) so the side labels fit.
    const ratio = Math.min(1.45, Math.max(1.1, (v.k * v.x + v.p) / (v.x + v.r)));
    const fig = diagram({
      type: 'figure',
      points: { _A: [0, 0], _B: [ratio, 0], _C: [ratio, 1], _D: [0, 1] },
      segments: [['_A', '_B'], ['_B', '_C'], ['_C', '_D'], ['_D', '_A']],
      edgeLabels: [{ a: '_A', b: '_B', text: `(${lin(v.k, v.p)}) cm` }, { a: '_B', b: '_C', text: `(${lin(1, v.r)}) cm` }],
      notAccurate: true,
    });
    const intro = [text('The diagram shows a rectangle.'), fig, text(`The area of the rectangle is ${int(v.area)} cm²`)];
    if (v.level === 'foundational') {
      return {
        stem: intro,
        parts: [part('a', 2, text(`Show that $${polyTex(eqn(v))} = 0$`)), part('b', 3, text('Work out the perimeter of the rectangle.'))],
      };
    }
    return { stem: intro, parts: [single(5, text('Work out the perimeter of the rectangle.'))] };
  },

  answer(v) {
    if (v.level === 'stretch') return [{ text: `${areaText(v)} cm²` }];
    const per = 2 * (v.k * v.x + v.p + v.x + v.r);
    return v.level === 'foundational' ? [{ text: `$${polyTex(eqn(v))} = 0$` }, { text: `${per} cm` }] : [{ text: `${per} cm` }];
  },

  markScheme(v) {
    if (v.level === 'stretch') {
      const { a, b } = v;
      const B = -2 * (b - a);
      const C = a * a - b * b;
      const disc = B * B - 4 * C;
      const x = stretchX(v);
      return [
        [
          step('P1', `$x^2 + (${polyTex([1, a])})^2 = (${polyTex([1, b])})^2$`, 'Pythagoras: the two shorter sides squared add up to the hypotenuse squared.'),
          step('P1', `$x^2 + ${polyTex([1, 2 * a, a * a])} = ${polyTex([1, 2 * b, b * b])}$, so $${polyTex([1, B, C])} = 0$`, 'Expand the brackets (each one gives an x² term), then collect everything on one side.'),
          v.calc
            ? step('P1', `$x = \\frac{${-B} + \\sqrt{${disc}}}{2}$`, `Quadratic formula with a = 1, b = ${String(B).replace('-', '−')}, c = ${String(C).replace('-', '−')}. Take the positive root: a length can’t be negative.`)
            : step('P1', `$(x - ${x})(x + ${x - (-B)}) = 0$`, 'Factorise. Take the positive root: a length can’t be negative.'),
          step('A1', v.calc ? `x = ${roundFloatSf(x, 4)}…` : `x = ${x}`, v.calc ? 'Keep the full value on your calculator.' : `Check: ${x}² + ${x + a}² = ${x + b}²`),
          step('A1', v.calc ? `½ × ${roundFloatSf(x, 4)}… × ${roundFloatSf(x + a, 4)}… = ${areaText(v)} cm²` : `½ × ${x} × ${x + a} = ${areaText(v)} cm²`, 'Area = ½ × base × height, using the two sides that meet at the right angle.'),
        ],
      ];
    }
    const [A2, B1, C0] = eqn(v);
    const L = v.k * v.x + v.p;
    const W = v.x + v.r;
    const other = Q.of(-(v.p + v.k * v.r), v.k).sub(v.x);
    const otherTex = other.isInt() ? `${other.toInt()}` : `${other.lt(0) ? '-' : ''}\\frac{${other.lt(0) ? -other.n : other.n}}{${other.d}}`;
    // Factorised form: (x − x0)(A2·x − A2·other) with integer coefficients.
    const f2 = Q.of(A2).mul(other).neg();
    const factors = `(x ${v.x > 0 ? '-' : '+'} ${v.x})(${A2 === 1 ? '' : A2}x ${f2.lt(0) ? '-' : '+'} ${Math.abs(f2.toNumber())})`;
    const form = step('M1', `$(${polyTex([v.k, v.p])})(${polyTex([1, v.r])}) = ${v.area}$`, 'Area of a rectangle = length × width.');
    const expand = step('A1', `$${polyTex([v.k, v.p + v.k * v.r, v.p * v.r])} = ${v.area}$, so $${polyTex([A2, B1, C0])} = 0$`, 'Expand, then subtract the area from both sides.');
    const solve = [
      step('M1', `$${factors} = 0$, so $x = ${v.x}$ or $x = ${otherTex}$`, 'Factorise (or use the formula).'),
      step('A1', `x = ${v.x}: length ${L} cm, width ${W} cm`, `Reject $x = ${otherTex}$: it would make a side negative.`),
      step('A1', `2 × (${L} + ${W}) = ${2 * (L + W)} cm`, 'Perimeter = all four sides added together.'),
    ];
    if (v.level === 'foundational') {
      return [[form, expand], solve];
    }
    return [[step('P1', form.working, form.note), step('P1', expand.working, expand.note), ...solve]];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      // Bisection on f(x) = x² + (x + a)² − (x + b)², then area.
      let lo = 0;
      let hi = 1000;
      const f = (x: number) => x * x + (x + v.a) ** 2 - (x + v.b) ** 2;
      for (let i = 0; i < 200; i++) {
        const mid = (lo + hi) / 2;
        if (f(mid) < 0) lo = mid;
        else hi = mid;
      }
      const area = (lo * (lo + v.a)) / 2;
      const shown = parseFloat(answers[0].text.replace(/\s/g, ''));
      if (Math.abs(shown - area) / area > (v.calc ? 0.005 : 1e-9)) p.push('area');
      return p;
    }
    // Search every positive integer x for the one that gives this area.
    const xs: number[] = [];
    for (let x = 1; x <= 100; x++) if (v.k * x + v.p > 0 && x + v.r > 0 && (v.k * x + v.p) * (x + v.r) === v.area) xs.push(x);
    if (xs.length !== 1) p.push('not a unique positive solution');
    else if (answers[answers.length - 1].text !== `${2 * (v.k * xs[0] + v.p + xs[0] + v.r)} cm`) p.push('perimeter');
    // The stated equation must hold at the root.
    const [a2, b1, c0] = eqn(v);
    if (a2 * v.x * v.x + b1 * v.x + c0 !== 0) p.push('equation');
    return p;
  },

  key: (v) => `${v.k}|${v.p}|${v.r}|${v.x}|${v.a}|${v.b}`,
});

/** kx² + (p + kr)x + (pr − area) = 0 */
function eqn(v: V): [number, number, number] {
  return [v.k, v.p + v.k * v.r, v.p * v.r - v.area];
}
function stretchX(v: V) {
  const B = -2 * (v.b - v.a);
  const C = v.a * v.a - v.b * v.b;
  return (-B + Math.sqrt(B * B - 4 * C)) / 2;
}
function stretchArea(v: V) {
  const x = stretchX(v);
  return (x * (x + v.a)) / 2;
}
function areaText(v: V) {
  if (v.calc) return roundFloatSf(stretchArea(v), 3);
  const x = Math.round(stretchX(v));
  return dec(Q.of(x * (x + v.a), 2));
}
