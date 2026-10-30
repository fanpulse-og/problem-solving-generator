import { defineTemplate } from '../../engine/types';
import { diagram, single, step, text } from '../../engine/blocks';
import { ensure } from '../../engine/format';

/**
 * Modelled on Set 22 1F Q21 / Set 23 1F Q19 (describe fully the single
 * transformation that maps A onto B), Set 24 1H Q7 (enlargement, centre and
 * scale factor) and Set 23 1H Q10 (reflect, then rotate: describe the single
 * transformation). Images are made by applying exact integer maps; check()
 * re-reads the description from the answer text and applies it from scratch.
 */
type Pt = [number, number];
interface Map {
  M: [number, number, number, number]; // [a, b, c, d]: (x, y) → (ax + by, cx + dy) + t
  t: Pt;
  k?: number; // enlargement scale factor (M = kI), possibly ½
}
interface V {
  level: 'foundational' | 'core' | 'stretch';
  shape: number;
  A: Pt[]; // object
  steps: { kind: Kind; p: number[] }[]; // the transformation(s) applied, in order
}
type Kind = 'translate' | 'reflectX' | 'reflectY' | 'reflectYX' | 'reflectYnegX' | 'rotate' | 'enlarge';

const SHAPES: { pts: Pt[]; inside: Pt }[] = [
  { pts: [[0, 0], [2, 0], [0, 3]], inside: [0.55, 0.85] },
  { pts: [[0, 0], [3, 0], [3, 1], [1, 1], [1, 2], [0, 2]], inside: [0.5, 0.55] },
  { pts: [[0, 0], [3, 0], [2, 2], [0, 1]], inside: [1.1, 0.9] },
  { pts: [[0, 0], [1, 0], [1, 1], [3, 1], [3, 2], [0, 2]], inside: [0.5, 1.5] },
];
const LIM = 7;

/** Build the affine map for one named transformation. */
function mapOf(kind: Kind, p: number[]): Map {
  switch (kind) {
    case 'translate':
      return { M: [1, 0, 0, 1], t: [p[0], p[1]] };
    case 'reflectX': // in the line x = p0
      return { M: [-1, 0, 0, 1], t: [2 * p[0], 0] };
    case 'reflectY': // in the line y = p0
      return { M: [1, 0, 0, -1], t: [0, 2 * p[0]] };
    case 'reflectYX':
      return { M: [0, 1, 1, 0], t: [0, 0] };
    case 'reflectYnegX':
      return { M: [0, -1, -1, 0], t: [0, 0] };
    case 'rotate': {
      // p = [angle anticlockwise: 90, 180, 270, centre x, centre y]
      const [ang, a, b] = p;
      const M: Map['M'] = ang === 90 ? [0, -1, 1, 0] : ang === 180 ? [-1, 0, 0, -1] : [0, 1, -1, 0];
      return { M, t: [a - (M[0] * a + M[1] * b), b - (M[2] * a + M[3] * b)] };
    }
    case 'enlarge': {
      // p = [k numerator, k denominator, centre x, centre y]
      const k = p[0] / p[1];
      return { M: [k, 0, 0, k], t: [p[2] - k * p[2], p[3] - k * p[3]], k };
    }
  }
}
const apply = (m: Map, [x, y]: Pt): Pt => [m.M[0] * x + m.M[1] * y + m.t[0], m.M[2] * x + m.M[3] * y + m.t[1]];
const compose = (first: Map, then: Map): Map => {
  const [a, b, c, d] = then.M;
  const [e, f, g, h] = first.M;
  return { M: [a * e + b * g, a * f + b * h, c * e + d * g, c * f + d * h], t: apply(then, first.t) };
};
const run = (v: V, pts: Pt[], upTo = v.steps.length) => v.steps.slice(0, upTo).reduce((ps, s) => ps.map((q) => apply(mapOf(s.kind, s.p), q)), pts);

const fmtN = (n: number) => (Number.isInteger(n) ? `${n}` : `\\frac{${Math.round(n * 2)}}{2}`);
const ptTex = ([x, y]: Pt) => `$(${fmtN(x)}, ${fmtN(y)})$`;
const vecTex = ([x, y]: Pt) => `$\\begin{pmatrix} ${x} \\\\ ${y} \\end{pmatrix}$`;

/** Name a single map as Edexcel would describe it, or null if it is not one of the simple types. */
function describe(m: Map): string | null {
  const [a, b, c, d] = m.M;
  const [tx, ty] = m.t;
  const det = a * d - b * c;
  if (m.k !== undefined && m.k !== 1) {
    const cx = tx / (1 - m.k);
    const cy = ty / (1 - m.k);
    const kTex = m.k === 0.5 ? '$\\frac{1}{2}$' : `${m.k}`;
    return `Enlargement, scale factor ${kTex}, centre ${ptTex([cx, cy])}`;
  }
  if (a === 1 && b === 0 && c === 0 && d === 1) return tx === 0 && ty === 0 ? null : `Translation by ${vecTex([tx, ty])}`;
  if (det === 1) {
    // Rotation: centre solves (I − M)c = t.
    const i = [1 - a, -b, -c, 1 - d];
    const D = i[0] * i[3] - i[1] * i[2];
    const cx = (i[3] * tx - i[1] * ty) / D;
    const cy = (-i[2] * tx + i[0] * ty) / D;
    if (!Number.isInteger(cx) || !Number.isInteger(cy)) return null;
    const angle = a === -1 ? '180°' : c === 1 ? '90° anticlockwise' : '90° clockwise';
    return `Rotation ${angle} about ${ptTex([cx, cy])}`;
  }
  if (det === -1) {
    if (a === -1 && d === 1 && b === 0 && ty === 0) return Number.isInteger(tx / 2) ? `Reflection in the line $x = ${tx / 2}$` : null;
    if (a === 1 && d === -1 && b === 0 && tx === 0) return Number.isInteger(ty / 2) ? `Reflection in the line $y = ${ty / 2}$` : null;
    if (b === 1 && c === 1 && tx === 0 && ty === 0) return 'Reflection in the line $y = x$';
    if (b === -1 && c === -1 && tx === 0 && ty === 0) return 'Reflection in the line $y = -x$';
  }
  return null;
}

/** Wording for one step, used in the stretch stem. */
function stepWords(s: V['steps'][number]): string {
  switch (s.kind) {
    case 'reflectX':
      return `reflected in the line $x = ${s.p[0]}$`;
    case 'reflectY':
      return `reflected in the line $y = ${s.p[0]}$`;
    case 'reflectYX':
      return 'reflected in the line $y = x$';
    case 'reflectYnegX':
      return 'reflected in the line $y = -x$';
    case 'rotate':
      return `rotated ${s.p[0] === 180 ? '180°' : s.p[0] === 90 ? '90° anticlockwise' : '90° clockwise'} about the point ${ptTex([s.p[1], s.p[2]])}`;
    case 'translate':
      return `translated by the vector ${vecTex([s.p[0], s.p[1]])}`;
    default:
      return 'enlarged';
  }
}

const inGrid = (ps: Pt[]) => ps.every(([x, y]) => Math.abs(x) <= LIM && Math.abs(y) <= LIM);
const bbox = (ps: Pt[]) => [Math.min(...ps.map((p) => p[0])), Math.max(...ps.map((p) => p[0])), Math.min(...ps.map((p) => p[1])), Math.max(...ps.map((p) => p[1]))];
const apart = (p: Pt[], q: Pt[]) => {
  const [a0, a1, a2, a3] = bbox(p);
  const [b0, b1, b2, b3] = bbox(q);
  return a1 <= b0 || b1 <= a0 || a3 <= b2 || b3 <= a2;
};
const sameSet = (p: Pt[], q: Pt[]) => {
  const key = (ps: Pt[]) => ps.map(([x, y]) => `${x},${y}`).sort().join(' ');
  return key(p) === key(q);
};

export default defineTemplate<V>({
  id: 'geom-transformations',
  title: 'Describing transformations',
  strand: 'Geometry & Measures',
  subtopic: 'Transformations',
  tiers: ['KS3', 'F', 'H'],
  // Combined transformations are Higher only (G8).
  levelsByTier: { KS3: ['foundational', 'core'], F: ['foundational', 'core'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'non-calc',

  generate({ rng, level, tier }) {
    const shape = rng.int(0, SHAPES.length - 1);
    // Rotate the base shape to a random orientation, then place it.
    const turn = rng.int(0, 3);
    let base = SHAPES[shape].pts;
    for (let i = 0; i < turn; i++) base = base.map(([x, y]) => [-y, x] as Pt);
    const off: Pt = [rng.int(-6, 6), rng.int(-6, 6)];
    let A = base.map(([x, y]) => [x + off[0], y + off[1]] as Pt);
    const r = () => rng.int(-4, 4);
    let steps: V['steps'];
    if (level === 'foundational') {
      const opts: Kind[] = ['translate', 'reflectX', 'reflectY', ...(tier === 'H' ? (['reflectYX', 'reflectYnegX'] as Kind[]) : [])];
      const kind = rng.pick(opts);
      if (kind === 'translate') {
        const t = [rng.int(-7, 7), rng.int(-7, 7)];
        ensure(t[0] !== 0 && t[1] !== 0, 'a diagonal translation');
        steps = [{ kind, p: t }];
      } else steps = [{ kind, p: kind === 'reflectX' || kind === 'reflectY' ? [r()] : [] }];
    } else if (level === 'core') {
      if (rng.chance(0.5)) {
        steps = [{ kind: 'rotate', p: [rng.pick([90, 180, 270]), r(), r()] }];
      } else {
        const kOpts = tier === 'H' ? [[2, 1], [3, 1], [-2, 1], [1, 2]] : [[2, 1], [3, 1]];
        const [kn, kd] = rng.pick(kOpts);
        const c = [rng.int(-6, 6), rng.int(-6, 6)];
        if (kd === 2) {
          // Scale factor ½: make A by enlarging a small shape by 2, so the image has whole-number corners.
          A = A.map(([x, y]) => [c[0] + 2 * (x - c[0]), c[1] + 2 * (y - c[1])] as Pt);
        }
        steps = [{ kind: 'enlarge', p: [kn, kd, c[0], c[1]] }];
      }
    } else {
      const pool: Kind[] = ['reflectX', 'reflectY', 'rotate', ...(tier === 'H' ? (['reflectYX', 'reflectYnegX'] as Kind[]) : [])];
      const mk = (kind: Kind) => ({ kind, p: kind === 'rotate' ? [rng.pick([90, 180, 270]), tier === 'H' ? r() : 0, tier === 'H' ? r() : 0] : kind === 'reflectX' || kind === 'reflectY' ? [r()] : [] });
      steps = [mk(rng.pick(pool)), mk(rng.pick(pool))];
      ensure(steps[0].kind !== steps[1].kind || steps[0].kind === 'reflectX' || steps[0].kind === 'reflectY', 'two different steps');
      const total = compose(mapOf(steps[0].kind, steps[0].p), mapOf(steps[1].kind, steps[1].p));
      ensure(describe(total) !== null, 'the result is a single simple transformation');
    }
    const v: V = { level, shape, A, steps };
    const B = run(v, A, 1);
    const C = run(v, A);
    ensure(inGrid(A) && inGrid(B) && inGrid(C), 'everything on the grid');
    ensure(apart(A, C), 'object and image do not overlap');
    if (level === 'stretch') ensure(apart(A, B) && apart(B, C), 'each stage separate');
    ensure(describe(total(v)) !== null, 'describable');
    return v;
  },

  validate(v) {
    return run(v, v.A).every(([x, y]) => Number.isInteger(x) && Number.isInteger(y)) ? [] : ['image corners must be on the grid'];
  },

  render(v) {
    const inside = SHAPES[v.shape].inside;
    // The interior label point follows the shape: find the same orientation by matching the first edge.
    const lab = (pts: Pt[], name: string) => ({ points: pts, closed: true, label: name, labelAt: labelPoint(v, pts, inside), shaded: name === 'A' });
    const paths = v.level === 'stretch' ? [lab(v.A, 'A')] : [lab(v.A, 'A'), lab(run(v, v.A), 'B')];
    const grid = diagram({ type: 'grid', x: [-LIM, LIM], y: [-LIM, LIM], square: true, xLabelEvery: 1, yLabelEvery: 1, paths });
    if (v.level !== 'stretch') return { stem: [grid], parts: [single(v.level === 'foundational' ? 2 : 3, text('Describe fully the single transformation that maps shape A onto shape B.'))] };
    return {
      stem: [grid, text(`Shape A is ${stepWords(v.steps[0])} to give shape B.`), text(`Shape B is ${stepWords(v.steps[1])} to give shape C.`)],
      parts: [single(3, text('Describe fully the single transformation that maps shape A onto shape C.'))],
    };
  },

  answer(v) {
    return [{ text: describe(total(v))! }];
  },

  markScheme(v) {
    const d = describe(total(v))!;
    if (v.level === 'stretch') {
      const B = run(v, v.A, 1);
      const C = run(v, v.A);
      return [
        [
          step('M1', `B has corners ${B.map(ptTex).join(', ')}`, 'Draw shape B on the grid first.'),
          step('M1', `C has corners ${C.map(ptTex).join(', ')}`, 'Then draw C from B.'),
          step('A1', d, 'Now compare A with C: name the ONE transformation and give all its details.'),
        ],
      ];
    }
    const s = v.steps[0];
    const notes: Record<Kind, string[]> = {
      translate: ['Every corner moves the same way: it is a translation.', 'Count squares across (right is +) then up (up is +) from a corner of A to the same corner of B.'],
      reflectX: ['B is a mirror image of A.', 'The mirror line is halfway between matching corners.'],
      reflectY: ['B is a mirror image of A.', 'The mirror line is halfway between matching corners.'],
      reflectYX: ['B is a mirror image of A.', 'The mirror line is the diagonal line through (0, 0) and (1, 1).'],
      reflectYnegX: ['B is a mirror image of A.', 'The mirror line is the diagonal line through (0, 0) and (1, −1).'],
      rotate: ['B is the same size and shape, turned round: a rotation.', 'Give the angle AND the direction (180° needs no direction).', 'Use tracing paper to find the point that stays still.'],
      enlarge: ['B is a different size: an enlargement.', `Scale factor = a length on B ÷ the same length on A${s.p[0] < 0 ? '; negative because B is on the other side of the centre, upside down' : ''}.`, 'Join matching corners with straight lines: they cross at the centre.'],
    };
    const n = notes[s.kind];
    if (v.level === 'foundational') {
      const kind = d.split(' ')[0];
      return [[step('B1', kind, n[0]), step('B1', d.slice(kind.length + 1), n[1])]];
    }
    const parts = d.match(/^(Rotation|Enlargement),? (.*?),? (about|centre) (.*)$/)!;
    return [[step('B1', parts[1], n[0]), step('B1', parts[2], n[1]), step('B1', `${parts[3]} ${parts[4]}`, n[2])]];
  },

  check(v, answers) {
    const p: string[] = [];
    const m = parse(answers[0].text);
    if (!m) return ['could not read the description'];
    const target = run(v, v.A);
    if (!sameSet(v.A.map((q) => apply(m, q)), target)) p.push('description does not map A onto the image');
    return p;
  },

  key: (v) => `${v.A.map((q) => q.join(',')).join(' ')}|${v.steps.map((s) => s.kind + s.p).join(';')}`,
});

function total(v: V): Map {
  const maps = v.steps.map((s) => mapOf(s.kind, s.p));
  return maps.length === 1 ? maps[0] : compose(maps[0], maps[1]);
}

/** Where to put the shape's letter: the base shape's interior point, carried along with it. */
function labelPoint(v: V, pts: Pt[], inside: Pt): Pt {
  // Find the similarity that sends the base shape's first two corners to these; it is a turn, flip and/or scale.
  const base = SHAPES[v.shape].pts;
  for (const flip of [1, -1])
    for (let turn = 0; turn < 4; turn++)
      for (const scale of [1, 2, 3, 0.5, -2, 4, 6, 1.5]) {
        const f = ([x, y]: Pt): Pt => {
          let q: Pt = [x, flip * y];
          for (let i = 0; i < turn; i++) q = [-q[1], q[0]];
          return [q[0] * scale, q[1] * scale];
        };
        const shift: Pt = [pts[0][0] - f(base[0])[0], pts[0][1] - f(base[0])[1]];
        if (base.every((b, i) => f(b)[0] + shift[0] === pts[i][0] && f(b)[1] + shift[1] === pts[i][1])) {
          const q = f(inside);
          return [q[0] + shift[0], q[1] + shift[1]];
        }
      }
  return [pts.reduce((s, q) => s + q[0], 0) / pts.length, pts.reduce((s, q) => s + q[1], 0) / pts.length];
}

/** Read a description back into a map (independent of describe()). */
function parse(s: string): Map | null {
  const num = (t: string) => {
    const f = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(t.trim());
    return f ? ((f[1] ? -1 : 1) * Number(f[2])) / Number(f[3]) : Number(t.trim().replace('−', '-'));
  };
  let m: RegExpExecArray | null;
  if ((m = /Translation by \$\\begin\{pmatrix\} (-?\d+) \\\\ (-?\d+) \\end\{pmatrix\}\$/.exec(s))) {
    const [x, y] = [Number(m[1]), Number(m[2])];
    return { M: [1, 0, 0, 1], t: [x, y] };
  }
  if ((m = /Reflection in the line \$x = (-?\d+)\$/.exec(s))) return { M: [-1, 0, 0, 1], t: [2 * Number(m[1]), 0] };
  if ((m = /Reflection in the line \$y = (-?\d+)\$/.exec(s))) return { M: [1, 0, 0, -1], t: [0, 2 * Number(m[1])] };
  if (/Reflection in the line \$y = x\$/.test(s)) return { M: [0, 1, 1, 0], t: [0, 0] };
  if (/Reflection in the line \$y = -x\$/.test(s)) return { M: [0, -1, -1, 0], t: [0, 0] };
  if ((m = /Rotation (90° clockwise|90° anticlockwise|180°) about \$\((-?\d+), (-?\d+)\)\$/.exec(s))) {
    const [cx, cy] = [Number(m[2]), Number(m[3])];
    // Rotate about the centre using cos and sin, rounded (they are exact for these angles).
    const th = ((m[1].startsWith('180') ? 180 : m[1].includes('anti') ? 90 : -90) * Math.PI) / 180;
    const [co, si] = [Math.round(Math.cos(th)), Math.round(Math.sin(th))];
    return { M: [co, -si, si, co], t: [cx - co * cx + si * cy, cy - si * cx - co * cy] };
  }
  if ((m = /Enlargement, scale factor (.+?), centre \$\((-?\d+), (-?\d+)\)\$/.exec(s))) {
    const k = num(m[1].replace(/\$/g, ''));
    const [cx, cy] = [Number(m[2]), Number(m[3])];
    return { M: [k, 0, 0, k], t: [cx * (1 - k), cy * (1 - k)] };
  }
  return null;
}
