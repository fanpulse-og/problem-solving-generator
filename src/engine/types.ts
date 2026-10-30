import type { Rng } from './rng';

export type Tier = 'KS3' | 'F' | 'H';
export type Level = 'foundational' | 'core' | 'stretch';
export type Calc = 'non-calc' | 'calc';
export type CalcSupport = Calc | 'either';

export const TIERS: { id: Tier; label: string }[] = [
  { id: 'KS3', label: 'KS3' },
  { id: 'F', label: 'KS4 Foundation' },
  { id: 'H', label: 'KS4 Higher' },
];

export const LEVELS: { id: Level; label: string }[] = [
  { id: 'foundational', label: 'Foundational' },
  { id: 'core', label: 'Core' },
  { id: 'stretch', label: 'Stretch' },
];

export const STRANDS = [
  'Number',
  'Algebra',
  'Ratio & Proportion',
  'Geometry & Measures',
  'Probability',
  'Statistics',
] as const;
export type Strand = (typeof STRANDS)[number];

/** Question styles seen in the reference papers. */
export const STYLES = {
  'multi-step': 'Multi-step',
  decide: 'Decide or show',
  backwards: 'Work backwards',
  'ratio-reasoning': 'Ratio reasoning',
  'form-solve': 'Form and solve',
  averages: 'Averages puzzle',
  'geometry-chain': 'Geometry chain',
  measures: 'Real-world measures',
  data: 'Interpret data',
} as const;
export type StyleId = keyof typeof STYLES;

/**
 * Mark codes, Edexcel style. Each step is worth exactly one mark.
 * P = process, M = method, A = accuracy, B = independent, C = communication.
 */
export type MarkCode = 'P1' | 'M1' | 'A1' | 'B1' | 'C1';

export interface MarkStep {
  code: MarkCode;
  /** The working, as it would be written down. May contain $…$ maths. */
  working: string;
  /** Student-friendly explanation of why this step earns the mark. */
  note: string;
}

export interface TableSpec {
  header?: string[];
  rows: string[][];
  /** Render the first column as a heading column. */
  rowHeaders?: boolean;
}

export type DiagramSpec =
  | {
      type: 'polygon';
      /** Vertices in drawing units (y up). */
      points: [number, number][];
      /** Text placed outside the middle of edge i (from point i to i+1). */
      edgeLabels?: { edge: number; text: string }[];
      vertexLabels?: string[];
      rightAngles?: number[];
      /** Text inside the corner at each vertex ('' for none), e.g. '(2x + 10)°'. */
      angleLabels?: string[];
      /** Dashed internal segments, e.g. the height of a triangle. */
      dashed?: [[number, number], [number, number]][];
      notAccurate?: boolean;
    }
  | { type: 'squareSemicircles'; label: string; notAccurate?: boolean }
  | {
      /**
       * Parallel lines APRB (top) and CQD (bottom) with triangle PQR between them.
       * `a` = angle APQ and `b` = angle RQD in degrees (used for drawing only).
       */
      type: 'parallelTriangle';
      a: number;
      b: number;
      labels: Partial<Record<'APQ' | 'QPR' | 'PRQ' | 'PQR' | 'RQD', string>>;
      notAccurate?: boolean;
    }
  | { type: 'plateCutouts'; lengthLabel: string; widthLabel: string; notAccurate?: boolean }
  | {
      /**
       * General geometry figure from named points (y up): triangles, circles,
       * cuboids drawn in oblique projection, vector diagrams.
       */
      type: 'figure';
      points: Record<string, [number, number]>;
      segments?: [string, string][];
      dashed?: [string, string][];
      /** Circle through the given centre and radius (model units). */
      circle?: { center: string; r: number };
      /** Points to label with their names (default: all, except names starting with _). */
      labelled?: string[];
      /** Draw a dot at these points (e.g. a centre O). */
      dots?: string[];
      edgeLabels?: { a: string; b: string; text: string }[];
      angles?: { at: string; from: string; to: string; text: string }[];
      rightAngles?: { at: string; from: string; to: string }[];
      /** Arrowhead halfway along a → b (vectors). */
      arrows?: [string, string][];
      notAccurate?: boolean;
    }
  | {
      type: 'histogram';
      classes: [number, number][];
      /** Frequency density for each class; null = bar not drawn (to be completed). */
      densities: (number | null)[];
      xLabel: string;
      yLabel: string;
      /** Spacing of the faint minor grid lines (e.g. 0.2), so bar heights can be read exactly. */
      gridStep?: number;
      /** Leave the frequency-density axis unnumbered (scale must be deduced). */
      hideScale?: boolean;
      notAccurate?: boolean;
    }
  | {
      /** Coordinate grid: transformations, cumulative frequency graphs. */
      type: 'grid';
      x: [number, number];
      y: [number, number];
      /** Spacing of the grid lines (default 1). */
      xStep?: number;
      yStep?: number;
      /** Number the axis every n units (default: every grid line). */
      xLabelEvery?: number;
      yLabelEvery?: number;
      xLabel?: string;
      yLabel?: string;
      /** Label the x-axis as 24-hour clock times, starting at this many minutes after midnight. */
      xClock?: number;
      /** Same scale on both axes, for shapes. */
      square?: boolean;
      paths?: { points: [number, number][]; closed?: boolean; label?: string; labelAt?: [number, number]; shaded?: boolean; dots?: boolean }[];
      notAccurate?: boolean;
    }
  | {
      /** Two-stage probability tree. A probability of '' is drawn as a blank to complete; 'a/b' is drawn as a fraction. */
      type: 'tree';
      first: { label: string; p: string }[];
      second: { label: string; p: string }[][];
      stages?: [string, string];
      /** Frequency tree: a label at the root and no probabilities on the branches. */
      root?: string;
      frequencies?: boolean;
      notAccurate?: boolean;
    }
  | {
      /** Pie chart drawn clockwise from 12 o'clock; showAngle prints the angle in the sector. */
      type: 'pie';
      title?: string;
      sectors: { label: string; angle: number; showAngle?: boolean }[];
      notAccurate?: boolean;
    }
  | {
      /** Two-set Venn diagram; '' leaves a region empty. Use \n to break a long list. */
      type: 'venn';
      sets: [string, string];
      regions: { a: string; both: string; b: string; neither: string };
      notAccurate?: boolean;
    };

export type Block =
  | { kind: 'text'; text: string }
  | { kind: 'box'; lines: string[] }
  | { kind: 'table'; table: TableSpec }
  | { kind: 'cards'; values: string[] }
  | { kind: 'diagram'; diagram: DiagramSpec };

export interface Part {
  /** 'a', 'b', 'b(i)' … or null for a single-part question. */
  label: string | null;
  blocks: Block[];
  marks: number;
}

export interface QuestionContent {
  /** Lines/blocks before the parts. */
  stem: Block[];
  parts: Part[];
}

export interface PartAnswer {
  /** Answer as shown on the answer sheet. May contain $…$ maths. */
  text: string;
}

export interface GenCtx {
  rng: Rng;
  tier: Tier;
  level: Level;
  calc: Calc;
}

export interface Template<V = any> {
  /** Unique, kebab-case, never reused. Appears in share links. */
  id: string;
  title: string;
  strand: Strand;
  subtopic: string;
  /** Tiers this template is offered at (in the filter and in generated sets). */
  tiers: Tier[];
  /**
   * Tiers it used to be offered at but no longer is (the content is outside that
   * tier's specification). Old links with these tiers still open.
   */
  formerTiers?: Tier[];
  levels: Level[];
  /**
   * Levels offered at a particular tier, when some levels need content from a
   * higher tier (e.g. Foundation gets the foundational and core levels only).
   */
  levelsByTier?: Partial<Record<Tier, Level[]>>;
  /** Default style, optionally overridden per level. */
  style: StyleId;
  styleByLevel?: Partial<Record<Level, StyleId>>;
  calculator: CalcSupport;
  /** Choose the variables. Throw Reject (see format.ts) to retry. */
  generate(ctx: GenCtx): V;
  /** Constraint violations; [] means the question is fine. */
  validate(v: V): string[];
  render(v: V): QuestionContent;
  answer(v: V): PartAnswer[];
  markScheme(v: V): MarkStep[][];
  /**
   * Independent verification: recompute or substitute back by a different
   * route from answer(). Return a list of problems ([] = verified).
   */
  check(v: V, answers: PartAnswer[]): string[];
  /** Canonical form of the maths (ignoring names/contexts) for duplicate detection. */
  key(v: V): string;
}

export interface Question {
  code: string;
  template: Template;
  tier: Tier;
  level: Level;
  calc: Calc;
  seed: string;
  style: StyleId;
  vars: unknown;
  content: QuestionContent;
  answers: PartAnswer[];
  scheme: MarkStep[][];
  marks: number;
  key: string;
}

/** The levels a template offers at this tier. */
export function levelsFor(t: Template, tier: Tier): Level[] {
  return t.levelsByTier?.[tier] ?? t.levels;
}

export function defineTemplate<V>(t: Template<V>): Template<V> {
  return t;
}
