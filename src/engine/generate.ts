import { Reject } from './format';
import { lineIssues } from './arithmetic';
import { Rng, freshSeed } from './rng';
import type { Calc, Level, Question, StyleId, Strand, Template, Tier } from './types';
import { LEVELS } from './types';

// Raising this only affects codes that used to fail: earlier attempts, and so existing questions, are unchanged.
const MAX_ATTEMPTS = 500;
const CALC_CODE: Record<Calc, string> = { 'non-calc': 'nc', calc: 'c' };

/** "ratio-difference.core.F.nc.k3f9a" */
export function questionCode(templateId: string, level: Level, tier: Tier, calc: Calc, seed: string): string {
  return [templateId, level, tier, CALC_CODE[calc], seed].join('.');
}

export function parseCode(code: string): { templateId: string; level: Level; tier: Tier; calc: Calc; seed: string } | null {
  const parts = code.split('.');
  if (parts.length !== 5) return null;
  const [templateId, level, tier, c, seed] = parts;
  if (!LEVELS.some((l) => l.id === level)) return null;
  if (!['KS3', 'F', 'H'].includes(tier)) return null;
  if (c !== 'nc' && c !== 'c') return null;
  return { templateId, level: level as Level, tier: tier as Tier, calc: c === 'nc' ? 'non-calc' : 'calc', seed };
}

export function supportsCalc(t: Template, calc: Calc): boolean {
  return t.calculator === 'either' || t.calculator === calc;
}

/**
 * Build one question. Attempts are deterministic sub-seeds of the code, so the
 * same code always gives the same question. Failure after MAX_ATTEMPTS is a
 * bug in the template, and the tests are designed to catch it.
 */
export function buildQuestion(t: Template, level: Level, tier: Tier, calc: Calc, seed: string): Question {
  if (!t.levels.includes(level)) throw new Error(`${t.id} has no level ${level}`);
  if (!t.tiers.includes(tier)) throw new Error(`${t.id} has no tier ${tier}`);
  if (!supportsCalc(t, calc)) throw new Error(`${t.id} does not support ${calc}`);
  const code = questionCode(t.id, level, tier, calc, seed);
  let lastReason = '';
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const rng = new Rng(`${code}#${attempt}`);
    try {
      const vars = t.generate({ rng, level, tier, calc });
      const problems = t.validate(vars);
      if (problems.length) {
        lastReason = problems.join('; ');
        continue;
      }
      const content = t.render(vars);
      const answers = t.answer(vars);
      const scheme = t.markScheme(vars);
      // Non-calculator: the hand arithmetic must be manageable (see arithmetic.ts); otherwise try the next sub-seed.
      if (calc === 'non-calc') {
        const heavy = scheme.flat().flatMap((s) => lineIssues(s.working));
        if (heavy.length) {
          lastReason = `non-calculator arithmetic too heavy: ${heavy[0].reason}`;
          continue;
        }
      }
      const marks = content.parts.reduce((s, p) => s + p.marks, 0);
      return {
        code,
        template: t,
        tier,
        level,
        calc,
        seed,
        style: t.styleByLevel?.[level] ?? t.style,
        vars,
        content,
        answers,
        scheme,
        marks,
        key: `${t.id}|${level}|${t.key(vars)}`,
      };
    } catch (e) {
      if (e instanceof Reject) {
        lastReason = e.message;
        continue;
      }
      throw e;
    }
  }
  throw new Error(`${code}: no valid question after ${MAX_ATTEMPTS} attempts (last: ${lastReason})`);
}

export interface SetOptions {
  tier: Tier;
  strands: Strand[];
  subtopics: string[]; // empty = all within strands
  levels: Level[];
  styles: StyleId[]; // empty = all
  calc: Calc | 'any';
  count: number;
}

export function eligibleTemplates(all: Template[], o: Omit<SetOptions, 'count'>, level?: Level): Template[] {
  return all.filter(
    (t) =>
      t.tiers.includes(o.tier) &&
      (o.strands.length === 0 || o.strands.includes(t.strand)) &&
      (o.subtopics.length === 0 || o.subtopics.includes(t.subtopic)) &&
      (level ? t.levels.includes(level) : o.levels.some((l) => t.levels.includes(l))) &&
      (o.styles.length === 0 ||
        (level
          ? o.styles.includes(t.styleByLevel?.[level] ?? t.style)
          : o.styles.some((s) => s === t.style || Object.values(t.styleByLevel ?? {}).includes(s))) ) &&
      (o.calc === 'any' || supportsCalc(t, o.calc)),
  );
}

function pickCalc(t: Template, want: Calc | 'any', rng: Rng): Calc {
  if (want !== 'any') return want;
  if (t.calculator === 'either') return rng.chance(0.5) ? 'non-calc' : 'calc';
  return t.calculator;
}

/**
 * A set of questions ordered foundational → core → stretch, spread across the
 * eligible templates, with no duplicate maths (by key).
 */
export function generateSet(all: Template[], o: SetOptions, setSeed = freshSeed()): Question[] {
  const rng = new Rng(`set:${setSeed}`);
  const levels = LEVELS.map((l) => l.id).filter((l) => o.levels.includes(l));
  const out: Question[] = [];
  const keys = new Set<string>();
  // Spread the count over levels as evenly as possible, earlier levels first.
  const perLevel = levels.map((_, i) => Math.floor(o.count / levels.length) + (i < o.count % levels.length ? 1 : 0));
  levels.forEach((level, li) => {
    const pool = eligibleTemplates(all, o, level).filter((t) => o.styles.length === 0 || o.styles.includes(t.styleByLevel?.[level] ?? t.style));
    if (pool.length === 0) return;
    let order = rng.shuffle(pool);
    let made = 0;
    let guard = 0;
    while (made < perLevel[li] && guard++ < perLevel[li] * 20) {
      if (order.length === 0) order = rng.shuffle(pool);
      const t = order.shift()!;
      const q = buildQuestion(t, level, o.tier, pickCalc(t, o.calc, rng), freshSeedFrom(rng));
      if (keys.has(q.key)) continue;
      keys.add(q.key);
      out.push(q);
      made++;
    }
  });
  return out;
}

/** Replace one question with a new one from the same template, avoiding duplicates. */
export function regenerate(q: Question, existing: Question[]): Question {
  const keys = new Set(existing.map((e) => e.key));
  for (let i = 0; i < 50; i++) {
    const n = buildQuestion(q.template, q.level, q.tier, q.calc, freshSeed());
    if (!keys.has(n.key)) return n;
  }
  return buildQuestion(q.template, q.level, q.tier, q.calc, freshSeed());
}

function freshSeedFrom(rng: Rng): string {
  return Math.floor(rng.next() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');
}
