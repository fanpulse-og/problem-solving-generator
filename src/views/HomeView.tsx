import type React from 'react';
import { TEMPLATES, subtopicsByStrand } from '../engine/registry';
import type { Tier } from '../engine/types';
import { tuitionHref } from '../components/Tuition';

interface Props {
  /** Open the builder at this tier. */
  onBuild: (tier: Tier) => void;
  /** Generate a default set at this tier and open it as a printable worksheet. */
  onWorksheet: (tier: Tier) => void;
}

interface Card {
  tier: Tier;
  title: string;
  sub: string;
}

// In-page links scroll instead of changing the hash, which holds the app's state.
const jump = (id: string) => (e: React.MouseEvent) => {
  e.preventDefault();
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

const typesAt = (tier: Tier) => TEMPLATES.filter((t) => t.tiers.includes(tier)).length;
const strandsAt = (tier: Tier) => [...subtopicsByStrand(tier).keys()];

function LevelCard({ card, onBuild, onWorksheet }: { card: Card } & Props) {
  return (
    <article className="level-card">
      <div className="level-card-head">
        <h3>{card.title}</h3>
        <span className="count">{typesAt(card.tier)} question types</span>
      </div>
      <p>{card.sub}</p>
      <ul className="chips" aria-label="Strands">
        {strandsAt(card.tier).map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <div className="level-card-actions">
        <button type="button" className="primary" onClick={() => onBuild(card.tier)}>
          Build a set
        </button>
        <button type="button" onClick={() => onWorksheet(card.tier)}>
          Instant worksheet
        </button>
      </div>
    </article>
  );
}

const SOON = [
  { title: 'Pure Mathematics', sub: 'Papers 1 and 2: algebra, calculus, trigonometry, sequences, vectors.' },
  { title: 'Statistics', sub: 'Paper 3, section A: distributions, hypothesis testing, data.' },
  { title: 'Mechanics', sub: 'Paper 3, section B: kinematics, forces, moments, projectiles.' },
];

export function HomeView({ onBuild, onWorksheet }: Props) {
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
          <LevelCard card={{ tier: 'KS3', title: 'KS3 Mathematics', sub: 'Foundational, core and stretch questions for Years 7, 8 and 9.' }} onBuild={onBuild} onWorksheet={onWorksheet} />
        </div>
      </section>

      <section id="gcse" className="level gcse" aria-labelledby="gcse-h">
        <header>
          <span className="level-tag">Years 10–11 · Edexcel 1MA1</span>
          <h2 id="gcse-h">GCSE</h2>
          <p>Questions in the style of Edexcel GCSE (9–1) papers, following the Foundation and Higher specification.</p>
        </header>
        <div className="level-grid">
          <LevelCard card={{ tier: 'F', title: 'GCSE Foundation', sub: 'Grades 1–5. Multi-step problems, reasoning and real-world contexts.' }} onBuild={onBuild} onWorksheet={onWorksheet} />
          <LevelCard card={{ tier: 'H', title: 'GCSE Higher', sub: 'Grades 4–9. Everything in Foundation plus the Higher-only content.' }} onBuild={onBuild} onWorksheet={onWorksheet} />
        </div>
      </section>

      <section id="alevel" className="level alevel" aria-labelledby="alevel-h">
        <header>
          <span className="level-tag">Years 12–13 · Edexcel 9MA0</span>
          <h2 id="alevel-h">A-level</h2>
          <p>Edexcel-style A-level questions are on the way.</p>
        </header>
        <div className="level-grid three">
          {SOON.map((c) => (
            <article key={c.title} className="level-card soon-card" aria-disabled="true">
              <div className="level-card-head">
                <h3>{c.title}</h3>
                <span className="count">Coming soon</span>
              </div>
              <p>{c.sub}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="how" aria-labelledby="how-h">
        <h2 id="how-h">Three ways to use it</h2>
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
            <p>A printable A4 sheet with a worked example, then an answer sheet with full mark schemes.</p>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <p>
          <a href={tuitionHref()}>Online maths tuition</a>
          <span aria-hidden="true"> · </span>
          <a href="https://buymeacoffee.com/zainhusayn" target="_blank" rel="noopener noreferrer">
            Buy me a coffee
          </a>
        </p>
        <p className="small">© {new Date().getFullYear()} Maths Problem Solving. Not affiliated with Pearson Edexcel.</p>
      </footer>
    </div>
  );
}
