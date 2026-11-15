import { buildQuestion, supportsCalc, totalMarks } from './generate';
import { Rng, freshSeed } from './rng';
import { LEVELS, levelsFor, type Calc, type Question, type Strand, type Template, type Tier } from './types';

/** A mock paper: its length, and the share of the marks each strand gets. */
export interface MockSpec {
  id: string;
  tier: Tier;
  /** Shown on the button and as the worksheet title. */
  label: string;
  calc: Calc;
  marks: number;
  minutes: number;
  shares: [Strand, number][];
}

// The middle of each range in the Edexcel GCSE (9–1) specification's table of weightings.
const FOUNDATION: [Strand, number][] = [['Number', 0.25], ['Algebra', 0.2], ['Ratio & Proportion', 0.25], ['Geometry & Measures', 0.15], ['Probability', 0.075], ['Statistics', 0.075]];
const HIGHER: [Strand, number][] = [['Number', 0.15], ['Algebra', 0.3], ['Ratio & Proportion', 0.2], ['Geometry & Measures', 0.2], ['Probability', 0.075], ['Statistics', 0.075]];

export const MOCKS: MockSpec[] = [
  { id: 'f-nc', tier: 'F', label: 'Foundation mock: non-calculator', calc: 'non-calc', marks: 80, minutes: 90, shares: FOUNDATION },
  { id: 'f-c', tier: 'F', label: 'Foundation mock: calculator', calc: 'calc', marks: 80, minutes: 90, shares: FOUNDATION },
  { id: 'h-nc', tier: 'H', label: 'Higher mock: non-calculator', calc: 'non-calc', marks: 80, minutes: 90, shares: HIGHER },
  { id: 'h-c', tier: 'H', label: 'Higher mock: calculator', calc: 'calc', marks: 80, minutes: 90, shares: HIGHER },
  { id: 'y12-pure', tier: 'Y12', label: 'Year 12 mock: Pure', calc: 'calc', marks: 100, minutes: 120, shares: [['Pure', 1]] },
  { id: 'y12-applied', tier: 'Y12', label: 'Year 12 mock: Statistics and Mechanics', calc: 'calc', marks: 60, minutes: 75, shares: [['Statistics', 0.5], ['Mechanics', 0.5]] },
  { id: 'y13-pure', tier: 'Y13', label: 'Year 13 mock: Pure', calc: 'calc', marks: 100, minutes: 120, shares: [['Pure', 1]] },
  { id: 'y13-applied', tier: 'Y13', label: 'Year 13 mock: Statistics and Mechanics', calc: 'calc', marks: 100, minutes: 120, shares: [['Statistics', 0.5], ['Mechanics', 0.5]] },
];

const seedFrom = (rng: Rng) =>
  Math.floor(rng.next() * 36 ** 6)
    .toString(36)
    .padStart(6, '0');

/**
 * A full paper: each strand is filled to its share of the marks with different
 * question types at a spread of levels, then the paper is topped up to the
 * exact total where a question of the right size exists. Easier questions first.
 */
export function buildMock(all: Template[], spec: MockSpec, seed = freshSeed()): Question[] {
  const rng = new Rng(`mock:${spec.id}:${seed}`);
  const out: Question[] = [];
  const keys = new Set<string>();
  const used = new Set<string>();
  const pools = spec.shares.map(([strand]) => all.filter((t) => t.strand === strand && t.tiers.includes(spec.tier) && supportsCalc(t, spec.calc)));

  /** One question from the pool worth at most `room` marks, preferring unused types and the given level. */
  const add = (pool: Template[], room: number, turn: number): Question | null => {
    const order = [...rng.shuffle(pool.filter((t) => !used.has(t.id))), ...rng.shuffle(pool.filter((t) => used.has(t.id)))];
    for (const t of order.slice(0, 12)) {
      const levels = levelsFor(t, spec.tier);
      const level = levels[turn % levels.length];
      const q = buildQuestion(t, level, spec.tier, spec.calc, seedFrom(rng));
      if (q.marks > room || keys.has(q.key)) continue;
      keys.add(q.key);
      used.add(t.id);
      out.push(q);
      return q;
    }
    return null;
  };

  spec.shares.forEach(([, share], i) => {
    let left = Math.round(share * spec.marks);
    for (let turn = 0; left > 0 && turn < 40; turn++) {
      const q = add(pools[i], left, turn);
      if (q) left -= q.marks;
    }
  });
  // Top up, or stop a mark or two short if nothing fits.
  for (let turn = 0; totalMarks(out) < spec.marks && turn < 30; turn++) add(pools[turn % pools.length], spec.marks - totalMarks(out), turn);

  const level = (q: Question) => LEVELS.findIndex((l) => l.id === q.level);
  return out.map((q, i) => ({ q, i })).sort((a, b) => level(a.q) - level(b.q) || a.q.marks - b.q.marks || a.i - b.i).map((x) => x.q);
}
