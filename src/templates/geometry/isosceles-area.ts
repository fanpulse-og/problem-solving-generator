import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Modelled on Set 23 1F Q33 / 1H Q8 (isosceles triangle, base 24 cm,
 * perimeter 54 cm, find the area) and Set 24 2H Q10 (area given, find the
 * equal sides). Non-calculator versions are built from Pythagorean triples so
 * every length is a whole number; calculator versions give 3 s.f. answers.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  calc: 'non-calc' | 'calc';
  half: Q; // half the base
  height: Q | null; // exact when known
  side: Q | null; // equal side, exact when known
  base: Q;
  perimeter: Q | null; // core
  area: Q | null; // stretch
}

const TRIPLES: [number, number, number][] = [
  [3, 4, 5],
  [5, 12, 13],
  [8, 15, 17],
  [7, 24, 25],
  [20, 21, 29],
];

export default defineTemplate<V>({
  id: 'geom-isosceles-area',
  title: 'Isosceles triangle: Pythagoras and area',
  strand: 'Geometry & Measures',
  subtopic: 'Area & perimeter problems',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const useTriple = calc === 'non-calc' || level === 'foundational' || tier === 'KS3';
    if (useTriple) {
      const t = rng.pick(tier === 'KS3' ? TRIPLES.slice(0, 2) : TRIPLES);
      const swap = rng.chance(0.5);
      const [legA, legB, hyp] = swap ? [t[1], t[0], t[2]] : t;
      const k = rng.int(1, Math.max(1, Math.floor(30 / hyp)));
      const half = Q.of(legA * k);
      const height = Q.of(legB * k);
      const side = Q.of(hyp * k);
      ensure(height.toNumber() >= 3, 'not too flat');
      const base = half.mul(2);
      return { level, calc: 'non-calc', half, height, side, base, perimeter: side.mul(2).add(base), area: half.mul(height) };
    }
    // Calculator: whole-number givens, irrational results.
    const base = Q.of(rng.int(6, 30));
    const half = base.div(2);
    if (level === 'core') {
      const side = half.add(Q.of(rng.int(2, Math.max(4, Math.round(half.toNumber() * 3))), 2));
      const v: V = { level, calc, half, height: null, side, base, perimeter: side.mul(2).add(base), area: null };
      ensure(!isSquare(side.mul(side).sub(half.mul(half))), 'exact height: use the non-calculator version');
      ensure(!/\.0 /.test(this_answer(v)), 'avoid answers like 75.0');
      return v;
    }
    const b = base.toNumber();
    // Height between b/3 and b keeps the triangle a sensible shape.
    const area = Q.of(rng.int(Math.ceil((b * b) / 6), Math.floor((b * b) / 2)));
    const height = area.mul(2).div(base);
    const v: V = { level, calc, half, height, side: null, base, perimeter: null, area };
    ensure(!isSquare(half.mul(half).add(height.mul(height))), 'exact side: use the non-calculator version');
    ensure(!/\.0 /.test(this_answer(v)), 'avoid answers like 42.0');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (!v.base.isPositive()) p.push('base');
    if (v.side && !v.side.gt(v.half)) p.push('impossible triangle');
    if (v.side && v.height && !v.side.mul(v.side).eq(v.half.mul(v.half).add(v.height.mul(v.height)))) p.push('not right-angled');
    return p;
  },

  render(v) {
    // Drawing only: real proportions, floating point is fine here.
    const h = v.height ? v.height.toNumber() : Math.sqrt(v.side!.toNumber() ** 2 - v.half.toNumber() ** 2);
    const b = v.base.toNumber();
    const pts: [number, number][] = [[0, 0], [b, 0], [b / 2, h]];
    const edgeLabels = [{ edge: 0, text: `${dec(v.base)} cm` }];
    if (v.level === 'foundational') edgeLabels.push({ edge: 1, text: `${dec(v.side!)} cm` }, { edge: 2, text: `${dec(v.side!)} cm` });
    const d = diagram({ type: 'polygon', points: pts, edgeLabels, notAccurate: true });
    if (v.level === 'foundational') {
      return {
        stem: [text('The diagram shows an isosceles triangle.'), d],
        parts: [part('a', 3, text('Work out the perpendicular height of the triangle.')), part('b', 2, text('Work out the area of the triangle.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [...lines(`The diagram shows an isosceles triangle, with base length ${dec(v.base)} cm.`, `The perimeter of the triangle is ${dec(v.perimeter!)} cm.`), d],
        parts: [single(5, text('Work out the area of the triangle.'), ...(v.calc === 'calc' ? [text('Give your answer correct to 3 significant figures.')] : []))],
      };
    }
    return {
      stem: [...lines(`The diagram shows an isosceles triangle with base length ${dec(v.base)} cm.`, `The area of the triangle is ${dec(v.area!)} cm²`), d],
      parts: [single(4, text('Work out the perimeter of the triangle.'), ...(v.calc === 'calc' ? [text('Give your answer correct to 3 significant figures.')] : []))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(v.height!)} cm` }, { text: `${dec(v.area!)} cm²` }];
    if (v.level === 'core') {
      if (v.calc === 'non-calc') return [{ text: `${dec(v.area!)} cm²` }];
      const height = Math.sqrt(v.side!.toNumber() ** 2 - v.half.toNumber() ** 2);
      return [{ text: `${roundFloatSf(v.half.toNumber() * height, 3)} cm²` }];
    }
    if (v.calc === 'non-calc') return [{ text: `${dec(v.perimeter!)} cm` }];
    const side = Math.hypot(v.half.toNumber(), v.height!.toNumber());
    return [{ text: `${roundFloatSf(2 * side + v.base.toNumber(), 3)} cm` }];
  },

  markScheme(v) {
    const half = dec(v.half);
    if (v.level === 'foundational') {
      const s = dec(v.side!);
      return [
        [
          step('M1', `Half the base = ${dec(v.base)} ${DIV} 2 = ${half}`, 'The height cuts the isosceles triangle into two right-angled triangles.'),
          step('M1', `$h^2 = ${s}^2 - ${half}^2 = ${dec(v.side!.mul(v.side!))} - ${dec(v.half.mul(v.half))} = ${dec(v.height!.mul(v.height!))}$`, 'Pythagoras: the sloping side is the hypotenuse, so subtract.'),
          step('A1', `$h = \\sqrt{${dec(v.height!.mul(v.height!))}}$ = ${dec(v.height!)} cm`, ''),
        ].map((x) => (x.note ? x : { ...x, note: 'Square root to finish.' })),
        [step('M1', `½ ${TIMES} ${dec(v.base)} ${TIMES} ${dec(v.height!)}`, 'Area of a triangle = ½ × base × height.'), step('A1', `= ${dec(v.area!)} cm²`, 'Give the units: cm².')],
      ];
    }
    if (v.level === 'core') {
      const P = dec(v.perimeter!);
      const s = dec(v.side!);
      const sideStep = step('P1', `(${P} ${MINUS} ${dec(v.base)}) ${DIV} 2 = ${s} cm`, 'Take the base off the perimeter and split what is left between the two equal sides.');
      const halfStep = step('P1', `Half the base = ${half} cm`, 'The height meets the base at its midpoint.');
      const h2 = v.side!.mul(v.side!).sub(v.half.mul(v.half));
      const pyth = step('P1', `$h^2 = ${s}^2 - ${half}^2 = ${dec(h2)}$`, 'Pythagoras in one of the right-angled halves.');
      if (v.calc === 'non-calc') {
        return [[sideStep, halfStep, pyth, step('P1', `$h = \\sqrt{${dec(h2)}} = ${dec(v.height!)}$, area = ½ ${TIMES} ${dec(v.base)} ${TIMES} ${dec(v.height!)}`, 'Find the height, then use ½ × base × height.'), step('A1', `${dec(v.area!)} cm²`, 'Give the units: cm².')]];
      }
      const h = Math.sqrt(h2.toNumber());
      return [[sideStep, halfStep, pyth, step('P1', `$h = \\sqrt{${dec(h2)}}$ = ${trunc4(h)}, area = ½ ${TIMES} ${dec(v.base)} ${TIMES} ${trunc4(h)}`, 'Keep the unrounded height on your calculator.'), step('A1', this_answer(v), 'Round to 3 significant figures at the very end.')]];
    }
    const hgt = v.height!;
    const heightStep = step('P1', `½ ${TIMES} ${dec(v.base)} ${TIMES} $h$ = ${dec(v.area!)}, so $h$ = ${dec(v.area!)} ${TIMES} 2 ${DIV} ${dec(v.base)} = ${hgt.terminatesWithin(4) ? dec(hgt) : approx(hgt)}`, 'Work backwards from the area formula to find the height.');
    const s2 = v.half.mul(v.half).add(hgt.mul(hgt));
    if (v.calc === 'non-calc') {
      return [[heightStep, step('P1', `Half the base = ${half}`, 'The height meets the base at its midpoint.'), step('P1', `$s^2 = ${half}^2 + ${dec(hgt)}^2 = ${dec(s2)}$, $s = ${dec(v.side!)}$`, 'Pythagoras: add the squares to find the sloping side.'), step('A1', `${dec(v.side!)} + ${dec(v.side!)} + ${dec(v.base)} = ${dec(v.perimeter!)} cm`, 'The perimeter uses BOTH equal sides.')]];
    }
    const s = Math.sqrt(s2.toNumber());
    return [[heightStep, step('P1', `Half the base = ${half}`, 'The height meets the base at its midpoint.'), step('P1', `$s = \\sqrt{${half}^2 + h^2}$ = ${trunc4(s)}`, 'Pythagoras: add the squares. Keep the full value on the calculator.'), step('A1', `2 ${TIMES} ${trunc4(s)} + ${dec(v.base)} = ${this_answer(v)}`, 'The perimeter uses both equal sides. Round at the end.')]];
  },

  check(v, answers) {
    const p: string[] = [];
    // Heron's formula is independent of the height-based route.
    const a = v.level === 'stretch' && v.calc === 'calc' ? Math.hypot(v.half.toNumber(), v.height!.toNumber()) : v.side!.toNumber();
    const b = v.base.toNumber();
    const s = (2 * a + b) / 2;
    const heron = Math.sqrt(s * (s - a) * (s - a) * (s - b));
    if (v.level === 'stretch') {
      if (Math.abs(heron - v.area!.toNumber()) > 1e-6) p.push('heron area');
      const per = 2 * a + b;
      const shown = parseFloat(answers[0].text.replace(/[^\d.]/g, ''));
      if (Math.abs(shown - per) > (v.calc === 'calc' ? 0.05 * 10 ** (Math.floor(Math.log10(per)) - 1) * 10 : 1e-9)) p.push(`perimeter ${shown} vs ${per}`);
    } else {
      const shown = parseFloat(answers[answers.length - 1].text.replace(/[^\d.]/g, ''));
      const tol = v.calc === 'calc' && v.level === 'core' ? 0.5 * 10 ** (Math.floor(Math.log10(heron)) - 2) : 1e-9;
      if (Math.abs(shown - heron) > tol + 1e-9) p.push(`area ${shown} vs ${heron}`);
    }
    return p;
  },

  key: (v) => `${v.base}|${v.side}|${v.perimeter}|${v.area}|${v.calc}`,
});

function this_answer(v: V): string {
  if (v.level === 'core') {
    const h = Math.sqrt(v.side!.toNumber() ** 2 - v.half.toNumber() ** 2);
    return `${roundFloatSf(v.half.toNumber() * h, 3)} cm²`;
  }
  const s = Math.hypot(v.half.toNumber(), v.height!.toNumber());
  return `${roundFloatSf(2 * s + v.base.toNumber(), 3)} cm`;
}

/** Calculator display cut to 4 dp, for working lines only. */
function trunc4(x: number): string {
  return `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;
}

/** True when a rational is the square of a rational (so its root is exact). */
function isSquare(q: Q): boolean {
  const r = (n: bigint) => {
    if (n < 0n) return -1n;
    let x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x--;
    while ((x + 1n) * (x + 1n) <= n) x++;
    return x;
  };
  const a = r(q.n);
  const b = r(q.d);
  return a * a === q.n && b * b === q.d;
}
