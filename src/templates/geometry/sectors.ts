import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { ensure, roundFloatDp, roundFloatSf } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 2F Q21 (sector of radius 8 cm, angle 140°: area and
 * perimeter), Set 23 2F Q23 (lawn with a quarter-circle flower bed: boxes of
 * grass seed) and Set 24 2H Q13 (sector with a given area and angle: work out
 * the perimeter).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: 'KS3' | 'F' | 'H';
  name: string;
  r: number;
  angle: number;
  a: number; // core: garden length (m)
  b: number; // core: garden width (m)
  cover: number; // core: m² per box
  given: number; // stretch: area (H) or arc length (F), shown to 1 dp
}

const tr = (x: number, dp: number) => (Math.floor(x * 10 ** dp) / 10 ** dp).toFixed(dp);
const area = (r: number, ang: number) => (ang / 360) * Math.PI * r * r;
const arc = (r: number, ang: number) => (ang / 360) * 2 * Math.PI * r;

export default defineTemplate<V>({
  id: 'geom-sectors',
  title: 'Sectors and arcs',
  strand: 'Geometry & Measures',
  subtopic: 'Area & perimeter problems',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  styleByLevel: { stretch: 'backwards' },
  calculator: 'calc',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, tier, name, r: 0, angle: 0, a: 0, b: 0, cover: 0, given: 0 };
    if (level === 'foundational') {
      const r = rng.int(4, 15);
      const angle = rng.step(35, 325, 5);
      ensure(angle !== 90 && angle !== 180 && angle !== 270, 'not a simple fraction of a circle');
      roundFloatDp(area(r, angle), 1);
      roundFloatDp(arc(r, angle) + 2 * r, 1);
      ensure(!/\.0$/.test(roundFloatDp(area(r, angle), 1)) && !/\.0$/.test(roundFloatDp(arc(r, angle) + 2 * r, 1)), 'no trailing zero');
      return { ...base, r, angle };
    }
    if (level === 'core') {
      const a = rng.int(8, 25);
      const b = rng.int(6, 18);
      const r = rng.int(3, Math.min(a, b) - 1);
      const cover = rng.pick([10, 15, 20, 25, 30]);
      const grass = a * b - area(r, 90);
      const boxes = grass / cover;
      const fr = boxes - Math.floor(boxes);
      ensure(boxes >= 3 && fr > 0.05 && fr < 0.95, 'a clear number of boxes');
      // The trap: forgetting to subtract the flower bed must give a different answer.
      ensure(Math.ceil((a * b) / cover) !== Math.ceil(boxes), 'the flower bed matters');
      return { ...base, a, b, r, cover };
    }
    const r = rng.int(5, 20);
    const angle = rng.step(30, 300, 5);
    ensure(angle % 90 !== 0, 'not a quarter or half');
    if (tier === 'H') {
      const A = Number(roundFloatDp(area(r, angle), 1));
      ensure(!Number.isInteger(A), 'area shown with a decimal part');
      // Working back from the area as shown (1 dp) must still round to the same perimeter.
      const rBack = Math.sqrt((360 * A) / (Math.PI * angle));
      const perimeter = arc(rBack, angle) + 2 * rBack;
      ensure(roundFloatSf(perimeter, 3) === roundFloatSf(arc(r, angle) + 2 * r, 3), 'stable rounding');
      ensure(!/\.0$/.test(roundFloatSf(perimeter, 3)), 'no trailing zero');
      return { ...base, r, angle, given: A };
    }
    const L = Number(roundFloatDp(arc(r, angle), 1));
    ensure(!Number.isInteger(L), 'arc shown with a decimal part');
    const angBack = (360 * L) / (2 * Math.PI * r);
    ensure(Math.round(angBack) === angle && Math.abs(angBack - angle) < 0.3, 'angle comes back to a whole number of degrees');
    return { ...base, r, angle, given: L };
  },

  validate(v) {
    return v.level === 'core' && v.r >= Math.min(v.a, v.b) ? ['flower bed too big'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`A sector of a circle has radius ${v.r} cm and angle ${v.angle}°.`)],
        parts: [part('a', 2, text('Work out the area of the sector.'), text('Give your answer correct to 1 decimal place.')), part('b', 3, text('Work out the perimeter of the sector.'), text('Give your answer correct to 1 decimal place.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`${v.name}’s garden is a rectangle ${v.a} m long and ${v.b} m wide.`, `In one corner of the garden there is a flower bed in the shape of a quarter of a circle of radius ${v.r} m.`, `${v.name} is going to cover the rest of the garden with grass seed.`, `One box of grass seed covers ${v.cover} m²`),
        parts: [single(4, text(`How many boxes of grass seed does ${v.name} need?`))],
      };
    }
    if (v.tier === 'H') {
      return { stem: [text(`A sector of a circle has angle ${v.angle}° and area ${v.given.toFixed(1)} cm²`)], parts: [single(4, text('Work out the perimeter of the sector.'), text('Give your answer correct to 3 significant figures.'))] };
    }
    return { stem: [text(`The arc of a sector of a circle has length ${v.given.toFixed(1)} cm.`), text(`The radius of the circle is ${v.r} cm.`)], parts: [single(3, text('Work out the angle of the sector.'), text('Give your answer to the nearest degree.'))] };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${roundFloatDp(area(v.r, v.angle), 1)} cm²` }, { text: `${roundFloatDp(arc(v.r, v.angle) + 2 * v.r, 1)} cm` }];
    if (v.level === 'core') return [{ text: `${Math.ceil((v.a * v.b - area(v.r, 90)) / v.cover)} boxes` }];
    if (v.tier === 'H') {
      const r = Math.sqrt((360 * v.given) / (Math.PI * v.angle));
      return [{ text: `${roundFloatSf(arc(r, v.angle) + 2 * r, 3)} cm` }];
    }
    return [{ text: `${Math.round((360 * v.given) / (2 * Math.PI * v.r))}°` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const A = area(v.r, v.angle);
      const L = arc(v.r, v.angle);
      return [
        [step('M1', `$\\frac{${v.angle}}{360} \\times \\pi \\times ${v.r}^2$`, 'Area of a sector = fraction of the circle × πr².'), step('A1', `${roundFloatDp(A, 1)} cm²`, `${tr(A, 3)}… rounded to 1 dp.`)],
        [
          step('M1', `$\\frac{${v.angle}}{360} \\times 2 \\times \\pi \\times ${v.r} = ${tr(L, 3)}…$`, 'Arc length = fraction of the circle × 2πr.'),
          step('M1', `${tr(L, 3)}… + ${v.r} + ${v.r}`, 'Perimeter: the arc AND the two straight edges (the radii).'),
          step('A1', `${roundFloatDp(L + 2 * v.r, 1)} cm`, 'Round at the end, not before.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const q = area(v.r, 90);
      const grass = v.a * v.b - q;
      return [
        [
          step('P1', `${v.a} ${TIMES} ${v.b} = ${v.a * v.b} m²`, 'Area of the whole garden.'),
          step('P1', `$\\frac{1}{4} \\times \\pi \\times ${v.r}^2 = ${tr(q, 2)}…$ m²`, 'Area of the quarter-circle flower bed.'),
          step('P1', `(${v.a * v.b} − ${tr(q, 2)}…) ${DIV} ${v.cover} = ${tr(grass / v.cover, 2)}…`, 'Area of grass ÷ area one box covers.'),
          step('A1', `${Math.ceil(grass / v.cover)} boxes`, 'Round UP: a part-box is not enough.'),
        ],
      ];
    }
    if (v.tier === 'H') {
      const r = Math.sqrt((360 * v.given) / (Math.PI * v.angle));
      const L = arc(r, v.angle);
      return [
        [
          step('P1', `$\\frac{${v.angle}}{360} \\times \\pi r^2 = ${v.given.toFixed(1)}$`, 'Use the area to set up an equation for r.'),
          step('P1', `$r^2 = ${tr((360 * v.given) / (Math.PI * v.angle), 2)}…$, so $r = ${tr(r, 3)}…$`, 'Rearrange, then square root.'),
          step('P1', `Arc $= \\frac{${v.angle}}{360} \\times 2\\pi \\times ${tr(r, 3)}… = ${tr(L, 3)}…$`, 'Arc length with the r you found.'),
          step('A1', `${tr(L, 3)}… + 2 ${TIMES} ${tr(r, 3)}… = ${roundFloatSf(L + 2 * r, 3)} cm`, 'Add the two radii; keep full accuracy until the end.'),
        ],
      ];
    }
    const ang = (360 * v.given) / (2 * Math.PI * v.r);
    return [
      [
        step('M1', `$2 \\times \\pi \\times ${v.r} = ${tr(2 * Math.PI * v.r, 3)}…$`, 'The circumference of the whole circle.'),
        step('M1', `$\\frac{${v.given.toFixed(1)}}{${tr(2 * Math.PI * v.r, 3)}…} \\times 360 = ${tr(ang, 2)}…$`, 'The arc is this fraction of the circumference, so the angle is that fraction of 360°.'),
        step('A1', `${Math.round(ang)}°`, 'Nearest degree.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = (s: string) => parseFloat(s.replace(/[^\d.]/g, ''));
    if (v.level === 'foundational') {
      // Numerical integration of the sector (polar strips) as an independent route.
      const n = 20000;
      let A = 0;
      let L = 0;
      const th = (v.angle * Math.PI) / 180;
      for (let i = 0; i < n; i++) {
        A += 0.5 * v.r * v.r * (th / n);
        L += 2 * v.r * Math.sin(th / n / 2);
      }
      if (Math.abs(num(answers[0].text) - A) > 0.05 + 1e-6) p.push('area');
      if (Math.abs(num(answers[1].text) - (L + 2 * v.r)) > 0.05 + 1e-4) p.push('perimeter');
      return p;
    }
    if (v.level === 'core') {
      const boxes = num(answers[0].text);
      const grass = v.a * v.b - (Math.PI * v.r * v.r) / 4;
      if (!(boxes * v.cover >= grass && (boxes - 1) * v.cover < grass)) p.push('boxes');
      return p;
    }
    if (v.tier === 'H') {
      // From the true radius, the perimeter must agree to 3 s.f. tolerance.
      const per = num(answers[0].text);
      const exact = arc(v.r, v.angle) + 2 * v.r;
      if (Math.abs(per - exact) > 0.006 * exact) p.push('perimeter');
      return p;
    }
    if (num(answers[0].text) !== v.angle) p.push('angle');
    return p;
  },

  key: (v) => `${v.tier === 'H' && v.level === 'stretch' ? 'H' : ''}|${v.r}|${v.angle}|${v.a}|${v.b}|${v.cover}`,
});
