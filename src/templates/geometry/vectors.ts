import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, text } from '../../engine/blocks';
import { ensure, fracTex, ratio } from '../../engine/format';
import { Q, gcdInt } from '../../engine/rational';

/**
 * Modelled on Set 24 1H Q13 (column vectors: find AC from BA and BC) and
 * Set 24 1H Q22 (OM : MB = 4 : 1, AN : NB = 3 : 2, OA : AE = 5 : 3: show MNE is
 * a straight line). The stretch ratios are constructed so the points really
 * are collinear.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  // foundational
  BA: [number, number];
  BC: [number, number];
  a: [number, number];
  b: [number, number];
  ka: number;
  kb: number;
  // core / stretch
  om: [number, number]; // OM : MB
  an: [number, number]; // AN : NB
  oe: [number, number]; // OA : AE (stretch)
}

/** KaTeX for x a + y b, e.g. "\frac{2}{5}\mathbf{a} - \frac{1}{5}\mathbf{b}". */
function vec(x: Q, y: Q): string {
  const term = (c: Q, v: string, first: boolean) => {
    if (c.eq(0)) return '';
    const neg = c.lt(0);
    const abs = neg ? c.neg() : c;
    const coef = abs.eq(1) ? '' : fracTex(abs);
    return `${first ? (neg ? '-' : '') : neg ? ' - ' : ' + '}${coef}\\mathbf{${v}}`;
  };
  const s = term(x, 'a', true) + term(y, 'b', x.eq(0));
  return s || '\\mathbf{0}';
}
const col = ([x, y]: [number, number]) => `\\begin{pmatrix} ${x} \\\\ ${y} \\end{pmatrix}`;

function parts(v: V) {
  const mu = Q.of(v.om[0], v.om[0] + v.om[1]); // OM = mu b
  const t = Q.of(v.an[0], v.an[0] + v.an[1]); // AN = t AB
  const N = { a: Q.of(1).sub(t), b: t }; // ON
  const MN = { a: N.a, b: N.b.sub(mu) };
  const k = Q.of(v.oe[0] + v.oe[1], v.oe[0]); // OE = k a
  const ME = { a: k, b: mu.neg() };
  return { mu, t, N, MN, k, ME };
}

export default defineTemplate<V>({
  id: 'geom-vectors',
  title: 'Vectors and straight-line proofs',
  strand: 'Geometry & Measures',
  subtopic: 'Vectors',
  tiers: ['H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const base: V = { level, BA: [0, 0], BC: [0, 0], a: [0, 0], b: [0, 0], ka: 0, kb: 0, om: [1, 1], an: [1, 1], oe: [1, 1] };
    const r = () => rng.int(-9, 9);
    if (level === 'foundational') {
      const v = { ...base, BA: [r(), r()] as [number, number], BC: [r(), r()] as [number, number], a: [r(), r()] as [number, number], b: [r(), r()] as [number, number], ka: rng.int(2, 4), kb: rng.int(2, 5) };
      ensure(v.BA.every((x) => x !== 0) && v.BC.every((x) => x !== 0) && v.a.every((x) => x !== 0) && v.b.every((x) => x !== 0), 'no zero components');
      return v;
    }
    const om: [number, number] = [rng.int(1, 5), rng.int(1, 4)];
    const an: [number, number] = [rng.int(1, 5), rng.int(1, 4)];
    ensure(gcdInt(...om) === 1 && gcdInt(...an) === 1, 'ratios in simplest form');
    const v = { ...base, om, an };
    if (level === 'stretch') {
      // Choose E on OA extended so that M, N, E are collinear: k = (1 − t)μ / (μ − t).
      const mu = Q.of(om[0], om[0] + om[1]);
      const t = Q.of(an[0], an[0] + an[1]);
      ensure(mu.gt(t), 'E must lie beyond A');
      const k = Q.of(1).sub(t).mul(mu).div(mu.sub(t));
      ensure(k.gt(1) && k.lt(3), 'E a sensible distance beyond A');
      const L = Number(k.d);
      const K = Number(k.n);
      v.oe = [L, K - L];
      ensure(v.oe[1] > 0 && Math.max(...v.oe) <= 12, 'tidy ratio OA : AE');
    } else ensure(!Q.of(an[0], an[0] + an[1]).eq(Q.of(om[0], om[0] + om[1])), 'MN not parallel to OA');
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (v.level === 'stretch') {
      const { MN, ME } = parts(v);
      if (!MN.a.mul(ME.b).eq(MN.b.mul(ME.a))) p.push('not collinear');
    }
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          part('a', 2, text(`$\\overrightarrow{BA} = ${col(v.BA)}$  and  $\\overrightarrow{BC} = ${col(v.BC)}$`), text('Find $\\overrightarrow{AC}$ as a column vector.')),
          part('b', 2, text(`$\\mathbf{a} = ${col(v.a)}$  and  $\\mathbf{b} = ${col(v.b)}$`), text(`Work out $${v.ka}\\mathbf{a} - ${v.kb}\\mathbf{b}$ as a column vector.`)),
        ],
      };
    }
    const O: [number, number] = [0, 0];
    const A: [number, number] = [4, 0.4];
    const B: [number, number] = [1.6, 3];
    const { mu, t, k } = parts(v);
    const lerp = (p: [number, number], q: [number, number], s: number): [number, number] => [p[0] + (q[0] - p[0]) * s, p[1] + (q[1] - p[1]) * s];
    const points: Record<string, [number, number]> = { O, A, B, M: lerp(O, B, mu.toNumber()), N: lerp(A, B, t.toNumber()) };
    const segs: [string, string][] = [['O', 'A'], ['O', 'B'], ['A', 'B']];
    if (v.level === 'stretch') {
      points.E = [A[0] * k.toNumber(), A[1] * k.toNumber()];
      segs.push(['A', 'E']);
    }
    const d = diagram({ type: 'figure', points, segments: segs, dashed: v.level === 'stretch' ? [['M', 'E']] : [['M', 'N']], arrows: [['O', 'A'], ['O', 'B']], notAccurate: true });
    const stem = [
      text(v.level === 'stretch' ? 'The diagram shows triangle OAB with OA extended to E.' : 'The diagram shows triangle OAB.'),
      d,
      text('$\\overrightarrow{OA} = \\mathbf{a}$\u2003\u2003$\\overrightarrow{OB} = \\mathbf{b}$'),
      text(`M is the point on OB such that OM : MB = ${ratio(...v.om)}`),
      text(`N is the point on AB such that AN : NB = ${ratio(...v.an)}`),
    ];
    if (v.level === 'stretch') {
      stem.push(text(`OA : AE = ${ratio(...v.oe)}`));
      return { stem, parts: [single(5, text('Use a vector method to show that MNE is a straight line.'))] };
    }
    return {
      stem,
      parts: [part('a', 2, text('Find an expression for $\\overrightarrow{ON}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$'), text('Give your answer in its simplest form.')), part('b', 2, text('Find an expression for $\\overrightarrow{MN}$ in terms of $\\mathbf{a}$ and $\\mathbf{b}$'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const ac: [number, number] = [v.BC[0] - v.BA[0], v.BC[1] - v.BA[1]];
      const c: [number, number] = [v.ka * v.a[0] - v.kb * v.b[0], v.ka * v.a[1] - v.kb * v.b[1]];
      return [{ text: `$${col(ac)}$` }, { text: `$${col(c)}$` }];
    }
    const { N, MN, ME } = parts(v);
    if (v.level === 'core') return [{ text: `$\\overrightarrow{ON} = ${vec(N.a, N.b)}$` }, { text: `$\\overrightarrow{MN} = ${vec(MN.a, MN.b)}$` }];
    const ratioK = ME.a.div(MN.a);
    return [{ text: `$\\overrightarrow{MN} = ${vec(MN.a, MN.b)}$, $\\overrightarrow{ME} = ${vec(ME.a, ME.b)} = ${fracTex(ratioK)}\\overrightarrow{MN}$, so MNE is a straight line` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const ac: [number, number] = [v.BC[0] - v.BA[0], v.BC[1] - v.BA[1]];
      const c: [number, number] = [v.ka * v.a[0] - v.kb * v.b[0], v.ka * v.a[1] - v.kb * v.b[1]];
      return [
        [step('M1', `$\\overrightarrow{AC} = \\overrightarrow{AB} + \\overrightarrow{BC} = -${col(v.BA)} + ${col(v.BC)}$`, 'Go from A to B (the reverse of BA), then B to C.'), step('A1', `$${col(ac)}$`, 'Subtract top from top and bottom from bottom.')],
        [step('M1', `$${col([v.ka * v.a[0], v.ka * v.a[1]])} - ${col([v.kb * v.b[0], v.kb * v.b[1]])}$`, 'Multiply each vector first.'), step('A1', `$${col(c)}$`, 'Take care with negative numbers.')],
      ];
    }
    const { mu, t, N, MN, k, ME } = parts(v);
    const ab = '\\mathbf{b} - \\mathbf{a}';
    const onStep = `$\\overrightarrow{AB} = ${ab}$, $\\overrightarrow{ON} = \\mathbf{a} + ${fracTex(t)}(${ab}) = ${vec(N.a, N.b)}$`;
    const mnStep = `$\\overrightarrow{MN} = -${fracTex(mu)}\\mathbf{b} + ${vec(N.a, N.b)} = ${vec(MN.a, MN.b)}$`;
    if (v.level === 'core') {
      return [
        [step('M1', `$\\overrightarrow{AB} = ${ab}$, $\\overrightarrow{AN} = ${fracTex(t)}(${ab})$`, `N is ${fracTex(t).includes('frac') ? `$${fracTex(t)}$` : fracTex(t)} of the way from A to B.`), step('A1', `$\\overrightarrow{ON} = ${vec(N.a, N.b)}$`, 'O to A, then A to N. Collect the a terms and the b terms.')],
        [step('M1', `$\\overrightarrow{MN} = \\overrightarrow{MO} + \\overrightarrow{ON}$, $\\overrightarrow{OM} = ${fracTex(mu)}\\mathbf{b}$`, 'Go back from M to O, then O to N.'), step('A1', `$\\overrightarrow{MN} = ${vec(MN.a, MN.b)}$`, 'Simplify fully.')],
      ];
    }
    return [
      [
        step('M1', onStep, 'Find ON first.'),
        step('A1', mnStep, 'Then MN = MO + ON.'),
        step('M1', `$\\overrightarrow{OE} = ${fracTex(k)}\\mathbf{a}$`, `OA : AE = ${ratio(...v.oe)}, so OE is ${v.oe[0] + v.oe[1]} parts where OA is ${v.oe[0]}.`),
        step('A1', `$\\overrightarrow{ME} = \\overrightarrow{MO} + \\overrightarrow{OE} = ${vec(ME.a, ME.b)}$`, 'Go from M to O, then O to E.'),
        step('C1', `$\\overrightarrow{ME} = ${fracTex(ME.a.div(MN.a))}\\overrightarrow{MN}$, so MN and ME are parallel and share the point M: MNE is a straight line`, 'Show one is a multiple of the other AND mention the common point.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Coordinates: put B at the origin.
      const A = v.BA;
      const C = v.BC;
      if (answers[0].text !== `$${col([C[0] - A[0], C[1] - A[1]])}$`) p.push('AC');
      return p;
    }
    // Coordinates check with a = (1, 0) and b = (0, 1).
    const { mu, t } = parts(v);
    const N = [Q.of(1).sub(t), t];
    const M = [Q.of(0), mu];
    if (v.level === 'stretch') {
      const E = [Q.of(v.oe[0] + v.oe[1], v.oe[0]), Q.of(0)];
      const cross = N[0].sub(M[0]).mul(E[1].sub(M[1])).sub(N[1].sub(M[1]).mul(E[0].sub(M[0])));
      if (!cross.eq(0)) p.push('not collinear by coordinates');
    } else if (!answers[1].text.includes(vec(N[0].sub(M[0]), N[1].sub(M[1])))) p.push('MN');
    return p;
  },

  key: (v) => `${v.BA}|${v.BC}|${v.a}|${v.b}|${v.ka}|${v.kb}|${v.om}|${v.an}|${v.oe}`,
});
