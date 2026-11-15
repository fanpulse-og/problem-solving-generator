import { useEffect, useMemo, useState } from 'react';
import { TIERS, type Question, type Tier } from '../engine/types';
import { MarkScheme, QuestionView } from '../components/QuestionView';
import { MathText } from '../components/Math';
import { partLabel } from '../engine/labels';
import { isCorrect, marking } from '../engine/practice';
import { ReportProblem } from '../components/ReportProblem';

interface Props {
  questions: Question[];
  tier: Tier;
  /** Make a fresh set at this tier, for someone arriving with no questions. */
  onStart: (tier: Tier) => void;
  /** The same question types again with new numbers. */
  onAgain: () => void;
}

type Result = 'right' | 'wrong';
/** What has happened on one question: a result for each part once it is settled. */
interface Progress {
  typed: string[];
  tries: number;
  results: (Result | null)[];
  revealed: boolean;
}

const blank = (q: Question): Progress => ({ typed: q.answers.map(() => ''), tries: 0, results: q.answers.map(() => null), revealed: false });

/**
 * Practice for students: type an answer, have it checked, then see the worked
 * solution. Answers that are not plain numbers are marked by the student
 * against the mark scheme.
 */
export function PracticeView({ questions, tier, onStart, onAgain }: Props) {
  const [index, setIndex] = useState(0);
  const [progress, setProgress] = useState<Progress[]>(() => questions.map(blank));
  const [done, setDone] = useState(false);
  const [startTier, setStartTier] = useState<Tier>(tier);
  const codes = questions.map((q) => q.code).join();

  // A new set starts again from the first question.
  useEffect(() => {
    setProgress(questions.map(blank));
    setIndex(0);
    setDone(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codes]);

  const q = questions[index];
  const p = progress[index];
  const kinds = useMemo(() => (q ? q.answers.map((a) => marking(a.text).kind) : []), [q]);

  if (!q || !p) {
    return (
      <div className="empty practice-empty">
        <h2>Practise with instant marking</h2>
        <p>Answer one question at a time. Your answer is checked, then you see the worked solution.</p>
        <div className="practice-start">
          <label>
            Level{' '}
            <select value={startTier} onChange={(e) => setStartTier(e.target.value as Tier)}>
              {TIERS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="primary" onClick={() => onStart(startTier)}>
            Start practising
          </button>
        </div>
        <p className="hint">Or choose your own topics on the Build tab, then come back here.</p>
      </div>
    );
  }

  const update = (change: Partial<Progress>) => setProgress((all) => all.map((x, i) => (i === index ? { ...x, ...change } : x)));
  const settled = p.results.every((r) => r !== null);
  const typedParts = kinds.some((k) => k === 'numbers');
  const part = (i: number) => (q.content.parts[i].label ? partLabel(q.content.parts[i].label!) : '');

  const check = () => {
    const tries = p.tries + 1;
    const results = p.results.map((r, i) => {
      if (r === 'right' || kinds[i] === 'self') return r;
      const ok = isCorrect(q.answers[i].text, p.typed[i]);
      // Two goes at a typed answer, then it counts as wrong.
      return ok ? 'right' : tries >= 2 ? 'wrong' : null;
    });
    const typedDone = results.every((r, i) => kinds[i] === 'self' || r !== null);
    update({ tries, results, revealed: p.revealed || typedDone });
  };
  const giveUp = () => update({ revealed: true, results: p.results.map((r, i) => (kinds[i] === 'numbers' && r === null ? 'wrong' : r)) });
  const selfMark = (i: number, r: Result) => update({ results: p.results.map((x, j) => (j === i ? r : x)) });

  const all = progress.flatMap((x) => x.results);
  const right = all.filter((r) => r === 'right').length;
  const answered = all.filter((r) => r !== null).length;

  if (done) {
    const weak = questions.filter((_, i) => progress[i].results.some((r) => r === 'wrong'));
    return (
      <div className="practice">
        <div className="practice-summary">
          <h2>
            You got {right} of {all.length} parts right
          </h2>
          {weak.length === 0 ? (
            <p>Every part correct. Try a harder level, or a different topic.</p>
          ) : (
            <>
              <p>Worth another look:</p>
              <ul>
                {weak.map((w) => (
                  <li key={w.code}>
                    <button type="button" className="link" onClick={() => { setDone(false); setIndex(questions.indexOf(w)); }}>
                      Question {questions.indexOf(w) + 1}
                    </button>
                    : {w.template.title}
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="practice-actions">
            <button type="button" className="primary" onClick={onAgain}>
              Same questions, new numbers
            </button>
            <button type="button" onClick={() => { setDone(false); setIndex(0); }}>
              Look back over my answers
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="practice">
      <div className="board-bar">
        <button type="button" onClick={() => setIndex(index - 1)} disabled={index === 0} aria-label="Previous question">
          ← Previous
        </button>
        <span className="board-count" aria-live="polite">
          Question {index + 1} of {questions.length} · {right} of {answered} right so far
        </span>
        {index < questions.length - 1 ? (
          <button type="button" className={settled ? 'primary' : ''} onClick={() => setIndex(index + 1)} aria-label="Next question">
            Next →
          </button>
        ) : (
          <button type="button" className={settled ? 'primary' : ''} onClick={() => setDone(true)}>
            Finish
          </button>
        )}
      </div>
      <div className="board-question">
        <QuestionView q={q} number={index + 1} />
      </div>

      <form
        className="practice-answers"
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
      >
        <h3>Your answer</h3>
        {q.answers.map((a, i) => {
          const r = p.results[i];
          return (
            <div key={i} className={`practice-part ${r ?? ''}`}>
              {part(i) && <span className="qlabel">{part(i)}</span>}
              {kinds[i] === 'numbers' ? (
                <>
                  <input
                    type="text"
                    inputMode="text"
                    autoComplete="off"
                    aria-label={`Answer${part(i) ? ` to part ${part(i)}` : ''}`}
                    placeholder={a.text.includes(' or ') ? 'Both answers, with a comma between' : 'Type your answer'}
                    value={p.typed[i]}
                    disabled={r !== null}
                    onChange={(e) => update({ typed: p.typed.map((t, j) => (j === i ? e.target.value : t)) })}
                  />
                  {r === 'right' && <span className="mark right">✓ Correct</span>}
                  {r === 'wrong' && (
                    <span className="mark wrong">
                      ✗ The answer is <MathText text={a.text} />
                    </span>
                  )}
                  {r === null && p.tries > 0 && <span className="mark again">Not quite. Check your working and try once more.</span>}
                </>
              ) : !p.revealed ? (
                <span className="practice-self">Work this part out on paper, then check it against the worked solution.</span>
              ) : (
                <span className="practice-self">
                  Answer: <MathText text={a.text} />{' '}
                  {r === null ? (
                    <>
                      <button type="button" onClick={() => selfMark(i, 'right')}>
                        I got it right
                      </button>{' '}
                      <button type="button" onClick={() => selfMark(i, 'wrong')}>
                        I got it wrong
                      </button>
                    </>
                  ) : (
                    <span className={`mark ${r}`}>{r === 'right' ? '✓ Marked right' : '✗ Marked wrong'}</span>
                  )}
                </span>
              )}
            </div>
          );
        })}
        <div className="practice-actions">
          {typedParts && !p.results.every((r, i) => kinds[i] === 'self' || r !== null) && (
            <button type="submit" className="primary">
              Check {q.answers.length > 1 ? 'answers' : 'answer'}
            </button>
          )}
          {!p.revealed && (
            <button type="button" onClick={giveUp}>
              {typedParts ? 'Show me the solution' : 'Show the worked solution'}
            </button>
          )}
          <ReportProblem q={q} />
        </div>
      </form>

      {p.revealed && (
        <div className="board-solution" aria-live="polite">
          <h3>Worked solution</h3>
          <MarkScheme q={q} />
        </div>
      )}
    </div>
  );
}
