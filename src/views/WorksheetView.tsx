import { useLayoutEffect, useRef, useState } from 'react';
import { LEVELS, STRANDS, type Calc, type Question } from '../engine/types';
import { AnswerView, MarkScheme, QuestionView } from '../components/QuestionView';
import { exampleChoices } from '../engine/example';
import { TEMPLATES } from '../engine/registry';
import { countPages, questionsToRemove, type PageBlock } from '../engine/pages';
import type { SheetOptions } from '../state';

interface Props {
  questions: Question[];
  example: Question | null;
  title: string;
  sheet: SheetOptions;
  onTitle: (t: string) => void;
  onSheet: (s: SheetOptions) => void;
  onQuestions: (qs: Question[]) => void;
  onExampleTemplate: (templateId: string) => void;
  onNewExample: () => void;
}

interface Section {
  calc: Calc | null; // null: one section with everything (normal mode)
  heading?: string;
  instruction?: string;
}

type PageSection = Section & { stages: { level: (typeof LEVELS)[number]; qs: Question[] }[] };

/** Print text is 11.5pt on a 16px screen, so the measuring copy is drawn larger and scaled back. */
const PRINT_SCALE = (11.5 * (96 / 72)) / 16;
const QUESTION_BLOCKS = '.sheet-head, .worked, .section-head, .stage > h2, .sheet-q';
const ANSWER_BLOCKS = '.sheet-head, .answer-block';

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

/** The question pages: heading, optional worked example, then the questions in stages. */
function QuestionPages({ title, example, sections, number, sheet, totalMarks, onRemove }: { title: string; example: Question | null; sections: PageSection[]; number: Map<string, number>; sheet: SheetOptions; totalMarks: number; onRemove?: (q: Question) => void }) {
  const marksOf = (qs: Question[]) => qs.reduce((s, q) => s + q.marks, 0);
  return (
    <div className="sheet-body">
      <header className="sheet-head">
        <h1>{title}</h1>
        <div className="sheet-name">
          Name <span className="line" /> Date <span className="line short" />
        </div>
        <p className="sheet-info">Answer all questions. {totalMarks} marks. Diagrams are NOT accurately drawn, unless otherwise indicated.</p>
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
                <div key={q.code} className="sheet-q" data-code={q.code}>
                  {onRemove && (
                    <button type="button" className="sheet-remove no-print" aria-label={`Remove question ${number.get(q.code)}`} title="Remove this question" onClick={() => onRemove(q)}>
                      ×
                    </button>
                  )}
                  <QuestionView q={q} number={number.get(q.code)} />
                  {!sheet.paper && <div className="calc-tag">{q.calc === 'calc' ? 'Calculator allowed' : 'Non-calculator'}</div>}
                </div>
              ))}
            </section>
          ))}
        </section>
      ))}
    </div>
  );
}

/** The answer pages. */
function AnswerPages({ title, ordered, number, sheet }: { title: string; ordered: Question[]; number: Map<string, number>; sheet: SheetOptions }) {
  return (
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
  );
}

/** Heights of the blocks in a measuring copy, scaled back to print size. */
function readBlocks(root: Element | null, selector: string): (PageBlock & { question?: string })[] {
  if (!root) return [];
  const els = [...root.querySelectorAll<HTMLElement>(selector)];
  return els.map((el, i) => {
    const box = el.getBoundingClientRect();
    const next = els[i + 1]?.getBoundingClientRect();
    return {
      height: box.height * PRINT_SCALE,
      advance: (next ? Math.max(next.top - box.top, box.height) : box.height) * PRINT_SCALE,
      keepWithNext: el.tagName === 'H2' || el.classList.contains('section-head'),
      question: el.dataset.code,
    };
  });
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/**
 * Printable worksheet: an optional worked example, then the questions in stages,
 * no working space, and an answer sheet on a new page. In paper mode the
 * non-calculator questions come first, each section still in stages.
 */
export function WorksheetView({ questions, example, title, sheet, onTitle, onSheet, onQuestions, onExampleTemplate, onNewExample }: Props) {
  const measureQ = useRef<HTMLDivElement>(null);
  const measureA = useRef<HTMLDivElement>(null);
  const [blocks, setBlocks] = useState<{ q: (PageBlock & { question?: string })[]; a: PageBlock[] }>({ q: [], a: [] });
  const [undo, setUndo] = useState<{ qs: Question[]; text: string } | null>(null);
  const shownExample = sheet.example ? example : null;

  // The order on the page, which also fixes the question numbers.
  const sections: PageSection[] = (sheet.paper ? PAPER : [{ calc: null } as Section])
    .map((sec) => ({
      ...sec,
      stages: LEVELS.map((l) => ({ level: l, qs: questions.filter((q) => q.level === l.id && (sec.calc === null || q.calc === sec.calc)) })).filter((s) => s.qs.length > 0),
    }))
    .filter((sec) => sec.stages.length > 0);
  const ordered = sections.flatMap((sec) => sec.stages.flatMap((s) => s.qs));
  const number = new Map(ordered.map((q, i) => [q.code, i + 1]));
  const totalMarks = ordered.reduce((s, q) => s + q.marks, 0);
  const choices = exampleChoices(questions, TEMPLATES);

  // Measure again whenever the content changes, and once the fonts have loaded.
  useLayoutEffect(() => {
    const read = () => setBlocks({ q: readBlocks(measureQ.current, QUESTION_BLOCKS), a: readBlocks(measureA.current, ANSWER_BLOCKS) });
    read();
    let live = true;
    document.fonts?.ready.then(() => live && read());
    return () => {
      live = false;
    };
  }, [questions, shownExample, title, sheet.answers, sheet.paper]);

  const removeQuestions = (codes: string[], text: string) => {
    setUndo({ qs: questions, text });
    onQuestions(questions.filter((q) => !codes.includes(q.code)));
  };
  const undoBar = undo && (
    <p className="undo-bar no-print" role="status">
      {undo.text}{' '}
      <button
        type="button"
        className="link"
        onClick={() => {
          onQuestions(undo.qs);
          setUndo(null);
        }}
      >
        Undo
      </button>
    </p>
  );

  if (questions.length === 0) {
    return (
      <div className="empty">
        <h2>No questions yet</h2>
        <p>Generate a set on the Build tab first.</p>
        {undoBar}
      </div>
    );
  }

  const qPages = countPages(blocks.q);
  const aPages = sheet.answers === 'none' ? 0 : countPages(blocks.a);
  const answerWord = sheet.answers === 'answers' ? 'answers' : 'mark scheme';
  const over = sheet.limit > 0 && qPages > sheet.limit;
  const suggested = over ? questionsToRemove(blocks.q, sheet.limit) : [];

  return (
    <div className="worksheet-wrap">
      <div className="worksheet-tools no-print">
        <div className="tool-row">
          <label>
            Worksheet title <input value={title} onChange={(e) => onTitle(e.target.value)} />
          </label>
        </div>
        <div className="tool-row">
          <label className="check">
            <input type="checkbox" checked={sheet.example} onChange={(e) => onSheet({ ...sheet, example: e.target.checked })} /> Include a worked example
          </label>
          {sheet.example && (
            <>
              <label>
                Topic{' '}
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
            </>
          )}
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
        <div className="tool-row page-row" aria-live="polite">
          <strong className="page-count">
            {qPages === 0 ? 'Working out the page count…' : aPages > 0 ? `${plural(qPages, 'page')} of questions + ${plural(aPages, 'page')} of ${answerWord} = about ${plural(qPages + aPages, 'page')}` : `About ${plural(qPages, 'page')} of questions`}
          </strong>
          <label>
            Fit questions on{' '}
            <select value={sheet.limit} onChange={(e) => onSheet({ ...sheet, limit: Number(e.target.value) })}>
              <option value={0}>any number of pages</option>
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {plural(n, 'page')}
                </option>
              ))}
            </select>{' '}
            {sheet.limit > 0 && <span className="limit-note">(the answer sheet is not counted)</span>}
          </label>
        </div>
        {over && (
          <p className="page-warning">
            That is {plural(qPages - sheet.limit, 'page')} over your limit.{' '}
            {suggested.length > 0 && (
              <>
                Removing {suggested.map((c) => `Q${number.get(c)}`).join(', ')} should fit.{' '}
                <button type="button" onClick={() => removeQuestions(suggested, `Removed ${plural(suggested.length, 'question')} to fit the page limit.`)}>
                  Remove {suggested.length === 1 ? 'it' : 'them'}
                </button>
              </>
            )}
          </p>
        )}
        {undoBar}
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
        <QuestionPages title={title} example={shownExample} sections={sections} number={number} sheet={sheet} totalMarks={totalMarks} onRemove={(q) => removeQuestions([q.code], `Removed question ${number.get(q.code)}.`)} />
      </div>

      {sheet.answers === 'none' ? (
        <p className="no-print hint sheet-note">No answer sheet: printing gives the questions only.</p>
      ) : (
        <div className={`sheet answers-sheet${sheet.answers === 'answers' ? ' answers-only' : ''}`}>
          <AnswerPages title={title} ordered={ordered} number={number} sheet={sheet} />
        </div>
      )}

      {/* Copies laid out as they will print, for measuring only. */}
      <div className="print-measure no-print" aria-hidden="true">
        <div className="sheet" ref={measureQ}>
          <QuestionPages title={title} example={shownExample} sections={sections} number={number} sheet={sheet} totalMarks={totalMarks} />
        </div>
        {sheet.answers !== 'none' && (
          <div className={`sheet answers-sheet${sheet.answers === 'answers' ? ' answers-only' : ''}`} ref={measureA}>
            <AnswerPages title={title} ordered={ordered} number={number} sheet={sheet} />
          </div>
        )}
      </div>
    </div>
  );
}
