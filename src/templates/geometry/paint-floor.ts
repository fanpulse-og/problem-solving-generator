import { defineTemplate } from '../../engine/types';
import { diagram, lines, part, single, step, text, DIV, MINUS, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, money } from '../../engine/format';
import { Q } from '../../engine/rational';
import { FLOOR_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 23 2F Q11 (stage floor from a triangle and a rectangle,
 * "does the stage manager have enough money?") and Set 24 2F Q14 (least
 * number of tins, total cost). Core and stretch use a trapezium-shaped plan
 * (rectangle + right-angled triangle) where the triangle's base has to be
 * found from the lengths given.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: (typeof FLOOR_CONTEXTS)[number];
  W: Q; // rectangle width (top edge)
  H: Q; // height
  T: Q; // triangle base (0 for foundational)
  cover: Q; // m² per container
  priceP: number; // pence per container
  coats: number;
  budgetP: number; // stretch
}

const area = (v: V) => v.W.mul(v.H).add(v.T.mul(v.H).div(2));
const tins = (v: V) => Number(area(v).mul(v.coats).div(v.cover).ceil());

export default defineTemplate<V>({
  id: 'geom-paint-floor',
  title: 'Floor plan: area, tins and cost',
  strand: 'Geometry & Measures',
  subtopic: 'Area & perimeter problems',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'measures',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const ctx = rng.pick(FLOOR_CONTEXTS);
    const friendly = calc === 'non-calc' || tier === 'KS3';
    const len = (lo: number, hi: number) => (friendly ? Q.of(rng.int(lo, hi)) : Q.of(rng.int(lo * 10, hi * 10), 10));
    const W = len(4, 14);
    const H = len(3, 10);
    const T = level === 'foundational' ? Q.of(0) : len(2, 8);
    const cover = friendly ? Q.of(rng.int(4, 12)) : Q.of(rng.pick(['1.8', '2.5', '3.2', '4.5', '5.5', '6.4', '7', '8.5']));
    const priceP = friendly ? rng.step(800, 3000, 50) : rng.step(990, 3990, 10);
    const coats = level === 'stretch' ? 2 : 1;
    const v: V = { level, ctx, W, H, T, cover, priceP, coats, budgetP: 0 };
    const exact = area(v).mul(coats).div(cover);
    ensure(!exact.isInt(), 'make rounding up matter');
    ensure(tins(v) >= 3 && tins(v) <= 25, 'sensible number of tins');
    if (friendly) ensure(area(v).isInt() || area(v).mul(2).isInt(), 'friendly area');
    if (level === 'stretch') {
      // Budget either just enough, or short — but always more than the cost of
      // (tins − 1), so rounding down gives the wrong conclusion.
      const cost = tins(v) * priceP;
      const enough = rng.chance(0.5);
      const step = friendly ? 500 : 100;
      v.budgetP = enough ? cost + rng.step(0, priceP - 1, step) : cost - rng.step(step, priceP - 1, step);
      ensure(v.budgetP > (tins(v) - 1) * priceP, 'budget must beat the round-down cost');
      ensure(v.budgetP % 100 === 0 || !friendly, 'whole-pound budget');
    }
    return v;
  },

  validate(v) {
    const p: string[] = [];
    if (!v.W.isPositive() || !v.H.isPositive() || v.T.lt(0)) p.push('lengths must be positive');
    if (v.level !== 'foundational' && !v.T.isPositive()) p.push('need a triangle');
    return p;
  },

  render(v) {
    const W = v.W.toNumber();
    const H = v.H.toNumber();
    const T = v.T.toNumber();
    const pts: [number, number][] = v.level === 'foundational' ? [[0, 0], [W, 0], [W, H], [0, H]] : [[0, 0], [W + T, 0], [W, H], [0, H]];
    const edgeLabels =
      v.level === 'foundational'
        ? [{ edge: 0, text: `${dec(v.W)} m` }, { edge: 3, text: `${dec(v.H)} m` }]
        : [{ edge: 0, text: `${dec(v.W.add(v.T))} m` }, { edge: 2, text: `${dec(v.W)} m` }, { edge: 3, text: `${dec(v.H)} m` }];
    const plan = diagram({ type: 'polygon', points: pts, edgeLabels, rightAngles: v.level === 'foundational' ? [0, 1, 2, 3] : [0, 3], notAccurate: true });
    const { ctx } = v;
    const product = [
      `One ${ctx.container} of ${ctx.product} ${ctx.covers} an area of ${dec(v.cover)} m²`,
      `One ${ctx.container} of ${ctx.product} costs ${money(v.priceP)}`,
    ];
    if (v.level === 'foundational') {
      return {
        stem: [text(`The diagram shows the plan of the floor of ${ctx.place}.`), plan, text(`The ${ctx.who} is going to ${ctx.job}.`)],
        parts: [
          part('a', 2, text('Work out the area of the floor.')),
          part('b', 2, text(product[0]), text(`${cap(ctx.product)} can only be bought in full ${ctx.containers}.`), text(`Work out the least number of ${ctx.containers} needed.`)),
        ],
      };
    }
    if (v.level === 'stretch') {
      return {
        stem: [
          text(`The diagram shows the plan of the floor of ${ctx.place}.`),
          plan,
          ...lines(`The ${ctx.who} is going to ${ctx.job}.`, `The floor needs 2 coats of ${ctx.product}.`, ...product, `${cap(ctx.product)} can only be bought in full ${ctx.containers}.`, `The ${ctx.who} has ${money(v.budgetP)} to spend.`),
        ],
        parts: [single(5, text(`Does the ${ctx.who} have enough money to buy enough ${ctx.containers}?`), text('Show your working clearly.'))],
      };
    }
    return {
      stem: [
        text(`The diagram shows the plan of the floor of ${ctx.place}.`),
        plan,
        ...lines(`The ${ctx.who} is going to ${ctx.job} with one coat of ${ctx.product}.`, ...product, `The ${ctx.who} buys the least possible number of ${ctx.containers}.`),
      ],
      parts: [single(5, text(`Work out the total cost of the ${ctx.containers} that the ${ctx.who} buys.`))],
    };
  },

  answer(v) {
    const n = tins(v);
    if (v.level === 'foundational') return [{ text: `${dec(area(v))} m²` }, { text: `${n} ${v.ctx.containers}` }];
    const cost = n * v.priceP;
    if (v.level === 'stretch') {
      return [{ text: cost <= v.budgetP ? `Yes: ${n} ${v.ctx.containers} cost ${money(cost)}, which is not more than ${money(v.budgetP)}` : `No: ${n} ${v.ctx.containers} cost ${money(cost)}, which is more than ${money(v.budgetP)}` }];
    }
    return [{ text: money(cost) }];
  },

  markScheme(v) {
    const A = area(v);
    const n = tins(v);
    const exact = A.mul(v.coats).div(v.cover);
    const tinStep = (code: 'M1' | 'P1') =>
      step(code, `${dec(A.mul(v.coats))} ${DIV} ${dec(v.cover)} = ${approx(exact)}`, `Divide the area by how much one ${v.ctx.container} covers.`);
    const roundUp = `${n} ${v.ctx.containers}`;
    if (v.level === 'foundational') {
      return [
        [step('M1', `${dec(v.W)} ${TIMES} ${dec(v.H)}`, 'Area of a rectangle is length × width.'), step('A1', `= ${dec(A)} m²`, 'Give the units: m².')],
        [tinStep('M1'), step('A1', roundUp, `Round UP: ${Number(exact.floor())} ${v.ctx.containers} would not be enough.`)],
      ];
    }
    const rect = v.W.mul(v.H);
    const tri = v.T.mul(v.H).div(2);
    const shapeSteps = [
      step('P1', `Rectangle: ${dec(v.W)} ${TIMES} ${dec(v.H)} = ${dec(rect)} m²`, 'Split the floor into a rectangle and a triangle.'),
      step('P1', `Triangle base: ${dec(v.W.add(v.T))} ${MINUS} ${dec(v.W)} = ${dec(v.T)}, area: ½ ${TIMES} ${dec(v.T)} ${TIMES} ${dec(v.H)} = ${dec(tri)} m²; total ${dec(A)} m²`, 'Find the missing base of the triangle first.'),
    ];
    const cost = n * v.priceP;
    if (v.level === 'stretch') {
      return [
        [
          step('P1', `Area = ${dec(rect)} + ${dec(tri)} = ${dec(A)} m²`, 'Rectangle plus triangle (find the triangle’s base by subtracting).'),
          step('P1', `2 coats: ${dec(A)} ${TIMES} 2 = ${dec(A.mul(2))} m², ${dec(A.mul(2))} ${DIV} ${dec(v.cover)} = ${approx(exact)}`, 'Two coats means covering the area twice.'),
          step('P1', roundUp, `Round up to whole ${v.ctx.containers}.`),
          step('P1', `${n} ${TIMES} ${money(v.priceP)} = ${money(cost)}`, 'Total cost of the tins.'),
          step('C1', cost <= v.budgetP ? `${money(cost)} ≤ ${money(v.budgetP)}, so yes, there is enough money` : `${money(cost)} > ${money(v.budgetP)}, so no, there is not enough money`, 'Compare and write a conclusion that uses your figures.'),
        ],
      ];
    }
    return [[...shapeSteps, { ...tinStep('P1'), working: `${tinStep('P1').working}, so ${roundUp}`, note: 'Divide by the area one tin covers and round UP.' }, step('P1', `${n} ${TIMES} ${money(v.priceP)}`, 'Multiply by the price of one.'), step('A1', money(cost), '')].map((s) => (s.note ? s : { ...s, note: 'Include the £ sign.' }))];
  },

  check(v, answers) {
    const p: string[] = [];
    // Area by the shoelace formula on the drawn vertices (independent of the split).
    const pts = v.level === 'foundational' ? [[Q.of(0), Q.of(0)], [v.W, Q.of(0)], [v.W, v.H], [Q.of(0), v.H]] : [[Q.of(0), Q.of(0)], [v.W.add(v.T), Q.of(0)], [v.W, v.H], [Q.of(0), v.H]];
    let s = Q.of(0);
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i];
      const [x2, y2] = pts[(i + 1) % pts.length];
      s = s.add(x1.mul(y2).sub(x2.mul(y1)));
    }
    const A = s.div(2);
    if (!A.eq(area(v))) p.push('area mismatch');
    // Smallest whole n with n × cover ≥ coats × area, by counting up.
    let n = 0;
    while (Q.of(n).mul(v.cover).lt(A.mul(v.coats))) n++;
    if (n !== tins(v)) p.push('tins mismatch');
    const last = answers[answers.length - 1].text;
    if (v.level === 'core' && last !== money(n * v.priceP)) p.push('cost');
    if (v.level === 'stretch' && !last.startsWith(n * v.priceP <= v.budgetP ? 'Yes' : 'No')) p.push('decision');
    if (v.level === 'foundational' && last !== `${n} ${v.ctx.containers}`) p.push('tins answer');
    return p;
  },

  key: (v) => `${v.W}|${v.H}|${v.T}|${v.cover}|${v.priceP}|${v.budgetP}`,
});

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
