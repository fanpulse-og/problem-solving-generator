import { defineTemplate } from '../../engine/types';
import { lines, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, int, roundFloatDp } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 2F Q16 (water flows into a cuboid tank at 4 litres a
 * minute: how long to fill it?), Set 22 2H Q12 (water from a full cylinder is
 * poured into a cuboid: how deep?) and Set 24 2H Q15 (a metal sphere is melted
 * down to make cones: how many?). π cancels in the stretch question, so the
 * count is exact.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  tier: 'KS3' | 'F' | 'H';
  name: string;
  dims: [number, number, number]; // cuboid l, w, h (cm)
  rate: number; // foundational: litres per minute
  r: number; // cylinder / sphere radius (cm)
  h: number; // cylinder height / cone height (cm)
  R: number; // stretch H: cone radius
}

const fillSeconds = (v: V) => Q.of(v.dims[0] * v.dims[1] * v.dims[2] * 60, 1000 * v.rate);
/** Cut (not round) to dp places, for working shown with “…”. */
const tr = (x: number, dp: number) => (Math.floor(x * 10 ** dp) / 10 ** dp).toFixed(dp);
const cylVol = (r: number, h: number) => Math.PI * r * r * h;

export default defineTemplate<V>({
  id: 'geom-volume',
  title: 'Volume problems: tanks, cylinders, spheres and cones',
  strand: 'Geometry & Measures',
  subtopic: 'Volume & surface area',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  calculator: 'calc',

  generate({ rng, level, tier }) {
    const [name] = names(rng, 1);
    const base: V = { level, tier, name, dims: [0, 0, 0], rate: 0, r: 0, h: 0, R: 0 };
    if (level === 'foundational') {
      const dims: [number, number, number] = [rng.step(40, 120, 10), rng.step(30, 80, 10), rng.step(30, 80, 10)];
      const rate = rng.pick([2, 3, 4, 5, 6, 8, 12, 15]);
      const v = { ...base, dims, rate };
      const secs = fillSeconds(v);
      ensure(secs.isInt() && secs.toInt() % 30 === 0, 'a whole number of half-minutes');
      ensure(secs.toInt() >= 5 * 60 && secs.toInt() <= 90 * 60, 'a sensible time');
      return v;
    }
    if (level === 'core') {
      const r = rng.int(3, 12);
      const h = rng.int(10, 30);
      const dims: [number, number, number] = [rng.step(20, 60, 5), rng.step(15, 40, 5), 0];
      const depth = cylVol(r, h) / (dims[0] * dims[1]);
      dims[2] = Math.ceil(depth + rng.int(3, 15));
      ensure(depth >= 1.5 && depth <= 40, 'a measurable depth');
      roundFloatDp(depth, 1); // rejects values on a rounding boundary
      ensure(!/\.0$/.test(roundFloatDp(depth, 1)), 'no trailing zero');
      return { ...base, r, h, dims };
    }
    if (tier === 'H') {
      // Sphere radius r → cones of radius R and height h: number = 4r³ / (R²h).
      const r = rng.int(5, 15);
      const R = rng.int(2, 6);
      const h = rng.int(4, 15);
      const n = Q.of(4 * r ** 3, R * R * h);
      ensure(n.toNumber() >= 5 && n.toNumber() <= 200, 'a sensible number of cones');
      const fr = n.toNumber() - Math.floor(n.toNumber());
      ensure(fr > 0.03 && fr < 0.97, 'not nearly a whole number');
      return { ...base, r, R, h };
    }
    // F/KS3 stretch: fill cylindrical cups from a full cuboid container.
    const dims: [number, number, number] = [rng.step(20, 60, 5), rng.step(20, 40, 5), rng.step(20, 50, 5)];
    const r = rng.pick([3, 3.5, 4, 4.5, 5]);
    const h = rng.int(8, 15);
    const n = (dims[0] * dims[1] * dims[2]) / cylVol(r, h);
    const fr = n - Math.floor(n);
    ensure(n >= 6 && n <= 120 && fr > 0.03 && fr < 0.97, 'a clear number of cups');
    return { ...base, dims, r, h };
  },

  validate(v) {
    return v.level === 'core' && v.dims[2] * v.dims[0] * v.dims[1] < cylVol(v.r, v.h) ? ['tank would overflow'] : [];
  },

  render(v) {
    const [l, w, h] = v.dims;
    if (v.level === 'foundational') {
      return {
        stem: lines(`A tank is in the shape of a cuboid.`, `The tank is ${l} cm long, ${w} cm wide and ${h} cm high.`, `The tank is empty.`, `Water flows into the tank at a rate of ${v.rate} litres per minute.`, '1 litre = 1000 cm³'),
        parts: [single(4, text('How long will it take to fill the tank completely?'), text('Give your answer in minutes and seconds.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`A cylinder has radius ${v.r} cm and height ${v.h} cm.`, 'The cylinder is full of water.', `${v.name} pours all of the water into an empty tank in the shape of a cuboid.`, `The base of the tank is ${l} cm by ${w} cm. The tank is ${h} cm high.`),
        parts: [single(4, text('Work out the depth of the water in the tank.'), text('Give your answer correct to 1 decimal place.'))],
      };
    }
    if (v.tier === 'H') {
      return {
        stem: lines(`A solid metal sphere has radius ${v.r} cm.`, `The sphere is melted down and all the metal is used to make cones.`, `Each cone has base radius ${v.R} cm and height ${v.h} cm.`, 'Volume of a sphere = $\\frac{4}{3}\\pi r^3$', 'Volume of a cone = $\\frac{1}{3}\\pi r^2 h$'),
        parts: [single(4, text('Work out the greatest number of cones that can be made.'))],
      };
    }
    return {
      stem: lines(`A container in the shape of a cuboid is ${l} cm long, ${w} cm wide and ${h} cm high.`, 'The container is full of water.', `${v.name} uses the water to fill cups.`, `Each cup is a cylinder with radius ${dec(Q.of(v.r * 2, 2))} cm and height ${v.h} cm.`),
      parts: [single(4, text(`Work out the greatest number of cups that ${v.name} can fill completely.`))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const s = fillSeconds(v).toInt();
      return [{ text: `${Math.floor(s / 60)} minutes${s % 60 ? ` ${s % 60} seconds` : ''}` }];
    }
    if (v.level === 'core') return [{ text: `${roundFloatDp(cylVol(v.r, v.h) / (v.dims[0] * v.dims[1]), 1)} cm` }];
    if (v.tier === 'H') return [{ text: `${Q.of(4 * v.r ** 3, v.R * v.R * v.h).floor()}` }];
    return [{ text: `${Math.floor((v.dims[0] * v.dims[1] * v.dims[2]) / cylVol(v.r, v.h))}` }];
  },

  markScheme(v) {
    const [l, w, h] = v.dims;
    if (v.level === 'foundational') {
      const vol = l * w * h;
      const litres = Q.of(vol, 1000);
      const mins = litres.div(v.rate);
      const s = fillSeconds(v).toInt();
      return [
        [
          step('M1', `${l} ${TIMES} ${w} ${TIMES} ${h} = ${int(vol)} cm³`, 'Volume of a cuboid = length × width × height.'),
          step('M1', `${int(vol)} ${DIV} 1000 = ${dec(litres)} litres`, 'Change cm³ to litres to match the rate.'),
          step('M1', `${dec(litres)} ${DIV} ${v.rate} = ${dec(mins)} minutes`, 'Time = volume ÷ rate.'),
          step('A1', `${Math.floor(s / 60)} minutes${s % 60 ? ` ${s % 60} seconds` : ''}`, s % 60 ? `0.${dec(mins).split('.')[1]} of a minute = ${s % 60} seconds (not ${dec(mins).split('.')[1]} seconds).` : 'A whole number of minutes.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const cv = cylVol(v.r, v.h);
      return [
        [
          step('M1', `π ${TIMES} ${v.r}² ${TIMES} ${v.h} = ${tr(cv, 2)}… cm³`, 'Volume of a cylinder = πr²h.'),
          step('M1', `${l} ${TIMES} ${w} = ${l * w} cm²`, 'The water spreads over the base of the tank.'),
          step('M1', `${tr(cv, 2)}… ${DIV} ${l * w}`, 'Depth = volume of water ÷ area of the base.'),
          step('A1', `${roundFloatDp(cv / (l * w), 1)} cm`, `Check it is less than the height of the tank (${h} cm).`),
        ],
      ];
    }
    if (v.tier === 'H') {
      const sphere = (4 / 3) * Math.PI * v.r ** 3;
      const cone = (1 / 3) * Math.PI * v.R ** 2 * v.h;
      const n = Q.of(4 * v.r ** 3, v.R * v.R * v.h);
      return [
        [
          step('P1', `$\\frac{4}{3} \\pi \\times ${v.r}^3 = ${tr(sphere, 1)}…$ cm³`, 'Volume of the sphere: all of this metal is used.'),
          step('P1', `$\\frac{1}{3} \\pi \\times ${v.R}^2 \\times ${v.h} = ${tr(cone, 2)}…$ cm³`, 'Volume of one cone.'),
          step('P1', `${tr(sphere, 1)}… ${DIV} ${tr(cone, 2)}… = ${tr(n.toNumber(), 2)}…`, 'Number of cones = total volume ÷ volume of one cone.'),
          step('A1', `${n.floor()}`, 'Round DOWN: only complete cones count.'),
        ],
      ];
    }
    const cup = cylVol(v.r, v.h);
    const n = (l * w * h) / cup;
    return [
      [
        step('P1', `${l} ${TIMES} ${w} ${TIMES} ${h} = ${int(l * w * h)} cm³`, 'Volume of water in the container.'),
        step('P1', `π ${TIMES} ${dec(Q.of(v.r * 2, 2))}² ${TIMES} ${v.h} = ${tr(cup, 2)}… cm³`, 'Volume of one cup = πr²h.'),
        step('P1', `${int(l * w * h)} ${DIV} ${tr(cup, 2)}… = ${tr(n, 2)}…`, 'How many cups’ worth of water there is.'),
        step('A1', `${Math.floor(n)}`, 'Round DOWN: the last cup would not be full.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const [l, w, h] = v.dims;
    if (v.level === 'foundational') {
      // Pour in litre by litre, counting seconds.
      const cm3PerSecond = (v.rate * 1000) / 60;
      const m = /(\d+) minutes(?: (\d+) seconds)?/.exec(answers[0].text);
      const secs = Number(m?.[1]) * 60 + Number(m?.[2] ?? 0);
      if (Math.abs(secs * cm3PerSecond - l * w * h) > 1e-6) p.push('fill time');
      return p;
    }
    if (v.level === 'core') {
      const shown = parseFloat(answers[0].text);
      // The water in the tank (depth × base) must hold the cylinder's volume to within rounding.
      const vol = Math.PI * v.r * v.r * v.h;
      if (Math.abs(shown * l * w - vol) > 0.05 * l * w + 1e-9) p.push('depth');
      if (shown > h) p.push('overflows');
      return p;
    }
    const n = Number(answers[0].text);
    const big = v.tier === 'H' ? (4 / 3) * Math.PI * v.r ** 3 : l * w * h;
    const small = v.tier === 'H' ? (1 / 3) * Math.PI * v.R ** 2 * v.h : Math.PI * v.r ** 2 * v.h;
    if (!(n * small <= big && (n + 1) * small > big)) p.push('count');
    return p;
  },

  key: (v) => `${v.tier === 'H' && v.level === 'stretch' ? 'H' : ''}|${v.dims}|${v.rate}|${v.r}|${v.h}|${v.R}`,
});
