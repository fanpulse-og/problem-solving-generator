import { defineTemplate } from '../../engine/types';
import { part, step, text, TIMES } from '../../engine/blocks';
import { ensure } from '../../engine/format';

/**
 * Modelled on Set 22 1H Q17 (a square of area 72 cm²: side as a surd in its
 * simplest form), June 2022 1H Q15 (rectangle (5 + √3) by (5 − √3): the area
 * is an integer) and Set 24 1H Q19 (area 30 cm², width √6: length with a
 * rational denominator, then the diagonal). check() works in floating point.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  k: number; // foundational: side k√m; stretch: length k√m
  m: number; // square-free
  a: number; // core: (a + √b)(a − √b)
  b: number;
}

const SQUAREFREE = [2, 3, 5, 6, 7, 10, 11, 13];

/** √n in its simplest form: [outside, inside]. */
function simplify(n: number): [number, number] {
  let out = 1;
  let inside = n;
  for (let f = 2; f * f <= inside; f++)
    while (inside % (f * f) === 0) {
      inside /= f * f;
      out *= f;
    }
  return [out, inside];
}
const surd = (k: number, m: number) => (m === 1 ? `${k}` : `${k === 1 ? '' : k}\\sqrt{${m}}`);
const tex = (s: string) => `$${s}$`;

export default defineTemplate<V>({
  id: 'num-surds',
  title: 'Surds in area and length problems',
  strand: 'Number',
  subtopic: 'Indices & surds',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, k: 0, m: 0, a: 0, b: 0 };
    if (level === 'core') {
      const a = rng.int(3, 9);
      const b = rng.pick(SQUAREFREE.filter((x) => x < a * a));
      return { ...base, a, b };
    }
    const m = rng.pick(SQUAREFREE.slice(0, level === 'stretch' ? 6 : 8));
    const k = rng.int(2, level === 'stretch' ? 6 : 7);
    if (level === 'stretch') ensure(simplify(m * (k * k + 1))[0] > 1, 'the diagonal simplifies');
    return { ...base, k, m };
  },

  validate(v) {
    if (v.level === 'core') return v.a * v.a > v.b ? [] : ['positive width'];
    return simplify(v.m)[0] === 1 ? [] : ['m must be square-free'];
  },

  render(v) {
    if (v.level === 'foundational') {
      const A = v.k * v.k * v.m;
      return {
        stem: [text(`A square has an area of ${A} cm²`)],
        parts: [part('a', 2, text('Find the length of one side of the square.'), text('Give your answer as a surd in its simplest form.')), part('b', 1, text('Find the perimeter of the square.'), text('Give your answer as a surd in its simplest form.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`A rectangle has length ${tex(`(${v.a} + \\sqrt{${v.b}})`)} cm and width ${tex(`(${v.a} - \\sqrt{${v.b}})`)} cm.`)],
        parts: [part('a', 2, text('Show that the area of the rectangle is a whole number of cm².'), text('Write down this whole number.')), part('b', 1, text('Work out the perimeter of the rectangle.'))],
      };
    }
    const N = v.k * v.m;
    return {
      stem: [text(`A rectangle has an area of ${N} cm²`), text(`The width of the rectangle is ${tex(`\\sqrt{${v.m}}`)} cm.`)],
      parts: [
        part('a', 2, text('Find the length of the rectangle.'), text('Give your answer in the form $a\\sqrt{b}$, where $a$ and $b$ are integers.')),
        part('b', 2, text('Find the length of a diagonal of the rectangle.'), text('Give your answer as a surd in its simplest form.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${tex(surd(v.k, v.m))} cm` }, { text: `${tex(surd(4 * v.k, v.m))} cm` }];
    if (v.level === 'core') return [{ text: `${v.a * v.a - v.b} cm²` }, { text: `${4 * v.a} cm` }];
    const [o, i] = simplify(v.m * (v.k * v.k + 1));
    return [{ text: `${tex(surd(v.k, v.m))} cm` }, { text: `${tex(surd(o, i))} cm` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const A = v.k * v.k * v.m;
      return [
        [step('M1', tex(`\\sqrt{${A}} = \\sqrt{${v.k * v.k}} \\times \\sqrt{${v.m}}`), `Side = √area. Split ${A} into a square number × another number: ${v.k * v.k} × ${v.m}.`), step('A1', tex(surd(v.k, v.m)), `√${v.k * v.k} = ${v.k}.`)],
        [step('B1', tex(`4 \\times ${surd(v.k, v.m)} = ${surd(4 * v.k, v.m)}`), 'Four equal sides: multiply the number in front by 4.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [step('M1', tex(`${v.a * v.a} - ${v.a}\\sqrt{${v.b}} + ${v.a}\\sqrt{${v.b}} - ${v.b}`), 'Expand all four terms (a grid helps).'), step('A1', `${v.a * v.a} ${'−'} ${v.b} = ${v.a * v.a - v.b}`, `The surd terms cancel, and √${v.b} × √${v.b} = ${v.b}, so the area is a whole number.`)],
        [step('B1', tex(`2(${v.a} + \\sqrt{${v.b}}) + 2(${v.a} - \\sqrt{${v.b}}) = ${4 * v.a}`), 'The surds cancel again.')],
      ];
    }
    const N = v.k * v.m;
    const d2 = v.m * (v.k * v.k + 1);
    const [o, i] = simplify(d2);
    return [
      [step('M1', tex(`\\frac{${N}}{\\sqrt{${v.m}}} \\times \\frac{\\sqrt{${v.m}}}{\\sqrt{${v.m}}} = \\frac{${N}\\sqrt{${v.m}}}{${v.m}}`), 'Length = area ÷ width. Multiply top and bottom by √' + v.m + ' to rationalise the denominator.'), step('A1', tex(surd(v.k, v.m)), `${N} ÷ ${v.m} = ${v.k}.`)],
      [
        step('M1', tex(`(${surd(v.k, v.m)})^2 + (\\sqrt{${v.m}})^2 = ${v.k * v.k * v.m} + ${v.m} = ${d2}`), `Pythagoras: (${v.k}√${v.m})² = ${v.k}² ${TIMES} ${v.m} = ${v.k * v.k * v.m}.`),
        step('A1', tex(`\\sqrt{${d2}} = ${surd(o, i)}`), `${d2} = ${o * o} × ${i}, and √${o * o} = ${o}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Read a√b back from the answer text and compare as decimals.
    const read = (t: string) => {
      const mm = t.match(/(\d*)\\sqrt\{(\d+)\}/);
      return mm ? Number(mm[1] || 1) * Math.sqrt(Number(mm[2])) : Number(t.match(/\d+/)![0]);
    };
    const close = (x: number, y: number) => Math.abs(x - y) < 1e-9;
    if (v.level === 'foundational') {
      const side = Math.sqrt(v.k * v.k * v.m);
      if (!close(read(answers[0].text), side) || !close(read(answers[1].text), 4 * side)) p.push('side / perimeter');
    } else if (v.level === 'core') {
      const L = v.a + Math.sqrt(v.b);
      const W = v.a - Math.sqrt(v.b);
      if (!close(read(answers[0].text), L * W) || !close(read(answers[1].text), 2 * (L + W))) p.push('area / perimeter');
    } else {
      const L = (v.k * v.m) / Math.sqrt(v.m);
      if (!close(read(answers[0].text), L) || !close(read(answers[1].text), Math.hypot(L, Math.sqrt(v.m)))) p.push('length / diagonal');
      for (const t of answers.map((a) => a.text)) {
        const inside = Number(t.match(/\\sqrt\{(\d+)\}/)?.[1] ?? 1);
        for (let f = 2; f * f <= inside; f++) if (inside % (f * f) === 0) p.push('not in simplest form');
      }
    }
    return p;
  },

  key: (v) => `${v.k}|${v.m}|${v.a}|${v.b}`,
});
