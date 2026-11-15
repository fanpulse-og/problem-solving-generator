import { describe, expect, it } from 'vitest';
import { isCorrect, marking, readNumbers } from '../src/engine/practice';
import { buildMock, MOCKS } from '../src/engine/mock';
import { buildQuestion, generateSet, totalMarks } from '../src/engine/generate';
import { TEMPLATES } from '../src/engine/registry';
import { DEFAULT_OPTIONS } from '../src/state';

describe('practice marking', () => {
  it('reads numbers in the forms answers are printed in', () => {
    expect(readNumbers('£13.60')).toEqual([13.6]);
    expect(readNumbers('18 000')).toEqual([18000]);
    expect(readNumbers('$x = -\\frac{1}{3}$ or $x = 3$')).toEqual([-1 / 3, 3]);
    expect(readNumbers('$3.2 \\times 10^{5}$')).toEqual([320000]);
    expect(readNumbers('$2\\frac{1}{4}$')).toEqual([2.25]);
    expect(readNumbers('3 : 4')).toEqual([3, 4]);
    expect(readNumbers('37.5%')).toEqual([37.5]);
    expect(readNumbers('24 cm²')).toEqual([24]);
    expect(readNumbers('$(3, -4)$')).toEqual([3, -4]);
    expect(readNumbers('2 hours 30 minutes')).toEqual([2, 30]);
  });

  it('leaves anything else for the student to mark', () => {
    for (const a of ['Shown', '$x < 3$', '$3\\sqrt{2}$', '$y = x^2 + 3x - 1$', 'Multiply by 3', '$x \\leqslant 4$ or $x \\geqslant 7$', '$12\\pi$']) expect(marking(a).kind, a).toBe('self');
  });

  it('marks typed answers', () => {
    expect(isCorrect('$x = 3$ or $x = 9$', '9, 3')).toBe(true);
    expect(isCorrect('$x = 3$ or $x = 9$', '3')).toBe(false);
    expect(isCorrect('$\\frac{3}{4}$', '0.75')).toBe(true);
    expect(isCorrect('$\\frac{3}{4}$', '3/4')).toBe(true);
    expect(isCorrect('£13.60', '13.6')).toBe(true);
    expect(isCorrect('18 000', '18,000')).toBe(true);
    expect(isCorrect('3 : 4', '4:3')).toBe(false);
    expect(isCorrect('$(3, -4)$', '(3,-4)')).toBe(true);
    expect(isCorrect('$3.2 \\times 10^{5}$', '3.2 x 10^5')).toBe(true);
    expect(isCorrect('42', 'forty two')).toBe(false);
    expect(isCorrect('63', '63 trees')).toBe(true);
    expect(isCorrect('$x = 4$, $y = -1$', 'x=4 and y=-1')).toBe(true);
    expect(isCorrect('£13.60', '£13.60 each')).toBe(true);
    expect(isCorrect('Shown', 'anything')).toBe(null);
  });

  it('never marks the printed answer itself as wrong, and marks most answers automatically', () => {
    let auto = 0;
    let total = 0;
    for (const t of TEMPLATES)
      for (const level of t.levels) {
        const q = buildQuestion(t, level, t.tiers[0], t.calculator === 'either' ? 'calc' : t.calculator, 'pr1');
        for (const a of q.answers) {
          total++;
          const m = marking(a.text);
          if (m.kind === 'numbers') {
            auto++;
            expect(isCorrect(a.text, a.text), `${q.code}: ${a.text}`).toBe(true);
          }
        }
      }
    console.log(`practice: ${auto} of ${total} answer parts are marked automatically`);
    expect(auto / total).toBeGreaterThan(0.4);
  });
});

describe('mock papers', () => {
  it('reach the total marks with the right topic spread and no repeats', () => {
    for (const spec of MOCKS)
      for (const seed of ['a', 'b', 'c']) {
        const qs = buildMock(TEMPLATES, spec, seed);
        const total = totalMarks(qs);
        expect(total, `${spec.id} total`).toBeLessThanOrEqual(spec.marks);
        // A-level questions are long, so the last few marks cannot always be filled.
        expect(total, `${spec.id} total`).toBeGreaterThanOrEqual(spec.marks - (spec.tier === 'F' || spec.tier === 'H' ? 2 : 6));
        expect(new Set(qs.map((q) => q.key)).size).toBe(qs.length);
        expect(qs.every((q) => q.calc === spec.calc && q.tier === spec.tier)).toBe(true);
        for (const [strand, share] of spec.shares) {
          const got = totalMarks(qs.filter((q) => q.template.strand === strand));
          expect(Math.abs(got - share * spec.marks), `${spec.id} ${strand}: ${got}`).toBeLessThanOrEqual(6);
        }
      }
  });
});

describe('mixed sets', () => {
  it('do not repeat a question type and share the topics out', () => {
    for (const seed of ['s1', 's2', 's3', 's4']) {
      const qs = generateSet(TEMPLATES, { ...DEFAULT_OPTIONS, count: 12 }, seed);
      expect(new Set(qs.map((q) => q.template.id)).size).toBe(qs.length);
      const perStrand = new Map<string, number>();
      qs.forEach((q) => perStrand.set(q.template.strand, (perStrand.get(q.template.strand) ?? 0) + 1));
      expect(Math.max(...perStrand.values())).toBeLessThanOrEqual(3);
    }
  });
});
