import { describe, expect, it } from 'vitest';
import { countPages, questionsToRemove, type PageBlock } from '../src/engine/pages';

const block = (height: number, keepWithNext = false): PageBlock => ({ height, advance: height + 10, keepWithNext });

describe('worksheet page count', () => {
  it('counts nothing as no pages, and a short sheet as one', () => {
    expect(countPages([], 100)).toBe(0);
    expect(countPages([block(50)], 100)).toBe(1);
  });

  it('never splits a block: one that does not fit moves to the next page', () => {
    expect(countPages([block(60), block(60)], 100)).toBe(2);
    expect(countPages([block(40), block(40)], 100)).toBe(1);
  });

  it('a block taller than a page still only starts one new page', () => {
    expect(countPages([block(300)], 100)).toBe(1);
  });

  it('a heading moves down with the block after it', () => {
    // Without the rule the heading would sit alone at the foot of page one.
    const blocks = [block(70), block(10, true), block(50)];
    expect(countPages(blocks, 100)).toBe(2);
  });

  it('suggests the fewest questions to meet a page limit, tallest first', () => {
    const q = (code: string, height: number) => ({ ...block(height), question: code });
    const blocks = [q('a', 40), q('b', 80), q('c', 40)];
    expect(countPages(blocks, 100)).toBe(3);
    expect(questionsToRemove(blocks, 1, 100)).toEqual(['b']);
    expect(questionsToRemove(blocks, 3, 100)).toEqual([]);
  });
});
