import { useMemo, useState } from 'react';
import { MarkScheme, QuestionView } from '../components/QuestionView';
import { buildQuestion } from '../engine/generate';
import { TEMPLATES } from '../engine/registry';
import { freshSeed } from '../engine/rng';
import { LEVELS, STRANDS, TIERS, levelsFor, type Calc, type Level, type Question, type Template, type Tier } from '../engine/types';

interface Props {
  tier: Tier;
  count: number;
  onAdd: (q: Question) => void;
  onOpen: (view: 'build' | 'worksheet') => void;
}

/** Every word typed must appear somewhere in the title, topic or area. */
export function matches(t: Template, query: string): boolean {
  const hay = `${t.title} ${t.subtopic} ${t.strand}`.toLowerCase();
  return query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .every((w) => hay.includes(w));
}

/** A sample of one question type, with its mark scheme, ready to add to the set. */
function Preview({ t, tier, onAdd }: { t: Template; tier: Tier; onAdd: (q: Question) => void }) {
  const levels = levelsFor(t, tier);
  const [level, setLevel] = useState<Level>(levels[0]);
  const [calc, setCalc] = useState<Calc>(t.calculator === 'either' ? 'calc' : t.calculator);
  const [seed, setSeed] = useState(freshSeed);
  const [added, setAdded] = useState(false);
  const q = useMemo(() => buildQuestion(t, level, tier, calc, seed), [t, level, tier, calc, seed]);
  const next = () => {
    setSeed(freshSeed());
    setAdded(false);
  };
  return (
    <div className="bank-preview">
      <div className="bank-preview-tools">
        <div className="seg" role="radiogroup" aria-label="Level">
          {LEVELS.filter((l) => levels.includes(l.id)).map((l) => (
            <button key={l.id} type="button" role="radio" aria-checked={level === l.id} className={level === l.id ? 'on' : ''} onClick={() => { setLevel(l.id); setAdded(false); }}>
              {l.label}
            </button>
          ))}
        </div>
        {t.calculator === 'either' && (
          <div className="seg" role="radiogroup" aria-label="Calculator">
            {(['calc', 'non-calc'] as const).map((c) => (
              <button key={c} type="button" role="radio" aria-checked={calc === c} className={calc === c ? 'on' : ''} onClick={() => { setCalc(c); setAdded(false); }}>
                {c === 'calc' ? 'Calculator' : 'Non-calculator'}
              </button>
            ))}
          </div>
        )}
        <button type="button" onClick={next}>
          Show another
        </button>
        <button
          type="button"
          className="primary"
          disabled={added}
          onClick={() => {
            onAdd(q);
            setAdded(true);
          }}
        >
          {added ? 'Added' : 'Add to my set'}
        </button>
      </div>
      <QuestionView q={q} />
      <details>
        <summary>Mark scheme</summary>
        <MarkScheme q={q} />
      </details>
    </div>
  );
}

/** Every question type, grouped by year, area and topic, with a search across all of them. */
export function BankView({ tier: startTier, count, onAdd, onOpen }: Props) {
  const [tier, setTier] = useState<Tier>(startTier);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const searching = query.trim() !== '';
  const tiers = searching ? TIERS.map((t) => t.id) : [tier];

  const groups = tiers
    .map((tr) => ({
      tier: tr,
      strands: STRANDS.map((strand) => {
        const ts = TEMPLATES.filter((t) => t.tiers.includes(tr) && t.strand === strand && matches(t, query));
        const topics = [...new Set(ts.map((t) => t.subtopic))].sort();
        return { strand, total: ts.length, topics: topics.map((name) => ({ name, ts: ts.filter((t) => t.subtopic === name) })) };
      }).filter((g) => g.total > 0),
    }))
    .filter((g) => g.strands.length > 0);
  const found = groups.reduce((s, g) => s + g.strands.reduce((n, x) => n + x.total, 0), 0);
  const label = (id: Tier) => TIERS.find((t) => t.id === id)!.label;

  return (
    <div className="bank">
      <h1>Question bank</h1>
      <p className="bank-intro">Browse every type of question. Open one to see a sample and its mark scheme, then add it to your set.</p>
      <div className="bank-bar">
        <input className="bank-search" type="search" aria-label="Search the question bank" placeholder="Search, for example binomial or circles" value={query} onChange={(e) => setQuery(e.target.value)} />
        <div className="bank-set">
          <span>
            Your set: {count} question{count === 1 ? '' : 's'}
          </span>
          <button type="button" onClick={() => onOpen('build')}>
            Open in Build
          </button>
          <button type="button" onClick={() => onOpen('worksheet')} disabled={count === 0}>
            Make worksheet
          </button>
        </div>
      </div>
      {!searching && (
        <div className="seg bank-tiers" role="radiogroup" aria-label="Year group">
          {TIERS.map((t) => (
            <button key={t.id} type="button" role="radio" aria-checked={tier === t.id} className={tier === t.id ? 'on' : ''} onClick={() => { setTier(t.id); setOpen(null); }}>
              {t.label}
            </button>
          ))}
        </div>
      )}
      {searching && <p aria-live="polite" className="bank-count">{found === 0 ? '' : `${found} match${found === 1 ? '' : 'es'} across all years`}</p>}
      {groups.length === 0 && <p className="bank-empty">No question types match that search. Try a broader word, such as a topic name.</p>}
      {groups.map((g) => (
        <section key={g.tier}>
          {searching && <h2 className="bank-tier-title">{label(g.tier)}</h2>}
          {g.strands.map((s) => (
            <details key={s.strand} className="bank-strand" open={searching || g.strands.length === 1}>
              <summary>
                {s.strand} <span className="bank-count">{s.total} question type{s.total === 1 ? '' : 's'}</span>
              </summary>
              {s.topics.map((topic) => (
                <div key={topic.name} className="bank-topic">
                  <h3>{topic.name}</h3>
                  {topic.ts.map((t) => {
                    const id = `${g.tier}:${t.id}`;
                    return (
                      <div key={t.id}>
                        <button type="button" className="bank-item" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
                          {t.title}
                        </button>
                        {open === id && <Preview t={t} tier={g.tier} onAdd={onAdd} />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </details>
          ))}
        </section>
      ))}
    </div>
  );
}
