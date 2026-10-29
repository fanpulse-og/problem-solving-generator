import { useMemo } from 'react';
import { eligibleTemplates, type SetOptions } from '../engine/generate';
import { TEMPLATES, subtopicsByStrand } from '../engine/registry';
import { LEVELS, STRANDS, STYLES, TIERS, type Level, type StyleId } from '../engine/types';

interface Props {
  options: SetOptions;
  onChange: (o: SetOptions) => void;
  onGenerate: () => void;
}

function toggle<T>(list: T[], x: T): T[] {
  return list.includes(x) ? list.filter((y) => y !== x) : [...list, x];
}

export function Controls({ options: o, onChange, onGenerate }: Props) {
  const subs = useMemo(() => subtopicsByStrand(), []);
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
            <button type="button" key={t.id} role="radio" aria-checked={o.tier === t.id} className={o.tier === t.id ? 'on' : ''} onClick={() => onChange({ ...o, tier: t.id })}>
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
        <legend>
          <label htmlFor="count">Number of questions</label>
        </legend>
        <input id="count" type="number" min={1} max={30} value={o.count} onChange={(e) => onChange({ ...o, count: Math.max(1, Math.min(30, Number(e.target.value) || 1)) })} />
      </fieldset>

      <button type="submit" className="primary big" disabled={matching === 0 || o.levels.length === 0}>
        Generate questions
      </button>
      <p className="hint" aria-live="polite">
        {matching === 0 || o.levels.length === 0 ? 'No templates match these choices yet.' : `${matching} question type${matching === 1 ? '' : 's'} match.`}
      </p>
    </form>
  );
}
