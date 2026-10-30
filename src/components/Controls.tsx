import { useMemo, useState } from 'react';
import { eligibleTemplates, type SetOptions } from '../engine/generate';
import { TEMPLATES, subtopicsByStrand } from '../engine/registry';
import { LEVELS, STRANDS, STYLES, TIERS, type Level, type StyleId, type Strand, type Tier } from '../engine/types';

interface Props {
  options: SetOptions;
  onChange: (o: SetOptions) => void;
  onGenerate: () => void;
  /** Locked questions are kept when generating again. */
  lockedCount?: number;
}

function toggle<T>(list: T[], x: T): T[] {
  return list.includes(x) ? list.filter((y) => y !== x) : [...list, x];
}

const toggleSet = (set: Set<string>, x: string, on: boolean) => {
  const next = new Set(set);
  if (on) next.add(x);
  else next.delete(x);
  return next;
};

/** A strand is off, all of it ("All" ticked, no sub-topics picked) or some of it (picked sub-topics only). */
export function strandState(o: SetOptions, s: Strand, list: string[]): 'off' | 'all' | 'some' {
  if (!o.strands.includes(s)) return 'off';
  return list.some((st) => o.subtopics.includes(st)) ? 'some' : 'all';
}

/** Tick or untick "All" for a strand. */
export function pickStrand(o: SetOptions, s: Strand, list: string[]): SetOptions {
  const subtopics = o.subtopics.filter((x) => !list.includes(x));
  return strandState(o, s, list) === 'all' ? { ...o, strands: o.strands.filter((x) => x !== s), subtopics } : { ...o, strands: o.strands.includes(s) ? o.strands : [...o.strands, s], subtopics };
}

/** Tick or untick one sub-topic: ticking one from nothing chooses just that sub-topic. */
export function pickSubtopic(o: SetOptions, s: Strand, st: string, list: string[]): SetOptions {
  if (o.subtopics.includes(st)) {
    const subtopics = o.subtopics.filter((x) => x !== st);
    const left = list.some((x) => subtopics.includes(x));
    return { ...o, subtopics, strands: left ? o.strands : o.strands.filter((x) => x !== s) };
  }
  return { ...o, strands: o.strands.includes(s) ? o.strands : [...o.strands, s], subtopics: [...o.subtopics, st] };
}

/** Switch tier, dropping any ticked sub-topics (and emptied strands) that the new tier doesn't have. */
export function withTier(o: SetOptions, tier: Tier): SetOptions {
  const subs = subtopicsByStrand(tier);
  const strands = o.strands.filter((s) => (subs.get(s) ?? []).length > 0);
  const offered = strands.flatMap((s) => subs.get(s) ?? []);
  // A strand whose picked sub-topics all disappear falls back to the whole strand.
  return { ...o, tier, strands, subtopics: o.subtopics.filter((x) => offered.includes(x)) };
}

export function Controls({ options: o, onChange, onGenerate, lockedCount = 0 }: Props) {
  // Only the sub-topics taught at this tier (Edexcel Foundation / Higher content, KS3 programme of study).
  const subs = useMemo(() => subtopicsByStrand(o.tier), [o.tier]);
  // Strands start open when something in them is chosen.
  const [open, setOpen] = useState<Set<string>>(() => new Set(o.strands));
  const available = eligibleTemplates(TEMPLATES, { ...o, styles: [] });
  const stylesInUse = new Set<StyleId>(available.flatMap((t) => [t.style, ...Object.values(t.styleByLevel ?? {})]));
  const matching = eligibleTemplates(TEMPLATES, o).length;

  return (
    <form
      className="controls"
      onSubmit={(e) => {
        e.preventDefault();
        onGenerate();
      }}
    >
      <fieldset>
        <legend>Key stage / tier</legend>
        <div className="seg" role="radiogroup" aria-label="Key stage or tier">
          {TIERS.map((t) => (
            <button type="button" key={t.id} role="radio" aria-checked={o.tier === t.id} className={o.tier === t.id ? 'on' : ''} onClick={() => onChange(withTier(o, t.id))}>
              {t.label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Topics</legend>
        <p className="hint">
          Leave all unticked for a mix of everything.
          {o.strands.length > 0 && (
            <>
              {' '}
              <button type="button" className="link" onClick={() => onChange({ ...o, strands: [], subtopics: [] })}>
                Clear topics
              </button>
            </>
          )}
        </p>
        <div className="strand-list">
          {STRANDS.map((s) => {
            const list = subs.get(s) ?? [];
            if (list.length === 0) return null;
            const state = strandState(o, s, list);
            const picked = list.filter((st) => o.subtopics.includes(st)).length;
            return (
              <details key={s} className={`strand ${state}`} open={open.has(s)} onToggle={(e) => {
                  const isOpen = e.currentTarget.open; // read now: the event is gone by the time the updater runs
                  setOpen((prev) => toggleSet(prev, s, isOpen));
                }}>
                <summary>
                  <span className="strand-name">{s}</span>
                  <span className="strand-state">{state === 'all' ? 'All' : state === 'some' ? `${picked} of ${list.length}` : ''}</span>
                </summary>
                <div className="subtopics">
                  <label className="check small all-row">
                    <input type="checkbox" checked={state === 'all'} onChange={() => onChange(pickStrand(o, s, list))} />
                    All {s.toLowerCase().replace('&', 'and')} topics
                  </label>
                  {list.map((st) => (
                    <label key={st} className="check small">
                      <input type="checkbox" checked={o.subtopics.includes(st)} onChange={() => onChange(pickSubtopic(o, s, st, list))} />
                      {st}
                    </label>
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend>Difficulty</legend>
        {LEVELS.map((l) => (
          <label key={l.id} className="check">
            <input type="checkbox" checked={o.levels.includes(l.id)} onChange={() => onChange({ ...o, levels: toggle<Level>(o.levels, l.id) })} />
            {l.label}
          </label>
        ))}
      </fieldset>

      <fieldset>
        <legend>Question style</legend>
        <p className="hint">Leave all unticked for any style.</p>
        {(Object.keys(STYLES) as StyleId[])
          .filter((s) => stylesInUse.has(s))
          .map((s) => (
            <label key={s} className="check">
              <input type="checkbox" checked={o.styles.includes(s)} onChange={() => onChange({ ...o, styles: toggle(o.styles, s) })} />
              {STYLES[s]}
            </label>
          ))}
      </fieldset>

      <fieldset>
        <legend>Calculator</legend>
        <div className="seg" role="radiogroup" aria-label="Calculator">
          {(
            [
              ['any', 'Either'],
              ['non-calc', 'Non-calculator'],
              ['calc', 'Calculator'],
            ] as const
          ).map(([id, label]) => (
            <button type="button" key={id} role="radio" aria-checked={o.calc === id} className={o.calc === id ? 'on' : ''} onClick={() => onChange({ ...o, calc: id })}>
              {label}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Size of the set</legend>
        <div className="target-row">
          <label className="check">
            <input type="radio" name="target" checked={o.target !== 'marks'} onChange={() => onChange({ ...o, target: 'count' })} />
            Number of questions
          </label>
          <input
            aria-label="Number of questions"
            type="number"
            min={1}
            max={30}
            value={o.count}
            disabled={o.target === 'marks'}
            onChange={(e) => onChange({ ...o, count: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })}
          />
        </div>
        <div className="target-row">
          <label className="check">
            <input type="radio" name="target" checked={o.target === 'marks'} onChange={() => onChange({ ...o, target: 'marks' })} />
            About this many marks
          </label>
          <input
            aria-label="Total marks"
            type="number"
            min={5}
            max={120}
            value={o.marks ?? 30}
            disabled={o.target !== 'marks'}
            onChange={(e) => onChange({ ...o, marks: Math.max(5, Math.min(120, Number(e.target.value) || 5)) })}
          />
        </div>
      </fieldset>

      <button type="submit" className="primary big" disabled={matching === 0 || o.levels.length === 0}>
        {lockedCount ? `Generate (keeping ${lockedCount} locked)` : 'Generate questions'}
      </button>
      <p className="hint" aria-live="polite">
        {matching === 0 || o.levels.length === 0 ? 'No templates match these choices yet.' : `${matching} question type${matching === 1 ? '' : 's'} match.`}
      </p>
    </form>
  );
}
