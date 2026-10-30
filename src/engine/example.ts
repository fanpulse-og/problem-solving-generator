import { buildQuestion, supportsCalc } from './generate';
import { freshSeed } from './rng';
import { levelsFor, type Question, type Template } from './types';

/**
 * Templates a worked example can use for this set: same tier as the set.
 * Grouped and ordered by strand, then title, for the dropdown.
 */
export function exampleChoices(set: Question[], all: Template[]): Template[] {
  if (set.length === 0) return [];
  const tier = set[0].tier;
  return all.filter((t) => t.tiers.includes(tier)).sort((a, b) => a.strand.localeCompare(b.strand) || a.title.localeCompare(b.title));
}

/**
 * The default worked example: a DIFFERENT template in the same sub-topic as one
 * of the set's questions; failing that, the same strand; failing that, the
 * first question's template with a new seed. Never identical to a set question.
 */
export function defaultExample(set: Question[], all: Template[], pick: <T>(xs: T[]) => T = (xs) => xs[Math.floor(Math.random() * xs.length)]): Question | null {
  if (set.length === 0) return null;
  const choices = exampleChoices(set, all);
  const used = new Set(set.map((q) => q.template.id));
  const sameTopic = choices.filter((t) => !used.has(t.id) && set.some((q) => q.template.subtopic === t.subtopic));
  const sameStrand = choices.filter((t) => !used.has(t.id) && set.some((q) => q.template.strand === t.strand));
  const t = sameTopic.length ? pick(sameTopic) : sameStrand.length ? pick(sameStrand) : set[0].template;
  return exampleFor(t, set);
}

/**
 * A worked example from a chosen template, pitched at the set's tier: its
 * easiest level, and the calculator mode of a matching question where possible.
 */
export function exampleFor(t: Template, set: Question[]): Question | null {
  if (set.length === 0) return null;
  const tier = set[0].tier;
  if (!t.tiers.includes(tier)) return null;
  const levels = levelsFor(t, tier);
  const level = levels.includes('foundational') ? 'foundational' : levels[0];
  const match = set.find((q) => q.template.subtopic === t.subtopic) ?? set[0];
  const calc = supportsCalc(t, match.calc) ? match.calc : t.calculator === 'either' ? 'non-calc' : t.calculator;
  const keys = new Set(set.map((q) => q.key));
  // A fresh seed almost always differs; retry in the rare case it repeats a set question.
  for (let i = 0; i < 20; i++) {
    const q = buildQuestion(t, level, tier, calc, freshSeed());
    if (!keys.has(q.key)) return q;
  }
  return buildQuestion(t, level, tier, calc, freshSeed());
}
