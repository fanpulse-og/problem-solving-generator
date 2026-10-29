import type { Template } from './types';

// Every template file in src/templates is picked up automatically:
// add a file with a default-exported template and it appears in the app.
const modules = import.meta.glob('../templates/**/*.ts', { eager: true }) as Record<string, { default?: Template }>;

export const TEMPLATES: Template[] = Object.entries(modules)
  .filter(([path]) => !path.includes('/_'))
  .map(([path, m]) => {
    if (!m.default) throw new Error(`${path} has no default export`);
    return m.default;
  })
  .sort((a, b) => a.strand.localeCompare(b.strand) || a.subtopic.localeCompare(b.subtopic) || a.title.localeCompare(b.title));

const seen = new Set<string>();
for (const t of TEMPLATES) {
  if (seen.has(t.id)) throw new Error(`Duplicate template id ${t.id}`);
  seen.add(t.id);
}

export function templateById(id: string): Template | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function subtopicsByStrand(): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const t of TEMPLATES) {
    const list = m.get(t.strand) ?? [];
    if (!list.includes(t.subtopic)) list.push(t.subtopic);
    m.set(t.strand, list);
  }
  return m;
}
