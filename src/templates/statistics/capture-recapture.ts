import { defineTemplate } from '../../engine/types';
import { lines, part, single, step, text } from '../../engine/blocks';
import { ensure, int } from '../../engine/format';
import { names } from '../../contexts/names';

/**
 * Modelled on June 2022 2H Q14 (180 fish tagged; 305 caught the next day, 45
 * of them tagged: estimate the number of fish) and November 2022 2H Q15 (rabbits
 * in a park; then a comment on an assumption). The examiner report says the
 * commonest error is a fraction "upside down", and that students should not
 * round the estimate to 1 s.f. just because it is an estimate.
 */
interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  ctx: number;
  M: number; // marked on day 1
  S: number; // caught on day 2
  m: number; // marked in the second sample
  claim: number; // stretch
}

const CONTEXTS = [
  { animals: 'fish', place: 'a lake', mark: 'puts a tag on each of these fish', back: 'puts them back into the lake', tagged: 'tagged', theseOne: 'fish' },
  { animals: 'rabbits', place: 'a park', mark: 'marks each rabbit with a tag', back: 'releases them back into the park', tagged: 'tagged', theseOne: 'rabbits' },
  { animals: 'ladybirds', place: 'a garden', mark: 'marks each ladybird with a small dot of paint', back: 'releases them back into the garden', tagged: 'marked', theseOne: 'ladybirds' },
  { animals: 'newts', place: 'a pond', mark: 'marks each newt', back: 'puts them back into the pond', tagged: 'marked', theseOne: 'newts' },
];
const DAYS = [
  ['Friday', 'Saturday'],
  ['Monday', 'Tuesday'],
  ['Wednesday', 'Thursday'],
];

const estimate = (v: V) => (v.M * v.S) / v.m;

export default defineTemplate<V>({
  id: 'stats-capture-recapture',
  title: 'Capture–recapture estimates',
  strand: 'Statistics',
  subtopic: 'Sampling & estimation',
  tiers: ['F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  styleByLevel: { stretch: 'decide' },
  calculator: 'either',

  generate({ rng, level, calc }) {
    const [name] = names(rng, 1);
    const ctx = rng.int(0, CONTEXTS.length - 1);
    // Choose the population and the fraction recaptured so the estimate is a whole number.
    const m = rng.int(calc === 'calc' ? 7 : 4, calc === 'calc' ? 60 : 20);
    const M = rng.step(20, 300, calc === 'calc' ? 1 : 5);
    const S = rng.int(Math.max(20, m + 5), calc === 'calc' ? 400 : 120);
    const N = (M * S) / m;
    ensure(Number.isInteger(N) && N > M + S - m && N <= 5000, 'a whole-number estimate bigger than the animals seen');
    ensure(m < M && m < S, 'not every animal recaptured');
    ensure(S <= 0.6 * N && M <= 0.6 * N, 'samples are a small part of the population');
    const v: V = { level, name, ctx, M, S, m, claim: 0 };
    if (level === 'stretch') {
      const factor = rng.pick([0.8, 0.9, 1.1, 1.2]);
      const claim = Math.round((N * factor) / 50) * 50;
      ensure(claim !== N && claim > 0, 'a claim that differs from the estimate');
      v.claim = claim;
    }
    return v;
  },

  validate(v) {
    return v.m > 0 ? [] : ['no marked animals'];
  },

  render(v) {
    const c = CONTEXTS[v.ctx];
    const [d1, d2] = DAYS[v.ctx % DAYS.length];
    const story = lines(
      `${v.name} wants to work out an estimate for the total number of ${c.animals} in ${c.place}.`,
      `On ${d1}, ${v.name} catches ${v.M} ${c.animals}. ${v.name} ${c.mark} and ${c.back}.`,
      `On ${d2}, ${v.name} catches ${v.S} ${c.animals}. ${v.m} of these ${c.theseOne} are ${c.tagged}.`,
    );
    if (v.level === 'foundational') return { stem: story, parts: [single(3, text(`Work out an estimate for the total number of ${c.animals} in ${c.place.replace(/^a /, 'the ')}.`))] };
    if (v.level === 'core') {
      return {
        stem: story,
        parts: [part('a', 3, text(`Work out an estimate for the total number of ${c.animals} in ${c.place.replace(/^a /, 'the ')}.`)), part('b', 1, text('Write down one assumption you have made.'))],
      };
    }
    return {
      stem: [...story, text(`${v.name} says, “There are more than ${int(v.claim)} ${c.animals} in ${c.place.replace(/^a /, 'the ')}.”`)],
      parts: [
        part('a', 3, text(`Is ${v.name} right?`), text('You must show how you get your answer.')),
        part('b', 1, text(`Some of the ${c.tagged} ${c.animals} lost their ${c.tagged === 'tagged' ? 'tags' : 'marks'} before ${d2}.`), text('What effect would this have on your estimate?')),
      ],
    };
  },

  answer(v) {
    const N = estimate(v);
    const c = CONTEXTS[v.ctx];
    if (v.level === 'foundational') return [{ text: int(N) }];
    if (v.level === 'core') return [{ text: int(N) }, { text: `The number of ${c.animals} does not change between the two days, and the ${c.tagged} ${c.animals} mix evenly with the others` }];
    return [{ text: `${N > v.claim ? 'Yes' : 'No'}: the estimate is ${int(N)}, which is ${N > v.claim ? 'more' : 'less'} than ${int(v.claim)}` }, { text: `The estimate would be too big: fewer ${c.tagged} ${c.animals} would be recognised in the second sample` }];
  },

  markScheme(v) {
    const c = CONTEXTS[v.ctx];
    const N = estimate(v);
    const est = [
      step('M1', `$\\frac{${v.m}}{${v.S}} = \\frac{${v.M}}{N}$`, `In the second sample, ${v.m} out of ${v.S} are ${c.tagged}. That should be the same fraction as ${v.M} out of ALL the ${c.animals}.`),
      step('M1', `$N = \\frac{${v.M} \\times ${v.S}}{${v.m}}$`, 'Rearrange (watch out for the fraction upside down).'),
      step('A1', int(N), 'Don’t round to 1 significant figure just because it is an estimate.'),
    ];
    if (v.level === 'foundational') return [est];
    if (v.level === 'core') return [est, [step('C1', `The population stays the same, and ${c.tagged} ${c.animals} mix evenly`, 'Any sensible assumption: no animals born, die, arrive or leave; tags don’t fall off; the sample is random.')]];
    return [
      [est[0], { ...est[1], code: 'M1' }, step('C1', `${N > v.claim ? 'Yes' : 'No'}, ${int(N)} ${N > v.claim ? '>' : '<'} ${int(v.claim)}`, 'A conclusion with the estimate to support it.')],
      [step('C1', 'The estimate would be too big', `Fewer ${c.tagged} ${c.animals} would be counted, so the fraction ${v.m} / ${v.S} is too small and N comes out too large.`)],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Proportion check by cross-multiplying: m × N = M × S.
    const N = v.level === 'stretch' ? Number(/estimate is ([\d\s ]+)/.exec(answers[0].text)?.[1].replace(/[\s ]/g, '')) : Number(answers[0].text.replace(/[\s ]/g, ''));
    if (v.m * N !== v.M * v.S) p.push('estimate');
    if (v.level === 'stretch') {
      if (answers[0].text.startsWith('Yes') !== N > v.claim) p.push('decision');
      if (!/too big/.test(answers[1].text)) p.push('effect of lost tags');
    }
    return p;
  },

  key: (v) => `${v.M}|${v.S}|${v.m}|${v.claim}`,
});

