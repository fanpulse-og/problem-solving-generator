import { LEVELS, STRANDS, type Calc, type Question } from '../engine/types';
import { AnswerView, MarkScheme, QuestionView } from '../components/QuestionView';
import { exampleChoices } from '../engine/example';
import { TEMPLATES } from '../engine/registry';
import type { SheetOptions } from '../state';

interface Props {
  questions: Question[];
  example: Question | null;
  title: string;
  sheet: SheetOptions;
  onTitle: (t: string) => void;
  onSheet: (s: SheetOptions) => void;
  onExampleTemplate: (templateId: string) => void;
  onNewExample: () => void;
}

interface Section {
  calc: Calc | null; // null: one section with everything (normal mode)
  heading?: string;
  instruction?: string;
}

const PAPER: Section[] = [
  { calc: 'non-calc', heading: 'Section A: Non-calculator', instruction: 'You must not use a calculator in this section.' },
  { calc: 'calc', heading: 'Section B: Calculator', instruction: 'You may use a calculator in this section.' },
];

/** Print with the answer sheet hidden, then put it back. */
function printQuestionsOnly() {
  document.body.classList.add('print-questions-only');
  const done = () => {
    document.body.classList.remove('print-questions-only');
    window.removeEventListener('afterprint', done);
  };
  window.addEventListener('afterprint', done);
  window.print();
}

/**
 * Printable worksheet: one worked example, then foundational → core → stretch,
 * no working space, and an answer sheet on a new page. In paper mode the
 * non-calculator questions come first, each section still in stages.
 */
export function WorksheetView({ questions, example, title, sheet, onTitle, onSheet, onExampleTemplate, onNewExample }: Props) {
  if (questions.length === 0) {
    return (
      <div className="empty">
        <h2>No questions yet</h2>
        <p>Generate a set on the Build tab first.</p>
      </div>
    );
  }

  // The order on the page, which also fixes the question numbers.
  const sections = (sheet.paper ? PAPER : [{ calc: null } as Section])
    .map((sec) => ({
      ...sec,
      stages: LEVELS.map((l) => ({ level: l, qs: questions.filter((q) => q.level === l.id && (sec.calc === null || q.calc === sec.calc)) })).filter((s) => s.qs.length > 0),
    }))
    .filter((sec) => sec.stages.length > 0);
  const ordered = sections.flatMap((sec) => sec.stages.flatMap((s) => s.qs));
  const number = new Map(ordered.map((q, i) => [q.code, i + 1]));
  const marksOf = (qs: Question[]) => qs.reduce((s, q) => s + q.marks, 0);
  const totalMarks = marksOf(ordered);
  const choices = exampleChoices(questions, TEMPLATES);

  return (
    <div className="worksheet-wrap">
      <div className="worksheet-tools no-print">
        <div className="tool-row">
          <label>
            Worksheet title <input value={title} onChange={(e) => onTitle(e.target.value)} />
          </label>
        </div>
        <div className="tool-row">
          <label>
            Worked example{' '}
            <select value={example?.template.id ?? ''} onChange={(e) => onExampleTemplate(e.target.value)}>
              {STRANDS.map((strand) => {
                const ts = choices.filter((t) => t.strand === strand);
                return ts.length ? (
                  <optgroup key={strand} label={strand}>
                    {ts.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.subtopic}: {t.title}
                      </option>
                    ))}
                  </optgroup>
                ) : null;
              })}
            </select>
          </label>
          <button type="button" onClick={onNewExample}>
            New worked example
          </button>
        </div>
        <div className="tool-row">
          <fieldset className="checks">
            <legend>Answer sheet</legend>
            <label>
              <input type="checkbox" checked={sheet.answers === 'scheme'} onChange={(e) => onSheet({ ...sheet, answers: e.target.checked ? 'scheme' : 'none' })} /> Include mark scheme
            </label>
            <label>
              <input type="checkbox" checked={sheet.answers === 'answers'} onChange={(e) => onSheet({ ...sheet, answers: e.target.checked ? 'answers' : 'scheme' })} /> Answers only
            </label>
          </fieldset>
          {questions.some((q) => q.calc === 'non-calc') && (
          <label className="check">
            <input type="checkbox" checked={sheet.paper} onChange={(e) => onSheet({ ...sheet, paper: e.target.checked })} /> Paper mode (non-calculator first)
          </label>
          )}
        </div>
        <div className="tool-row">
          <button type="button" className="primary" onClick={() => window.print()}>
            Print / save as PDF
          </button>
          <button type="button" onClick={printQuestionsOnly} disabled={sheet.answers === 'none'} title={sheet.answers === 'none' ? 'There is no answer sheet to leave out' : undefined}>
            Print questions only
          </button>
        </div>
      </div>

      <div className="sheet">
        <div className="sheet-body">
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

          {sections.map((sec) => (
            <section key={sec.calc ?? 'all'} className={sec.heading ? 'paper-section' : undefined}>
              {sec.heading && (
                <div className="section-head">
                  <h2 className="section-title">
                    {sec.heading} <span className="section-marks">({marksOf(sec.stages.flatMap((s) => s.qs))} marks)</span>
                  </h2>
                  <p className="section-note">{sec.instruction}</p>
                </div>
              )}
              {sec.stages.map(({ level, qs }) => (
                <section key={level.id} className="stage">
                  <h2>{level.label}</h2>
                  {qs.map((q) => (
                    <div key={q.code} className="sheet-q">
                      <QuestionView q={q} number={number.get(q.code)} />
                      {!sheet.paper && <div className="calc-tag">{q.calc === 'calc' ? 'Calculator allowed' : 'Non-calculator'}</div>}
                    </div>
                  ))}
                </section>
              ))}
            </section>
          ))}
        </div>
      </div>

      {sheet.answers === 'none' ? (
        <p className="no-print hint sheet-note">No answer sheet: printing gives the questions only.</p>
      ) : (
        <div className={`sheet answers-sheet${sheet.answers === 'answers' ? ' answers-only' : ''}`}>
          <div className="sheet-body">
            <header className="sheet-head">
              <h1>
                {title}: {sheet.answers === 'answers' ? 'answers' : 'mark scheme'}
              </h1>
            </header>
            <div className="answer-list">
              {ordered.map((q) => (
                <div key={q.code} className="answer-block">
                  <h3>Question {number.get(q.code)}</h3>
                  {sheet.answers === 'answers' ? <AnswerView q={q} /> : <MarkScheme q={q} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
