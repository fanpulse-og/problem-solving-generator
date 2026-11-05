import { useEffect, useState } from 'react';
import type { Question } from '../engine/types';
import { AnswerView, MarkScheme, QuestionView, totalSteps } from '../components/QuestionView';
import { ReportProblem } from '../components/ReportProblem';

interface Props {
  questions: Question[];
  index: number;
  onIndex: (i: number) => void;
  onRegenerate: (i: number) => void;
}

/** One question at a time for the projector. Keys: ← → questions, A answer, Space next step, R reset. */
export function BoardView({ questions, index, onIndex, onRegenerate }: Props) {
  const q = questions[index];
  const [showAnswer, setShowAnswer] = useState(false);
  const [steps, setSteps] = useState(0);
  const total = q ? totalSteps(q) : 0;

  useEffect(() => {
    setShowAnswer(false);
    setSteps(0);
  }, [q?.code]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Typing in a form, such as the report pop-up, is not a shortcut.
      if ((e.target instanceof Element && e.target.closest('input, textarea, select, dialog')) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight' && index < questions.length - 1) onIndex(index + 1);
      else if (e.key === 'ArrowLeft' && index > 0) onIndex(index - 1);
      else if (e.key === 'a' || e.key === 'A') setShowAnswer((s) => !s);
      else if (e.key === ' ' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setSteps((s) => Math.min(total, s + 1));
      } else if (e.key === 'r' || e.key === 'R') {
        setSteps(0);
        setShowAnswer(false);
      } else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, questions.length, total, onIndex]);

  if (!q) {
    return (
      <div className="empty board-empty">
        <h2>No questions yet</h2>
        <p>Generate a set on the Build tab first.</p>
      </div>
    );
  }

  return (
    <div className="board">
      <div className="board-bar">
        <button type="button" onClick={() => onIndex(index - 1)} disabled={index === 0} aria-label="Previous question">
          ← Previous
        </button>
        <span className="board-count" aria-live="polite">
          Question {index + 1} of {questions.length}
        </span>
        <button type="button" onClick={() => onIndex(index + 1)} disabled={index === questions.length - 1} aria-label="Next question">
          Next →
        </button>
      </div>
      <div className="board-question">
        <QuestionView q={q} number={index + 1} />
      </div>
      <div className="board-actions">
        <button type="button" className="primary" aria-pressed={showAnswer} onClick={() => setShowAnswer((s) => !s)}>
          {showAnswer ? 'Hide answer' : 'Reveal answer'}
        </button>
        <button type="button" className="primary" onClick={() => setSteps((s) => Math.min(total, s + 1))} disabled={steps >= total}>
          {steps === 0 ? 'Reveal worked solution' : steps < total ? `Next step (${steps}/${total})` : 'All steps shown'}
        </button>
        {steps > 0 && (
          <button type="button" onClick={() => setSteps(total)} disabled={steps >= total}>
            Show all steps
          </button>
        )}
        <button
          type="button"
          onClick={() => {
            setSteps(0);
            setShowAnswer(false);
          }}
        >
          Reset
        </button>
        <button type="button" onClick={() => onRegenerate(index)}>
          Generate new
        </button>
        <ReportProblem q={q} />
      </div>
      <div aria-live="polite">
        {showAnswer && (
          <div className="board-answer">
            <h3>Answer</h3>
            <AnswerView q={q} />
          </div>
        )}
        {steps > 0 && (
          <div className="board-solution">
            <h3>Worked solution</h3>
            <MarkScheme q={q} upTo={steps} />
          </div>
        )}
      </div>
      <p className="keys">Keys: ← → change question · A answer · Space next step · R reset</p>
    </div>
  );
}
