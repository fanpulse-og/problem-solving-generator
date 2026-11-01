import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp } from '../../engine/format';
import { DEG, surdTex } from '../../engine/pure';

/**
 * Modelled on 9MA0 vectors in three dimensions: a magnitude and the angle with an
 * axis, the cosine rule on a triangle from position vectors, and unknowns found
 * from three collinear points.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: number[];
  b: number[];
  c: number[];
  lam: number;
}

const ijk = (v: number[]) => {
  const names = ['\\mathbf{i}', '\\mathbf{j}', '\\mathbf{k}'];
  let s = '';
  v.forEach((x, i) => {
    if (x === 0) return;
    const abs = Math.abs(x) === 1 ? '' : Math.abs(x);
    s += s === '' ? `${x < 0 ? '-' : ''}${abs}${names[i]}` : ` ${x < 0 ? '-' : '+'} ${abs}${names[i]}`;
  });
  return s || '\\mathbf{0}';
};
const sub = (u: number[], w: number[]) => u.map((x, i) => x - w[i]);
const n2 = (u: number[]) => u.reduce((s, x) => s + x * x, 0);

export default defineTemplate<V>({
  id: 'y13-vectors',
  title: 'Vectors in three dimensions',
  strand: 'Pure',
  subtopic: 'Vectors',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = () => rng.int(1, 8) * rng.pick([1, -1]);
    if (level === 'foundational') {
      const a = [nz(), nz(), nz()];
      return { level, a, b: [], c: [], lam: 0 };
    }
    if (level === 'core') {
      const a = [nz(), nz(), nz()];
      const b = [nz(), nz(), nz()];
      const c = [nz(), nz(), nz()];
      const [ab, ac] = [sub(b, a), sub(c, a)];
      const cross = [ab[1] * ac[2] - ab[2] * ac[1], ab[2] * ac[0] - ab[0] * ac[2], ab[0] * ac[1] - ab[1] * ac[0]];
      ensure(n2(cross) > 0, 'a real triangle');
      return { level, a, b, c, lam: 0 };
    }
    const a = [nz(), nz(), nz()];
    const d = [rng.int(1, 4), rng.int(1, 4) * rng.pick([1, -1]), rng.int(1, 4)];
    const lam = rng.int(2, 4);
    const b = a.map((x, i) => x + d[i]);
    const c = a.map((x, i) => x + lam * d[i]);
    ensure(c[0] !== 0, 'the i component of C is written out');
    return { level, a, b, c, lam };
  },

  validate(v) {
    return v.level === 'stretch' && v.c.some((x, i) => x - v.a[i] !== v.lam * (v.b[i] - v.a[i])) ? ['the points must be collinear'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The vector  $\\mathbf{a} = ${ijk(v.a)}$`),
        parts: [
          part('a', 2, text('Find the exact value of $|\\mathbf{a}|$')),
          part('b', 2, text('Find the angle between $\\mathbf{a}$ and the positive $x$-axis, giving your answer in degrees to 1 decimal place.')),
          part('c', 1, text('Find a unit vector in the direction of $\\mathbf{a}$')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines('Relative to a fixed origin $O$, the points $A$, $B$ and $C$ have position vectors', `$${ijk(v.a)}$,   $${ijk(v.b)}$   and   $${ijk(v.c)}$   respectively.`),
        parts: [
          part('a', 2, text('Find $\\overrightarrow{AB}$ and $\\overrightarrow{AC}$')),
          part('b', 4, text('Find the size of angle $BAC$, giving your answer in degrees to 1 decimal place.')),
        ],
      };
    }
    return {
      stem: lines(
        'Relative to a fixed origin $O$, the points $A$, $B$ and $C$ have position vectors',
        `$${ijk(v.a)}$,   $${ijk(v.b)}$   and   $${ijk([v.c[0], 0, 0])} + p\\mathbf{j} + q\\mathbf{k}$   respectively,`,
        'where $p$ and $q$ are constants.',
        'Given that $A$, $B$ and $C$ lie on a straight line,',
      ),
      parts: [
        part('a', 2, text('find $\\overrightarrow{AB}$,')),
        part('b', 3, text('find the value of $p$ and the value of $q$.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const m = n2(v.a);
      return [{ text: `$${surdTex(m)}$` }, { text: `$${roundFloatDp(Math.acos(v.a[0] / Math.sqrt(m)) / DEG, 1)}^\\circ$` }, { text: `$\\frac{1}{${surdTex(m)}}(${ijk(v.a)})$` }];
    }
    if (v.level === 'core') {
      const [ab, ac] = [sub(v.b, v.a), sub(v.c, v.a)];
      const bc = sub(v.c, v.b);
      const ang = Math.acos((n2(ab) + n2(ac) - n2(bc)) / (2 * Math.sqrt(n2(ab) * n2(ac)))) / DEG;
      return [{ text: `$${ijk(ab)}$ and $${ijk(ac)}$` }, { text: `$${roundFloatDp(ang, 1)}^\\circ$` }];
    }
    return [{ text: `$${ijk(sub(v.b, v.a))}$` }, { text: `$p = ${v.c[1]}$, $q = ${v.c[2]}$` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const m = n2(v.a);
      return [
        [step('M1', `$\\sqrt{(${v.a[0]})^2 + (${v.a[1]})^2 + (${v.a[2]})^2}$`, 'Pythagoras in three dimensions.'), step('A1', `$${surdTex(m)}$`, 'Simplify the root.')],
        [step('M1', `$\\cos\\theta = \\frac{${v.a[0]}}{${surdTex(m)}}$`, 'The angle with the x-axis uses the i component over the magnitude.'), step('A1', `$${roundFloatDp(Math.acos(v.a[0] / Math.sqrt(m)) / DEG, 1)}^\\circ$`, 'A negative component gives an obtuse angle.')],
        [step('B1', `$\\frac{1}{${surdTex(m)}}(${ijk(v.a)})$`, 'Divide the vector by its magnitude.')],
      ];
    }
    if (v.level === 'core') {
      const [ab, ac] = [sub(v.b, v.a), sub(v.c, v.a)];
      const bc = sub(v.c, v.b);
      const c0 = (n2(ab) + n2(ac) - n2(bc)) / (2 * Math.sqrt(n2(ab) * n2(ac)));
      return [
        [step('M1', `$\\overrightarrow{AB} = ${ijk(ab)}$`, 'End minus start.'), step('A1', `$\\overrightarrow{AC} = ${ijk(ac)}$`, 'Both vectors.')],
        [
          step('M1', `$|AB|^2 = ${n2(ab)}$, $|AC|^2 = ${n2(ac)}$, $|BC|^2 = ${n2(bc)}$`, 'Find the three sides of the triangle.'),
          step('M1', `$${n2(bc)} = ${n2(ab)} + ${n2(ac)} - 2\\sqrt{${n2(ab)}}\\sqrt{${n2(ac)}}\\cos\\theta$`, 'Cosine rule with BC opposite the angle at A.'),
          step('A1', `$\\cos\\theta = ${roundFloatDp(c0, 4)}$`, 'Rearrange.'),
          step('A1', `$${roundFloatDp(Math.acos(c0) / DEG, 1)}^\\circ$`, 'Use the unrounded value.'),
        ],
      ];
    }
    const d = sub(v.b, v.a);
    return [
      [step('M1', 'End minus start', 'AB is the position vector of B minus that of A.'), step('A1', `$${ijk(d)}$`, 'Check each component.')],
      [
        step('M1', `$\\overrightarrow{AC} = \\lambda\\overrightarrow{AB}$`, 'Points on a straight line: AC is a multiple of AB.'),
        step('M1', `$${v.c[0]} - (${v.a[0]}) = ${d[0]}\\lambda$, so $\\lambda = ${v.lam}$`, 'The i components give the multiple.'),
        step('A1', `$p = ${v.c[1]}$, $q = ${v.c[2]}$`, 'Use it with the j and k components.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      const m = Math.sqrt(n2(v.a));
      const unit = v.a.map((x) => x / m);
      return Math.abs(n2(unit) - 1) < 1e-9 && answers.length === 3 ? [] : ['unit'];
    }
    if (v.level === 'core') {
      // Dot product is a different route from the cosine rule used in the answer.
      const [ab, ac] = [sub(v.b, v.a), sub(v.c, v.a)];
      const dot = ab.reduce((s, x, i) => s + x * ac[i], 0);
      const ang = Math.acos(dot / Math.sqrt(n2(ab) * n2(ac))) / DEG;
      return Math.abs(ang - Number(answers[1].text.match(/[\d.]+/)![0])) < 0.051 ? [] : ['angle'];
    }
    // Cross product of AB and AC is zero.
    const [u, w] = [sub(v.b, v.a), sub(v.c, v.a)];
    return [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]].every((x) => x === 0) ? [] : ['collinear'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.lam}`,
});
