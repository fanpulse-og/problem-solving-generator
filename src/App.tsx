import { useCallback, useEffect, useState } from 'react';
import { generateSet, regenerate, type SetOptions } from './engine/generate';
import { TEMPLATES } from './engine/registry';
import type { Question } from './engine/types';
import { BuilderView } from './views/BuilderView';
import { BoardView } from './views/BoardView';
import { WorksheetView } from './views/WorksheetView';
import { DEFAULT_SHEET, questionFromCode, readHash, writeHash, type SheetOptions, type View } from './state';
import { defaultExample, exampleFor } from './engine/example';

export default function App() {
  const initial = readHash();
  const [view, setView] = useState<View>(initial.view);
  const [options, setOptions] = useState<SetOptions>(initial.options);
  const [questions, setQuestions] = useState<Question[]>(() => initial.codes.map(questionFromCode).filter((q): q is Question => q !== null));
  const [index, setIndex] = useState(Math.min(initial.index, Math.max(0, initial.codes.length - 1)));
  const [example, setExample] = useState<Question | null>(() => (initial.example ? questionFromCode(initial.example) : null));
  const [title, setTitle] = useState(initial.title ?? 'Problem solving');
  const [sheet, setSheet] = useState<SheetOptions>(initial.sheet ?? DEFAULT_SHEET);

  // Keep the URL in step with the state, so the page can be bookmarked or shared.
  useEffect(() => {
    const hash = writeHash({ view, codes: questions.map((q) => q.code), index, options, example: example?.code, title: title === 'Problem solving' ? undefined : title, sheet });
    // An empty hash means nothing to remember: keep the plain address.
    if (hash !== location.hash) history.replaceState(null, '', hash || location.pathname + location.search);
  }, [view, questions, index, options, example, title, sheet]);

  useEffect(() => {
    const onHash = () => {
      // A link pasted into an open tab: take everything from it, not just the view and questions.
      const s = readHash();
      setView(s.view);
      setOptions(s.options);
      setIndex(s.index);
      setTitle(s.title ?? 'Problem solving');
      setExample(s.example ? questionFromCode(s.example) : null);
      setSheet(s.sheet ?? DEFAULT_SHEET);
      if (s.codes.join() !== questions.map((q) => q.code).join()) setQuestions(s.codes.map(questionFromCode).filter((q): q is Question => q !== null));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [questions]);

  const generate = useCallback(() => {
    const set = generateSet(TEMPLATES, options);
    setQuestions(set);
    setIndex(0);
    setExample(defaultExample(set, TEMPLATES));
  }, [options]);

  const regen = useCallback(
    (i: number) => {
      setQuestions((qs) => qs.map((q, j) => (j === i ? regenerate(q, qs) : q)));
    },
    [],
  );

  const tabs: [View, string][] = [
    ['build', 'Build'],
    ['board', 'Board'],
    ['worksheet', 'Worksheet'],
  ];

  return (
    <div className={`app view-${view}`}>
      <a className="skip" href="#main">
        Skip to content
      </a>
      <header className="topbar no-print">
        <div className="brand">
          <span className="logo" aria-hidden="true">
            ∑
          </span>
          <span>Problem Solving Generator</span>
        </div>
        <nav aria-label="Views" className="tabs">
          {tabs.map(([id, label]) => (
            <button key={id} type="button" className={view === id ? 'tab on' : 'tab'} aria-current={view === id ? 'page' : undefined} onClick={() => setView(id)}>
              {label}
            </button>
          ))}
        </nav>
      </header>
      <main id="main">
        {view === 'build' && (
          <BuilderView
            options={options}
            questions={questions}
            onOptions={setOptions}
            onGenerate={generate}
            onRegenerate={regen}
            onPresent={(i) => {
              setIndex(i);
              setView('board');
            }}
          />
        )}
        {view === 'board' && <BoardView questions={questions} index={index} onIndex={setIndex} onRegenerate={regen} />}
        {view === 'worksheet' && (
          <WorksheetView
            questions={questions}
            example={example}
            title={title}
            sheet={sheet}
            onTitle={setTitle}
            onSheet={setSheet}
            onExampleTemplate={(id) => {
              const t = TEMPLATES.find((x) => x.id === id);
              if (t) setExample(exampleFor(t, questions));
            }}
            onNewExample={() => setExample(example ? exampleFor(example.template, questions) : defaultExample(questions, TEMPLATES))}
          />
        )}
      </main>
    </div>
  );
}
