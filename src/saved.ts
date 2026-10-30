import type { SetOptions } from './engine/generate';
import { currentSubtopics } from './engine/registry';
import type { SheetOptions } from './state';

/** A set saved in this browser (localStorage). It holds codes, so it reopens exactly. */
export interface SavedSet {
  id: string;
  name: string;
  savedAt: string; // ISO date
  options: SetOptions;
  codes: string[];
  locked: string[];
  example?: string;
  title?: string;
  sheet?: SheetOptions;
}

const KEY = 'psg.savedSets.v1';

export function loadSaved(): SavedSet[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as SavedSet[]) : [];
    return Array.isArray(list)
      ? list.filter((s) => s && typeof s.name === 'string' && Array.isArray(s.codes)).map((s) => ({ ...s, options: { ...s.options, subtopics: currentSubtopics(s.options?.subtopics ?? []), styles: [] } }))
      : [];
  } catch {
    return []; // storage blocked (private browsing, settings): the app still works, it just can't save
  }
}

/** Save the list; false if the browser refused (full or blocked). */
export function storeSaved(list: SavedSet[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
    return true;
  } catch {
    return false;
  }
}
