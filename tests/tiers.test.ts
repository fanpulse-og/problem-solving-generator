import { describe, expect, it } from 'vitest';
import { buildSet, eligibleTemplates } from '../src/engine/generate';
import { TEMPLATES, subtopicsByStrand, templateById } from '../src/engine/registry';
import { levelsFor, type Strand, type Tier } from '../src/engine/types';
import { pickStrand, pickSubtopic, strandState, withTier } from '../src/components/Controls';
import { DEFAULT_OPTIONS, questionFromCode, readHash } from '../src/state';

// Content that is Higher only in the Edexcel GCSE (9–1) specification (bold, or Higher-only references).
const HIGHER_ONLY = ['alg-completing-square', 'alg-quadratic-area', 'alg-iteration', 'alg-circles-lines', 'geom-circle-theorems', 'geom-pythagoras-3d', 'geom-sine-cosine-rule', 'geom-vectors', 'num-recurring-decimals', 'num-index-equations', 'num-bounds', 'stats-cumulative-frequency', 'stats-histogram', 'stats-iqr-compare'];
// Higher-only levels of templates that are otherwise Foundation.
const HIGHER_LEVELS: [string, string][] = [
  ['num-counting', 'core'],
  ['num-counting', 'stretch'],
  ['geom-transformations', 'stretch'],
  ['geom-similarity', 'core'],
  ['geom-similarity', 'stretch'],
  ['ratio-proportion', 'stretch'],
];
// Not in the KS3 programme of study.
const NOT_KS3 = ['prob-tree-diagram', 'prob-frequency-tree', 'alg-inequalities', 'alg-simultaneous-context', 'ratio-interest-compare', 'num-standard-form', 'geom-sectors', 'geom-bearings', 'stats-grouped-mean'];

describe('tiers follow the specification', () => {
  it('Higher includes all Foundation content', () => {
    for (const t of TEMPLATES) if (t.tiers.includes('F')) expect(t.tiers, t.id).toContain('H');
  });

  it('Higher-only templates are not offered at Foundation or KS3', () => {
    for (const id of HIGHER_ONLY) expect(templateById(id)!.tiers, id).toEqual(['H']);
  });

  it('Higher-only levels are not offered at Foundation or KS3', () => {
    for (const [id, level] of HIGHER_LEVELS) {
      const t = templateById(id)!;
      expect(levelsFor(t, 'H'), id).toContain(level);
      for (const tier of ['F', 'KS3'] as Tier[]) expect(levelsFor(t, tier), `${id} ${tier}`).not.toContain(level);
    }
  });

  it('KS3 is limited to the KS3 programme of study', () => {
    for (const id of NOT_KS3) expect(templateById(id)!.tiers, id).not.toContain('KS3');
  });

  it('Foundation sets never use a Higher-only level', () => {
    for (let i = 0; i < 20; i++) {
      const set = buildSet(TEMPLATES, { ...DEFAULT_OPTIONS, tier: 'F', count: 30 }, `fset${i}`);
      for (const q of set) expect(levelsFor(q.template, 'F'), q.code).toContain(q.level);
    }
  });

  it('Foundation stretch questions avoid conditional probability, area factors and "prove"', () => {
    for (let i = 0; i < 40; i++) {
      const tree = questionFromCode(`prob-frequency-tree.stretch.F.nc.s${i}`)!;
      expect(JSON.stringify(tree.content.parts[1])).toMatch(/One of the \d+ is picked/);
      const sim = questionFromCode(`geom-similarity.foundational.F.c.s${i}`)!;
      expect(JSON.stringify(sim.content)).not.toContain('area');
      const proof = questionFromCode(`alg-algebraic-proof.core.F.nc.s${i}`)!;
      expect(JSON.stringify(proof.content)).toContain('Show algebraically');
    }
  });

  it('old links with a tier that has since been withdrawn still open', () => {
    for (const code of ['num-bounds.core.F.c.p0', 'stats-iqr-compare.core.F.c.p0', 'alg-inequalities.core.KS3.nc.p0', 'prob-frequency-tree.core.KS3.nc.p0']) expect(questionFromCode(code), code).not.toBeNull();
  });
});

describe('topic filter', () => {
  for (const tier of ['KS3', 'F', 'H'] as Tier[]) {
    it(`${tier}: lists only sub-topics with questions at that tier`, () => {
      for (const [, subs] of subtopicsByStrand(tier)) {
        for (const st of subs) expect(eligibleTemplates(TEMPLATES, { ...DEFAULT_OPTIONS, tier, subtopics: [st] }).length, `${tier} ${st}`).toBeGreaterThan(0);
      }
    });
  }

  it('Foundation and KS3 do not list sub-topics whose questions are all Higher only', () => {
    const higherOnly = [...new Set(TEMPLATES.map((t) => t.subtopic))].filter((st) => TEMPLATES.filter((t) => t.subtopic === st).every((t) => t.tiers.length === 1 && t.tiers[0] === 'H'));
    expect(higherOnly.length).toBeGreaterThan(0);
    for (const tier of ['F', 'KS3'] as Tier[]) {
      const listed = [...subtopicsByStrand(tier).values()].flat();
      for (const st of higherOnly) expect(listed, tier).not.toContain(st);
    }
  });

  it('switching tier drops sub-topics the new tier does not have', () => {
    const hOnly = [...subtopicsByStrand('H').entries()].flatMap(([s, l]) => l.filter((x) => ![...subtopicsByStrand('F').values()].flat().includes(x)).map((x) => [s, x] as const));
    expect(hOnly.length).toBeGreaterThan(0);
    const [strand, st] = hOnly[0];
    const o = withTier({ ...DEFAULT_OPTIONS, tier: 'H', strands: [strand as Strand], subtopics: [st] }, 'F');
    expect(o.tier).toBe('F');
    expect(o.subtopics).not.toContain(st);
  });
});

describe('renamed sub-topics', () => {
  it('old links with a split sub-topic still filter to the same questions', () => {
    const o = readHash('#/build?tier=H&strands=Probability&topics=Tree diagrams %26 Venn diagrams');
    expect(o.options.subtopics).toEqual(['Tree diagrams', 'Venn diagrams']);
    expect(eligibleTemplates(TEMPLATES, o.options).map((t) => t.id).sort()).toEqual(['prob-tree-diagram', 'prob-venn-diagram']);
  });
});

describe('topic dropdowns', () => {
  const alg = [...subtopicsByStrand('F').get('Algebra')!];
  const num = [...subtopicsByStrand('F').get('Number')!];
  const ids = (o: typeof DEFAULT_OPTIONS) => new Set(eligibleTemplates(TEMPLATES, o).map((t) => t.subtopic));

  it('ticking one sub-topic from nothing chooses just that sub-topic', () => {
    const o = pickSubtopic(DEFAULT_OPTIONS, 'Algebra', 'Inequalities', alg);
    expect([...ids(o)]).toEqual(['Inequalities']);
    expect(strandState(o, 'Algebra', alg)).toBe('some');
  });

  it('a whole strand and one sub-topic of another combine', () => {
    const o = pickSubtopic(pickStrand(DEFAULT_OPTIONS, 'Number', num), 'Algebra', 'Inequalities', alg);
    expect(ids(o)).toEqual(new Set([...num, 'Inequalities']));
  });

  it('unticking the last sub-topic, or "All", turns the strand off', () => {
    const one = pickSubtopic(DEFAULT_OPTIONS, 'Algebra', 'Inequalities', alg);
    expect(pickSubtopic(one, 'Algebra', 'Inequalities', alg)).toMatchObject({ strands: [], subtopics: [] });
    const all = pickStrand(DEFAULT_OPTIONS, 'Algebra', alg);
    expect(strandState(all, 'Algebra', alg)).toBe('all');
    expect(pickStrand(all, 'Algebra', alg)).toMatchObject({ strands: [], subtopics: [] });
    // "All" after some picks clears the picks.
    expect(pickStrand(one, 'Algebra', alg)).toMatchObject({ strands: ['Algebra'], subtopics: [] });
  });
});
