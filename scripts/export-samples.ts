// Export generated questions as JSON lines, for independent checking outside
// the app (see scripts/crosscheck.py). Usage:
//   npx vite-node scripts/export-samples.ts [seedsPerCombination] > samples.jsonl
import { TEMPLATES } from '../src/engine/registry';
import { buildQuestion } from '../src/engine/generate';
import { Q } from '../src/engine/rational';
import type { Calc } from '../src/engine/types';

const n = Number(process.argv[2] ?? 40);
const replacer = (_k: string, v: unknown) => (v instanceof Q ? { $q: `${v.n}/${v.d}` } : typeof v === 'bigint' ? String(v) : v);

for (const t of TEMPLATES) {
  const calcs: Calc[] = t.calculator === 'either' ? ['non-calc', 'calc'] : [t.calculator];
  for (const tier of [...t.tiers, ...(t.formerTiers ?? [])])
    for (const level of t.levels)
      for (const calc of calcs)
        for (let i = 0; i < n; i++) {
          const q = buildQuestion(t, level, tier, calc, `x${i}`);
          process.stdout.write(JSON.stringify({ id: t.id, code: q.code, level, tier, calc, vars: q.vars, answers: q.answers.map((a) => a.text) }, replacer) + '\n');
        }
}
