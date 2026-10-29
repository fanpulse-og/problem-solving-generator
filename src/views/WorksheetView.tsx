import { LEVELS, type Question } from '../engine/types';
import { MarkScheme, QuestionView } from '../components/QuestionView';

interface Props {
  questions: Question[];
  example: Question | null;
  title: string;
  onTitle: (t: string) => void;
  onNewExample: () => void;
}

/**
 * Printable worksheet: one worked example, then foundational → core → stretch,
 * no working space, and a separate answer sheet on a new page. Print to PDF.
 */
export function WorksheetView({ questions, example, title, onTitle, onNewExample }: Props) {
  if (questions.length === 0) {
    return (
      <div className="empty">
        <h2>No questions yet</h2>
        <p>Generate a set on the Build tab first.</p>
      </div>
    );
  }
  const numbered = questions.map((q, i) => ({ q, n: i + 1 }));
  const totalMarks = questions.reduce((s, q) => s + q.marks, 0);

  return (
    <div className="worksheet-wrap">
      <div className="worksheet-tools no-print">
        <label>
          Worksheet title{' '}
          <input value={title} onChange={(e) => onTitle(e.target.value)} />
        </label>
        <button type="button" onClick={onNewExample}>
          New worked example
        </button>
        <button type="button" className="primary" onClick={() => window.print()}>
          Print / save as PDF
        </button>
        <span className="hint">Tip: in the print dialog, choose “Save as PDF” and turn off headers and footers.</span>
      </div>

      <div className="sheet">
        <header className="sheet-head">
          <h1>{title}</h1>
          <div className="sheet-name">
            Name <span className="line" /> Date <span className="line short" />
          </div>
          <p className="sheet-info">
            Answer all questions. {totalMarks} marks. Diagrams are NOT accurately drawn, unless otherwise indicated.
          </p>
        </header>

        {example && (
          <section className="worked">
            <h2>Worked example</h2>
            <QuestionView q={example} />
            <MarkScheme q={example} />
          </section>
        )}

        {LEVELS.map((l) => {
          const group = numbered.filter(({ q }) => q.level === l.id);
          if (group.length === 0) return null;
          return (
            <section key={l.id} className="stage">
              <h2>{l.label}</h2>
              {group.map(({ q, n }) => (
                <div key={q.code} className="sheet-q">
                  <QuestionView q={q} number={n} />
                  <div className="calc-tag">{q.calc === 'calc' ? 'Calculator allowed' : 'Non-calculator'}</div>
                </div>
              ))}
            </section>
          );
        })}
      </div>

      <div className="sheet answers-sheet">
        <header className="sheet-head">
          <h1>{title}: answers</h1>
        </header>
        {numbered.map(({ q, n }) => (
          <div key={q.code} className="answer-block">
            <h3>Question {n}</h3>
            <MarkScheme q={q} />
          </div>
        ))}
      </div>
    </div>
  );
}
