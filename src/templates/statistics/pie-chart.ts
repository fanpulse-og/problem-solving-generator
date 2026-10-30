import { defineTemplate } from '../../engine/types';
import { diagram, part, single, step, table, text, DIV, TIMES } from '../../engine/blocks';
import { ensure, frac, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { names } from '../../contexts/names';

/**
 * Modelled on Set 22 1F Q10 (angle for one category of a pie chart), Set 23
 * 1F Q16 (pie chart with one angle missing; 18 people chose bus: how many
 * walked?) and Set 24 1F Q22 (two pie charts with different totals: "more
 * Year 11 students than Year 7 students chose football" — is she right?).
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: (typeof CONTEXTS)[number];
  N: number;
  freqs: number[];
  ask: [number, number]; // foundational: angle of ask[0], fraction of ask[1]; core: known ask[0], find ask[1]
  N2: number; // stretch: second group
  freqs2: number[];
}

const CONTEXTS = [
  { q: 'how they travel to school', cats: ['Walk', 'Bus', 'Car', 'Bike', 'Train'], who: 'students', verb: 'travel by', noun: (c: string) => (c === 'Walk' ? 'walk' : `travel by ${c.toLowerCase()}`) },
  { q: 'their favourite sport', cats: ['Football', 'Netball', 'Tennis', 'Swimming', 'Cricket'], who: 'students', verb: 'chose', noun: (c: string) => `chose ${c.toLowerCase()}` },
  { q: 'their favourite flavour of crisps', cats: ['Ready salted', 'Salt & vinegar', 'Cheese & onion', 'Prawn cocktail', 'Barbecue'], who: 'people', verb: 'chose', noun: (c: string) => `chose ${c.toLowerCase()}` },
] as const;

const TOTALS = [36, 40, 45, 60, 72, 90, 120, 180];
const deg = (f: number, N: number) => (f * 360) / N;

function makeFreqs(rng: { int(a: number, b: number): number; pick<T>(xs: readonly T[]): T }, N: number, k: number): number[] {
  const unit = 360 / N; // degrees per person
  const minF = Math.ceil(20 / unit);
  const f = Array.from({ length: k }, () => rng.int(minF, minF * 4));
  const s = f.reduce((a, b) => a + b, 0);
  const scaled = f.map((x) => Math.max(minF, Math.round((x * N) / s)));
  scaled[scaled.length - 1] += N - scaled.reduce((a, b) => a + b, 0);
  return scaled;
}

export default defineTemplate<V>({
  id: 'stats-pie-chart',
  title: 'Pie charts',
  strand: 'Statistics',
  subtopic: 'Charts & diagrams',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  styleByLevel: { stretch: 'decide' },
  calculator: 'non-calc',

  generate({ rng, level }) {
    const [name] = names(rng, 1);
    const ctx = rng.pick(CONTEXTS);
    const N = rng.pick(level === 'stretch' ? [90, 120, 180, 360] : TOTALS);
    const k = rng.int(4, 5);
    const freqs = makeFreqs(rng, N, k);
    const minF = Math.ceil(20 / (360 / N));
    ensure(freqs.every((f) => f >= minF), 'every sector big enough to label');
    ensure(new Set(freqs).size === k, 'different sizes');
    const ask = rng.sample(Array.from({ length: k }, (_, i) => i), 2) as [number, number];
    const v: V = { level, name, ctx, N, freqs, ask, N2: 0, freqs2: [] };
    if (level === 'stretch') {
      ensure(ctx.who === 'students', 'year groups are students');
      const N2 = rng.pick([90, 120, 180, 360].filter((t) => t !== N));
      const freqs2 = makeFreqs(rng, N2, k);
      ensure(freqs2.every((f) => f >= Math.ceil(20 / (360 / N2))), 'sectors big enough');
      const i = ask[0];
      // Sometimes the bigger angle is the smaller number of people: the point of the question.
      ensure(freqs2[i] !== freqs[i] && deg(freqs2[i], N2) !== deg(freqs[i], N), 'a real comparison');
      // Usually make the bigger sector the smaller number of students: the point of the question.
      if (rng.chance(0.7)) ensure(deg(freqs2[i], N2) > deg(freqs[i], N) !== freqs2[i] > freqs[i], 'angles and numbers disagree');
      Object.assign(v, { N2, freqs2 });
    }
    return v;
  },

  validate(v) {
    return v.freqs.reduce((a, b) => a + b, 0) === v.N ? [] : ['frequencies must add to the total'];
  },

  render(v) {
    const cats = v.ctx.cats.slice(0, v.freqs.length);
    if (v.level === 'foundational') {
      return {
        stem: [text(`${v.N} ${v.ctx.who} were asked ${v.ctx.q}.`), text('The table shows information about their answers.'), table({ header: ['', 'Frequency'], rows: cats.map((c, i) => [c, `${v.freqs[i]}`]) })],
        parts: [
          part('a', 2, text(`${v.name} is going to draw a pie chart for this information.`), text(`Work out the angle of the sector for ‘${cats[v.ask[0]]}’.`)),
          part('b', 2, text(`What fraction of the ${v.ctx.who} ${v.ctx.noun(cats[v.ask[1]])}?`), text('Give your answer in its simplest form.')),
        ],
      };
    }
    if (v.level === 'core') {
      const [known, find] = v.ask;
      const sectors = cats.map((c, i) => ({ label: c, angle: deg(v.freqs[i], v.N), showAngle: i !== find }));
      return {
        stem: [text(`Some ${v.ctx.who} were asked ${v.ctx.q}.`), text('The pie chart shows information about their answers.'), diagram({ type: 'pie', sectors, notAccurate: true }), text(`${v.freqs[known]} of the ${v.ctx.who} ${v.ctx.noun(cats[known])}.`)],
        parts: [single(3, text(`Work out how many of the ${v.ctx.who} ${v.ctx.noun(cats[find])}.`))],
      };
    }
    const i = v.ask[0];
    const pie = (freqs: number[], N: number, title: string) => diagram({ type: 'pie', title, sectors: cats.map((c, j) => ({ label: c, angle: deg(freqs[j], N), showAngle: j === i })), notAccurate: true });
    return {
      stem: [
        text(`All the students in Year 7 and in Year 11 were asked ${v.ctx.q}.`),
        text('The pie charts show information about their answers.'),
        pie(v.freqs, v.N, 'Year 7'),
        pie(v.freqs2, v.N2, 'Year 11'),
        text(`There are ${v.N} ${v.ctx.who} in Year 7 and ${v.N2} ${v.ctx.who} in Year 11.`),
        text(`${v.name} says, “More ${v.ctx.who} in Year 11 than in Year 7 ${v.ctx.noun(cats[i])}.”`),
      ],
      parts: [single(4, text(`Is ${v.name} right?`), text('You must show how you get your answer.'))],
    };
  },

  answer(v) {
    const cats = v.ctx.cats;
    if (v.level === 'foundational') return [{ text: `${deg(v.freqs[v.ask[0]], v.N)}°` }, { text: frac(Q.of(v.freqs[v.ask[1]], v.N)) }];
    if (v.level === 'core') return [{ text: int(v.freqs[v.ask[1]]) }];
    const i = v.ask[0];
    const yes = v.freqs2[i] > v.freqs[i];
    return [{ text: `${yes ? 'Yes' : 'No'}: ${v.freqs[i]} in Year 7 and ${v.freqs2[i]} in Year 11 ${v.ctx.noun(cats[i])}` }];
  },

  markScheme(v) {
    const cats = v.ctx.cats;
    if (v.level === 'foundational') {
      const [a, b] = v.ask;
      return [
        [step('M1', `360 ${DIV} ${v.N} = ${360 / v.N}° for each person`, 'The whole circle (360°) shares out between everyone.'), step('A1', `${v.freqs[a]} ${TIMES} ${360 / v.N} = ${deg(v.freqs[a], v.N)}°`, 'Multiply by the frequency.')],
        [step('M1', `$\\frac{${v.freqs[b]}}{${v.N}}$`, 'Frequency out of the total.'), step('A1', frac(Q.of(v.freqs[b], v.N)), 'Cancel to the simplest form.')],
      ];
    }
    if (v.level === 'core') {
      const [known, find] = v.ask;
      const others = v.freqs.map((f, j) => (j === find ? 0 : deg(f, v.N)));
      const missing = 360 - others.reduce((x, y) => x + y, 0);
      return [
        [
          step('P1', `360 − ${others.filter((x) => x).join(' − ')} = ${missing}°`, 'The angles in a full turn add up to 360°.'),
          step('P1', `${deg(v.freqs[known], v.N)}° represents ${v.freqs[known]} ${v.ctx.who}, so 1 person is ${deg(v.freqs[known], v.N) / v.freqs[known]}°`, 'Use the sector you know to find what each degree (or each person) is worth.'),
          step('A1', `${missing} ${DIV} ${deg(v.freqs[known], v.N) / v.freqs[known]} = ${v.freqs[find]}`, 'Divide the missing angle by the degrees per person.'),
        ],
      ];
    }
    const i = v.ask[0];
    const [a1, a2] = [deg(v.freqs[i], v.N), deg(v.freqs2[i], v.N2)];
    const yes = v.freqs2[i] > v.freqs[i];
    return [
      [
        step('P1', `Year 7: $\\frac{${a1}}{360} \\times ${v.N} = ${v.freqs[i]}$`, 'The angle is a fraction of 360°; take that fraction of the year group.'),
        step('P1', `Year 11: $\\frac{${a2}}{360} \\times ${v.N2} = ${v.freqs2[i]}$`, 'Same for the other year group.'),
        step('A1', `${v.freqs[i]} and ${v.freqs2[i]}`, a1 > a2 === yes ? 'The bigger sector does not always mean more people: the totals are different.' : 'Compare the numbers of people, not the angles.'),
        step('C1', `${yes ? 'Yes' : 'No'}, ${v.freqs2[i]} ${yes ? '>' : '<'} ${v.freqs[i]}`, `A conclusion that matches your working, about ${cats[i].toLowerCase()}.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    if (v.level === 'foundational') {
      // Fraction of the circle = fraction of the people.
      const angle = Number(answers[0].text.replace('°', ''));
      if (angle * v.N !== 360 * v.freqs[v.ask[0]]) p.push('angle');
      const m = /\\frac\{(\d+)\}\{(\d+)\}/.exec(answers[1].text);
      if (!m || Number(m[1]) * v.N !== Number(m[2]) * v.freqs[v.ask[1]]) p.push('fraction');
      return p;
    }
    if (v.level === 'core') {
      // Missing angle from the drawn sectors, then scale from the known sector.
      const angles = v.freqs.map((f) => (f * 360) / v.N);
      const missing = 360 - angles.reduce((s, a, j) => (j === v.ask[1] ? s : s + a), 0);
      const want = (missing * v.freqs[v.ask[0]]) / angles[v.ask[0]];
      if (Number(answers[0].text) !== want) p.push('missing count');
      return p;
    }
    const i = v.ask[0];
    const y7 = ((v.freqs[i] * 360) / v.N / 360) * v.N;
    const y11 = ((v.freqs2[i] * 360) / v.N2 / 360) * v.N2;
    if (answers[0].text.startsWith('Yes') !== y11 > y7) p.push('decision');
    return p;
  },

  key: (v) => `${v.N}|${v.freqs}|${v.ask}|${v.N2}|${v.freqs2}`,
});
