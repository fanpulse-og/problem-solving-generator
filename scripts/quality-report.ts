// Quality report: runs every template across ~N seeds (default 2000, spread
// over its tier × level × calculator combinations) and counts questions where
//   (a) an answer is not tidy,
//   (b) a non-calculator question needs arithmetic beyond NONCALC_LIMIT,
//   (c) the mark scheme does not add up to the marks shown,
//   (d) the generator throws.
// Prints a table and writes docs/quality-report.md.
// Usage: npx vite-node scripts/quality-report.ts [seedsPerTemplate]
import { writeFileSync } from 'node:fs';
import { TEMPLATES } from '../src/engine/registry';
import { buildQuestion } from '../src/engine/generate';
import { NONCALC_LIMIT, arithmeticIssues, untidyAnswers } from '../src/engine/arithmetic';
import type { Calc } from '../src/engine/types';

const perTemplate = Number(process.argv[2] ?? 2000);

interface Row {
  id: string;
  seeds: number;
  untidy: number;
  heavy: number;
  nonCalcSeeds: number;
  marks: number;
  throws: number;
  example: string;
}

const rows: Row[] = [];
for (const t of TEMPLATES) {
  const calcs: Calc[] = t.calculator === 'either' ? ['non-calc', 'calc'] : [t.calculator];
  const combos = t.tiers.flatMap((tier) => t.levels.flatMap((level) => calcs.map((calc) => ({ tier, level, calc }))));
  const each = Math.ceil(perTemplate / combos.length);
  const r: Row = { id: t.id, seeds: 0, untidy: 0, heavy: 0, nonCalcSeeds: 0, marks: 0, throws: 0, example: '' };
  const note = (what: string) => {
    if (!r.example) r.example = what;
  };
  for (const { tier, level, calc } of combos) {
    for (let i = 0; i < each; i++) {
      r.seeds++;
      let q;
      try {
        q = buildQuestion(t, level, tier, calc, `qr${i}`);
      } catch (e) {
        r.throws++;
        note(`throws: ${(e as Error).message.slice(0, 80)}`);
        continue;
      }
      const untidy = untidyAnswers(q);
      if (untidy.length) {
        r.untidy++;
        note(`untidy ${q.code}: ${untidy[0].slice(0, 60)}`);
      }
      if (calc === 'non-calc') {
        r.nonCalcSeeds++;
        const issues = arithmeticIssues(q);
        if (issues.length) {
          r.heavy++;
          note(`heavy ${q.code}: ${issues[0].reason}`);
        }
      }
      const badMarks = q.content.parts.some((p, pi) => q.scheme[pi]?.length !== p.marks) || q.answers.length !== q.content.parts.length;
      if (badMarks) {
        r.marks++;
        note(`marks ${q.code}`);
      }
    }
  }
  rows.push(r);
}

const pct = (n: number, d: number) => (d === 0 ? '–' : n === 0 ? '0' : `${n} (${((100 * n) / d).toFixed(1)}%)`);
const header = ['Template', 'Seeds', '(a) Untidy answer', '(b) Non-calc too heavy', '(c) Marks wrong', '(d) Throws', 'First example'];
const body = rows
  .sort((x, y) => y.heavy + y.untidy + y.marks + y.throws - (x.heavy + x.untidy + x.marks + x.throws) || x.id.localeCompare(y.id))
  .map((r) => [r.id, String(r.seeds), pct(r.untidy, r.seeds), r.nonCalcSeeds ? pct(r.heavy, r.nonCalcSeeds) : '–', pct(r.marks, r.seeds), pct(r.throws, r.seeds), r.example || 'OK']);
const flagged = rows.filter((r) => r.untidy + r.heavy + r.marks + r.throws > 0).length;
const totals = rows.reduce((a, r) => ({ seeds: a.seeds + r.seeds, issues: a.issues + r.untidy + r.heavy + r.marks + r.throws }), { seeds: 0, issues: 0 });

// Console: aligned columns, without the long example column.
const widths = header.slice(0, 6).map((h, i) => Math.max(h.length, ...body.map((b) => b[i].length)));
const line = (cells: string[]) => cells.slice(0, 6).map((c, i) => (i === 0 ? c.padEnd(widths[i]) : c.padStart(widths[i]))).join('  ');
console.log(line(header));
console.log(widths.map((w) => '-'.repeat(w)).join('  '));
body.forEach((b) => console.log(line(b)));
console.log(`\n${rows.length} templates, ${totals.seeds} questions; ${flagged} templates flagged, ${totals.issues} flagged questions.`);
console.log(`Non-calculator limit: multiplication/division up to ${NONCALC_LIMIT.product} significant-digit pairs (e.g. 3-digit × 2-digit), numbers up to ${NONCALC_LIMIT.digits} significant digits.`);

const md = [
  '# Question quality report',
  '',
  `Generated ${new Date().toISOString().slice(0, 10)} by \`scripts/quality-report.ts\` with about ${perTemplate} seeds per template (${totals.seeds} questions).`,
  '',
  '- **(a) Untidy answer:** a number with more decimal places than the question asks for, a “…”, or a fraction with a denominator over 1000.',
  `- **(b) Non-calc too heavy:** non-calculator questions only. The mark-scheme working multiplies or divides numbers whose significant digits multiply to more than ${NONCALC_LIMIT.product} (3-digit × 2-digit is the most allowed; a 1-digit divisor is always fine), or uses a number with more than ${NONCALC_LIMIT.digits} significant digits.`,
  '- **(c) Marks wrong:** the mark-scheme steps do not match the marks shown, or an answer is missing.',
  '- **(d) Throws:** the generator could not make a question.',
  '',
  `**${flagged} of ${rows.length} templates flagged.**`,
  '',
  `| ${header.join(' | ')} |`,
  `| ${header.map((_, i) => (i === 0 || i === 6 ? '---' : '---:')).join(' | ')} |`,
  ...body.map((b) => `| ${b.map((c) => c.replace(/\|/g, '\\|')).join(' | ')} |`),
  '',
].join('\n');
writeFileSync('docs/quality-report.md', md);
console.log('Written to docs/quality-report.md');
