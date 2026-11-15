import { useEffect, useRef, useState } from 'react';
import type { Question } from '../engine/types';
import { AnswerView, MarkScheme, QuestionView, totalSteps } from '../components/QuestionView';
import { ReportProblem } from '../components/ReportProblem';

interface Props {
  questions: Question[];
  index: number;
  onIndex: (i: number) => void;
  onRegenerate: (i: number) => void;
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

/** A countdown for the class: pick the minutes, start, pause, reset. */
function Timer() {
  const [minutes, setMinutes] = useState(3);
  const [left, setLeft] = useState(180);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    // Count from the clock, so a sleeping tab does not lose time.
    const end = Date.now() + left * 1000;
    const tick = setInterval(() => {
      const now = Math.max(0, Math.round((end - Date.now()) / 1000));
      setLeft(now);
      if (now === 0) setRunning(false);
    }, 250);
    return () => clearInterval(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  const reset = (m = minutes) => {
    setRunning(false);
    setLeft(m * 60);
  };
  return (
    <div className={`timer${left === 0 ? ' up' : ''}`}>
      <select
        aria-label="Timer length"
        value={minutes}
        onChange={(e) => {
          setMinutes(Number(e.target.value));
          reset(Number(e.target.value));
        }}
      >
        {[1, 2, 3, 4, 5, 8, 10, 15].map((m) => (
          <option key={m} value={m}>
            {m} min
          </option>
        ))}
      </select>
      <span className="timer-clock" role="timer" aria-live="off">
        {left === 0 ? 'Time’s up' : clock(left)}
      </span>
      <button type="button" onClick={() => (left === 0 ? reset() : setRunning((r) => !r))}>
        {left === 0 ? 'Reset' : running ? 'Pause' : left < minutes * 60 ? 'Resume' : 'Start timer'}
      </button>
      {left > 0 && left < minutes * 60 && !running && (
        <button type="button" onClick={() => reset()}>
          Reset
        </button>
      )}
    </div>
  );
}

/** One question at a time for the projector. Keys: ← → questions, A answer, Space next step, R reset, F full screen. */
export function BoardView({ questions, index, onIndex, onRegenerate }: Props) {
  const q = questions[index];
  const [showAnswer, setShowAnswer] = useState(false);
  const [steps, setSteps] = useState(0);
  const total = q ? totalSteps(q) : 0;
  const board = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);
  const canFull = typeof document !== 'undefined' && document.fullscreenEnabled;
  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void board.current?.requestFullscreen();
  };
  useEffect(() => {
    const onChange = () => setFull(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

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
      } else if ((e.key === 'f' || e.key === 'F') && canFull) toggleFull();
      else return;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, questions.length, total, onIndex, canFull]);

  if (!q) {
    return (
      <div className="empty board-empty">
        <h2>No questions yet</h2>
        <p>Generate a set on the Build tab first.</p>
      </div>
    );
  }

  return (
    <div className="board" ref={board}>
      <div className="board-tools">
        <Timer />
        {canFull && (
          <button type="button" onClick={toggleFull} aria-pressed={full}>
            {full ? 'Exit full screen' : 'Full screen'}
          </button>
        )}
      </div>
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
      <p className="keys">Keys: ← → change question · A answer · Space next step · R reset{canFull ? ' · F full screen' : ''}</p>
    </div>
  );
}
