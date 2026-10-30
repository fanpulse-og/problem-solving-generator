import { buildQuestion, parseCode, type SetOptions } from './engine/generate';
import { currentSubtopics, templateById } from './engine/registry';
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
  target: 'count',
  marks: 30,
};

/** Worksheet print settings. */
export interface SheetOptions {
  /** What goes on the answer sheet: the full mark scheme, final answers only, or nothing (questions only). */
  answers: 'scheme' | 'answers' | 'none';
  /** Non-calculator questions first, then calculator, each under its own heading. */
  paper: boolean;
}
export const DEFAULT_SHEET: SheetOptions = { answers: 'scheme', paper: false };

export interface UrlState {
  view: View;
  codes: string[];
  index: number;
  options: SetOptions;
  example?: string;
  title?: string;
  sheet?: SheetOptions;
  /** Positions of locked questions (kept when the set is generated again). */
  locked?: number[];
}

/**
 * Everything lives in the URL hash, so any set or question can be shared as a
 * link. Settings are written only when they differ from DEFAULT_OPTIONS, as
 * short readable parameters (tier=H&n=12); lists are separated by "|" because
 * some sub-topic names contain commas. A fresh visit keeps a clean address.
 */
const LIST = '|';
const sameList = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function readHash(hash = location.hash): UrlState {
  const [path, query = ''] = hash.replace(/^#\/?/, '').split('?');
  const view: View = path === 'board' || path === 'worksheet' ? path : 'build';
  const p = new URLSearchParams(query);
  let options: SetOptions = { ...DEFAULT_OPTIONS };
  try {
    // Links made before readable settings: one base64 blob.
    const o = p.get('o');
    if (o) options = { ...options, ...JSON.parse(decodeURIComponent(atob(o))) };
  } catch {
    /* ignore bad options */
  }
  const list = (k: string) => (p.get(k) ?? '').split(LIST).filter(Boolean);
  if (p.has('tier')) options.tier = p.get('tier') as SetOptions['tier'];
  if (p.has('strands')) options.strands = list('strands') as SetOptions['strands'];
  if (p.has('topics')) options.subtopics = list('topics');
  options.subtopics = currentSubtopics(options.subtopics);
  if (p.has('levels')) options.levels = list('levels') as SetOptions['levels'];
  // There is no style filter any more: older links that chose styles open with every style.
  options.styles = [];
  if (p.has('calc')) options.calc = p.get('calc') as SetOptions['calc'];
  if (p.has('n')) options.count = Number(p.get('n')) || DEFAULT_OPTIONS.count;
  if (p.get('target') === 'marks') options.target = 'marks';
  if (p.has('m')) options.marks = Number(p.get('m')) || DEFAULT_OPTIONS.marks;
  return {
    view,
    codes: (p.get('q') ?? '').split(',').filter(Boolean),
    index: Number(p.get('i') ?? 0) || 0,
    options,
    example: p.get('ex') ?? undefined,
    title: p.get('t') ?? undefined,
    locked: (p.get('lk') ?? '').split(',').filter(Boolean).map(Number).filter((n) => Number.isInteger(n) && n >= 0),
    sheet: {
      answers: p.get('ans') === 'answers' || p.get('ans') === 'none' ? (p.get('ans') as SheetOptions['answers']) : 'scheme',
      paper: p.get('paper') === '1',
    },
  };
}

/** The hash for a state, or '' when there is nothing to remember (a clean address). */
export function writeHash(s: UrlState): string {
  const p = new URLSearchParams();
  const o = s.options;
  const d = DEFAULT_OPTIONS;
  if (s.codes.length) p.set('q', s.codes.join(','));
  if (s.index) p.set('i', String(s.index));
  if (o.tier !== d.tier) p.set('tier', o.tier);
  if (!sameList(o.strands, d.strands)) p.set('strands', o.strands.join(LIST));
  if (!sameList(o.subtopics, d.subtopics)) p.set('topics', o.subtopics.join(LIST));
  if (!sameList(o.levels, d.levels)) p.set('levels', o.levels.join(LIST));
  if (o.calc !== d.calc) p.set('calc', o.calc);
  if (o.count !== d.count) p.set('n', String(o.count));
  if (o.target === 'marks') p.set('target', 'marks');
  if ((o.marks ?? d.marks) !== d.marks) p.set('m', String(o.marks));
  if (s.example) p.set('ex', s.example);
  if (s.title) p.set('t', s.title);
  if (s.sheet && s.sheet.answers !== DEFAULT_SHEET.answers) p.set('ans', s.sheet.answers);
  if (s.sheet?.paper) p.set('paper', '1');
  if (s.locked?.length) p.set('lk', s.locked.join(','));
  const query = p.toString().replace(/%2C/g, ',').replace(/%7C/g, '|');
  if (!query && s.view === 'build') return '';
  return `#/${s.view}${query ? `?${query}` : ''}`;
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
