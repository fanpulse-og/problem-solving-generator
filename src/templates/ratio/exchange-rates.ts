import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { dec, ensure, money, roundDp } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 2F Q27 / 2H Q7 (27 euros for 18 litres in Spain against
 * £40.80 for 8 gallons in Wales; €1 = £0.85 and 4.5 litres = 1 gallon). The
 * examiner report says the commonest error was dividing by 0.85 instead of
 * multiplying, so the notes spell out which way each conversion goes.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  other: string;
  rate: Q; // foundational / stretch: euros per £1
  pounds: number; // foundational: £ to change; stretch: £ to change
  euroPrice: Q; // foundational: item price in euros
  poundPrice: Q; // foundational: item price in pounds
  item: string;
  // core
  eur: Q; // euros paid in Spain
  litres: number;
  gbp: Q; // pounds paid in the UK
  gallons: number;
  eurToGbp: Q; // €1 = £…
  // stretch
  rateB: Q;
  commission: number; // % at bureau A
  fee: number; // £ fee at bureau B
}

/** Euros: whole amounts without cents (€152), otherwise 2 dp. */
const eur = (q: Q) => `€${q.isInt() ? dec(q) : dec(q, 2)}`;

const ITEMS = ['pair of trainers', 'jacket', 'watch', 'pair of headphones', 'rucksack'];

export default defineTemplate<V>({
  id: 'ratio-exchange-rates',
  title: 'Exchange rates and unit conversions',
  strand: 'Ratio & Proportion',
  subtopic: 'Compound measures & best buys',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'decide',
  calculator: 'calc',

  generate({ rng, level }) {
    const [name, other] = names(rng, 2);
    const base: V = { level, name, other, rate: Q.of(0), pounds: 0, euroPrice: Q.of(0), poundPrice: Q.of(0), item: '', eur: Q.of(0), litres: 0, gbp: Q.of(0), gallons: 0, eurToGbp: Q.of(0), rateB: Q.of(0), commission: 0, fee: 0 };
    if (level === 'foundational') {
      const rate = Q.of(rng.int(108, 125), 100);
      const pounds = rng.step(150, 900, 50);
      const poundPrice = Q.of(rng.int(30, 160));
      // The euro price is within 3–15% of the pound price converted, either side.
      const conv = poundPrice.mul(rate).toNumber();
      const euroPrice = Q.of(Math.round(conv * rng.pick([0.85, 0.9, 0.95, 1.05, 1.1, 1.15])));
      ensure(Math.abs(euroPrice.toNumber() - conv) / conv >= 0.03, 'a clear difference');
      return { ...base, rate, pounds, euroPrice, poundPrice, item: rng.pick(ITEMS) };
    }
    if (level === 'core') {
      const eurToGbp = Q.of(rng.int(80, 92), 100);
      const litres = rng.int(10, 45);
      const gallons = rng.int(5, 12);
      const eurPerLitre = Q.of(rng.int(140, 190), 100);
      const gbpPerLitreSpain = eurPerLitre.mul(eurToGbp);
      const gbpPerLitreUK = Q.of(Math.round(gbpPerLitreSpain.toNumber() * rng.pick([0.9, 0.94, 1.06, 1.1]) * 100), 100);
      const eur = eurPerLitre.mul(litres);
      const gbp = Q.of(Math.round(gbpPerLitreUK.mul(gallons).mul(Q.of(9, 2)).toNumber() * 100), 100);
      ensure(eur.terminatesWithin(2) && gbp.terminatesWithin(2), 'prices in whole cents and pence');
      const ukPerLitre = gbp.div(Q.of(gallons * 9, 2));
      ensure(Math.abs(ukPerLitre.toNumber() / gbpPerLitreSpain.toNumber() - 1) >= 0.03, 'a clear difference');
      return { ...base, eur, litres, gbp, gallons, eurToGbp };
    }
    const pounds = rng.step(300, 1500, 100);
    const rate = Q.of(rng.int(110, 122), 100);
    const commission = rng.pick([1, 2, 3, 4]);
    const rateB = rate.add(Q.of(rng.int(1, 4), 100));
    const fee = rng.step(4, 15, 1);
    const a = euros(pounds * (1 - commission / 100), rate);
    const b = euros(pounds - fee, rateB);
    ensure(!a.eq(b) && Math.abs(a.sub(b).toNumber()) >= 1, 'a difference of at least €1');
    return { ...base, pounds, rate, rateB, commission, fee };
  },

  validate(v) {
    return v.level === 'stretch' && v.rateB.lt(v.rate) ? ['bureau B rate'] : [];
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: [text(`The exchange rate is £1 = €${dec(v.rate, 2)}`)],
        parts: [
          part('a', 2, text(`${v.name} changes ${money(v.pounds * 100)} into euros.`), text('How many euros does she get?'.replace('she', v.name))),
          part('b', 3, text(`A ${v.item} costs ${eur(v.euroPrice)} in Paris.`), text(`The same ${v.item} costs ${money(v.poundPrice.mul(100).toInt())} in London.`), text('In which city is the ' + v.item + ' cheaper?'), text('You must show how you get your answer.')),
        ],
      };
    }
    if (v.level === 'core') {
      return {
        stem: lines(`In Spain, ${v.name} pays ${dec(v.eur, 2)} euros for ${v.litres} litres of petrol.`, `In Wales, ${v.other} pays ${money(v.gbp.mul(100).toInt(), true)} for ${v.gallons} gallons of the same type of petrol.`, `€1 = £${dec(v.eurToGbp, 2)}`, '4.5 litres = 1 gallon', `${v.name} thinks that petrol is cheaper in Spain than in Wales.`),
        parts: [single(4, text(`Is ${v.name} correct?`), text('You must show how you get your answer.'))],
      };
    }
    return {
      stem: lines(`${v.name} wants to change ${money(v.pounds * 100)} into euros.`, `Bureau A: £1 = €${dec(v.rate, 2)}, and charges ${v.commission}% commission on the pounds changed.`, `Bureau B: £1 = €${dec(v.rateB, 2)}, and charges a fixed fee of £${v.fee}, taken from the pounds before they are changed.`),
      parts: [single(4, text(`Which bureau gives ${v.name} more euros, and how many more?`), text('You must show all your working.'))],
    };
  },

  answer(v) {
    if (v.level === 'foundational') {
      const conv = v.poundPrice.mul(v.rate);
      const paris = v.euroPrice.lt(conv);
      return [{ text: `€${dec(v.rate.mul(v.pounds), 2)}` }, { text: `${paris ? 'Paris' : 'London'} (${money(v.poundPrice.mul(100).toInt())} = €${dec(conv, 2)}${conv.terminatesWithin(2) ? '' : '…'})`.replace(/€(\d+\.\d{2})\d*…/, '€$1…') }];
    }
    if (v.level === 'core') {
      const spain = spainPerLitre(v);
      const wales = walesPerLitre(v);
      const yes = spain.lt(wales);
      return [{ text: `${yes ? 'Yes' : 'No'}: Spain £${roundDp(spain, 3)} per litre, Wales £${roundDp(wales, 3)} per litre` }];
    }
    const a = euros(v.pounds * (1 - v.commission / 100), v.rate);
    const b = euros(v.pounds - v.fee, v.rateB);
    return [{ text: `Bureau ${a.gt(b) ? 'A' : 'B'}, by €${dec(a.sub(b).toNumber() > 0 ? a.sub(b) : b.sub(a), 2)} (A: €${dec(a, 2)}, B: €${dec(b, 2)})` }];
  },

  markScheme(v) {
    if (v.level === 'foundational') {
      const conv = v.poundPrice.mul(v.rate);
      return [
        [step('M1', `${v.pounds} ${TIMES} ${dec(v.rate, 2)}`, 'Pounds to euros: multiply by the rate (you get more euros than pounds).'), step('A1', `€${dec(v.rate.mul(v.pounds), 2)}`, 'Money to 2 decimal places.')],
        [
          step('M1', `${dec(v.poundPrice)} ${TIMES} ${dec(v.rate, 2)} = €${roundDp(conv, 2)}`, 'Change one price so both are in the same currency.'),
          step('A1', `€${roundDp(conv, 2)} and ${eur(v.euroPrice)}`, 'Now the two prices can be compared.'),
          step('C1', v.euroPrice.lt(conv) ? 'Paris' : 'London', 'Give a conclusion that matches your numbers.'),
        ],
      ];
    }
    if (v.level === 'core') {
      const spain = spainPerLitre(v);
      const wales = walesPerLitre(v);
      return [
        [
          step('M1', `${dec(v.eur, 2)} ${TIMES} ${dec(v.eurToGbp, 2)} = £${roundDp(v.eur.mul(v.eurToGbp), 2)} for ${v.litres} litres`, `Euros to pounds: €1 is worth £${dec(v.eurToGbp, 2)}, so MULTIPLY by ${dec(v.eurToGbp, 2)}.`),
          step('M1', `${v.gallons} ${TIMES} 4.5 = ${dec(Q.of(v.gallons * 9, 2))} litres`, 'Gallons to litres, so both are in the same units.'),
          step('M1', `Spain: £${roundDp(spain, 3)} per litre; Wales: ${dec(v.gbp, 2)} ${DIV} ${dec(Q.of(v.gallons * 9, 2))} = £${roundDp(wales, 3)} per litre`, 'Cost of ONE litre in each country (or the cost of the same amount).'),
          step('C1', spain.lt(wales) ? 'Yes, petrol is cheaper in Spain' : 'No, petrol is cheaper in Wales', 'A conclusion with the values that support it.'),
        ],
      ];
    }
    const a = euros(v.pounds * (1 - v.commission / 100), v.rate);
    const b = euros(v.pounds - v.fee, v.rateB);
    const afterA = v.pounds * (1 - v.commission / 100);
    return [
      [
        step('P1', `A: ${v.commission}% of ${money(v.pounds * 100)} = ${money(v.pounds * v.commission)}, so ${dec(Q.of(afterA * 100, 100))} ${TIMES} ${dec(v.rate, 2)} = €${dec(a, 2)}`, 'Take off the commission first, then change the rest.'),
        step('P1', `B: ${v.pounds} − ${v.fee} = ${v.pounds - v.fee}, ${v.pounds - v.fee} ${TIMES} ${dec(v.rateB, 2)} = €${dec(b, 2)}`, 'Take off the fee, then change the rest at the better rate.'),
        step('P1', `€${dec(a.gt(b) ? a : b, 2)} − €${dec(a.gt(b) ? b : a, 2)}`, 'Find the difference.'),
        step('A1', `Bureau ${a.gt(b) ? 'A' : 'B'}, €${dec(a.gt(b) ? a.sub(b) : b.sub(a), 2)} more`, a.gt(b) ? 'Bureau B has the better rate, but its charge makes it the worse deal.' : 'Compare the euros actually received, after the charges.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      if (answers[0].text !== `€${dec(v.rate.mul(v.pounds), 2)}`) p.push('euros');
      // Compare in pounds instead: euro price ÷ rate.
      const parisInPounds = v.euroPrice.div(v.rate);
      if (answers[1].text.startsWith('Paris') !== parisInPounds.lt(v.poundPrice)) p.push('cheaper city');
      return p;
    }
    if (v.level === 'core') {
      // Compare the price of a gallon instead.
      const spainGallon = v.eur.div(v.litres).mul(Q.of(9, 2)).mul(v.eurToGbp);
      const walesGallon = v.gbp.div(v.gallons);
      if (answers[0].text.startsWith('Yes') !== spainGallon.lt(walesGallon)) p.push('decision');
      return p;
    }
    // Work in pence and cents to avoid any rounding.
    const aCents = Q.of(v.pounds * (100 - v.commission)).mul(v.rate);
    const bCents = Q.of((v.pounds - v.fee) * 100).mul(v.rateB);
    const better = aCents.gt(bCents) ? 'A' : 'B';
    const diff = aCents.sub(bCents).toNumber();
    if (!answers[0].text.startsWith(`Bureau ${better}, by €${(Math.abs(diff) / 100).toFixed(2)}`)) p.push('bureau');
    return p;
  },

  key: (v) => `${v.rate}|${v.pounds}|${v.euroPrice}|${v.poundPrice}|${v.eur}|${v.litres}|${v.gbp}|${v.gallons}|${v.eurToGbp}|${v.rateB}|${v.commission}|${v.fee}`,
});

function euros(pounds: number, rate: Q): Q {
  return Q.of(Math.round(pounds * 100), 100).mul(rate);
}
const spainPerLitre = (v: V) => v.eur.mul(v.eurToGbp).div(v.litres);
const walesPerLitre = (v: V) => v.gbp.div(Q.of(v.gallons * 9, 2));
