import { useMemo } from 'react';
import { eligibleTemplates, type SetOptions } from '../engine/generate';
import { TEMPLATES, subtopicsByStrand } from '../engine/registry';
import { LEVELS, STRANDS, STYLES, TIERS, type Level, type StyleId, type Tier } from '../engine/types';

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

/** Switch tier, dropping any ticked sub-topics (and emptied strands) that the new tier doesn't have. */
export function withTier(o: SetOptions, tier: Tier): SetOptions {
  const subs = subtopicsByStrand(tier);
  const strands = o.strands.filter((s) => (subs.get(s) ?? []).length > 0);
  const offered = strands.flatMap((s) => subs.get(s) ?? []);
  const kept = o.subtopics.filter((x) => offered.includes(x));
  // If none of the chosen sub-topics survive, fall back to every sub-topic in the chosen strands.
  return { ...o, tier, strands, subtopics: kept.length === offered.length ? [] : kept };
}

export function Controls({ options: o, onChange, onGenerate, lockedCount = 0 }: Props) {
  // Only the sub-topics taught at this tier (Edexcel Foundation / Higher content, KS3 programme of study).
  const subs = useMemo(() => subtopicsByStrand(o.tier), [o.tier]);
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
        <p className="hint">Leave all unticked for a mix of everything.</p>
        {STRANDS.map((s) => {
          const list = subs.get(s) ?? [];
          const on = o.strands.includes(s);
          return (
            <div key={s} className="strand">
              <label className="check">
                <input
                  type="checkbox"
                  checked={on}
                  disabled={list.length === 0}
                  onChange={() => onChange({ ...o, strands: toggle(o.strands, s), subtopics: on ? o.subtopics.filter((x) => !list.includes(x)) : o.subtopics })}
                />
                {s}
                {list.length === 0 && <span className="soon"> (coming soon)</span>}
              </label>
              {on && list.length > 0 && (
                <div className="subtopics">
                  {list.map((st) => (
                    <label key={st} className="check small">
                      <input
                        type="checkbox"
                        checked={o.subtopics.length === 0 || o.subtopics.includes(st)}
                        onChange={() => {
                          // An empty list means "all sub-topics"; expand it before toggling one off.
                          const all = o.strands.flatMap((x) => subs.get(x) ?? []);
                          const next = toggle(o.subtopics.length ? o.subtopics : all, st);
                          onChange({ ...o, subtopics: next.length === all.length ? [] : next });
                        }}
                      />
                      {st}
                    </label>
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
