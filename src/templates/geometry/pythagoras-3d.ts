import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp, roundFloatSf } from '../../engine/format';

/**
 * Modelled on Set 22 1H Q16 (distance between midpoints through a cube) and
 * Set 24 2H Q15 (angle a line makes with a plane). Cuboid ABCDEFGH with base
 * ABCD and E, F, G, H above A, B, C, D.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  l: number; // AB
  w: number; // BC
  h: number; // AE
  thing: string;
}

const deg = (r: number) => (r * 180) / Math.PI;
const t4 = (x: number) => `${(Math.floor(x * 1e4) / 1e4).toFixed(4)}…`;

function cuboid(v: V, extra: Partial<Parameters<typeof diagram>[0]> = {}) {
  const dx = v.w * 0.55;
  const dy = v.w * 0.4;
  const pts: Record<string, [number, number]> = {
    A: [0, 0],
    B: [v.l, 0],
    C: [v.l + dx, dy],
    D: [dx, dy],
    E: [0, v.h],
    F: [v.l, v.h],
    G: [v.l + dx, v.h + dy],
    H: [dx, v.h + dy],
  };
  return { pts, dx, dy, extra };
}

const baseDiag = (v: V) => Math.hypot(v.l, v.w);
const spaceDiag = (v: V) => Math.hypot(v.l, v.w, v.h);
// Stretch: M is the midpoint of FG; the angle between AM and the base ABCD.
const amAngle = (v: V) => deg(Math.atan(v.h / Math.hypot(v.l, v.w / 2)));

export default defineTemplate<V>({
  id: 'geom-pythagoras-3d',
  title: '3D Pythagoras and trigonometry',
  strand: 'Geometry & Measures',
  subtopic: 'Trigonometry',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'calc',

  generate({ rng, level }) {
    const l = rng.int(5, 20);
    const w = rng.int(3, 12);
    const h = rng.int(3, 12);
    ensure(new Set([l, w, h]).size === 3, 'three different edges');
    const v = { level, l, w, h, thing: rng.pick(['box', 'room', 'storage container', 'fish tank']) };
    const checks = level === 'foundational' ? [roundFloatSf(baseDiag(v), 3), roundFloatSf(spaceDiag(v), 3)] : level === 'core' ? [roundFloatDp(deg(Math.atan(h / baseDiag(v))), 1)] : [roundFloatDp(amAngle(v), 1)];
    ensure(checks.every((c) => !/\.0$/.test(c)), 'avoid trailing zeros');
    return v;
  },

  validate(v) {
    return v.l > 0 && v.w > 0 && v.h > 0 ? [] : ['edges'];
  },

  render(v) {
    const { pts } = cuboid(v);
    const all = { ...pts };
    const segs: [string, string][] = [['A', 'B'], ['B', 'C'], ['E', 'F'], ['F', 'G'], ['G', 'H'], ['H', 'E'], ['A', 'E'], ['B', 'F'], ['C', 'G']];
    const hidden: [string, string][] = [['A', 'D'], ['D', 'C'], ['D', 'H']];
    const labels = [{ a: 'A', b: 'B', text: `${v.l} cm` }, { a: 'B', b: 'C', text: `${v.w} cm` }, { a: 'A', b: 'E', text: `${v.h} cm` }];
    const intro = text(`The diagram shows a cuboid ABCDEFGH.`);
    if (v.level === 'stretch') {
      all.M = [(pts.F[0] + pts.G[0]) / 2, (pts.F[1] + pts.G[1]) / 2];
      return {
        stem: [intro, diagram({ type: 'figure', points: all, segments: segs, dashed: [...hidden, ['A', 'M']], edgeLabels: labels, notAccurate: true }), text('M is the midpoint of FG.')],
        parts: [single(4, text('Work out the size of the angle between the line AM and the base ABCD.'), text('Give your answer correct to 1 decimal place.'))],
      };
    }
    const d = diagram({ type: 'figure', points: all, segments: segs, dashed: [...hidden, ['A', 'G']], edgeLabels: labels, notAccurate: true });
    if (v.level === 'foundational') {
      return {
        stem: [intro, d],
        parts: [
          part('a', 2, text('Work out the length of AC.'), text('Give your answer correct to 3 significant figures.')),
          part('b', 2, text('Work out the length of the diagonal AG.'), text('Give your answer correct to 3 significant figures.')),
        ],
      };
    }
    return { stem: [intro, d], parts: [single(4, text('Work out the size of the angle between AG and the base ABCD.'), text('Give your answer correct to 1 decimal place.'))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${roundFloatSf(baseDiag(v), 3)} cm` }, { text: `${roundFloatSf(spaceDiag(v), 3)} cm` }];
    if (v.level === 'core') return [{ text: `${roundFloatDp(deg(Math.atan(v.h / baseDiag(v))), 1)}°` }];
    return [{ text: `${roundFloatDp(amAngle(v), 1)}°` }];
  },

  markScheme(v) {
    const ac = baseDiag(v);
    if (v.level === 'foundational') {
      return [
        [step('M1', `AC² = ${v.l}² + ${v.w}² = ${v.l * v.l + v.w * v.w}`, 'AC is the diagonal of the base: Pythagoras in triangle ABC.'), step('A1', `AC = ${roundFloatSf(ac, 3)} cm`, 'Square root and round.')],
        [step('M1', `AG² = AC² + CG² = ${v.l * v.l + v.w * v.w} + ${v.h}²`, 'Triangle ACG has a right angle at C.'), step('A1', `AG = ${roundFloatSf(spaceDiag(v), 3)} cm`, 'Use the unrounded AC² so the answer stays accurate.')],
      ];
    }
    if (v.level === 'core') {
      return [
        [
          step('M1', `AC² = ${v.l}² + ${v.w}² = ${v.l * v.l + v.w * v.w}`, 'The angle is between AG and its “shadow” AC on the base.'),
          step('A1', `AC = ${t4(ac)}`, 'Keep the full value.'),
          step('M1', `$\\tan \\theta = \\frac{${v.h}}{${t4(ac).replace('…', '')}…}$`, 'In triangle ACG, CG is opposite the angle and AC is adjacent.'),
          step('A1', `$\\theta$ = ${roundFloatDp(deg(Math.atan(v.h / ac)), 1)}°`, 'Inverse tangent, then round.'),
        ],
      ];
    }
    const an = Math.hypot(v.l, v.w / 2);
    return [
      [
        step('M1', `M is directly above N, the midpoint of BC. BN = ${v.w / 2}`, 'Drop a vertical line from M to the base.'),
        step('M1', `AN² = ${v.l}² + ${v.w / 2}², AN = ${t4(an)}`, 'Pythagoras in triangle ABN on the base.'),
        step('M1', `$\\tan \\theta = \\frac{${v.h}}{${t4(an).replace('…', '')}…}$`, 'MN = height of the cuboid, and AN is adjacent.'),
        step('A1', `$\\theta$ = ${roundFloatDp(amAngle(v), 1)}°`, 'Inverse tangent, then round.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const near = (s: string, x: number, tol: number) => Math.abs(parseFloat(s) - x) <= tol;
    // Vectors in 3D: angle between a line and the horizontal = asin(vertical / length).
    if (v.level === 'foundational') {
      const ag = Math.sqrt(v.l ** 2 + v.w ** 2 + v.h ** 2);
      if (!near(answers[1].text, ag, 0.5 * 10 ** (Math.floor(Math.log10(ag)) - 2) + 1e-9)) p.push('AG');
    } else {
      const vec = v.level === 'core' ? [v.l, v.w, v.h] : [v.l, v.w / 2, v.h];
      const len = Math.hypot(...vec);
      const ang = deg(Math.asin(v.h / len));
      if (!near(answers[0].text, ang, 0.05 + 1e-9)) p.push('angle');
    }
    return p;
  },

  key: (v) => `${v.l}|${v.w}|${v.h}`,
});
