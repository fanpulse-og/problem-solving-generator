// Dev helper: print questions as plain text. Usage: vite-node scripts/print.ts <templateId> [level] [tier] [calc] [n]
import { templateById } from '../src/engine/registry';
import { buildQuestion } from '../src/engine/generate';
import type { Block } from '../src/engine/types';

const [id, level = 'core', tier = 'F', calc = 'non-calc', n = '3'] = process.argv.slice(2);
const t = templateById(id);
if (!t) throw new Error(`no template ${id}`);
const show = (b: Block): string =>
  b.kind === 'text' ? b.text : b.kind === 'box' ? `[BOX] ${b.lines.join(' / ')}` : b.kind === 'cards' ? `[CARDS] ${b.values.join(' | ')}` : b.kind === 'table' ? `[TABLE] ${JSON.stringify(b.table)}` : `[DIAGRAM] ${JSON.stringify(b.diagram)}`;
for (let i = 0; i < Number(n); i++) {
  const q = buildQuestion(t, level as any, tier as any, calc as any, `p${i}`);
  console.log(`\n=== ${q.code} (${q.marks} marks)`);
  q.content.stem.forEach((b) => console.log(show(b)));
  q.content.parts.forEach((p, pi) => {
    console.log(`  (${p.label ?? '-'}) ${p.blocks.map(show).join(' ')}  [${p.marks}]`);
    q.scheme[pi].forEach((s) => console.log(`      ${s.code}  ${s.working}   // ${s.note}`));
    console.log(`      ANSWER: ${q.answers[pi].text}`);
  });
}
