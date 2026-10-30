import { defineTemplate } from '../../engine/types';
import { part, single, step, text, TIMES } from '../../engine/blocks';
import { ensure, int, linTex } from '../../engine/format';

/**
 * Modelled on Set 23 1F Q17 (rectangle with sides in x: the perimeter is
 * given, find the area), June 2022 1F Q24 / 1H Q5 (a triangle and a square
 * have the same perimeter: work out the area of the square) and Set 24 2F Q20
 * (one perimeter is more than another: compare the areas). check() searches
 * whole-number values of x.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  x: number; // the solution
  // foundational: rectangle (a x + b) by (x + d)
  a: number;
  b: number;
  d: number;
  // core: triangle sides x + p, 2x + q, 3x − r; square side x + s
  p: number;
  q: number;
  r: number;
  s: number;
  // stretch: rectangle (2x + u) by (x − w); square (x + t); perimeters differ by D
  u: number;
  w: number;
  t: number;
}

const m = (e: string) => `$${e}$`;
const lin = (a: number, b: number) => m(`(${linTex(a, b)})`);

export default defineTemplate<V>({
  id: 'alg-shape-expressions',
  title: 'Forming equations from shapes',
  strand: 'Algebra',
  subtopic: 'Forming & solving equations',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'form-solve',
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const x = rng.int(2, tier === 'KS3' ? 7 : 10);
    const base: V = { level, x, a: 0, b: 0, d: 0, p: 0, q: 0, r: 0, s: 0, u: 0, w: 0, t: 0 };
    if (level === 'foundational') {
      const a = rng.int(2, 3);
      const b = rng.int(-3, 8);
      const d = rng.int(1, 6);
      ensure(b !== 0 && a * x + b > x + d && x + d > 0, 'length longer than width');
      return { ...base, a, b, d };
    }
    if (level === 'core') {
      const [p, q, r] = [rng.int(1, 9), rng.int(1, 9), rng.int(1, 9)];
      const sides = [x + p, 2 * x + q, 3 * x - r];
      ensure(sides.every((l) => l > 0) && sides.every((l, i) => l < sides[(i + 1) % 3] + sides[(i + 2) % 3]), 'a real triangle');
      const fourS = 2 * x + p + q - r;
      ensure(fourS % 4 === 0 && fourS / 4 >= 1, 'whole-number square side');
      return { ...base, p, q, r, s: fourS / 4 };
    }
    const [u, w, t] = [rng.int(1, 8), rng.int(1, 4), rng.int(1, 6)];
    ensure(x - w > 0, 'positive width');
    ensure(2 * x + 2 * u - 2 * w - 4 * t > 0, 'the rectangle has the longer perimeter');
    ensure((2 * x + u) * (x - w) !== (x + t) ** 2, 'different areas');
    return { ...base, u, w, t };
  },

  validate(v) {
    return v.x > 0 ? [] : ['x must be positive'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const P = 2 * ((v.a + 1) * v.x + v.b + v.d);
      return {
        stem: [text(`A rectangle has length ${lin(v.a, v.b)} cm and width ${lin(1, v.d)} cm.`), text(`The perimeter of the rectangle is ${P} cm.`)],
        parts: [part('a', 3, text('Work out the value of $x$')), part('b', 1, text('Work out the area of the rectangle.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`The sides of a triangle are ${lin(1, v.p)} cm, ${lin(2, v.q)} cm and ${lin(3, -v.r)} cm.`), text(`The sides of a square are ${lin(1, v.s)} cm.`), text('The triangle and the square have the same perimeter.')],
        parts: [single(4, text('Work out the area of the square.'))],
      };
    }
    const D = 2 * (3 * v.x + v.u - v.w) - 4 * (v.x + v.t);
    return {
      stem: [text(`A rectangle has length ${lin(2, v.u)} cm and width ${lin(1, -v.w)} cm.`), text(`A square has sides of length ${lin(1, v.t)} cm.`), text(`The perimeter of the rectangle is ${D} cm more than the perimeter of the square.`)],
      parts: [single(5, text('Which shape has the greater area, and by how much?'), text('You must show your working.'))],
    };
  },

  answer(v) {
    const x = v.x;
    if (v.level === 'foundational') return [{ text: `$x = ${x}$` }, { text: `${int((v.a * x + v.b) * (x + v.d))} cm²` }];
    if (v.level === 'core') return [{ text: `${int((x + v.s) ** 2)} cm²` }];
    const R = (2 * x + v.u) * (x - v.w);
    const S = (x + v.t) ** 2;
    return [{ text: `The ${R > S ? 'rectangle' : 'square'}, by ${int(Math.abs(R - S))} cm²` }];
  },

  markScheme(v) {
    const x = v.x;
    if (v.level === 'foundational') {
      const P = 2 * ((v.a + 1) * x + v.b + v.d);
      const k = 2 * (v.b + v.d);
      return [
        [
          step('M1', m(`2(${linTex(v.a, v.b)}) + 2(${linTex(1, v.d)}) = ${P}`), 'Perimeter = all four sides: two lengths and two widths.'),
          step('M1', m(`${linTex(2 * (v.a + 1), k)} = ${P}`), 'Expand the brackets and collect like terms.'),
          step('A1', m(`x = ${x}`), `${k >= 0 ? 'Subtract' : 'Add'} ${Math.abs(k)} from both sides, then divide by ${2 * (v.a + 1)}.`),
        ],
        [step('B1', `${v.a * x + v.b} ${TIMES} ${x + v.d} = ${int((v.a * x + v.b) * (x + v.d))} cm²`, `Put x = ${x} into each side first: length ${v.a * x + v.b} cm, width ${x + v.d} cm.`)],
      ];
    }
    if (v.level === 'core') {
      const k = v.p + v.q - v.r;
      return [
        [
          step('M1', `Triangle: ${m(linTex(6, k))}; square: ${m(`4(${linTex(1, v.s)}) = ${linTex(4, 4 * v.s)}`)}`, 'Add the three sides of the triangle; the square has four equal sides.'),
          step('M1', m(`${linTex(6, k)} = ${linTex(4, 4 * v.s)}`), 'Same perimeter, so set them equal.'),
          step('A1', m(`2x = ${4 * v.s - k}, x = ${x}`), 'Collect x on one side, numbers on the other.'),
          step('A1', `Side ${x + v.s} cm, area ${x + v.s}² = ${int((x + v.s) ** 2)} cm²`, 'The question asks for the AREA of the square, not x.'),
        ],
      ];
    }
    const D = 2 * (3 * x + v.u - v.w) - 4 * (x + v.t);
    const R = (2 * x + v.u) * (x - v.w);
    const S = (x + v.t) ** 2;
    return [
      [
        step('M1', `Rectangle: ${m(`2(${linTex(2, v.u)}) + 2(${linTex(1, -v.w)}) = ${linTex(6, 2 * (v.u - v.w))}`)}; square: ${m(linTex(4, 4 * v.t))}`, 'Write an expression for each perimeter.'),
        step('M1', m(`${linTex(6, 2 * (v.u - v.w))} - (${linTex(4, 4 * v.t)}) = ${D}`), `“${D} cm more” means the difference is ${D}.`),
        step('A1', m(`${linTex(2, 2 * (v.u - v.w) - 4 * v.t)} = ${D}, x = ${x}`), 'Simplify and solve.'),
        step('M1', `Rectangle ${2 * x + v.u} ${TIMES} ${x - v.w} = ${int(R)} cm²; square ${x + v.t}² = ${int(S)} cm²`, 'Substitute x into the side lengths, then find each area.'),
        step('A1', `The ${R > S ? 'rectangle' : 'square'}, by ${int(Math.abs(R - S))} cm²`, 'A longer perimeter does not always mean a bigger area.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Search for the whole number x that fits the given facts, then recompute.
    const fits = (x: number) =>
      v.level === 'foundational'
        ? 2 * (v.a * x + v.b) + 2 * (x + v.d) === 2 * ((v.a + 1) * v.x + v.b + v.d)
        : v.level === 'core'
          ? x + v.p + 2 * x + v.q + 3 * x - v.r === 4 * (x + v.s)
          : 2 * (2 * x + v.u) + 2 * (x - v.w) - 4 * (x + v.t) === 2 * (3 * v.x + v.u - v.w) - 4 * (v.x + v.t);
    const sols = Array.from({ length: 100 }, (_, i) => i + 1).filter(fits);
    if (sols.length !== 1) return ['x is not unique'];
    const x = sols[0];
    if (v.level === 'foundational') {
      if (answers[0].text !== `$x = ${x}$` || answers[1].text !== `${int((v.a * x + v.b) * (x + v.d))} cm²`) p.push('rectangle');
    } else if (v.level === 'core') {
      if (answers[0].text !== `${int((x + v.s) * (x + v.s))} cm²`) p.push('square area');
    } else {
      const diff = (2 * x + v.u) * (x - v.w) - (x + v.t) * (x + v.t);
      if (!answers[0].text.includes(diff > 0 ? 'rectangle' : 'square') || !answers[0].text.includes(int(Math.abs(diff)))) p.push('comparison');
    }
    return p;
  },

  key: (v) => `${v.level}|${v.x}|${v.a}|${v.b}|${v.d}|${v.p}|${v.q}|${v.r}|${v.s}|${v.u}|${v.w}|${v.t}`,
});
