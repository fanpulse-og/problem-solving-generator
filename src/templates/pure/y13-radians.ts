import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, step, text } from '../../engine/blocks';
import { dec, ensure, fracTex } from '../../engine/format';
import { sf3, terms } from '../../engine/pure';
import { Q, gcdInt, lcmInt } from '../../engine/rational';

/**
 * Modelled on 9MA0 radian questions: arc length and sector area, a segment found
 * as sector minus triangle, and a sector given by its perimeter and area, which
 * leads to a quadratic with a root to reject.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  r: number;
  theta: Q;
  P: Q; // stretch: perimeter
  A: Q; // stretch: area
  r2: Q; // stretch: the other root
}

/** 2r² − Pr + 2A = 0 scaled to whole numbers with no common factor. */
const quadratic = (v: V) => {
  const scale = lcmInt(Number(v.P.d), Number(v.A.mul(2).d));
  const co = [2 * scale, v.P.mul(scale).toInt(), v.A.mul(2 * scale).toInt()];
  const g = gcdInt(gcdInt(co[0], co[1]), co[2]);
  return terms([[co[0] / g, 2], [-co[1] / g, 1], [co[2] / g, 0]], 'r');
};

/** The arc is drawn as short segments between unlabelled points (names starting with _). */
const sectorFigure = (r: number, theta: number) => {
  const N = 24;
  const points: Record<string, [number, number]> = { O: [0, 0] };
  const at = (i: number): [number, number] => [r * Math.cos(-theta / 2 + (theta * i) / N), r * Math.sin(-theta / 2 + (theta * i) / N)];
  for (let i = 1; i < N; i++) points[`_${i}`] = at(i);
  points.A = at(N);
  points.B = at(0);
  const chain = ['B', ...Array.from({ length: N - 1 }, (_, i) => `_${i + 1}`), 'A'];
  return diagram({
    type: 'figure',
    points,
    segments: [['O', 'A'], ['O', 'B'], ...chain.slice(1).map((n, i) => [chain[i], n] as [string, string])],
    dashed: [['A', 'B']],
    labelled: ['O', 'A', 'B'],
    notAccurate: true,
  });
};

export default defineTemplate<V>({
  id: 'y13-radians',
  title: 'Radians: arcs, sectors and segments',
  strand: 'Pure',
  subtopic: 'Radians',
  tiers: ['Y13'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  styleByLevel: { stretch: 'form-solve' },
  calculator: 'calc',

  generate({ rng, level }) {
    const base: V = { level, r: 0, theta: Q.of(0), P: Q.of(0), A: Q.of(0), r2: Q.of(0) };
    if (level === 'stretch') {
      const r = rng.int(3, 15);
      const theta = Q.of(rng.int(4, 26), 10);
      ensure(!theta.isInt(), 'a whole number of radians would read oddly');
      const P = theta.mul(r).add(2 * r);
      const A = theta.mul(r * r).div(2);
      // 2r² − Pr + 2A = 0 has roots r and P/2 − r. Only one may give an angle under 2π.
      const r2 = P.div(2).sub(r);
      ensure(!r2.eq(r), 'two different roots');
      const other = r2.isPositive() ? P.sub(r2.mul(2)).div(r2).toNumber() : 99;
      ensure(other >= 2 * Math.PI, 'the other root gives an impossible angle');
      return { ...base, r, theta, P, A, r2 };
    }
    const theta = Q.of(rng.int(4, 28), 10);
    ensure(!theta.isInt(), 'a whole number of radians would read oddly');
    return { ...base, r: rng.int(3, 15), theta };
  },

  validate(v) {
    return v.theta.toNumber() < Math.PI ? [] : ['the angle must be below π so the figure is simple'];
  },

  render(v) {
    const th = dec(v.theta);
    if (v.level === 'foundational') {
      return {
        stem: lines(`A sector $OAB$ of a circle has centre $O$ and radius ${v.r} cm.`, `The angle $AOB$ is ${th} radians.`),
        parts: [
          part('a', 2, text('Find the length of the arc $AB$.')),
          part('b', 2, text('Find the area of the sector.')),
          part('c', 2, text('Find the perimeter of the sector.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [sectorFigure(v.r, v.theta.toNumber()), ...lines(`The diagram shows a sector $OAB$ of a circle with centre $O$ and radius ${v.r} cm.`, `The angle $AOB$ is ${th} radians.`, 'The chord $AB$ cuts off a segment of the sector.')],
        parts: [
          part('a', 2, text('Find the area of the triangle $OAB$, giving your answer to 3 significant figures.')),
          part('b', 3, text('Find the area of the segment between the chord $AB$ and the arc $AB$, giving your answer to 3 significant figures.')),
        ],
      };
    }
    return {
      stem: lines('A sector of a circle has radius $r$ cm and angle $\\theta$ radians, where  $0 < \\theta < 2\\pi$', `The perimeter of the sector is ${dec(v.P)} cm and the area of the sector is ${dec(v.A)} cm².`),
      parts: [
        part('a', 3, text(`Show that  $${quadratic(v)} = 0$`)),
        part('b', 3, text('Find the value of $r$ and the value of $\\theta$, explaining why any other solution must be rejected.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const arc = v.theta.mul(v.r);
      const area = v.theta.mul(v.r * v.r).div(2);
      return [{ text: `${dec(arc)} cm` }, { text: `${dec(area)} cm²` }, { text: `${dec(arc.add(2 * v.r))} cm` }];
    }
    if (v.level === 'core') {
      const t = v.theta.toNumber();
      const tri = 0.5 * v.r * v.r * Math.sin(t);
      return [{ text: `${sf3(tri)} cm²` }, { text: `${sf3(0.5 * v.r * v.r * t - tri)} cm²` }];
    }
    return [{ text: 'Shown' }, { text: `$r = ${v.r}$, $\\theta = ${dec(v.theta)}$` }];
  },

  markScheme(v) {
    const th = dec(v.theta);
    if (v.level === 'foundational') {
      const arc = v.theta.mul(v.r);
      const area = v.theta.mul(v.r * v.r).div(2);
      return [
        [step('M1', `$s = r\\theta = ${v.r} \\times ${th}$`, 'This formula needs the angle in radians.'), step('A1', `${dec(arc)} cm`, 'Include the units.')],
        [step('M1', `$\\frac{1}{2}r^2\\theta = \\frac{1}{2} \\times ${v.r}^2 \\times ${th}$`, 'Sector area in radians.'), step('A1', `${dec(area)} cm²`, 'Square the radius before you multiply.')],
        [step('M1', `$${dec(arc)} + ${v.r} + ${v.r}$`, 'The perimeter includes both radii as well as the arc.'), step('A1', `${dec(arc.add(2 * v.r))} cm`, 'Add them up.')],
      ];
    }
    if (v.level === 'core') {
      const t = v.theta.toNumber();
      const tri = 0.5 * v.r * v.r * Math.sin(t);
      return [
        [step('M1', `$\\frac{1}{2} \\times ${v.r}^2 \\times \\sin ${th}$`, 'Your calculator must be in radian mode.'), step('A1', `${sf3(tri)} cm²`, 'A value that seems too small usually means degree mode.')],
        [
          step('M1', `Sector $= \\frac{1}{2} \\times ${v.r}^2 \\times ${th} = ${dec(v.theta.mul(v.r * v.r).div(2))}$`, 'Find the whole sector first.'),
          step('M1', `Segment = sector − triangle`, 'The segment is what is left when the triangle is removed.'),
          step('A1', `${sf3(0.5 * v.r * v.r * t - tri)} cm²`, 'Use the unrounded triangle area.'),
        ],
      ];
    }
    const roots = `$r = ${v.r}$ or $r = ${fracTex(v.r2)}$`;
    return [
      [
        step('M1', `$2r + r\\theta = ${dec(v.P)}$ and $\\frac{1}{2}r^2\\theta = ${dec(v.A)}$`, 'Write an equation for each piece of information.'),
        step('M1', `$r\\theta = ${dec(v.P)} - 2r$, so $\\frac{1}{2}r(${dec(v.P)} - 2r) = ${dec(v.A)}$`, 'Eliminate θ.'),
        step('A1', `$${quadratic(v)} = 0$`, 'Multiply by 2, rearrange and clear any fractions. This is the printed answer.'),
      ],
      [
        step('M1', roots, 'Solve the quadratic.'),
        step('A1', `$r = ${v.r}$, $\\theta = ${dec(v.theta)}$`, 'Find θ from rθ = P − 2r.'),
        step('B1', `The other root does not give  $0 < \\theta < 2\\pi$`, 'Check the angle against the range you were given.'),
      ],
    ];
  },

  check(v, answers) {
    if (v.level === 'foundational') {
      // A sector is the fraction θ/2π of the circle.
      const area = (v.theta.toNumber() / (2 * Math.PI)) * Math.PI * v.r * v.r;
      return Math.abs(area - Number(answers[1].text.split(' ')[0])) < 1e-6 ? [] : ['area'];
    }
    if (v.level === 'core') {
      // Integrate the segment height numerically.
      const half = v.theta.toNumber() / 2;
      const d = v.r * Math.cos(half);
      let s = 0;
      const n = 20000;
      for (let i = 0; i < n; i++) {
        const x = d + ((i + 0.5) / n) * (v.r - d);
        s += 2 * Math.sqrt(v.r * v.r - x * x) * ((v.r - d) / n);
      }
      const shown = Number(answers[1].text.split(' ')[0]);
      return Math.abs(s - shown) / s < 0.01 ? [] : ['segment'];
    }
    const t = v.theta.toNumber();
    return Math.abs(2 * v.r + v.r * t - v.P.toNumber()) < 1e-9 && Math.abs(0.5 * v.r * v.r * t - v.A.toNumber()) < 1e-9 ? [] : ['sector'];
  },

  key: (v) => `${v.r}|${v.theta}`,
});
