import type { Block, DiagramSpec, MarkCode, MarkStep, Part, TableSpec } from './types';

/** Shorthand builders used by templates. */
export const text = (s: string): Block => ({ kind: 'text', text: s });
export const lines = (...s: string[]): Block[] => s.map(text);
export const box = (...l: string[]): Block => ({ kind: 'box', lines: l });
export const table = (t: TableSpec): Block => ({ kind: 'table', table: t });
export const cards = (values: string[]): Block => ({ kind: 'cards', values });
export const diagram = (d: DiagramSpec): Block => ({ kind: 'diagram', diagram: d });

export const single = (marks: number, ...blocks: Block[]): Part => ({ label: null, blocks, marks });
export const part = (label: string, marks: number, ...blocks: Block[]): Part => ({ label, blocks, marks });

export const step = (code: MarkCode, working: string, note: string): MarkStep => ({ code, working, note });

/** Unicode operators for plain-text working (not KaTeX). */
export const TIMES = '×';
export const DIV = '÷';
export const MINUS = '−';

/** Edexcel style: end with a full stop unless the line ends in a number. */
export const sentence = (s: string): string => (/\d$/.test(s) ? s : `${s}.`);
