import type React from 'react';
import { TEMPLATES, subtopicsByStrand } from '../engine/registry';
import type { Strand, Tier } from '../engine/types';
import { tuitionHref } from '../components/Tuition';
import { MOCKS } from '../engine/mock';

interface Props {
  /** Open the builder at this tier, optionally narrowed to one strand. */
  onBuild: (tier: Tier, strand?: Strand) => void;
  /** Generate a default set at this tier and open it as a printable worksheet, optionally on one topic of a strand. */
  onWorksheet: (tier: Tier, strand?: Strand, subtopic?: string) => void;
  /** Generate a default set and open it in practice mode, where answers are checked. */
  onPractice: (tier: Tier, strand?: Strand) => void;
  /** Build a full mock paper and open it as a worksheet. */
  onMock: (id: string) => void;
}

interface Card {
  tier: Tier;
  title: string;
  sub: string;
  /** A-level cards are one strand of a year group. */
  strand?: Strand;
}

// In-page links scroll instead of changing the hash, which holds the app's state.
const jump = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const typesAt = ({ tier, strand }: Card) => TEMPLATES.filter((t) => t.tiers.includes(tier) && (!strand || t.strand === strand)).length;
/** Chips: the strands of a key stage, or the topics of one A-level strand. */
const chipsFor = ({ tier, strand }: Card) => (strand ? (subtopicsByStrand(tier).get(strand) ?? []) : [...subtopicsByStrand(tier).keys()]);

function LevelCard({ card, onBuild, onWorksheet, onPractice }: { card: Card } & Omit<Props, 'onMock'>) {
  return (
    <article className="level-card">
      <div className="level-card-head">
        <h3>{card.title}</h3>
        <span className="count">{typesAt(card)} question types</span>
      </div>
      <p>{card.sub}</p>
      <p className="chips-hint">Pick a topic for an instant worksheet:</p>
      <ul className="chips" aria-label={card.strand ? 'Topics' : 'Strands'}>
        {chipsFor(card).map((s) => (
          <li key={s}>
            {/* A-level chips are topics of the card's strand; the others are whole strands. */}
            <button type="button" title={`Instant worksheet: ${s}`} onClick={() => (card.strand ? onWorksheet(card.tier, card.strand, s) : onWorksheet(card.tier, s as Strand))}>
              {s}
            </button>
          </li>
        ))}
      </ul>
      <div className="level-card-actions">
        <button type="button" className="primary" onClick={() => onBuild(card.tier, card.strand)}>
          Build a set
        </button>
        <button type="button" onClick={() => onWorksheet(card.tier, card.strand)}>
          Instant worksheet
        </button>
        <button type="button" onClick={() => onPractice(card.tier, card.strand)}>
          Practise
        </button>
      </div>
    </article>
  );
}

/** Year groups of the A-level section. A card with no question types yet shows "Coming soon". */
const A_LEVEL: { year: string; spec: string; tier: Tier; cards: { strand: Strand; title: string; sub: string }[] }[] = [
  {
    year: 'Year 12',
    spec: 'First-year content, in the style of Edexcel AS papers (8MA0).',
    tier: 'Y12',
    cards: [
      { strand: 'Pure', title: 'Y12 Pure', sub: 'Algebra, coordinate geometry, trigonometry, calculus, logarithms, vectors and proof.' },
      { strand: 'Mechanics', title: 'Y12 Mechanics', sub: 'Kinematics, forces and Newton’s laws, connected particles.' },
      { strand: 'Statistics', title: 'Y12 Statistics', sub: 'Sampling, data, probability, the binomial distribution and hypothesis tests.' },
    ],
  },
  {
    year: 'Year 13',
    spec: 'Second-year content, in the style of Edexcel A-level papers (9MA0).',
    tier: 'Y13',
    cards: [
      { strand: 'Pure', title: 'Y13 Pure', sub: 'Functions, series, further calculus, differential equations and numerical methods.' },
      { strand: 'Mechanics', title: 'Y13 Mechanics', sub: 'Moments, friction, projectiles and forces in two dimensions.' },
      { strand: 'Statistics', title: 'Y13 Statistics', sub: 'Regression, conditional probability and the normal distribution.' },
    ],
  },
];

export function HomeView({ onBuild, onWorksheet, onPractice, onMock }: Props) {
  const cardProps = { onBuild, onWorksheet, onPractice };
  return (
    <div className="home">
      <section className="hero">
        <p className="kicker">Edexcel-style problem solving</p>
        <h1>Fresh maths questions, worked mark schemes</h1>
        <p className="tagline">Build exam-style problem-solving questions for lessons, homework and revision. Every answer is checked twice.</p>
        <p className="trust">
          <span>Free</span>
          <span>No ads</span>
          <span>No sign-up</span>
        </p>
        <div className="hero-actions">
          <a className="cta" href="#levels" onClick={jump('levels')}>
            Choose your level <span aria-hidden="true">↓</span>
          </a>
        </div>
      </section>

      <nav id="levels" className="level-tabs" aria-label="Levels">
        <a href="#ks3" onClick={jump('ks3')}>
          KS3 <small>Years 7–9</small>
        </a>
        <a href="#gcse" onClick={jump('gcse')}>
          GCSE <small>Years 10–11</small>
        </a>
        <a href="#alevel" onClick={jump('alevel')}>
          A-level <small>Years 12–13</small>
        </a>
      </nav>

      <section id="ks3" className="level ks3" aria-labelledby="ks3-h">
        <header>
          <span className="level-tag">Years 7–9</span>
          <h2 id="ks3-h">Key Stage 3</h2>
          <p>Problem solving from the KS3 programme of study, pitched to build towards GCSE.</p>
        </header>
        <div className="level-grid one">
          <LevelCard card={{ tier: 'KS3', title: 'KS3 Mathematics', sub: 'Practice, Apply and Extend questions for Years 7, 8 and 9.' }} {...cardProps} />
        </div>
      </section>

      <section id="gcse" className="level gcse" aria-labelledby="gcse-h">
        <header>
          <span className="level-tag">Years 10–11 · Edexcel 1MA1</span>
          <h2 id="gcse-h">GCSE</h2>
          <p>Questions in the style of Edexcel GCSE (9–1) papers, following the Foundation and Higher specification.</p>
        </header>
        <div className="level-grid">
          <LevelCard card={{ tier: 'F', title: 'GCSE Foundation', sub: 'Grades 1–5. Multi-step problems, reasoning and real-world contexts.' }} {...cardProps} />
          <LevelCard card={{ tier: 'H', title: 'GCSE Higher', sub: 'Grades 4–9. Everything in Foundation plus the Higher-only content.' }} {...cardProps} />
        </div>
      </section>

      <section id="alevel" className="level alevel" aria-labelledby="alevel-h">
        <header>
          <span className="level-tag">Years 12–13 · Edexcel</span>
          <h2 id="alevel-h">A-level</h2>
          <p>Questions in the style of Edexcel AS and A-level papers. A calculator is allowed on every paper.</p>
        </header>
        {A_LEVEL.map((y) => (
          <div key={y.tier} className="year-group">
            <h3>{y.year}</h3>
            <p className="year-spec">{y.spec}</p>
            <div className="level-grid three">
              {y.cards.map((c) => {
                const card: Card = { tier: y.tier, strand: c.strand, title: c.title, sub: c.sub };
                return typesAt(card) > 0 ? (
                  <LevelCard key={c.title} card={card} {...cardProps} />
                ) : (
                  <article key={c.title} className="level-card soon-card" aria-disabled="true">
                    <div className="level-card-head">
                      <h3>{c.title}</h3>
                      <span className="count">Coming soon</span>
                    </div>
                    <p>{c.sub}</p>
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </section>

      <section className="level mocks" aria-labelledby="mock-h">
        <header>
          <span className="level-tag">Full papers</span>
          <h2 id="mock-h">Mock papers</h2>
          <p>A full-length paper in one click: the right number of marks and the specification’s balance of topics, easier questions first, with a mark scheme. Every click makes a new paper.</p>
        </header>
        <div className="mock-grid">
          {MOCKS.map((m) => (
            <button key={m.id} type="button" onClick={() => onMock(m.id)}>
              <strong>{m.label}</strong>
              <span>
                {m.marks} marks · {m.minutes >= 60 ? `${Math.floor(m.minutes / 60)} h ` : ''}
                {m.minutes % 60 ? `${m.minutes % 60} min` : ''}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="how" aria-labelledby="how-h">
        <h2 id="how-h">Four ways to use it</h2>
        <div className="how-grid">
          <div>
            <h3>Build</h3>
            <p>Pick topics, difficulty and calculator or non-calculator. Lock the questions you like and regenerate the rest.</p>
          </div>
          <div>
            <h3>Board</h3>
            <p>One question at a time, big enough for a projector. Reveal the answer, then the working step by step.</p>
          </div>
          <div>
            <h3>Worksheet</h3>
            <p>A printable A4 sheet with an answer sheet of full mark schemes. Make versions A and B with different numbers.</p>
          </div>
          <div>
            <h3>Practise</h3>
            <p>For students: type an answer, have it checked, then see the worked solution step by step.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        {/* Plain links to the static topic pages (scripts/build-pages.tsx), for visitors and search engines. */}
        <p>
          Sample questions by level: <a href="/ks3/">KS3</a>
          <span aria-hidden="true"> · </span>
          <a href="/gcse-foundation/">GCSE Foundation</a>
          <span aria-hidden="true"> · </span>
          <a href="/gcse-higher/">GCSE Higher</a>
          <span aria-hidden="true"> · </span>
          <a href="/a-level-year-12/">A-level Year 12</a>
          <span aria-hidden="true"> · </span>
          <a href="/a-level-year-13/">A-level Year 13</a>
        </p>
        <p>
          <a href={tuitionHref()}>Online maths tuition</a>
          <span aria-hidden="true"> · </span>
          <a href="https://buymeacoffee.com/zainhusayn" target="_blank" rel="noopener noreferrer">
            Buy me a coffee
          </a>
          <span aria-hidden="true"> · </span>
          <a href="./privacy.html">Privacy</a>
        </p>
        <p className="small">© {new Date().getFullYear()} Maths Problem Solving. Not affiliated with Pearson Edexcel.</p>
      </footer>
    </div>
  );
}
