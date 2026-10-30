import { describe, expect, it } from 'vitest';
import { defaultExample, exampleChoices, exampleFor } from '../src/engine/example';
import { DEFAULT_OPTIONS } from '../src/state';
import { generateSet } from '../src/engine/generate';
import { TEMPLATES } from '../src/engine/registry';
import type { Tier } from '../src/engine/types';

describe('worked example', () => {
  for (const tier of ['KS3', 'F', 'H'] as Tier[]) {
    it(`${tier}: a different template from one of the set's topics where possible, never a repeat`, () => {
      for (let i = 0; i < 40; i++) {
        const set = generateSet(TEMPLATES, { ...DEFAULT_OPTIONS, tier }, `ex${tier}${i}`);
        const ex = defaultExample(set, TEMPLATES, (xs) => xs[i % xs.length])!;
        expect(ex.tier).toBe(tier);
        expect(set.map((q) => q.key)).not.toContain(ex.key);
        const used = new Set(set.map((q) => q.template.id));
        const topicAlternatives = TEMPLATES.filter((t) => t.tiers.includes(tier) && !used.has(t.id) && set.some((q) => q.template.subtopic === t.subtopic));
        if (topicAlternatives.length) {
          expect(used.has(ex.template.id)).toBe(false);
          expect(set.some((q) => q.template.subtopic === ex.template.subtopic)).toBe(true);
        }
      }
    });
  }

  it('a chosen template gives an example at the set’s tier, from the dropdown’s list', () => {
    const set = generateSet(TEMPLATES, { ...DEFAULT_OPTIONS, tier: 'F' }, 'pick');
    const choices = exampleChoices(set, TEMPLATES);
    expect(choices.every((t) => t.tiers.includes('F'))).toBe(true);
    for (const t of choices) {
      const ex = exampleFor(t, set)!;
      expect(ex.template.id).toBe(t.id);
      expect(ex.tier).toBe('F');
    }
  });

  it('a single-question set whose template is the only one in its topic still gets an example', () => {
    const set = generateSet(TEMPLATES, { ...DEFAULT_OPTIONS, tier: 'H', count: 1, subtopics: ['Vectors'], strands: ['Geometry & Measures'] }, 'one');
    const ex = defaultExample(set, TEMPLATES)!;
    expect(ex).not.toBeNull();
    expect(ex.key).not.toBe(set[0].key);
  });
});
