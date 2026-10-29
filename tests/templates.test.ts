import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../src/engine/registry';
import { buildQuestion, generateSet } from '../src/engine/generate';
import type { Block, Calc, Level, Question, Tier } from '../src/engine/types';

/**
 * Every template × level × tier × calculator mode is generated SEEDS times.
 * Each question must validate, pass its independent check(), have marks that
 * match the mark scheme, and render without NaN/undefined or broken KaTeX.
 */
const SEEDS = Number(process.env.SEEDS ?? 500);

function blockStrings(b: Block): string[] {
  switch (b.kind) {
    case 'text':
      return [b.text];
    case 'box':
      return b.lines;
    case 'cards':
      return b.values;
    case 'table':
      return [...(b.table.header ?? []), ...b.table.rows.flat()];
    case 'diagram':
      return JSON.stringify(b.diagram).match(/"(?:text|label|lengthLabel|widthLabel)":"([^"]*)"/g) ?? [];
  }
}

function allStrings(q: Question): string[] {
  const s: string[] = [];
  q.content.stem.forEach((b) => s.push(...blockStrings(b)));
  q.content.parts.forEach((p) => p.blocks.forEach((b) => s.push(...blockStrings(b))));
  q.answers.forEach((a) => s.push(a.text));
  q.scheme.forEach((ps) => ps.forEach((st) => s.push(st.working, st.note)));
  return s;
}

function mathSegments(s: string): string[] {
  const out: string[] = [];
  const re = /\$([^$]+)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) out.push(m[1]);
  return out;
}

function lint(q: Question): string[] {
  const problems: string[] = [];
  for (const s of allStrings(q)) {
    if (/NaN|undefined|Infinity|\[object/.test(s)) problems.push(`bad token in "${s}"`);
    if ((s.match(/\$/g)?.length ?? 0) % 2) problems.push(`unbalanced $ in "${s}"`);
    for (const m of mathSegments(s)) {
      try {
        katex.renderToString(m.replace(/ /g, '\\,'), { throwOnError: true });
      } catch (e) {
        problems.push(`KaTeX error in "${m}": ${(e as Error).message}`);
      }
    }
    if (/£\d+\.\d(?!\d)/.test(s)) problems.push(`money with 1 dp in "${s}"`);
    if (/\d\.0+(?!\d)(?![^$]*\$)/.test(s.replace(/\$[^$]*\$/g, '')) && !/to \d decimal/.test(s)) {
      // trailing .0 is only acceptable when the question asks for that accuracy
      if (!/\d\.\d*[1-9]/.test(s) && /\b\d+\.0\b/.test(s)) problems.push(`trailing .0 in "${s}"`);
    }
  }
  // Edexcel style: a stem line that ends in a number has no full stop.
  q.content.stem.forEach((b) => {
    if (b.kind === 'text' && /\d\.$/.test(b.text) && !/Year \d+\.$/.test(b.text)) problems.push(`full stop after number: "${b.text}"`);
  });
  return problems;
}

for (const t of TEMPLATES) {
  describe(t.id, () => {
    const calcs: Calc[] = t.calculator === 'either' ? ['non-calc', 'calc'] : [t.calculator];
    for (const tier of t.tiers as Tier[]) {
      for (const level of t.levels as Level[]) {
        for (const calc of calcs) {
          it(`${tier} ${level} ${calc}: ${SEEDS} seeds valid, checked and well-formed`, () => {
            const failures: string[] = [];
            for (let i = 0; i < SEEDS; i++) {
              const seed = `t${i}`;
              let q: Question;
              try {
                q = buildQuestion(t, level, tier, calc, seed);
              } catch (e) {
                failures.push(`${seed}: ${(e as Error).message}`);
                continue;
              }
              const errs = [...t.validate(q.vars), ...t.check(q.vars, q.answers), ...lint(q)];
              if (q.answers.length !== q.content.parts.length) errs.push('answers/parts count');
              if (q.scheme.length !== q.content.parts.length) errs.push('scheme/parts count');
              q.content.parts.forEach((p, pi) => {
                if (q.scheme[pi]?.length !== p.marks) errs.push(`part ${p.label ?? '-'}: ${p.marks} marks but ${q.scheme[pi]?.length} steps`);
              });
              // Determinism: the same code gives the same question.
              const again = buildQuestion(t, level, tier, calc, seed);
              if (JSON.stringify(again.content) !== JSON.stringify(q.content)) errs.push('not deterministic');
              if (errs.length) failures.push(`${q.code}: ${errs.join(' | ')}`);
              if (failures.length > 10) break;
            }
            expect(failures.join('\n')).toBe('');
          });
        }
      }
    }
  });
}

describe('sets', () => {
  it('a 20-question set has no duplicate questions', () => {
    for (let s = 0; s < 20; s++) {
      for (const tier of ['KS3', 'F', 'H'] as Tier[]) {
        const set = generateSet(TEMPLATES, { tier, strands: [], subtopics: [], levels: ['foundational', 'core', 'stretch'], styles: [], calc: 'any', count: 20 }, `s${s}`);
        const keys = set.map((q) => q.key);
        expect(new Set(keys).size).toBe(keys.length);
        // ordered foundational -> core -> stretch
        const order = { foundational: 0, core: 1, stretch: 2 } as const;
        for (let i = 1; i < set.length; i++) expect(order[set[i].level]).toBeGreaterThanOrEqual(order[set[i - 1].level]);
      }
    }
  });
});

describe('code hygiene', () => {
  it('never passes dec/roundDp straight to .map (the index would become the number of decimal places)', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const dir = path.resolve(__dirname, '../src/templates');
    const files = fs.readdirSync(dir, { recursive: true }).filter((f) => String(f).endsWith('.ts'));
    const bad = files.filter((f) => /\.map\((dec|roundDp|money)\)/.test(fs.readFileSync(path.join(dir, String(f)), 'utf8')));
    expect(bad).toEqual([]);
  });
});
