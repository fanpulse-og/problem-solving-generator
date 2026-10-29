/**
 * COPY-READY TEMPLATE SKELETON — not loaded by the app (files starting with _
 * are ignored). Copy to src/templates/<strand>/<your-id>.ts, rename, and fill in.
 * See docs/TEMPLATES.md for the full guide.
 */
import { defineTemplate } from '../engine/types';
import { lines, single, step, text, TIMES } from '../engine/blocks';
import { ensure, int } from '../engine/format';
import { names } from '../contexts/names';

interface V {
  level: 'foundational' | 'core' | 'stretch';
  name: string;
  a: number;
  b: number;
}

export default defineTemplate<V>({
  id: 'strand-short-name', // unique, kebab-case, never reuse an old id (it is in share links)
  title: 'Short title shown to teachers',
  strand: 'Number',
  subtopic: 'Fractions, decimals & percentages',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'multi-step',
  calculator: 'either',

  // 1. Choose the numbers. Work backwards from a tidy answer where you can.
  //    Call ensure(condition, reason) to reject a bad combination and retry.
  generate({ rng, tier, level }) {
    const [name] = names(rng, 1);
    const a = rng.int(2, tier === 'KS3' ? 9 : 20);
    const b = rng.int(2, 12);
    ensure(a !== b, 'use two different numbers');
    return { level, name, a, b };
  },

  // 2. Constraints that must always hold (positive lengths, whole counts…).
  validate(v) {
    return v.a > 0 && v.b > 0 ? [] : ['values must be positive'];
  },

  // 3. The question. One text block per line, as on an Edexcel paper.
  //    No full stop after a line that ends in a number.
  render(v) {
    return {
      stem: lines(`${v.name} buys ${v.a} packs of pens.`, `Each pack has ${v.b} pens in it.`),
      parts: [single(2, text('Work out the total number of pens.'))],
    };
  },

  // 4. The answer for each part, as shown on the answer sheet.
  answer(v) {
    return [{ text: int(v.a * v.b) }];
  },

  // 5. One MarkStep per mark: code, the working, and a student-friendly note.
  markScheme(v) {
    return [[step('M1', `${v.a} ${TIMES} ${v.b}`, 'Multiply the number of packs by the pens in each pack.'), step('A1', int(v.a * v.b), 'Check it is a sensible size.')]];
  },

  // 6. Check the answer a DIFFERENT way (substitute back, brute force…).
  check(v, answers) {
    let total = 0;
    for (let i = 0; i < v.a; i++) total += v.b; // repeated addition, not multiplication
    return answers[0].text === int(total) ? [] : ['total'];
  },

  // 7. What makes two questions "the same" (ignore names and contexts).
  key: (v) => `${v.a}|${v.b}`,
});
