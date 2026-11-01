import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp } from '../../engine/format';
import { DEG, sf3, surdTex } from '../../engine/pure';
import { gcdInt } from '../../engine/rational';

/**
 * Modelled on 8MA0/01 vectors: magnitude and direction of a vector in i and j, a
 * parallelogram from position vectors with an exact length, and a resultant that
 * must be parallel to a given direction.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  a: [number, number];
  b: [number, number];
  c: [number, number];
  lambda: number;
  dir: [number, number];
}

const ij = ([x, y]: [number, number]) => `${x === 1 ? '' : x === -1 ? '-' : x}\\mathbf{i} ${y < 0 ? '-' : '+'} ${Math.abs(y) === 1 ? '' : Math.abs(y)}\\mathbf{j}`;

export default defineTemplate<V>({
  id: 'y12-vectors',
  title: 'Vectors in two dimensions',
  strand: 'Pure',
  subtopic: 'Vectors',
  tiers: ['Y12'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { core: 'geometry-chain', stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const nz = (lo: number, hi: number) => rng.int(lo, hi) * rng.pick([1, -1]);
    const base: V = { level, a: [0, 0], b: [0, 0], c: [0, 0], lambda: 0, dir: [0, 0] };
    if (level === 'foundational') {
      const a: [number, number] = [nz(2, 9), nz(2, 9)];
      const v2 = a[0] * a[0] + a[1] * a[1];
      ensure(a[0] !== a[1] && a[0] !== -a[1], 'not at 45 degrees');
      ensure(Math.sqrt(v2) % 1 !== 0 || v2 % 2 === 1, 'allow surds and triples');
      return { ...base, a };
    }
    if (level === 'core') {
      const a: [number, number] = [nz(1, 8), nz(1, 8)];
      const b: [number, number] = [nz(1, 8), nz(1, 8)];
      const c: [number, number] = [nz(1, 8), nz(1, 8)];
      const ab: [number, number] = [b[0] - a[0], b[1] - a[1]];
      const bc: [number, number] = [c[0] - b[0], c[1] - b[1]];
      ensure(ab[0] !== 0 && ab[1] !== 0 && ab[0] * bc[1] !== ab[1] * bc[0], 'a real parallelogram');
      const d = [a[0] + c[0] - b[0], a[1] + c[1] - b[1]];
      ensure(d[0] !== 0 && d[1] !== 0, 'position vector of D has both parts');
      return { ...base, a, b, c };
    }
    const lambda = rng.int(2, 5);
    const k = rng.int(2, 6);
    const dir: [number, number] = rng.pick([[1, 2], [2, 1], [1, 3], [3, 1], [3, 4], [4, 3], [1, -2], [2, -1], [3, -1]]);
    const b: [number, number] = [nz(1, 5), nz(1, 5)];
    const a: [number, number] = [k * dir[0] - lambda * b[0], k * dir[1] - lambda * b[1]];
    ensure(a[0] !== 0 && a[1] !== 0 && a[0] * b[1] !== a[1] * b[0], 'P and Q are not parallel');
    ensure(b[0] * dir[1] !== b[1] * dir[0], 'lambda is determined');
    return { ...base, a, b, lambda, dir };
  },

  validate(v) {
    return v.level === 'stretch' && (v.a[0] + v.lambda * v.b[0]) * v.dir[1] !== (v.a[1] + v.lambda * v.b[1]) * v.dir[0] ? ['the resultant must be parallel'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`The vector  $\\mathbf{a} = ${ij(v.a)}$`),
        parts: [
          part('a', 2, text('Find the exact value of $|\\mathbf{a}|$')),
          part('b', 2, text('Find the acute angle between $\\mathbf{a}$ and the direction of $\\mathbf{i}$, giving your answer in degrees to 1 decimal place.')),
          part('c', 1, text(`Write down the vector  $3\\mathbf{a}$`)),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`Relative to a fixed origin $O$, the points $A$, $B$ and $C$ have position vectors`, `$\\overrightarrow{OA} = ${ij(v.a)}$,   $\\overrightarrow{OB} = ${ij(v.b)}$,   $\\overrightarrow{OC} = ${ij(v.c)}$`),
        parts: [
          part('a', 2, text('Find $\\overrightarrow{AB}$')),
          part('b', 2, text('Find the exact length of $AB$, giving your answer as a simplified surd or an integer.')),
          part('c', 2, text('Given that $ABCD$ is a parallelogram, find the position vector of the point $D$.')),
        ],
      };
    }
    return {
      stem: lines(`Two vectors are  $\\mathbf{p} = ${ij(v.a)}$  and  $\\mathbf{q} = ${ij(v.b)}$`, `The vector  $\\mathbf{r} = \\mathbf{p} + \\lambda\\mathbf{q}$,  where $\\lambda$ is a constant, is parallel to  $${ij(v.dir)}$`),
      parts: [
        part('a', 3, text('Find the value of $\\lambda$')),
        part('b', 2, text('Find $|\\mathbf{r}|$, giving your answer to 3 significant figures.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      return [{ text: `$${surdTex(v.a[0] ** 2 + v.a[1] ** 2)}$` }, { text: `$${roundFloatDp(Math.atan(Math.abs(v.a[1] / v.a[0])) / DEG, 1)}^\\circ$` }, { text: `$${ij([3 * v.a[0], 3 * v.a[1]])}$` }];
    }
    if (v.level === 'core') {
      const ab: [number, number] = [v.b[0] - v.a[0], v.b[1] - v.a[1]];
      return [{ text: `$${ij(ab)}$` }, { text: `$${surdTex(ab[0] ** 2 + ab[1] ** 2)}$` }, { text: `$${ij([v.a[0] + v.c[0] - v.b[0], v.a[1] + v.c[1] - v.b[1]])}$` }];
    }
    const r = [v.a[0] + v.lambda * v.b[0], v.a[1] + v.lambda * v.b[1]];
    return [{ text: `$\\lambda = ${v.lambda}$` }, { text: sf3(Math.hypot(r[0], r[1])) }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const n2 = v.a[0] ** 2 + v.a[1] ** 2;
      return [
        [step('M1', `$\\sqrt{(${v.a[0]})^2 + (${v.a[1]})^2} = \\sqrt{${n2}}$`, 'Pythagoras on the two components.'), step('A1', `$${surdTex(n2)}$`, 'Simplify the surd if you can.')],
        [step('M1', `$\\tan\\theta = \\frac{${Math.abs(v.a[1])}}{${Math.abs(v.a[0])}}$`, 'Sketch a right-angled triangle: the j part is opposite the angle to i.'), step('A1', `$${roundFloatDp(Math.atan(Math.abs(v.a[1] / v.a[0])) / DEG, 1)}^\\circ$`, 'Use the sizes of the components for the acute angle.')],
        [step('B1', `$${ij([3 * v.a[0], 3 * v.a[1]])}$`, 'Multiply each component by 3.')],
      ];
    }
    if (v.level === 'core') {
      const ab: [number, number] = [v.b[0] - v.a[0], v.b[1] - v.a[1]];
      const n2 = ab[0] ** 2 + ab[1] ** 2;
      const d: [number, number] = [v.a[0] + v.c[0] - v.b[0], v.a[1] + v.c[1] - v.b[1]];
      return [
        [step('M1', `$\\overrightarrow{AB} = \\overrightarrow{OB} - \\overrightarrow{OA}$`, 'End minus start.'), step('A1', `$${ij(ab)}$`, 'Take care with subtracting negatives.')],
        [step('M1', `$\\sqrt{(${ab[0]})^2 + (${ab[1]})^2} = \\sqrt{${n2}}$`, 'Pythagoras.'), step('A1', `$${surdTex(n2)}$`, 'Leave it exact.')],
        [step('M1', `$\\overrightarrow{OD} = \\overrightarrow{OC} + \\overrightarrow{BA}$, since $\\overrightarrow{CD} = \\overrightarrow{BA}$`, 'Opposite sides of a parallelogram are equal and parallel.'), step('A1', `$${ij(d)}$`, 'The letters go round in order A, B, C, D.')],
      ];
    }
    const r: [number, number] = [v.a[0] + v.lambda * v.b[0], v.a[1] + v.lambda * v.b[1]];
    return [
      [
        step('M1', `$\\mathbf{r} = (${v.a[0]} ${v.b[0] < 0 ? '-' : '+'} ${Math.abs(v.b[0])}\\lambda)\\mathbf{i} + (${v.a[1]} ${v.b[1] < 0 ? '-' : '+'} ${Math.abs(v.b[1])}\\lambda)\\mathbf{j}$`, 'Collect the i parts and the j parts.'),
        step('M1', `$\\frac{${v.a[0]} ${v.b[0] < 0 ? '-' : '+'} ${Math.abs(v.b[0])}\\lambda}{${v.a[1]} ${v.b[1] < 0 ? '-' : '+'} ${Math.abs(v.b[1])}\\lambda} = \\frac{${v.dir[0]}}{${v.dir[1]}}$`, 'Parallel vectors have components in the same ratio.'),
        step('A1', `$\\lambda = ${v.lambda}$`, 'Cross-multiply and solve the linear equation.'),
      ],
      [step('M1', `$\\mathbf{r} = ${ij(r)}$`, 'Substitute the value of lambda.'), step('A1', sf3(Math.hypot(r[0], r[1])), 'Pythagoras.')],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') return gcdInt(v.a[0], v.a[1]) > 0 && answers.length === 3 ? [] : ['parts'];
    if (v.level === 'core') {
      // Diagonals of a parallelogram bisect each other.
      const d = [v.a[0] + v.c[0] - v.b[0], v.a[1] + v.c[1] - v.b[1]];
      return v.a[0] + v.c[0] === v.b[0] + d[0] && v.a[1] + v.c[1] === v.b[1] + d[1] ? [] : ['diagonals'];
    }
    // Solve for lambda by trying values, without the algebra above.
    const hits: number[] = [];
    for (let l = -40; l <= 40; l++) if ((v.a[0] + l * v.b[0]) * v.dir[1] === (v.a[1] + l * v.b[1]) * v.dir[0]) hits.push(l);
    return hits.length === 1 && hits[0] === v.lambda ? [] : ['lambda'];
  },

  key: (v) => `${v.a}|${v.b}|${v.c}|${v.lambda}|${v.dir}`,
});
