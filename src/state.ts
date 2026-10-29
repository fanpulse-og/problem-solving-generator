import { buildQuestion, parseCode, type SetOptions } from './engine/generate';
import { templateById } from './engine/registry';
import type { Question } from './engine/types';

export type View = 'build' | 'board' | 'worksheet';

export const DEFAULT_OPTIONS: SetOptions = {
  tier: 'F',
  strands: [],
  subtopics: [],
  levels: ['foundational', 'core', 'stretch'],
  styles: [],
  calc: 'any',
  count: 9,
};

export interface UrlState {
  view: View;
  codes: string[];
  index: number;
  options: SetOptions;
  example?: string;
  title?: string;
}

/** Everything lives in the URL hash, so any set or question can be shared as a link. */
export function readHash(hash = location.hash): UrlState {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const view: View = path === 'board' || path === 'worksheet' ? path : 'build';
  const p = new URLSearchParams(query);
  let options = DEFAULT_OPTIONS;
  try {
    const o = p.get('o');
    if (o) options = { ...DEFAULT_OPTIONS, ...JSON.parse(decodeURIComponent(atob(o))) };
  } catch {
    /* ignore bad options */
  }
  return {
    view,
    codes: (p.get('q') ?? '').split(',').filter(Boolean),
    index: Number(p.get('i') ?? 0) || 0,
    options,
    example: p.get('ex') ?? undefined,
    title: p.get('t') ?? undefined,
  };
}

export function writeHash(s: UrlState): string {
  const p = new URLSearchParams();
  if (s.codes.length) p.set('q', s.codes.join(','));
  if (s.index) p.set('i', String(s.index));
  p.set('o', btoa(encodeURIComponent(JSON.stringify(s.options))));
  if (s.example) p.set('ex', s.example);
  if (s.title) p.set('t', s.title);
  return `#/${s.view}?${p.toString().replace(/%2C/g, ',')}`;
}

export function questionFromCode(code: string): Question | null {
  const c = parseCode(code);
  if (!c) return null;
  const t = templateById(c.templateId);
  if (!t) return null;
  try {
    return buildQuestion(t, c.level, c.tier, c.calc, c.seed);
  } catch {
    return null;
  }
}

export function shareLink(view: View, codes: string[], options: SetOptions): string {
  return `${location.origin}${location.pathname}${writeHash({ view, codes, index: 0, options })}`;
}
