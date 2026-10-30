import { useEffect, useState } from 'react';
import type { SetOptions } from '../engine/generate';
import { LEVELS, STYLES, type Question } from '../engine/types';
import { Controls } from '../components/Controls';
import { MarkScheme, QuestionView } from '../components/QuestionView';
import { shareLink } from '../state';
import { ReportProblem } from '../components/ReportProblem';
import type { SavedSet } from '../saved';

interface Edit {
  toggleLock: (i: number) => void;
  remove: (i: number) => void;
  move: (i: number, by: -1 | 1) => void;
  addOne: () => void;
}
interface Saved {
  list: SavedSet[];
  error: boolean;
  save: (name: string) => void;
  open: (s: SavedSet) => void;
  regenerate: (s: SavedSet) => void;
  remove: (id: string) => void;
}

interface Props {
  options: SetOptions;
  questions: Question[];
  locked: Set<string>;
  edit: Edit;
  saved: Saved;
  onOptions: (o: SetOptions) => void;
  onGenerate: () => void;
  onRegenerate: (i: number) => void;
  onPresent: (i: number) => void;
}

export function BuilderView({ options, questions, locked, edit, saved, onOptions, onGenerate, onRegenerate, onPresent }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const marks = questions.reduce((s, q) => s + q.marks, 0);
  const nLocked = questions.filter((q) => locked.has(q.code)).length;

  // Close an open "More" menu when clicking anywhere outside it.
  useEffect(() => {
    const close = (e: MouseEvent) => document.querySelectorAll('details.more[open]').forEach((d) => !d.contains(e.target as Node) && d.removeAttribute('open'));
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  const copy = async (q: Question) => {
    const url = shareLink('board', [q.code], options);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(q.code);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      prompt('Copy this link:', url);
    }
  };

  return (
    <div className="builder">
      <aside className="sidebar">
        <Controls options={options} onChange={onOptions} onGenerate={onGenerate} lockedCount={nLocked} />
        <SavedSets saved={saved} canSave={questions.length > 0} />
      </aside>
      <section className="results" aria-label="Generated questions">
        {questions.length === 0 ? (
          <div className="empty">
            <h2>Choose your options, then generate</h2>
            <p>Every question is generated fresh from a template, with a worked mark scheme. Use Board for the projector, or Worksheet to print.</p>
          </div>
        ) : (
          <>
            <p className="set-summary" aria-live="polite">
              {questions.length} question{questions.length === 1 ? '' : 's'} · {marks} marks{nLocked ? ` · ${nLocked} locked (kept when you generate again)` : ''}
            </p>
            {questions.map((q, i) => {
              const isLocked = locked.has(q.code);
              return (
                <article key={q.code} className={`qcard-outer accent-${i % 6}${isLocked ? ' locked' : ''}`}>
                  <header className="qmeta">
                    <span className={`badge level-${q.level}`}>{LEVELS.find((l) => l.id === q.level)!.label}</span>
                    <span className="badge">{q.calc === 'calc' ? 'Calculator' : 'Non-calculator'}</span>
                    {isLocked && <span className="badge lock-badge">Locked</span>}
                    <span className="meta-text">
                      {q.template.strand} · {q.template.title} · {STYLES[q.style]}
                    </span>
                    <span className="meta-marks">{q.marks} marks</span>
                  </header>
                  <QuestionView q={q} number={i + 1} />
                  <div className="qactions">
                    <button type="button" onClick={() => onRegenerate(i)} disabled={isLocked} title={isLocked ? 'Unlock it to change this question' : undefined}>
                      Generate new
                    </button>
                    <button type="button" aria-pressed={isLocked} onClick={() => edit.toggleLock(i)}>
                      {isLocked ? 'Unlock' : 'Lock'}
                    </button>
                    <button type="button" aria-expanded={!!open[q.code]} onClick={() => setOpen({ ...open, [q.code]: !open[q.code] })}>
                      {open[q.code] ? 'Hide mark scheme' : 'Show mark scheme'}
                    </button>
                    <button type="button" onClick={() => onPresent(i)}>
                      Show on board
                    </button>
                    <details className="more">
                      <summary>More</summary>
                      <div className="menu">
                        <button type="button" onClick={() => copy(q)}>
                          {copied === q.code ? 'Link copied' : 'Copy link'}
                        </button>
                        <ReportProblem q={q} />
                      </div>
                    </details>
                    <span className="order-actions">
                      <button type="button" onClick={() => edit.move(i, -1)} disabled={i === 0} aria-label={`Move question ${i + 1} up`} title="Move up">
                        ↑
                      </button>
                      <button type="button" onClick={() => edit.move(i, 1)} disabled={i === questions.length - 1} aria-label={`Move question ${i + 1} down`} title="Move down">
                        ↓
                      </button>
                      <button type="button" className="danger" onClick={() => edit.remove(i)} aria-label={`Delete question ${i + 1}`}>
                        Delete
                      </button>
                    </span>
                  </div>
                  {open[q.code] && <MarkScheme q={q} />}
                </article>
              );
            })}
            <button type="button" className="add-one" onClick={edit.addOne}>
              + Add one more question
            </button>
          </>
        )}
      </section>
    </div>
  );
}

/** Sets saved in this browser: open again exactly, or regenerate with the same settings. */
function SavedSets({ saved, canSave }: { saved: Saved; canSave: boolean }) {
  const [name, setName] = useState('');
  const date = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return (
    <section className="saved-sets" aria-labelledby="saved-heading">
      <h2 id="saved-heading">Saved sets</h2>
      <form
        className="save-row"
        onSubmit={(e) => {
          e.preventDefault();
          saved.save(name);
          setName('');
        }}
      >
        <label className="sr-only" htmlFor="save-name">
          Name for this set
        </label>
        <input id="save-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name, e.g. 10X Friday" disabled={!canSave} />
        <button type="submit" disabled={!canSave}>
          Save set
        </button>
      </form>
      {saved.error && <p className="hint warn">This browser would not save (storage is full or blocked).</p>}
      {saved.list.length === 0 ? (
        <p className="hint">Saved sets stay in this browser only.</p>
      ) : (
        <ul className="saved-list">
          {saved.list.map((s) => (
            <li key={s.id}>
              <span className="saved-name">{s.name}</span>
              <span className="hint">
                {s.codes.length} questions · {date(s.savedAt)}
              </span>
              <span className="saved-actions">
                <button type="button" onClick={() => saved.open(s)}>
                  Open
                </button>
                <button type="button" onClick={() => saved.regenerate(s)} title="A new set of questions with the same settings">
                  New questions
                </button>
                <button type="button" className="danger" onClick={() => saved.remove(s.id)} aria-label={`Delete saved set ${s.name}`}>
                  Delete
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
