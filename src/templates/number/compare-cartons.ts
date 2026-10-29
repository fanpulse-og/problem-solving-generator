import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, table, text, TIMES, DIV, MINUS } from '../../engine/blocks';
import { dec, ensure, int, ratio } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';
import { SQUASH_FLAVOURS } from '../../contexts/scenarios';

/**
 * Modelled on Set 23 2F Q2 (cartons of orange squash): the same quantity is
 * described two different ways (a percentage vs an amount of water) and must be
 * compared. Stretch asks which carton has the greater PROPORTION of juice, where
 * the bigger carton has more juice but a smaller proportion.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  flavour: string;
  volP: number;
  pctP: number;
  volQ: number;
  juiceQ: number; // core/foundational
  ratioQ: [number, number]; // stretch: juice : water
}

const VOLS = {
  KS3: [200, 500, 1000],
  'non-calc': [200, 250, 300, 400, 500, 750, 1000],
  calc: [250, 330, 375, 450, 500, 750, 1500],
};
const RATIOS: [number, number][] = [
  [1, 3],
  [1, 4],
  [2, 3],
  [3, 5],
  [1, 9],
  [3, 7],
  [1, 7],
  [2, 5],
  [3, 17],
];

function juiceP(v: V): Q {
  return Q.of(v.pctP, 100).mul(v.volP);
}

export default defineTemplate<V>({
  id: 'num-compare-cartons',
  title: 'Comparing two mixtures',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, tier, level, calc }) {
    const [name] = names(rng, 1);
    const vols = tier === 'KS3' ? VOLS.KS3 : VOLS[calc];
    const volP = rng.pick(vols);
    const pctP = tier === 'KS3' ? rng.step(10, 40, 10) : calc === 'non-calc' ? rng.step(10, 45, 5) : rng.int(8, 48);
    ensure(Q.of(pctP * volP, 100).isInt(), 'juice in P must be whole ml');
    const volQ = rng.pick(vols);
    let juiceQ = 0;
    let ratioQ: [number, number] = [1, 1];
    if (level === 'stretch') {
      ratioQ = rng.pick(RATIOS);
      const fracQ = Q.of(ratioQ[0], ratioQ[0] + ratioQ[1]);
      ensure(Q.of(volQ).mul(fracQ).isInt(), 'ratio must split carton Q into whole ml');
      const propP = Q.of(pctP, 100);
      ensure(propP.sub(fracQ).mul(100).toNumber() !== 0 && Math.abs(propP.sub(fracQ).mul(100).toNumber()) >= 2, 'proportions too close');
      // Trap: the carton with more juice has the SMALLER proportion.
      const jP = propP.mul(volP);
      const jQ = fracQ.mul(volQ);
      ensure(jP.cmp(jQ) !== 0 && jP.cmp(jQ) !== propP.cmp(fracQ), 'want the bigger volume to be the smaller proportion');
    } else {
      const step = calc === 'non-calc' || tier === 'KS3' ? 10 : 5;
      juiceQ = rng.step(Math.ceil(volQ * 0.1), Math.floor(volQ * 0.5), step);
      ensure(juiceQ !== juiceP({ pctP, volP } as V).toNumber(), 'cartons must differ');
    }
    return { level, name, flavour: rng.pick(SQUASH_FLAVOURS), volP, pctP, volQ, juiceQ, ratioQ };
  },

  validate(v) {
    const p: string[] = [];
    if (!juiceP(v).isInt()) p.push('P juice not whole');
    if (v.level !== 'stretch' && (v.juiceQ <= 0 || v.juiceQ >= v.volQ)) p.push('Q juice out of range');
    return p;
  },

  render(v) {
    const juice = `${v.flavour} juice`;
    const descP = `Total volume of ${v.flavour} squash is\n${int(v.volP)} millilitres\n${v.pctP}% of the total volume is ${juice}\nand the remainder is water`;
    const descQ =
      v.level === 'stretch'
        ? `Total volume of ${v.flavour} squash is\n${int(v.volQ)} millilitres\n${juice} : water = ${ratio(...v.ratioQ)}`
        : `Total volume of ${v.flavour} squash is\n${int(v.volQ)} millilitres\n${int(v.volQ - v.juiceQ)} millilitres of the total volume is water\nand the remainder is ${juice}`;
    const stem = [
      ...lines(
        `${capital(v.flavour)} squash is made from ${juice} and water.`,
        `${v.name} has two different cartons of ${v.flavour} squash, carton P and carton Q.`,
        'The table gives information about the two cartons.',
      ),
      table({ header: ['Carton P', 'Carton Q'], rows: [[descP, descQ]] }),
    ];
    if (v.level === 'stretch') {
      return {
        stem,
        parts: [single(3, text(`Which carton has the greater proportion of ${juice}?`), text('You must show how you get your answer.'))],
      };
    }
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [
          part('a', 2, text(`Work out the volume of ${juice} in carton P.`)),
          part('b', 1, text(`Work out the volume of ${juice} in carton Q.`)),
          part('c', 1, text(`Work out the difference in the volume of ${juice} in carton P and the volume of ${juice} in carton Q.`)),
        ],
      };
    }
    return {
      stem,
      parts: [single(3, text(`Work out the difference in the volume of ${juice} in carton P and the volume of ${juice} in carton Q.`))],
    };
  },

  answer(v) {
    if (v.level === 'stretch') {
      const pQ = Q.of(v.ratioQ[0], v.ratioQ[0] + v.ratioQ[1]).mul(100);
      const winner = Q.of(v.pctP).gt(pQ) ? 'P' : 'Q';
      return [{ text: `Carton ${winner} (P is ${v.pctP}% juice, Q is ${dec(pQ)}% juice)` }];
    }
    const jP = juiceP(v).toInt();
    const diff = Math.abs(jP - v.juiceQ);
    if (v.level === 'foundational') return [{ text: `${int(jP)} ml` }, { text: `${int(v.juiceQ)} ml` }, { text: `${int(diff)} ml` }];
    return [{ text: `${int(diff)} ml` }];
  },

  markScheme(v) {
    const jP = juiceP(v).toInt();
    const pStep = `${v.pctP}% of ${int(v.volP)} = ${v.pctP} ${DIV} 100 ${TIMES} ${int(v.volP)} = ${int(jP)} ml`;
    if (v.level === 'stretch') {
      const [a, b] = v.ratioQ;
      const pQ = Q.of(a, a + b).mul(100);
      const winner = Q.of(v.pctP).gt(pQ) ? 'P' : 'Q';
      return [
        [
          step('P1', `Carton Q: ${a} + ${b} = ${a + b} parts, juice is $\\frac{${a}}{${a + b}}$ = ${dec(pQ)}%`, 'Turn the ratio into a fraction of the whole carton, then a percentage.'),
          step('P1', `Carton P: ${v.pctP}%   Carton Q: ${dec(pQ)}%`, 'Compare like with like. The volumes of the cartons don’t matter for a proportion.'),
          step('C1', `${v.pctP}% ${Q.of(v.pctP).gt(pQ) ? '>' : '<'} ${dec(pQ)}%, so carton ${winner} has the greater proportion`, 'Write a clear conclusion that uses your figures.'),
        ],
      ];
    }
    const water = v.volQ - v.juiceQ;
    const qStep = `${int(v.volQ)} ${MINUS} ${int(water)} = ${int(v.juiceQ)} ml`;
    const diff = Math.abs(jP - v.juiceQ);
    const dStep = `${int(Math.max(jP, v.juiceQ))} ${MINUS} ${int(Math.min(jP, v.juiceQ))} = ${int(diff)} ml`;
    if (v.level === 'foundational') {
      return [
        [step('M1', `${v.pctP} ${DIV} 100 ${TIMES} ${int(v.volP)}`, `To find ${v.pctP}%, divide by 100 and multiply by ${v.pctP}.`), step('A1', `= ${int(jP)} ml`, 'Give the units.')],
        [step('B1', qStep, 'The juice is whatever isn’t water.')],
        [step('B1', dStep, 'Take the smaller amount from the larger.')],
      ];
    }
    return [
      [
        step('P1', pStep, 'Find the juice in carton P from the percentage.'),
        step('P1', qStep, 'For carton Q, the juice is the total take away the water.'),
        step('A1', dStep, 'Difference means bigger minus smaller.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Water + juice must make the total in each carton.
    const jP = juiceP(v);
    if (!jP.add(Q.of(100 - v.pctP, 100).mul(v.volP)).eq(v.volP)) p.push('P does not add up');
    if (v.level === 'stretch') {
      const [a, b] = v.ratioQ;
      // Compare by cross-multiplying, no percentages.
      const cmpCross = Math.sign(v.pctP * (a + b) - 100 * a);
      if (cmpCross === 0) p.push('proportions equal');
      if (!answers[0].text.startsWith(`Carton ${cmpCross > 0 ? 'P' : 'Q'} `)) p.push('wrong carton');
    } else {
      if (v.juiceQ === jP.toInt()) p.push('cartons equal');
      const diff = Math.abs(v.pctP * v.volP - 100 * v.juiceQ) / 100;
      if (answers[answers.length - 1].text !== `${int(diff)} ml`) p.push('difference wrong');
    }
    return p;
  },

  key: (v) => `${v.volP}|${v.pctP}|${v.volQ}|${v.juiceQ}|${v.ratioQ}`,
});

function capital(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
