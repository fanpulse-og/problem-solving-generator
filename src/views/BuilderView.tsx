import { useState } from 'react';
import type { SetOptions } from '../engine/generate';
import { LEVELS, STYLES, type Question } from '../engine/types';
import { Controls } from '../components/Controls';
import { MarkScheme, QuestionView } from '../components/QuestionView';
import { shareLink } from '../state';
import { ReportProblem } from '../components/ReportProblem';

interface Props {
  options: SetOptions;
  questions: Question[];
  onOptions: (o: SetOptions) => void;
  onGenerate: () => void;
  onRegenerate: (i: number) => void;
  onPresent: (i: number) => void;
}

export function BuilderView({ options, questions, onOptions, onGenerate, onRegenerate, onPresent }: Props) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);

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
        <Controls options={options} onChange={onOptions} onGenerate={onGenerate} />
      </aside>
      <section className="results" aria-label="Generated questions">
        {questions.length === 0 ? (
          <div className="empty">
            <h2>Choose your options, then generate</h2>
            <p>Every question is generated fresh from a template, with a worked mark scheme. Use Board for the projector, or Worksheet to print.</p>
          </div>
        ) : (
          questions.map((q, i) => (
            <article key={q.code} className="qcard-outer">
              <header className="qmeta">
                <span className={`badge level-${q.level}`}>{LEVELS.find((l) => l.id === q.level)!.label}</span>
                <span className="badge">{q.calc === 'calc' ? 'Calculator' : 'Non-calculator'}</span>
                <span className="meta-text">
                  {q.template.strand} · {q.template.title} · {STYLES[q.style]}
                </span>
                <span className="meta-marks">{q.marks} marks</span>
              </header>
              <QuestionView q={q} number={i + 1} />
              <div className="qactions">
                <button type="button" onClick={() => onRegenerate(i)}>
                  Generate new
                </button>
                <button type="button" aria-expanded={!!open[q.code]} onClick={() => setOpen({ ...open, [q.code]: !open[q.code] })}>
                  {open[q.code] ? 'Hide mark scheme' : 'Show mark scheme'}
                </button>
                <button type="button" onClick={() => onPresent(i)}>
                  Show on board
                </button>
                <button type="button" onClick={() => copy(q)}>
                  {copied === q.code ? 'Link copied' : 'Copy link'}
                </button>
                <ReportProblem q={q} />
              </div>
              {open[q.code] && <MarkScheme q={q} />}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
