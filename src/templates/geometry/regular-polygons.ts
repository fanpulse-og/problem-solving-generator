import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure } from '../../engine/format';
import { Q } from '../../engine/rational';

/**
 * Regular polygons (Set 24 2H Q14 works out the number of sides from angle
 * facts). Foundational: exterior and interior angles; core: the number of
 * sides from an interior angle, and why an angle is impossible; stretch: three
 * regular polygons meeting at a point with no gaps.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  n: number; // sides (the answer for core/stretch)
  impossible: number; // core (b)
  m1: number; // stretch: the two known polygons
  m2: number;
}

const NAMES: Record<number, string> = {
  3: 'equilateral triangle',
  4: 'square',
  5: 'regular pentagon',
  6: 'regular hexagon',
  8: 'regular octagon',
  9: 'regular nonagon',
  10: 'regular decagon',
  12: 'regular dodecagon (12 sides)',
};

const interior = (n: number) => Q.of(180).sub(Q.of(360, n));

/** All (m1, m2, n) with m1 ≤ m2 named polygons and n a whole number of sides. */
const TRIPLES: [number, number, number][] = [];
const named = Object.keys(NAMES).map(Number);
for (const m1 of named)
  for (const m2 of named) {
    if (m2 < m1) continue;
    const third = Q.of(360).sub(interior(m1)).sub(interior(m2));
    const ext = Q.of(180).sub(third);
    if (!ext.isPositive() || !third.isPositive()) continue;
    const n = Q.of(360).div(ext);
    if (n.isInt() && n.toInt() >= 3 && !(m1 === m2 && m2 === n.toInt())) TRIPLES.push([m1, m2, n.toInt()]);
  }

function regularPoints(n: number): [number, number][] {
  return Array.from({ length: n }, (_, i) => {
    const t = Math.PI / 2 + (2 * Math.PI * i) / n + (n % 2 === 0 ? Math.PI / n : 0);
    return [Math.cos(t), Math.sin(t)] as [number, number];
  });
}

export default defineTemplate<V>({
  id: 'geom-regular-polygons',
  title: 'Regular polygons: interior and exterior angles',
  strand: 'Geometry & Measures',
  subtopic: 'Angles & polygons',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'either',

  generate({ rng, level }) {
    if (level === 'stretch') {
      const [m1, m2, n] = rng.pick(TRIPLES);
      return { level, n, impossible: 0, m1, m2 };
    }
    if (level === 'foundational') return { level, n: rng.pick([5, 6, 8, 9, 10, 12]), impossible: 0, m1: 0, m2: 0 };
    const n = rng.pick([5, 6, 8, 9, 10, 12, 15, 18, 20, 24, 30, 36]);
    let impossible = 0;
    for (let tries = 0; tries < 40 && !impossible; tries++) {
      const j = rng.int(100, 175);
      if (360 % (180 - j) !== 0) impossible = j;
    }
    ensure(impossible > 0, 'found an impossible angle');
    return { level, n, impossible, m1: 0, m2: 0 };
  },

  validate(v) {
    const p: string[] = [];
    if (v.n < 3) p.push('polygon needs 3 sides');
    if (v.level === 'stretch' && !interior(v.m1).add(interior(v.m2)).add(interior(v.n)).eq(360)) p.push('angles must make 360°');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`The diagram shows a regular polygon with ${v.n} sides.`), diagram({ type: 'polygon', points: regularPoints(v.n), notAccurate: false })],
        parts: [part('a', 2, text('Work out the size of each exterior angle of the polygon.')), part('b', 1, text('Work out the size of each interior angle of the polygon.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`Each interior angle of a regular polygon is ${dec(interior(v.n))}°.`)],
        parts: [part('a', 3, text('Work out the number of sides of the polygon.')), part('b', 1, text(`Explain why a regular polygon cannot have an interior angle of ${v.impossible}°.`))],
      };
    }
    return {
      stem: [
        text('Three tiles meet at a point, with no gaps and no overlaps.'),
        text(`One tile is ${article(NAMES[v.m1])} ${NAMES[v.m1]}.`),
        text(`One tile is ${v.m1 === v.m2 ? 'another' : article(NAMES[v.m2])} ${NAMES[v.m2]}.`),
        text('The third tile is a regular polygon with $n$ sides.'),
      ],
      parts: [single(4, text('Work out the value of $n$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${dec(Q.of(360, v.n))}°` }, { text: `${dec(interior(v.n))}°` }];
    if (v.level === 'core') {
      const ext = 180 - v.impossible;
      return [{ text: `${v.n} sides` }, { text: `The exterior angle would be ${ext}°, and 360 ÷ ${ext} is not a whole number.` }];
    }
    return [{ text: `$n$ = ${v.n}` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      return [
        [step('M1', `360 ${DIV} ${v.n}`, 'The exterior angles of any polygon add up to 360°.'), step('A1', `${dec(Q.of(360, v.n))}°`, 'In a regular polygon they are all equal.')],
        [step('B1', `180 ${MINUS} ${dec(Q.of(360, v.n))} = ${dec(interior(v.n))}°`, 'Interior and exterior angles lie on a straight line.')],
      ];
    }
    if (v.level === 'core') {
      const ext = Q.of(360, v.n);
      const bad = 180 - v.impossible;
      return [
        [step('M1', `Exterior angle = 180 ${MINUS} ${dec(interior(v.n))} = ${dec(ext)}°`, 'Work with the exterior angle: they add up to 360°.'), step('M1', `360 ${DIV} ${dec(ext)}`, 'How many exterior angles fit into 360°?'), step('A1', `${v.n} sides`, 'One exterior angle for each side.')],
        [step('C1', `180 ${MINUS} ${v.impossible} = ${bad}, and 360 ${DIV} ${bad} = ${dec(Q.of(360, bad).terminatesWithin(2) ? Q.of(360, bad) : Q.of(Q.of(36000, bad).floor(), 100))}${Q.of(360, bad).terminatesWithin(2) ? '' : '…'}, not a whole number`, 'The number of sides must be a whole number.')],
      ];
    }
    const i1 = interior(v.m1);
    const i2 = interior(v.m2);
    const third = Q.of(360).sub(i1).sub(i2);
    return [
      [
        step('P1', `Interior angle of the ${NAMES[v.m1]} = 180 ${MINUS} 360 ${DIV} ${v.m1} = ${dec(i1)}°`, 'Use exterior angles to find each interior angle.'),
        step('P1', `Interior angle of the ${NAMES[v.m2]} = ${dec(i2)}°; third angle = 360 ${MINUS} ${dec(i1)} ${MINUS} ${dec(i2)} = ${dec(third)}°`, 'Angles around a point add up to 360°.'),
        step('P1', `Exterior angle of the third tile = 180 ${MINUS} ${dec(third)} = ${dec(Q.of(180).sub(third))}°`, 'Turn its interior angle into an exterior angle.'),
        step('A1', `$n$ = 360 ${DIV} ${dec(Q.of(180).sub(third))} = ${v.n}`, 'Exterior angles add up to 360°.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Interior angle sum (n − 2) × 180 ÷ n, a different formula.
    const int2 = (n: number) => Q.of((n - 2) * 180, n);
    if (v.level === 'stretch') {
      let found = 0;
      for (let n = 3; n <= 100; n++) if (int2(v.m1).add(int2(v.m2)).add(int2(n)).eq(360)) found = n;
      if (answers[0].text !== `$n$ = ${found}`) p.push('n');
    } else if (v.level === 'core') {
      let found = 0;
      for (let n = 3; n <= 400; n++) if (int2(n).eq(interior(v.n))) found = n;
      if (answers[0].text !== `${found} sides`) p.push('sides');
      for (let n = 3; n <= 400; n++) if (int2(n).eq(v.impossible)) p.push('angle is possible after all');
    } else if (answers[1].text !== `${dec(int2(v.n))}°`) p.push('interior');
    return p;
  },

  key: (v) => `${v.n}|${v.impossible}|${v.m1}|${v.m2}`,
});

function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'an' : 'a';
}
