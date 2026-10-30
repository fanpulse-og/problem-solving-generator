// Print questions as plain text, to read the wording and mark scheme:
//   npx vite-node scripts/show.ts <code> [<code> ...]
import { questionFromCode } from '../src/state';
import type { Block } from '../src/engine/types';
const b = (x: Block): string => (x.kind === 'text' ? x.text : x.kind === 'table' ? `[table ${JSON.stringify([x.table.header, ...x.table.rows])}]` : x.kind === 'diagram' ? `[${x.diagram.type}]` : JSON.stringify(x));
for (const code of process.argv.slice(2)) {
  const q = questionFromCode(code)!;
  console.log(`\n=== ${code} (${q.marks} marks)`);
  q.content.stem.forEach((x) => console.log(b(x)));
  q.content.parts.forEach((p, i) => {
    console.log(`(${p.label ?? '-'}) ${p.blocks.map(b).join(' | ')} [${p.marks}]`);
    console.log(`   ANS: ${q.answers[i].text}`);
    q.scheme[i].forEach((s) => console.log(`   ${s.code} ${s.working}  — ${s.note}`));
  });
}
