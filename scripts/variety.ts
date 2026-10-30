// Dev helper: count distinct questions per level over n seeds.
// Usage: vite-node scripts/variety.ts <templateId> [tier] [calc] [n]
import { templateById } from '../src/engine/registry';
import { buildQuestion } from '../src/engine/generate';

const [id, tier = 'H', calc = 'non-calc', n = '200'] = process.argv.slice(2);
const t = templateById(id);
if (!t) throw new Error(`no template ${id}`);
for (const level of t.levels) {
  const keys = new Set<string>();
  for (let i = 0; i < Number(n); i++) keys.add(buildQuestion(t, level, tier as any, calc as any, `v${i}`).key);
  console.log(`${level}: ${keys.size} distinct of ${n}`);
}
