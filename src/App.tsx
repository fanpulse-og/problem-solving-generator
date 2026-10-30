import { useCallback, useEffect, useState } from 'react';
import { addOne, buildSet, regenerate, type SetOptions } from './engine/generate';
import { TEMPLATES } from './engine/registry';
import type { Question } from './engine/types';
import { BuilderView } from './views/BuilderView';
import { BoardView } from './views/BoardView';
import { WorksheetView } from './views/WorksheetView';
import { DEFAULT_SHEET, questionFromCode, readHash, writeHash, type SheetOptions, type View } from './state';
import { defaultExample, exampleFor } from './engine/example';
import { loadSaved, storeSaved, type SavedSet } from './saved';
import { freshSeed } from './engine/rng';

const fromCodes = (codes: string[]) => codes.map(questionFromCode).filter((q): q is Question => q !== null);

export default function App() {
  const initial = readHash();
  const [view, setView] = useState<View>(initial.view);
  const [options, setOptions] = useState<SetOptions>(initial.options);
  const [questions, setQuestions] = useState<Question[]>(() => initial.codes.map(questionFromCode).filter((q): q is Question => q !== null));
  const [index, setIndex] = useState(Math.min(initial.index, Math.max(0, initial.codes.length - 1)));
  const [example, setExample] = useState<Question | null>(() => (initial.example ? questionFromCode(initial.example) : null));
  const [title, setTitle] = useState(initial.title ?? 'Problem solving');
  const [sheet, setSheet] = useState<SheetOptions>(initial.sheet ?? DEFAULT_SHEET);
  // Locked questions are kept when the set is generated again; stored by code.
  const [locked, setLocked] = useState<Set<string>>(() => new Set((initial.locked ?? []).map((i) => initial.codes[i]).filter(Boolean)));
  const [saved, setSaved] = useState<SavedSet[]>(() => loadSaved());
  const [saveError, setSaveError] = useState(false);

  // Keep the URL in step with the state, so the page can be bookmarked or shared.
  useEffect(() => {
    const lockedAt = questions.flatMap((q, i) => (locked.has(q.code) ? [i] : []));
    const hash = writeHash({ view, codes: questions.map((q) => q.code), index, options, example: example?.code, title: title === 'Problem solving' ? undefined : title, sheet, locked: lockedAt });
    // An empty hash means nothing to remember: keep the plain address.
    if (hash !== location.hash) history.replaceState(null, '', hash || location.pathname + location.search);
  }, [view, questions, index, options, example, title, sheet, locked]);

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
      setLocked(new Set((s.locked ?? []).map((i) => s.codes[i]).filter(Boolean)));
      if (s.codes.join() !== questions.map((q) => q.code).join()) setQuestions(fromCodes(s.codes));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [questions]);

  const generateWith = useCallback(
    (o: SetOptions, keep: Question[]) => {
      const set = buildSet(TEMPLATES, o, freshSeed(), keep);
      setQuestions(set);
      setIndex(0);
      setExample(defaultExample(set, TEMPLATES));
    },
    [],
  );
  const generate = useCallback(() => generateWith(options, questions.filter((q) => locked.has(q.code))), [options, questions, locked, generateWith]);

  const regen = useCallback(
    (i: number) => {
      setQuestions((qs) => qs.map((q, j) => (j === i ? regenerate(q, qs) : q)));
    },
    [],
  );

  // Editing the set after generating.
  const edit = {
    toggleLock: (i: number) =>
      setLocked((l) => {
        const next = new Set(l);
        const code = questions[i].code;
        if (next.has(code)) next.delete(code);
        else next.add(code);
        return next;
      }),
    remove: (i: number) => {
      setLocked((l) => {
        const next = new Set(l);
        next.delete(questions[i].code);
        return next;
      });
      setQuestions((qs) => qs.filter((_, j) => j !== i));
      setIndex(0);
    },
    move: (i: number, by: -1 | 1) =>
      setQuestions((qs) => {
        const j = i + by;
        if (j < 0 || j >= qs.length) return qs;
        const next = [...qs];
        [next[i], next[j]] = [next[j], next[i]];
        return next;
      }),
    addOne: () => {
      const q = addOne(TEMPLATES, options, questions);
      if (!q) return;
      // After the last question at the same level, so the stages stay together.
      const order = ['foundational', 'core', 'stretch'];
      let at = 0;
      questions.forEach((x, i) => {
        if (order.indexOf(x.level) <= order.indexOf(q.level)) at = i + 1;
      });
      setQuestions((qs) => [...qs.slice(0, at), q, ...qs.slice(at)]);
      if (!example) setExample(defaultExample([...questions, q], TEMPLATES));
    },
  };
  // Keep a regenerated question's lock (its code changes).
  const regenKeepingLock = (i: number) => {
    if (locked.has(questions[i].code)) return;
    regen(i);
  };

  // Saved sets (this browser only).
  const persist = (list: SavedSet[]) => {
    setSaved(list);
    setSaveError(!storeSaved(list));
  };
  const savedSets = {
    list: saved,
    error: saveError,
    save: (name: string) =>
      persist([
        {
          id: freshSeed(),
          name: name.trim() || title,
          savedAt: new Date().toISOString(),
          options,
          codes: questions.map((q) => q.code),
          locked: questions.filter((q) => locked.has(q.code)).map((q) => q.code),
          example: example?.code,
          title: title === 'Problem solving' ? undefined : title,
          sheet,
        },
        ...saved,
      ]),
    open: (s: SavedSet) => {
      setOptions(s.options);
      setQuestions(fromCodes(s.codes));
      setLocked(new Set(s.locked ?? []));
      setExample(s.example ? questionFromCode(s.example) : null);
      setTitle(s.title ?? 'Problem solving');
      setSheet(s.sheet ?? DEFAULT_SHEET);
      setIndex(0);
    },
    regenerate: (s: SavedSet) => {
      setOptions(s.options);
      setLocked(new Set());
      setTitle(s.title ?? 'Problem solving');
      setSheet(s.sheet ?? DEFAULT_SHEET);
      generateWith(s.options, []);
    },
    remove: (id: string) => persist(saved.filter((s) => s.id !== id)),
  };

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
            locked={locked}
            edit={edit}
            saved={savedSets}
            onOptions={setOptions}
            onGenerate={generate}
            onRegenerate={regenKeepingLock}
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
