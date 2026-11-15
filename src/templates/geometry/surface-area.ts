import { defineTemplate } from '../../engine/types';
import { single, step, text, TIMES } from '../../engine/blocks';
import { dec, ensure, int, roundFloatDp, roundFloatSf } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Surface area: a cuboid (Practice), a closed cylinder (Apply), and painting
 * the side and top of a cylindrical tank, then buying whole tins (Extend).
 * check() adds the faces one at a time, or uses the factorised formula.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  // cuboid l × w × h (cm); cylinder radius r and height h, in tenths
  l: number;
  w: number;
  h: number;
  r: number;
  cover: number; // m² per litre
  tin: number; // litres per tin
}

const CUBOIDS = ['A box', 'A wooden block', 'A storage crate', 'A brick'];
const rr = (v: V) => v.r / 10;
const hh = (v: V) => v.h / 10;
const cylinder = (v: V) => 2 * Math.PI * rr(v) * rr(v) + 2 * Math.PI * rr(v) * hh(v);
/** Curved surface and top only. */
const tank = (v: V) => Math.PI * rr(v) * rr(v) + 2 * Math.PI * rr(v) * hh(v);
const tins = (v: V) => Math.ceil(tank(v) / v.cover / v.tin);
const tenths = (n: number) => dec(Q.of(n, 10));

export default defineTemplate<V>({
  id: 'geom-surface-area',
  title: 'Surface area of cuboids and cylinders',
  strand: 'Geometry & Measures',
  subtopic: 'Volume & surface area',
  tiers: ['KS3', 'F', 'H'],
  levelsByTier: { KS3: ['foundational'] },
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'measures' },
  calculator: 'calc',

  generate({ rng, level }) {
    const [name] = names(rng, 1);
    const base: V = { level, name, l: 0, w: 0, h: 0, r: 0, cover: 0, tin: 0 };
    if (level === 'foundational') {
      const [h, w, l] = rng.sample([2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20], 3).sort((x, y) => x - y);
      return { ...base, l, w, h, r: rng.int(0, CUBOIDS.length - 1) };
    }
    if (level === 'core') {
      const v = { ...base, r: rng.int(2, 9) * 10 + rng.pick([0, 5]), h: rng.int(5, 20) * 10 };
      ensure(v.h > v.r && !/\.\d*0$/.test(roundFloatSf(cylinder(v), 3)), 'a tidy answer');
      return v;
    }
    const v = { ...base, r: rng.int(8, 25), h: rng.int(15, 40), cover: rng.pick([8, 10, 12]), tin: rng.pick([1, 2.5]) };
    const need = tank(v) / v.cover / v.tin;
    ensure(tins(v) >= 2 && tins(v) <= 8 && need - Math.floor(need) > 0.08 && need - Math.floor(need) < 0.92, 'clearly between two whole numbers of tins');
    roundFloatDp(tank(v), 2);
    return v;
  },

  validate(v) {
    return v.h > 0 ? [] : ['positive height'];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`${CUBOIDS[v.r]} is in the shape of a cuboid.`), text(`The cuboid is ${v.l} cm long, ${v.w} cm wide and ${v.h} cm high.`)],
        parts: [single(3, text('Work out the total surface area of the cuboid.'))],
      };
    }
    if (v.level === 'core') {
      return {
        stem: [text(`A solid cylinder has radius ${tenths(v.r)} cm and height ${tenths(v.h)} cm.`)],
        parts: [single(4, text('Work out the total surface area of the cylinder.'), text('Give your answer correct to 3 significant figures.'))],
      };
    }
    return {
      stem: [
        text(`A water tank is in the shape of a cylinder with radius ${tenths(v.r)} m and height ${tenths(v.h)} m.`),
        text(`${v.name} is going to paint the curved surface and the circular top of the tank.`),
        text(`1 litre of paint covers ${v.cover} m²`),
        text(`The paint is sold in tins. Each tin holds ${dec(Q.of(Math.round(v.tin * 10), 10))} litres of paint.`),
      ],
      parts: [single(5, text(`Work out the number of tins of paint ${v.name} needs to buy.`), text('You must show all your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') return [{ text: `${int(2 * (v.l * v.w + v.l * v.h + v.w * v.h))} cm²` }];
    if (v.level === 'core') return [{ text: `${roundFloatSf(cylinder(v), 3)} cm²` }];
    return [{ text: `${tins(v)} tins` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const [a, b, c] = [v.l * v.w, v.l * v.h, v.w * v.h];
      return [
        [
          step('M1', `${v.l} ${TIMES} ${v.w} = ${a}, ${v.l} ${TIMES} ${v.h} = ${b}, ${v.w} ${TIMES} ${v.h} = ${c}`, 'A cuboid has three different faces. Find the area of each.'),
          step('M1', `2 ${TIMES} (${a} + ${b} + ${c})`, 'There are two of each face: top and bottom, front and back, and the two ends.'),
          step('A1', `${int(2 * (a + b + c))} cm²`, 'Area is measured in square units.'),
        ],
      ];
    }
    const [r, h] = [tenths(v.r), tenths(v.h)];
    if (v.level === 'core') {
      return [
        [
          step('M1', `$\\pi \\times ${r}^2 = ${roundFloatDp(Math.PI * rr(v) ** 2, 3)}…$`, 'The top and the bottom are circles: area = πr².'),
          step('M1', `$2 \\times \\pi \\times ${r} \\times ${h} = ${roundFloatDp(2 * Math.PI * rr(v) * hh(v), 3)}…$`, 'The curved surface unrolls into a rectangle: circumference × height.'),
          step('M1', `$2 \\times ${roundFloatDp(Math.PI * rr(v) ** 2, 3)}… + ${roundFloatDp(2 * Math.PI * rr(v) * hh(v), 3)}…$`, 'Two circles and the curved surface.'),
          step('A1', `${roundFloatSf(cylinder(v), 3)} cm²`, 'Round only at the end.'),
        ],
      ];
    }
    const litres = tank(v) / v.cover;
    return [
      [
        step('M1', `$2 \\times \\pi \\times ${r} \\times ${h} = ${roundFloatDp(2 * Math.PI * rr(v) * hh(v), 2)}…$`, 'Curved surface: circumference × height.'),
        step('M1', `$\\pi \\times ${r}^2 = ${roundFloatDp(Math.PI * rr(v) ** 2, 2)}…$, total ${roundFloatDp(tank(v), 2)}… m²`, 'Add ONE circle for the top. The base is not painted.'),
        step('M1', `${roundFloatDp(tank(v), 2)}… ÷ ${v.cover} = ${roundFloatDp(litres, 2)}… litres`, 'Divide the area by the area that one litre covers.'),
        step('M1', `${roundFloatDp(litres, 2)}… ÷ ${dec(Q.of(Math.round(v.tin * 10), 10))} = ${roundFloatDp(litres / v.tin, 2)}…`, 'Divide by the size of a tin.'),
        step('A1', `${tins(v)} tins`, 'Round UP: part of a tin cannot be bought, and rounding down would leave some unpainted.'),
      ],
    ];
  },

  check(v, answers) {
    const n = Number(/^[\d ]+(?:\.\d+)?/.exec(answers[0].text)?.[0].replace(/ /g, ''));
    if (v.level === 'foundational') {
      // Add the six faces one at a time.
      let total = 0;
      for (const [p, q] of [[v.l, v.w], [v.l, v.w], [v.l, v.h], [v.l, v.h], [v.w, v.h], [v.w, v.h]]) total += p * q;
      return n === total ? [] : ['surface area'];
    }
    if (v.level === 'core') {
      const want = 2 * Math.PI * rr(v) * (rr(v) + hh(v)); // factorised form
      return Math.abs(n - want) <= want * 0.006 ? [] : ['surface area'];
    }
    // The stated number of tins is enough, and one fewer is not.
    const area = Math.PI * rr(v) * (rr(v) + 2 * hh(v));
    const covers = (k: number) => k * v.tin * v.cover;
    return covers(n) >= area && covers(n - 1) < area ? [] : ['tins'];
  },

  key: (v) => `${v.level}|${v.l}|${v.w}|${v.h}|${v.r}|${v.cover}|${v.tin}`,
});
