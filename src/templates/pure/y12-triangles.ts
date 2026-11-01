import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp, roundFloatSf } from '../../engine/format';
import { DEG, sf3, terms } from '../../engine/pure';
import { gcdInt } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 sine and cosine rule questions, including the mock paper
 * triangle with sides in x and a 60° angle that leads to a quadratic, and the
 * two possible triangles from the sine rule.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number;
  b: number;
  c: number;
  angle: number; // core: angle A in degrees
  p: number; // stretch: AB = x + p, AC = x + q, BC = 2x + s
  q: number;
  s: number;
}

const sideTex = (co: number, k: number) => terms([[co, 1], [k, 0]]);
const root = (v: V) => {
  const A = 3;
  const B = 4 * v.s - v.p - v.q;
  const C = v.s * v.s - v.p * v.p - v.q * v.q + v.p * v.q;
  return { A, B, C, x: (-B + Math.sqrt(B * B - 4 * A * C)) / (2 * A) };
};

export default defineTemplate<V>({
  id: 'y12-triangles',
  title: 'The sine and cosine rules',
  strand: 'Pure',
  subtopic: 'Trigonometry',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { core: 'decide', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, a: 0, b: 0, c: 0, angle: 0, p: 0, q: 0, s: 0 };
    if (level === 'foundational') {
      const a = rng.int(5, 15);
      const b = rng.int(5, 15);
      const c = rng.int(5, 15);
      ensure(a < b + c && b < a + c && c < a + b && c > a && c > b, 'a valid triangle with c the longest side');
      return { ...base, a, b, c };
    }
    if (level === 'core') {
      const angle = rng.pick([25, 30, 35, 40, 42, 48, 50]);
      const a = rng.int(6, 12);
      const c = rng.int(a + 1, a + 6);
      const sinC = (c * Math.sin(angle * DEG)) / a;
      ensure(sinC < 0.97, 'two triangles exist');
      return { ...base, a, c, angle };
    }
    const p = rng.int(-2, 4);
    const q = rng.int(-2, 4);
    const s = rng.int(-3, 3);
    ensure(p !== q && p !== 0 && q !== 0 && s !== 0, 'all three sides look different');
    const { A, B, C } = root({ ...base, p, q, s });
    const disc = B * B - 4 * A * C;
    ensure(disc > 0 && B !== 0 && C !== 0 && gcdInt(gcdInt(A, B), C) === 1, 'real roots, all terms, and the equation in its simplest form');
    const x = (-B + Math.sqrt(disc)) / (2 * A);
    const [ab, ac, bc] = [x + p, x + q, 2 * x + s];
    ensure(ab > 1 && ac > 1 && bc > 1 && ab + ac > bc && ab + bc > ac && ac + bc > ab, 'a valid triangle');
    const other = (-B - Math.sqrt(disc)) / (2 * A);
    ensure(other + p <= 0 || other + q <= 0 || 2 * other + s <= 0, 'the second root must fail');
    return { ...base, p, q, s };
  },

  validate(v) {
    return v.level === 'core' && v.c <= v.a ? ['the given side must be longer, so there are two triangles'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`Triangle $ABC$ has  $BC = ${v.a}$ cm,  $AC = ${v.b}$ cm  and  $AB = ${v.c}$ cm.`),
        parts: [
          part('a', 3, text('Find the size of angle $ACB$, giving your answer in degrees to 1 decimal place.')),
          part('b', 2, text('Find the area of the triangle, giving your answer in cm² to 3 significant figures.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`In triangle $ABC$,  $BC = ${v.a}$ cm,  $AB = ${v.c}$ cm  and angle $BAC = ${v.angle}^\\circ$`),
        parts: [
          part('a', 3, text('Find the two possible sizes of angle $ACB$, giving your answers in degrees to 1 decimal place.')),
          part('b', 3, text('Given that angle $ACB$ is obtuse, find the area of the triangle, giving your answer in cm² to 3 significant figures.')),
        ],
      };
    }
    const { A, B, C, x } = root(v);
    const [ab, ac] = [x + v.p, x + v.q];
    const Bpt: [number, number] = [ab * Math.cos(60 * DEG), ab * Math.sin(60 * DEG)];
    return {
      stem: [
        diagram({
          type: 'polygon',
          points: [[0, 0], Bpt, [ac, 0]],
          vertexLabels: ['A', 'B', 'C'],
          edgeLabels: [
            { edge: 0, text: `(${sideTex(1, v.p)}) cm` },
            { edge: 1, text: `(${sideTex(2, v.s)}) cm` },
            { edge: 2, text: `(${sideTex(1, v.q)}) cm` },
          ],
          angleLabels: ['60°', '', ''],
          notAccurate: true,
        }),
        ...lines('The diagram shows a sketch of triangle $ABC$.', `Given that  $AB = (${sideTex(1, v.p)})$ cm,  $BC = (${sideTex(2, v.s)})$ cm,  $AC = (${sideTex(1, v.q)})$ cm  and angle $BAC = 60^\\circ$,`),
      ],
      parts: [
        part('a', 3, text(`show that  $${terms([[A, 2], [B, 1], [C, 0]])} = 0$`)),
        part('b', 3, text('hence find the area of triangle $ABC$, giving your answer in cm² to 3 significant figures.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const C = Math.acos((v.a * v.a + v.b * v.b - v.c * v.c) / (2 * v.a * v.b));
      return [{ text: `$${roundFloatDp(C / DEG, 1)}^\\circ$` }, { text: `${sf3(0.5 * v.a * v.b * Math.sin(C))} cm²` }];
    }
    if (v.level === 'core') {
      const acute = Math.asin((v.c * Math.sin(v.angle * DEG)) / v.a) / DEG;
      const C = 180 - acute;
      const B = 180 - v.angle - C;
      const area = 0.5 * v.a * v.c * Math.sin(B * DEG);
      return [{ text: `$${roundFloatDp(acute, 1)}^\\circ$ or $${roundFloatDp(C, 1)}^\\circ$` }, { text: `${sf3(area)} cm²` }];
    }
    const { x } = root(v);
    return [{ text: 'Shown' }, { text: `${sf3(0.5 * (x + v.p) * (x + v.q) * Math.sin(60 * DEG))} cm²` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const C = Math.acos((v.a * v.a + v.b * v.b - v.c * v.c) / (2 * v.a * v.b));
      return [
        [
          step('M1', `$${v.c}^2 = ${v.a}^2 + ${v.b}^2 - 2 \\times ${v.a} \\times ${v.b} \\times \\cos C$`, 'Angle ACB is opposite AB, so AB goes on the left of the cosine rule.'),
          step('M1', `$\\cos C = \\frac{${v.a * v.a} + ${v.b * v.b} - ${v.c * v.c}}{${2 * v.a * v.b}}$`, 'Rearrange before you use your calculator.'),
          step('A1', `$${roundFloatDp(C / DEG, 1)}^\\circ$`, 'Inverse cosine gives the right angle even when it is obtuse.'),
        ],
        [step('M1', `Area $= \\frac{1}{2} \\times ${v.a} \\times ${v.b} \\times \\sin ${roundFloatDp(C / DEG, 1)}^\\circ$`, 'Use the two sides either side of the angle.'), step('A1', `${sf3(0.5 * v.a * v.b * Math.sin(C))} cm²`, 'Use the unrounded angle.')],
      ];
    }
    if (v.level === 'core') {
      const acute = Math.asin((v.c * Math.sin(v.angle * DEG)) / v.a) / DEG;
      const C = 180 - acute;
      const B = 180 - v.angle - C;
      const area = 0.5 * v.a * v.c * Math.sin(B * DEG);
      return [
        [
          step('M1', `$\\frac{\\sin C}{${v.c}} = \\frac{\\sin ${v.angle}^\\circ}{${v.a}}$`, 'Sine rule: each side goes with the angle opposite it.'),
          step('A1', `$${roundFloatDp(acute, 1)}^\\circ$`, 'Your calculator gives the acute value.'),
          step('A1', `$180^\\circ - ${roundFloatDp(acute, 1)}^\\circ = ${roundFloatDp(C, 1)}^\\circ$`, 'sin x = sin(180° − x), so there is a second possible triangle.'),
        ],
        [
          step('M1', `Angle $ABC = 180^\\circ - ${v.angle}^\\circ - ${roundFloatDp(C, 1)}^\\circ = ${roundFloatDp(B, 1)}^\\circ$`, 'Angles in a triangle add to 180°.'),
          step('M1', `Area $= \\frac{1}{2} \\times ${v.a} \\times ${v.c} \\times \\sin ${roundFloatDp(B, 1)}^\\circ$`, 'Sides BC and AB meet at angle ABC.'),
          step('A1', `${sf3(area)} cm²`, 'Use unrounded angles.'),
        ],
      ];
    }
    const { A, B, C, x } = root(v);
    return [
      [
        step('M1', `$(${sideTex(2, v.s)})^2 = (${sideTex(1, v.p)})^2 + (${sideTex(1, v.q)})^2 - 2(${sideTex(1, v.p)})(${sideTex(1, v.q)})\\cos 60^\\circ$`, 'Cosine rule, with BC opposite the 60° angle.'),
        step('M1', `$\\cos 60^\\circ = \\frac{1}{2}$, so the last term is $-(${sideTex(1, v.p)})(${sideTex(1, v.q)})$`, 'An exact value: do not use a decimal from your calculator.'),
        step('A1', `$${terms([[A, 2], [B, 1], [C, 0]])} = 0$`, 'Expand every bracket and collect the terms. This is the printed answer.'),
      ],
      [
        step('M1', `$x = ${roundFloatSf(x, 4)}$`, 'Solve with the quadratic formula. The other root makes a side negative.'),
        step('M1', `Area $= \\frac{1}{2}(x ${v.p < 0 ? '-' : '+'} ${Math.abs(v.p)})(x ${v.q < 0 ? '-' : '+'} ${Math.abs(v.q)})\\sin 60^\\circ$`, 'Use the two sides next to the 60° angle.'),
        step('A1', `${sf3(0.5 * (x + v.p) * (x + v.q) * Math.sin(60 * DEG))} cm²`, 'Use the unrounded value of x.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // Heron's formula is a different route to the area.
      const sp = (v.a + v.b + v.c) / 2;
      const heron = Math.sqrt(sp * (sp - v.a) * (sp - v.b) * (sp - v.c));
      return Math.abs(heron - Number(answers[1].text.split(' ')[0])) / heron < 0.01 ? [] : ['heron'];
    }
    if (v.level === 'core') {
      // Build the obtuse triangle from coordinates: A at the origin, B on the x-axis, C on the ray at the angle.
      const ang = v.angle * DEG;
      // |C − B| = a gives a quadratic in AC.
      const disc = (2 * v.c * Math.cos(ang)) ** 2 - 4 * (v.c * v.c - v.a * v.a);
      const ac = (2 * v.c * Math.cos(ang) - Math.sqrt(disc)) / 2; // shorter AC gives the obtuse angle at C
      const area = 0.5 * v.c * ac * Math.sin(ang);
      return Math.abs(area - Number(answers[1].text.split(' ')[0])) / area < 0.01 ? [] : ['coordinates'];
    }
    const { x, A, B, C } = root(v);
    if (Math.abs(A * x * x + B * x + C) > 1e-6) return ['root'];
    // Coordinates: the distance BC must equal 2x + s.
    const [ab, ac] = [x + v.p, x + v.q];
    const dx = ab * Math.cos(60 * DEG) - ac;
    const dy = ab * Math.sin(60 * DEG);
    return Math.abs(Math.hypot(dx, dy) - (2 * x + v.s)) < 1e-6 ? [] : ['side'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.angle}|${v.p}|${v.q}|${v.s}`,
});
