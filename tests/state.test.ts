import { describe, expect, it } from 'vitest';
import { DEFAULT_OPTIONS, DEFAULT_SHEET, readHash, writeHash, type UrlState } from '../src/state';

const base: UrlState = { view: 'build', codes: [], index: 0, options: DEFAULT_OPTIONS, sheet: DEFAULT_SHEET, locked: [] };

describe('URL state', () => {
  it('a fresh visit opens the home page at a clean address', () => {
    expect(writeHash({ ...base, view: 'home' })).toBe('');
    expect(readHash('')).toEqual({ ...base, view: 'home', example: undefined, title: undefined });
    expect(writeHash(base)).toBe('#/build');
    expect(readHash('#/build').view).toBe('build');
  });

  it('old links with settings but no view still open the builder', () => {
    expect(readHash('#?tier=H').view).toBe('build');
  });

  it('only changed settings are written, readably', () => {
    const hash = writeHash({ ...base, options: { ...DEFAULT_OPTIONS, tier: 'H', count: 12 } });
    expect(hash).toBe('#/build?tier=H&n=12');
  });

  it('every setting survives a round trip, including names with commas and ampersands', () => {
    const s: UrlState = {
      view: 'board',
      codes: ['ratio-parts.core.F.nc.abc123', 'geom-scales.stretch.F.c.zz9'],
      index: 1,
      options: {
        tier: 'KS3',
        strands: ['Ratio & Proportion', 'Number'],
        subtopics: ['Fractions, decimals & percentages', 'Sharing in a ratio'],
        levels: ['core', 'stretch'],
        styles: [],
        calc: 'non-calc',
        count: 15,
        target: 'marks',
        marks: 45,
      },
      example: 'ratio-parts.foundational.F.nc.ex1',
      title: 'Year 9 & 10 starter',
      sheet: { answers: 'answers', paper: true, example: true, limit: 3 },
      locked: [0],
    };
    expect(readHash(writeHash(s))).toEqual(s);
  });

  it('links made when there was a style filter open with every style', () => {
    const s = readHash('#/build?tier=H&styles=decide|backwards');
    expect(s.options.tier).toBe('H');
    expect(s.options.styles).toEqual([]);
  });

  it('links shared before this change (one base64 "o" blob) still open with their settings', () => {
    const old = { ...DEFAULT_OPTIONS, tier: 'H', calc: 'calc', count: 6 };
    const hash = `#/worksheet?q=num-profit.core.H.c.x1&o=${btoa(encodeURIComponent(JSON.stringify(old)))}`;
    const s = readHash(hash);
    expect(s.view).toBe('worksheet');
    expect(s.codes).toEqual(['num-profit.core.H.c.x1']);
    expect(s.options).toEqual(old);
  });
});
