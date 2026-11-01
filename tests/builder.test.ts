import { describe, expect, it } from 'vitest';
import { addOne, buildSet, totalMarks } from '../src/engine/generate';
import { TEMPLATES } from '../src/engine/registry';
import { DEFAULT_OPTIONS } from '../src/state';
import type { Tier } from '../src/engine/types';

const levelIndex = { foundational: 0, core: 1, stretch: 2 } as const;
const inLevelOrder = (qs: { level: keyof typeof levelIndex }[]) => qs.every((q, i) => i === 0 || levelIndex[qs[i - 1].level] <= levelIndex[q.level]);

describe('editing a set', () => {
  it('locked questions are kept, in the set and not repeated, when the set is generated again', () => {
    for (let i = 0; i < 30; i++) {
      const first = buildSet(TEMPLATES, DEFAULT_OPTIONS, `lock${i}`);
      const keep = [first[1], first[first.length - 1]];
      const again = buildSet(TEMPLATES, DEFAULT_OPTIONS, `again${i}`, keep);
      expect(again).toHaveLength(DEFAULT_OPTIONS.count);
      for (const k of keep) expect(again.map((q) => q.code)).toContain(k.code);
      expect(new Set(again.map((q) => q.key)).size).toBe(again.length);
      expect(inLevelOrder(again)).toBe(true);
    }
  });

  for (const tier of ['KS3', 'F', 'H', 'Y12', 'Y13'] as Tier[]) {
    it(`${tier}: "about N marks" lands within 2 marks of the target`, () => {
      for (const target of [12, 20, 30, 45, 60]) {
        for (let i = 0; i < 10; i++) {
          const set = buildSet(TEMPLATES, { ...DEFAULT_OPTIONS, tier, target: 'marks', marks: target }, `m${tier}${target}${i}`);
          expect(Math.abs(totalMarks(set) - target)).toBeLessThanOrEqual(2);
          expect(new Set(set.map((q) => q.key)).size).toBe(set.length);
          expect(inLevelOrder(set)).toBe(true);
        }
      }
    });
  }

  it('"about N marks" counts locked questions towards the total', () => {
    const first = buildSet(TEMPLATES, DEFAULT_OPTIONS, 'lockmarks');
    const keep = first.slice(0, 2);
    const set = buildSet(TEMPLATES, { ...DEFAULT_OPTIONS, target: 'marks', marks: 30 }, 'lm', keep);
    expect(Math.abs(totalMarks(set) - 30)).toBeLessThanOrEqual(2);
    for (const k of keep) expect(set.map((q) => q.code)).toContain(k.code);
  });

  it('"add one more" picks the least-used level and never repeats a question', () => {
    let set = buildSet(TEMPLATES, { ...DEFAULT_OPTIONS, count: 4 }, 'add');
    for (let i = 0; i < 15; i++) {
      const before = { f: set.filter((q) => q.level === 'foundational').length, c: set.filter((q) => q.level === 'core').length, s: set.filter((q) => q.level === 'stretch').length };
      const q = addOne(TEMPLATES, DEFAULT_OPTIONS, set, `add${i}`)!;
      expect(set.map((x) => x.key)).not.toContain(q.key);
      const counts = { foundational: before.f, core: before.c, stretch: before.s };
      expect(counts[q.level]).toBe(Math.min(before.f, before.c, before.s));
      set = [...set, q];
    }
  });
});
