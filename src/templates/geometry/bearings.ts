import { defineTemplate } from '../../engine/types';
import { lines, part, step, text } from '../../engine/blocks';
import { ensure, roundFloatDp } from '../../engine/format';

/**
 * Modelled on Set 22 1F Q14 (the bearing of B from A is 070°: work out the
 * bearing of A from B), Set 23 2H Q10 (a ship sails 12 km on a bearing of
 * 050°: how far east?) and Set 24 2H Q18 (two legs at right angles: distance
 * and bearing back to the start). check() works in coordinates.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  b1: number; // bearings in degrees
  b2: number;
  d1: number; // km
  d2: number;
}

const three = (b: number) => String(((b % 360) + 360) % 360).padStart(3, '0');
const rad = (deg: number) => (deg * Math.PI) / 180;
const back = (b: number) => (b + 180) % 360;
/** East and north components of a journey of d on bearing b. */
const en = (d: number, b: number) => [d * Math.sin(rad(b)), d * Math.cos(rad(b))];
const tr = (x: number, dp: number) => (Math.floor(x * 10 ** dp) / 10 ** dp).toFixed(dp);

function stretchVals(v: V) {
  const [e1, n1] = en(v.d1, v.b1);
  const [e2, n2] = en(v.d2, v.b2);
  const E = e1 + e2;
  const N = n1 + n2;
  const dist = Math.hypot(E, N);
  // Bearing of A from C: direction of (−E, −N).
  let brg = (Math.atan2(-E, -N) * 180) / Math.PI;
  if (brg < 0) brg += 360;
  return { dist, brg, angC: (Math.atan(v.d1 / v.d2) * 180) / Math.PI };
}

export default defineTemplate<V>({
  id: 'geom-bearings',
  title: 'Bearings',
  strand: 'Geometry & Measures',
  subtopic: 'Trigonometry',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'geometry-chain',
  calculator: 'calc',

  generate({ rng, level, tier }) {
    const base: V = { level, b1: 0, b2: 0, d1: 0, d2: 0 };
    if (level === 'foundational') {
      const b1 = rng.step(10, 170, 5);
      const b2 = rng.step(190, 350, 5);
      ensure(b1 % 90 !== 0 && b2 % 90 !== 0 && b2 !== 270, 'not a compass point');
      return { ...base, b1, b2 };
    }
    if (level === 'core') {
      const b1 = tier === 'H' ? rng.step(5, 355, 1) : rng.int(10, 80);
      ensure(b1 % 90 !== 0, 'not due north, east, south or west');
      const d1 = rng.int(5, 40);
      const [e, n] = en(d1, b1);
      const es = roundFloatDp(Math.abs(e), 1);
      const ns = roundFloatDp(Math.abs(n), 1);
      ensure(!/\.0$/.test(es) && !/\.0$/.test(ns) && Math.abs(e) >= 1 && Math.abs(n) >= 1, 'tidy answers');
      return { ...base, b1, d1 };
    }
    const b1 = rng.step(15, tier === 'H' ? 340 : 75, 5);
    ensure(b1 % 90 !== 0, 'not a compass point');
    const b2 = (b1 + 90) % 360;
    const d1 = rng.int(4, 30);
    const d2 = rng.int(4, 30);
    ensure(d1 !== d2, 'different legs');
    const v = { ...base, b1, b2, d1, d2 };
    const { dist, brg } = stretchVals(v);
    ensure(!/\.0$/.test(roundFloatDp(dist, 1)), 'no trailing zero');
    ensure(Math.abs(brg - Math.round(brg) - 0.5) > 0.01 && Math.abs(brg - Math.round(brg) + 0.5) > 0.01, 'bearing not on a rounding boundary');
    return v;
  },

  validate(v) {
    return v.level === 'stretch' && (v.b2 - v.b1 + 360) % 360 !== 90 ? ['legs must be at right angles'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [],
        parts: [
          part('a', 2, text(`The bearing of $B$ from $A$ is ${three(v.b1)}°`), text('Work out the bearing of $A$ from $B$.')),
          part('b', 2, text(`The bearing of $Q$ from $P$ is ${three(v.b2)}°`), text('Work out the bearing of $P$ from $Q$.')),
        ],
      };
    }
    if (v.level === 'core') {
      const [e, n] = en(v.d1, v.b1);
      return {
        stem: lines(`A ship sails ${v.d1} km from a port $P$ on a bearing of ${three(v.b1)}° to a point $S$.`),
        parts: [
          part('a', 2, text(`Work out how far ${e > 0 ? 'east' : 'west'} of $P$ the point $S$ is.`), text('Give your answer correct to 1 decimal place.')),
          part('b', 2, text(`Work out how far ${n > 0 ? 'north' : 'south'} of $P$ the point $S$ is.`), text('Give your answer correct to 1 decimal place.')),
        ],
      };
    }
    return {
      stem: lines(`A boat sails ${v.d1} km from $A$ on a bearing of ${three(v.b1)}° to $B$.`, `The boat then sails ${v.d2} km from $B$ on a bearing of ${three(v.b2)}° to $C$.`),
      parts: [
        part('a', 2, text('Work out the distance $AC$.'), text('Give your answer correct to 1 decimal place.')),
        part('b', 3, text('Work out the bearing of $A$ from $C$.'), text('Give your answer to the nearest degree.')),
      ],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${three(back(v.b1))}°` }, { text: `${three(back(v.b2))}°` }];
    if (v.level === 'core') {
      const [e, n] = en(v.d1, v.b1);
      return [{ text: `${roundFloatDp(Math.abs(e), 1)} km` }, { text: `${roundFloatDp(Math.abs(n), 1)} km` }];
    }
    const { dist, brg } = stretchVals(v);
    return [{ text: `${roundFloatDp(dist, 1)} km` }, { text: `${three(Math.round(brg) % 360)}°` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const one = (b: number) => [
        step('M1', b < 180 ? `${three(b)} + 180` : `${three(b)} − 180`, 'Draw a north line at the second point: the back bearing differs by 180°.'),
        step('A1', `${three(back(b))}°`, 'Bearings are always written with three figures.'),
      ];
      return [one(v.b1), one(v.b2)];
    }
    if (v.level === 'core') {
      const [e, n] = en(v.d1, v.b1);
      // Angle between the path and the north–south line.
      const ns = v.b1 <= 90 ? v.b1 : v.b1 <= 180 ? 180 - v.b1 : v.b1 <= 270 ? v.b1 - 180 : 360 - v.b1;
      return [
        [step('M1', `${v.d1} ${'×'} sin ${ns}°`, `The angle between the path and the north–south line is ${ns}°; the east–west distance is opposite it.`), step('A1', `${roundFloatDp(Math.abs(e), 1)} km`, 'Calculator in degrees mode.')],
        [step('M1', `${v.d1} ${'×'} cos ${ns}°`, 'The north–south distance is next to (adjacent to) the angle.'), step('A1', `${roundFloatDp(Math.abs(n), 1)} km`, `Check: ${roundFloatDp(Math.abs(e), 1)}² + ${roundFloatDp(Math.abs(n), 1)}² ≈ ${v.d1}²`)],
      ];
    }
    const { dist, brg, angC } = stretchVals(v);
    return [
      [step('M1', `Angle $ABC = 90°$, so $AC^2 = ${v.d1}^2 + ${v.d2}^2$`, `The second bearing is 90° more than the first, so the turn at B is a right angle.`), step('A1', `${roundFloatDp(dist, 1)} km`, `√${v.d1 * v.d1 + v.d2 * v.d2} = ${tr(dist, 3)}…`)],
      [
        step('M1', `Angle $BCA = \\tan^{-1}\\left(\\frac{${v.d1}}{${v.d2}}\\right) = ${tr(angC, 2)}…°$`, 'Use the right-angled triangle ABC to find the angle at C.'),
        step('M1', `Bearing of $B$ from $C$ = ${three(back(v.b2))}°`, 'Back bearing of the second leg.'),
        step('A1', `${three(back(v.b2))}° − ${tr(angC, 2)}…° → ${three(Math.round(brg) % 360)}°`, 'A is anticlockwise from B as seen from C, so subtract (draw a sketch with north lines to check).'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    const num = (s: string) => parseFloat(s);
    if (v.level === 'foundational') {
      // Walk out on the bearing and back: the return direction is the reverse vector.
      for (const [b, ans] of [[v.b1, answers[0].text], [v.b2, answers[1].text]] as const) {
        const [e, n] = en(1, b);
        const [e2, n2] = en(1, num(ans));
        if (Math.abs(e + e2) > 1e-9 || Math.abs(n + n2) > 1e-9 || !/^\d{3}°$/.test(ans)) p.push('back bearing');
      }
      return p;
    }
    if (v.level === 'core') {
      const [e, n] = en(v.d1, v.b1);
      if (Math.abs(num(answers[0].text) - Math.abs(e)) > 0.05 + 1e-9 || Math.abs(num(answers[1].text) - Math.abs(n)) > 0.05 + 1e-9) p.push('components');
      return p;
    }
    const { dist, brg } = stretchVals(v);
    if (Math.abs(num(answers[0].text) - dist) > 0.05 + 1e-9) p.push('distance');
    // Bearing check via the angle at C from the cosine rule on the coordinates.
    const shown = num(answers[1].text);
    const diff = Math.abs(((shown - brg + 540) % 360) - 180);
    if (diff > 0.5 + 1e-9) p.push('bearing');
    return p;
  },

  key: (v) => `${v.b1}|${v.b2}|${v.d1}|${v.d2}`,
});
