import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text, DIV, TIMES } from '../../engine/blocks';
import { approx, dec, ensure, int, stdForm, stdParts } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 23 1H Q8 (work out (a × 10^p) × (b × 10^q) in standard
 * form), Set 22 2F Q24 (red blood cells in an adult) and Set 24 2H Q9 (hard
 * drive capacity in terabytes against file sizes). Every value is an exact
 * rational, so the standard form shown is never a floating-point artefact.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  calc: boolean;
  ctx: number;
  a: Q; // mantissas (1 ≤ a < 10)
  b: Q;
  p: number; // powers
  q: number;
  claim: number; // stretch photos: the number claimed
}

const SF = (m: Q, e: number) => `${dec(m)} \\times 10^{${e}}`;
const pow10 = (e: number) => (e >= 0 ? Q.of(10n ** BigInt(e)) : Q.of(1n, 10n ** BigInt(-e)));
const val = (m: Q, e: number) => m.mul(pow10(e));
const tenths = (lo: number, hi: number, rng: { int(a: number, b: number): number }) => Q.of(rng.int(lo * 10, hi * 10), 10);

// Core contexts: the answer is a × b or a ÷ b of the two given values.
const CORE = [
  {
    op: 'mul' as const,
    stem: (a: string, b: string) => [`There are about $${a}$ red blood cells in 1 mm³ of blood.`, `An adult has about $${b}$ mm³ of blood.`],
    ask: 'Work out an estimate for the number of red blood cells in the body of an adult.',
    note: 'Number of cells = cells in 1 mm³ × number of mm³.',
    range: { a: [4, 6], p: [6, 6], b: [4, 6], q: [6, 6] },
  },
  {
    op: 'mul' as const,
    stem: (a: string, b: string) => [`Light travels $${a}$ km in one second.`, `Light from a star takes $${b}$ seconds to reach the Earth.`],
    ask: 'Work out the distance, in km, from the star to the Earth.',
    note: 'Distance = speed × time.',
    range: { a: [3, 3], p: [5, 5], b: [1, 9], q: [8, 10] },
  },
  {
    op: 'div' as const,
    stem: (a: string, b: string) => [`The total mass of a sample of bacteria is $${a}$ grams.`, `The mass of one bacterium is $${b}$ grams.`],
    ask: 'Work out the number of bacteria in the sample.',
    note: 'Number = total mass ÷ mass of one.',
    range: { a: [1, 9], p: [-6, -4], b: [1, 9], q: [-13, -11] },
  },
];

export default defineTemplate<V>({
  id: 'num-standard-form',
  title: 'Standard form in context',
  strand: 'Number',
  subtopic: 'Standard form',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'measures' },
  calculator: 'either',

  generate({ rng, level, calc, tier }) {
    const [name] = names(rng, 1);
    const isCalc = calc === 'calc';
    const base: V = { level, name, calc: isCalc, ctx: 0, a: Q.of(1), b: Q.of(1), p: 0, q: 0, claim: 0 };
    if (level === 'foundational') {
      // A × B and A + B, with powers close enough to add by hand.
      const a = tenths(1.1, 9.9, rng);
      const b = isCalc ? tenths(1.1, 9.9, rng) : Q.of(rng.int(2, 9));
      const p = tier === 'H' ? rng.int(-4, 8) : rng.int(3, 8);
      const q = p - rng.int(1, 2);
      ensure(p !== 0 && q !== 0 && q !== 1 && p !== 1, 'powers worth writing');
      ensure(!a.isInt(), 'a has a decimal part');
      return { ...base, a, b, p, q };
    }
    if (level === 'core') {
      const ctx = rng.int(0, CORE.length - 1);
      const c = CORE[ctx];
      const r = c.range;
      const p = rng.int(r.p[0], r.p[1]);
      const q = rng.int(r.q[0], r.q[1]);
      if (c.op === 'mul') {
        const a = r.a[0] === r.a[1] ? Q.of(r.a[0]) : isCalc ? tenths(r.a[0], r.a[1], rng) : Q.of(rng.pick([40, 45, 50, 55]), 10);
        const b = isCalc ? tenths(r.b[0], r.b[1], rng) : Q.of(rng.int(r.b[0] * 2, r.b[1] * 2), 2);
        ensure(b.cmp(1) >= 0 && b.lt(10), 'b in standard form');
        return { ...base, ctx, a, b, p, q };
      }
      // Division: build the count first so the answer is exact.
      const b = isCalc ? tenths(1.1, 9.9, rng) : rng.pick([Q.of(2), Q.of(4), Q.of(5), Q.of(8), Q.of(15, 10), Q.of(25, 10)]);
      ensure(b.cmp(1) >= 0 && b.lt(10), 'b in standard form');
      const count = isCalc ? tenths(1.1, 9.9, rng) : Q.of(rng.int(2, 9));
      const { m, e } = stdParts(count.mul(b));
      return { ...base, ctx, a: m, b, p: e + q + rng.int(6, 8), q };
    }
    // Stretch: hard drive (decide) or grains of sand (unit conversion).
    const ctx = rng.int(0, 1);
    if (ctx === 0) {
      const tb = isCalc ? tenths(1, 8, rng) : Q.of(rng.pick([1, 2, 4, 5, 8]));
      const mb = isCalc ? tenths(2, 9.5, rng) : rng.pick([Q.of(2), Q.of(4), Q.of(5), Q.of(8), Q.of(25, 10), Q.of(125, 100)]);
      ensure(mb.cmp(1) >= 0 && mb.lt(10) && tb.cmp(1) >= 0, 'standard-form sizes');
      ensure(!tb.eq(1), 'plural terabytes');
      const photos = tb.mul(pow10(6)).div(mb).floor();
      // The claim is a round number within 15% of the truth, on either side.
      const claim = Number(photos) * rng.pick([0.88, 0.92, 1.06, 1.12]);
      const round = 10 ** (Math.floor(Math.log10(claim)) - 1);
      const c = Math.round(claim / round) * round;
      ensure(c !== Number(photos), 'claim differs from the truth');
      return { ...base, ctx, a: tb, b: mb, p: 12, q: 6, claim: c };
    }
    const w = isCalc ? tenths(1, 25, rng) : Q.of(rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25]));
    const m = isCalc ? Q.of(rng.int(11, 99), 10) : rng.pick([Q.of(2), Q.of(4), Q.of(5), Q.of(8), Q.of(25, 10), Q.of(16, 10), Q.of(125, 100)]);
    ensure(m.cmp(1) >= 0 && m.lt(10), 'grain mass in standard form');
    return { ...base, ctx, a: w, b: m, p: 0, q: rng.pick([-3, -4]) };
  },

  validate(v) {
    const p: string[] = [];
    if (v.a.isPositive() !== true || v.b.isPositive() !== true) p.push('positive');
    return p;
  },

  render(v) {
    if (v.level === 'foundational') {
      return {
        stem: lines(`$A = ${SF(v.a, v.p)}$`, `$B = ${SF(v.b, v.q)}$`),
        parts: [
          part('a', 2, text('Work out $A \\times B$'), text('Give your answer in standard form.')),
          part('b', 2, text('Work out $A + B$'), text('Give your answer in standard form.')),
        ],
      };
    }
    if (v.level === 'core') {
      const c = CORE[v.ctx];
      return { stem: lines(...c.stem(SF(v.a, v.p), SF(v.b, v.q))), parts: [single(3, text(c.ask), text('Give your answer in standard form.'))] };
    }
    if (v.ctx === 0) {
      return {
        stem: lines(`${v.name} has a hard drive that can store ${dec(v.a)} terabytes of data.`, '1 terabyte = $10^{12}$ bytes', `Each photo that ${v.name} takes needs $${SF(v.b, 6)}$ bytes of storage.`, `${v.name} says, “I can store more than ${int(v.claim)} photos on my hard drive.”`),
        parts: [single(4, text(`Is ${v.name} right?`), text('You must show how you get your answer.'))],
      };
    }
    return {
      stem: lines(`A bag of sand has a mass of ${dec(v.a)} kg.`, `The mass of one grain of sand is $${SF(v.b, v.q)}$ grams.`),
      parts: [single(4, text('Work out an estimate for the number of grains of sand in the bag.'), text(v.calc ? 'Give your answer in standard form correct to 3 significant figures.' : 'Give your answer in standard form.'))],
    };
  },

  answer(v) {
    const A = val(v.a, v.p);
    const B = val(v.b, v.q);
    if (v.level === 'foundational') return [{ text: stdForm(A.mul(B)) }, { text: stdForm(A.add(B)) }];
    if (v.level === 'core') return [{ text: stdForm(CORE[v.ctx].op === 'mul' ? A.mul(B) : A.div(B)) }];
    if (v.ctx === 0) {
      const photos = photosOf(v);
      return [{ text: `${photos > v.claim ? 'Yes' : 'No'}: the hard drive can store ${int(photos)} photos, which is ${photos > v.claim ? 'more' : 'fewer'} than ${int(v.claim)}` }];
    }
    return [{ text: stdForm(grains(v), v.calc ? 3 : undefined) }];
  },

  markScheme(v) {
    const A = val(v.a, v.p);
    const B = val(v.b, v.q);
    if (v.level === 'foundational') {
      const big = v.a.mul(pow10(v.p - v.q));
      return [
        [step('M1', `(${dec(v.a)} ${TIMES} ${dec(v.b)}) ${TIMES} $10^{${v.p} + ${paren(v.q)}}$ = ${dec(v.a.mul(v.b))} ${TIMES} $10^{${v.p + v.q}}$`, 'Multiply the numbers, add the powers.'), step('A1', stdForm(A.mul(B)), v.a.mul(v.b).cmp(10) >= 0 ? `${dec(v.a.mul(v.b))} is not between 1 and 10, so adjust the power.` : 'The first number must be between 1 and 10.')],
        [step('M1', `$${SF(v.a, v.p)} = ${dec(big)} \\times 10^{${v.q}}$`, 'Write both with the same power of 10 (or write both as ordinary numbers).'), step('A1', `(${dec(big)} + ${dec(v.b)}) ${TIMES} $10^{${v.q}}$ = ${stdForm(A.add(B))}`, 'Add, then check it is in standard form.')],
      ];
    }
    if (v.level === 'core') {
      const mul = CORE[v.ctx].op === 'mul';
      const raw = mul ? v.a.mul(v.b) : v.a.div(v.b);
      const e = mul ? v.p + v.q : v.p - v.q;
      return [
        [
          step('M1', mul ? `${dec(v.a)} ${TIMES} ${dec(v.b)} = ${dec(raw)}` : `${dec(v.a)} ${DIV} ${dec(v.b)} = ${dec(raw)}`, CORE[v.ctx].note),
          step('M1', mul ? `$10^{${v.p}} \\times 10^{${v.q}} = 10^{${e}}$` : `$10^{${v.p}} \\div 10^{${paren(v.q)}} = 10^{${e}}$`, mul ? 'Add the powers.' : 'Subtract the powers: take care with the negatives.'),
          step('A1', stdForm(mul ? A.mul(B) : A.div(B)), 'Make sure the first number is between 1 and 10.'),
        ],
      ];
    }
    if (v.ctx === 0) {
      const photos = photosOf(v);
      const exact = val(v.a, 12).div(val(v.b, 6));
      return [
        [
          step('P1', `${dec(v.a)} terabytes = ${dec(v.a)} ${TIMES} $10^{12}$ bytes`, 'Change terabytes into bytes first.'),
          step('P1', `$${dec(v.a)} \\times 10^{12} \\div (${SF(v.b, 6)})$`, 'Number of photos = total storage ÷ storage for one photo.'),
          step('A1', exact.isInt() ? `= ${int(photos)}` : `= ${approx(exact)} so ${int(photos)} whole photos`, 'Only whole photos can be stored.'),
          step('C1', `${photos > v.claim ? 'Yes' : 'No'}, ${int(photos)} ${photos > v.claim ? '>' : '<'} ${int(v.claim)}`, 'Compare with the number in the question and say who is right.'),
        ],
      ];
    }
    const g = grains(v);
    return [
      [
        step('P1', `${dec(v.a)} kg = ${dec(v.a.mul(1000))} g`, 'Get the units the same: 1 kg = 1000 g.'),
        step('P1', `$${dec(v.a.mul(1000))} \\div (${SF(v.b, v.q)})$`, 'Number of grains = total mass ÷ mass of one grain.'),
        step('P1', `= ${g.terminatesWithin(4) ? dec(g) : approx(g)}`, v.calc ? 'Use your calculator’s standard form key (×10ˣ).' : 'Divide the numbers and subtract the powers.'),
        step('A1', stdForm(g, v.calc ? 3 : undefined), v.calc ? '3 significant figures, in standard form.' : 'Write it in standard form.'),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Recompute as ordinary numbers and read the value back out of the answer text.
    const asNum = (m: Q, e: number) => (e >= 0 ? m.mul(Q.of(10n ** BigInt(e))) : m.div(Q.of(10n ** BigInt(-e))));
    const A = asNum(v.a, v.p);
    const B = asNum(v.b, v.q);
    const shown = (s: string) => {
      const mm = /\$([\d.]+) \\times 10\^\{(-?\d+)\}\$/.exec(s);
      return mm ? asNum(Q.of(mm[1]), Number(mm[2])) : null;
    };
    if (v.level === 'foundational') {
      if (!shown(answers[0].text)?.eq(A.mul(B)) || !shown(answers[1].text)?.eq(A.add(B))) p.push('product/sum');
    } else if (v.level === 'core') {
      const want = CORE[v.ctx].op === 'mul' ? A.mul(B) : A.div(B);
      if (!shown(answers[0].text)?.eq(want)) p.push('core value');
    } else if (v.ctx === 0) {
      // Count photos by whole multiples.
      const total = asNum(v.a, 12);
      const each = asNum(v.b, 6);
      const n = total.div(each).floor();
      if (each.mul(Q.of(n)).gt(total) || each.mul(Q.of(n + 1n)).cmp(total) <= 0) p.push('floor');
      if (!answers[0].text.startsWith(Number(n) > v.claim ? 'Yes' : 'No')) p.push('decision');
    } else {
      const g = asNum(v.a, 3).div(asNum(v.b, v.q));
      const s = shown(answers[0].text);
      if (!s) p.push('format');
      else if (v.calc ? s.sub(g).toNumber() ** 2 > (g.toNumber() * 0.005) ** 2 : !s.eq(g)) p.push('grains');
    }
    for (const a of answers) {
      const mm = /\$([\d.]+) \\times/.exec(a.text);
      if (mm && (Number(mm[1]) < 1 || Number(mm[1]) >= 10)) p.push('mantissa not in [1, 10)');
    }
    return p;
  },

  key: (v) => `${v.ctx}|${v.a}|${v.b}|${v.p}|${v.q}|${v.claim}`,
});

const paren = (n: number) => (n < 0 ? `(${n})` : `${n}`);
const photosOf = (v: V) => Number(val(v.a, 12).div(val(v.b, 6)).floor());
const grains = (v: V) => v.a.mul(1000).div(val(v.b, v.q));
