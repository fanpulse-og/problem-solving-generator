import { defineTemplate } from '../../engine/types';
import { part, step, table, text, MINUS } from '../../engine/blocks';
import { ensure, frac, fracRaw, int } from '../../engine/format';
import { Q } from '../../engine/rational';
import { TWO_WAY_CONTEXTS } from '../../contexts/scenarios';

/**
 * Modelled on Set 24 1F Q10 (complete the two-way table of desserts, then a
 * fraction) and Set 22 1F Q12 (probability from a two-way table). Stretch
 * gives the information as sentences, so the table has to be built first.
 */
type Ctx = (typeof TWO_WAY_CONTEXTS)[number];
interface V {
  level: 'foundational' | 'core' | 'stretch';
  ctx: Ctx;
  grid: number[][]; // 3 × 4: rows 0–1 data, row 2 totals; col 3 totals
  shown: boolean[][];
  askRow: number;
  askCol: number;
}

interface Deduction {
  r: number;
  c: number;
  how: string;
}

const rowName = (ctx: Ctx, r: number) => (r === 2 ? 'Total' : ctx.rows[r]);
const colName = (ctx: Ctx, c: number) => (c === 3 ? 'Total' : ctx.cols[c]);

/** Fill unknowns using only "a row or column with one gap". Returns deductions, or null if stuck. */
function solve(grid: number[][], shown: boolean[][], ctx: Ctx): Deduction[] | null {
  const known = shown.map((r) => r.slice());
  const val = grid.map((r, ri) => r.map((x, ci) => (known[ri][ci] ? x : NaN)));
  const out: Deduction[] = [];
  const lines: { cells: [number, number][]; total: [number, number] }[] = [];
  for (let r = 0; r < 3; r++) lines.push({ cells: [0, 1, 2].map((c) => [r, c] as [number, number]), total: [r, 3] });
  for (let c = 0; c < 4; c++) lines.push({ cells: [0, 1].map((r) => [r, c] as [number, number]), total: [2, c] });
  let progress = true;
  while (progress) {
    progress = false;
    for (const ln of lines) {
      const all = [...ln.cells, ln.total];
      const gaps = all.filter(([r, c]) => !known[r][c]);
      if (gaps.length !== 1) continue;
      const [gr, gc] = gaps[0];
      const isTotal = gr === ln.total[0] && gc === ln.total[1];
      const parts = ln.cells.filter(([r, c]) => !(r === gr && c === gc)).map(([r, c]) => val[r][c]);
      const value = isTotal ? parts.reduce((a, b) => a + b, 0) : val[ln.total[0]][ln.total[1]] - parts.reduce((a, b) => a + b, 0);
      val[gr][gc] = value;
      known[gr][gc] = true;
      const label = `${rowName(ctx, gr)}, ${colName(ctx, gc)}`;
      out.push({ r: gr, c: gc, how: isTotal ? `${label}: ${parts.join(' + ')} = ${value}` : `${label}: ${val[ln.total[0]][ln.total[1]]} ${MINUS} ${parts.join(` ${MINUS} `)} = ${value}` });
      progress = true;
    }
  }
  return known.every((r) => r.every(Boolean)) ? out : null;
}

export default defineTemplate<V>({
  id: 'prob-two-way-table',
  title: 'Two-way tables and probability',
  strand: 'Probability',
  subtopic: 'Probability tables',
  tiers: ['KS3', 'F', 'H'],
  levels: ['foundational', 'core', 'stretch'],
  style: 'data',
  calculator: 'either',

  generate({ rng, tier, level }) {
    const ctx = rng.pick(TWO_WAY_CONTEXTS);
    const max = tier === 'KS3' ? 25 : 45;
    const data = [0, 1].map(() => [0, 1, 2].map(() => rng.int(2, max)));
    const grid = [...data.map((r) => [...r, r[0] + r[1] + r[2]]), [0, 1, 2, 3].map((c) => data[0][c] ?? 0)];
    for (let c = 0; c < 4; c++) grid[2][c] = grid[0][c] + grid[1][c];
    // Show the grand total plus 5–6 other cells, chosen so the table can be completed.
    const cells: [number, number][] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) if (!(r === 2 && c === 3)) cells.push([r, c]);
    const nShown = level === 'foundational' ? 6 : 5;
    const pick = rng.sample(cells, nShown);
    const shown = [0, 1, 2].map((r) => [0, 1, 2, 3].map((c) => (r === 2 && c === 3) || pick.some(([pr, pc]) => pr === r && pc === c)));
    ensure(solve(grid, shown, ctx) !== null, 'table must be completable');
    ensure(solve(grid, shown, ctx)!.length >= 4, 'enough to find');
    const askRow = rng.int(0, 1);
    const askCol = rng.int(0, 2);
    return { level, ctx, grid, shown, askRow, askCol };
  },

  validate(v) {
    const p: string[] = [];
    for (let r = 0; r < 3; r++) if (v.grid[r][0] + v.grid[r][1] + v.grid[r][2] !== v.grid[r][3]) p.push(`row ${r} total`);
    for (let c = 0; c < 4; c++) if (v.grid[0][c] + v.grid[1][c] !== v.grid[2][c]) p.push(`col ${c} total`);
    if (v.grid.flat().some((x) => x <= 0)) p.push('every count positive');
    return p;
  },

  render(v) {
    const { ctx, grid } = v;
    const N = grid[2][3];
    const header = ['', ...ctx.cols, 'Total'];
    const body = (blankAll: boolean) =>
      [0, 1, 2].map((r) => [rowName(ctx, r), ...[0, 1, 2, 3].map((c) => (r === 2 && c === 3 ? int(N) : !blankAll && v.shown[r][c] ? int(grid[r][c]) : ''))]);
    const intro = ctx.intro(int(N));
    const stem = [text(v.level === 'stretch' ? intro.replace('The two-way table shows some information about', 'Here is some information about') : intro), text(ctx.each)];
    if (v.level === 'stretch') {
      const clues: string[] = [];
      for (let r = 0; r < 3; r++)
        for (let c = 0; c < 4; c++) {
          if (!v.shown[r][c] || (r === 2 && c === 3)) continue;
          const n = int(grid[r][c]);
          if (r === 2) clues.push(`${n} of the ${ctx.noun} ${ctx.did(ctx.cols[c])}.`);
          else if (c === 3) clues.push(`${n} of the ${ctx.noun} ${ctx.inRow(ctx.rows[r])}.`);
          else clues.push(`${n} of the ${ctx.rowNoun(ctx.rows[r])} ${ctx.did(ctx.cols[c])}.`);
        }
      stem.push(...clues.map(text), table({ header, rows: body(true), rowHeaders: true }));
    } else stem.push(table({ header, rows: body(false), rowHeaders: true }));
    const complete = part('a', 3, text(v.level === 'stretch' ? 'Use this information to complete the two-way table.' : 'Complete the two-way table.'));
    if (v.level === 'foundational') {
      return {
        stem,
        parts: [complete, part('b', 1, text(`One of the ${int(N)} ${ctx.noun} is picked at random.`), text(`Write down the probability that this person is one of the ${ctx.rowNoun(ctx.rows[v.askRow])}.`))],
      };
    }
    return {
      stem,
      parts: [complete, part('b', 2, text(`One of the ${ctx.rowNoun(ctx.rows[v.askRow])} is picked at random.`), text(`Work out the probability that this person did not ${base(ctx.did(ctx.cols[v.askCol]))}.`))],
    };
  },

  answer(v) {
    const { grid, ctx } = v;
    const rows = [0, 1, 2].map((r) => `${rowName(ctx, r)}: ${[0, 1, 2, 3].map((c) => int(grid[r][c])).join(', ')}`).join('; ');
    const tableAns = { text: `Completed table (${ctx.cols.join(', ')}, Total) — ${rows}` };
    if (v.level === 'foundational') return [tableAns, { text: frac(Q.of(grid[v.askRow][3], grid[2][3])) }];
    const rt = grid[v.askRow][3];
    return [tableAns, { text: frac(Q.of(rt - grid[v.askRow][v.askCol], rt)) }];
  },

  markScheme(v) {
    const ded = solve(v.grid, v.shown, v.ctx)!;
    // Split the deductions into three marks, like B3 / B2 / B1 on a mark scheme.
    const n = ded.length;
    const cut = [Math.ceil(n / 3), Math.ceil((2 * n) / 3)];
    const groups = [ded.slice(0, cut[0]), ded.slice(cut[0], cut[1]), ded.slice(cut[1])];
    const notes = ['Look for a row or column with only one gap: the numbers must add to the total.', 'Each value you find opens up another row or column.', 'Check that every row and column adds up.'];
    const tableSteps = groups.map((g, i) => step('B1', g.map((d) => d.how).join(';  ') || 'All entries correct', notes[i]));
    const { grid, ctx } = v;
    if (v.level === 'foundational') {
      const rt = grid[v.askRow][3];
      return [tableSteps, [step('B1', `${fracRaw(rt, grid[2][3])}${Q.of(rt, grid[2][3]).d !== BigInt(grid[2][3]) ? ` = ${frac(Q.of(rt, grid[2][3]))}` : ''}`, `Probability = number of ${ctx.rowNoun(ctx.rows[v.askRow])} ÷ total.`)]];
    }
    const rt = grid[v.askRow][3];
    const not = rt - grid[v.askRow][v.askCol];
    return [
      tableSteps,
      [
        step('M1', `${rt} ${MINUS} ${grid[v.askRow][v.askCol]} = ${not}`, `Only use the ${ctx.rowNoun(ctx.rows[v.askRow])} row, and find how many did NOT ${base(ctx.did(ctx.cols[v.askCol]))}.`),
        step('A1', `${fracRaw(not, rt)}${Q.of(not, rt).d !== BigInt(rt) ? ` = ${frac(Q.of(not, rt))}` : ''}`, `Divide by the ${ctx.rowNoun(ctx.rows[v.askRow])} total, not the whole table.`),
      ],
    ];
  },

  check(v, answers) {
    const p: string[] = [];
    // Rebuild the table from the shown cells by brute force over the unknowns' row/col sums.
    const ded = solve(v.grid, v.shown, v.ctx);
    if (!ded) p.push('not solvable');
    else for (const d of ded) if (!d.how.endsWith(`= ${v.grid[d.r][d.c]}`)) p.push('deduction mismatch');
    const { grid } = v;
    const want = v.level === 'foundational' ? Q.of(grid[v.askRow][3], grid[2][3]) : Q.of(grid[v.askRow][3] - grid[v.askRow][v.askCol], grid[v.askRow][3]);
    if (answers[1].text !== frac(want)) p.push('probability');
    return p;
  },

  key: (v) => `${v.grid.flat().join(',')}|${v.shown.flat().map(Number).join('')}|${v.askRow}${v.askCol}`,
});

function base(did: string): string {
  return did.replace(/^chose/, 'choose').replace(/^named/, 'name').replace(/^visited/, 'visit');
}
