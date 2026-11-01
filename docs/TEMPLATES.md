# Writing question templates

Every question type is one TypeScript file in `src/templates/<strand>/`. Drop a
new file in and it appears in the app automatically. There's no list to update.
Start from [`src/templates/_skeleton.ts`](../src/templates/_skeleton.ts).

## The schema

| Field | What it is |
|---|---|
| `id` | Unique kebab-case id, e.g. `ratio-difference`. It appears in share links, so **never rename or reuse one**. |
| `title`, `strand`, `subtopic` | How the template is listed in the topic picker. |
| `tiers` | Any of `'KS3'`, `'F'`, `'H'`, or `'Y12'`, `'Y13'` for A-level. KS3 should get easier numbers (check `tier === 'KS3'` in `generate`). A-level templates use `calculator: 'calc'`, since every paper allows one. |
| `formerTiers` | Optional. Tiers the template is no longer offered at (see [TIERS.md](TIERS.md)); old links with them still open. |
| `levelsByTier` | Optional. Levels offered at a tier when the other levels need Higher-only content, e.g. `{ F: ['foundational', 'core'] }`. |
| `levels` | Any of `'foundational'`, `'core'`, `'stretch'`. Levels should change the **question**, not just the numbers: foundational adds scaffolding parts; core is the paper-style problem; stretch reverses it, adds a step or asks for a decision. |
| `style`, `styleByLevel` | One of the styles in `src/engine/types.ts` (`STYLES`), optionally different per level. |
| `calculator` | `'non-calc'`, `'calc'` or `'either'`. With `'either'`, `generate` receives `calc` and must keep non-calculator numbers mental-friendly. |
| `generate(ctx)` | Picks the variables from `ctx.rng`. Throw `reject(…)` or use `ensure(cond, reason)` to retry with fresh numbers. |
| `validate(v)` | Constraints that must always hold. Returns a list of problems. |
| `render(v)` | The question: `stem` blocks, then `parts`, each with its marks. |
| `answer(v)` | One answer string per part. |
| `markScheme(v)` | One list of `MarkStep`s per part. **Each step is one mark**, so a 3-mark part has 3 steps. |
| `check(v, answers)` | Re-derives the answer **by a different route** (substituting back, brute force, a different formula) and compares it with the shown answer. |
| `key(v)` | The maths without names or contexts, used to stop duplicates in a set. |

### Blocks (`src/engine/blocks.ts`)

- `text('…')`: one line. Use `$…$` for maths (KaTeX), e.g. `'$\\frac{3}{4}$ of the tickets'`.
- `lines(a, b, c)`: several lines.
- `box('line 1', 'line 2')`: a ruled box, for rules and offers.
- `table({ header, rows, rowHeaders })`: blank cells are `''`.
- `cards(['4', '$x$'])`: number cards.
- `diagram({...})`: SVG drawn from your numbers (see `DiagramSpec` in `types.ts`).
  Types: `polygon`, `figure` (named points: triangles, circles, cuboids, vectors),
  `histogram`, `grid` (coordinate grid for transformations and cumulative frequency
  graphs), `tree` (two-stage probability tree; `''` draws a blank, `'a/b'` a fraction),
  `venn` (two sets), `pie` (pie chart, optional angle labels), `graph` (sketch graph with axes through O, curves, marked points and a shaded region), plus the special-purpose `squareSemicircles`, `plateCutouts` and
  `parallelTriangle`.
- `single(marks, …blocks)` for a one-part question; `part('a', marks, …blocks)` for multi-part.
- `step('M1', working, note)`: codes are `P1` (process), `M1` (method), `A1` (accuracy), `B1` (independent) and `C1` (communication). Write the working as a student would, and the note in plain, friendly language.

### Numbers and formatting (`src/engine/format.ts`, `rational.ts`, `pure.ts`)

- A-level algebra helpers are in `pure.ts`: `terms` and `polyQ` for rational coefficients, `coef` and `signedCoef` so a coefficient of 1 is not written, `circleTex`, `lineTex`, `surdTex`, `nCr`, `gCr`, and `sf3` (3 significant figures, retrying rather than showing "52.0").

- Never do arithmetic on decimals with floating point. Use `Q` (exact fractions), integers, or pence for money.
- `money(pence)` gives £7200, £13.60 or £18 000. `int(n)` gives Edexcel spacing. `dec(q)` gives an exact decimal. `frac(q)` gives a KaTeX fraction.
- For π and square roots, use `roundFloatDp` or `roundFloatSf`. They reject values too close to a rounding boundary. Also reject answers that would show as "75.0".
- Edexcel style has no full stop after a line ending in a number. `sentence(s)` handles it.
- Names come from `names(rng, n)`. Contexts belong in `src/contexts/scenarios.ts`, so one template can be reskinned many ways.

## Checking your template

```bash
npm test                     # every template × tier × level × calculator mode, 500 seeds each
SEEDS=100 npm test           # quicker while you are working
npx vite-node scripts/print.ts <id> core F non-calc 5   # read 5 questions as text
npm run crosscheck           # independent Python re-solve (add a function for new ids)
```

The test fails if a template can't produce a valid question, if `check` disagrees,
if marks don't match the mark-scheme steps, if any KaTeX fails to render, if
`NaN` or `undefined` appears, or if the punctuation breaks house style.

When you add a template, also add a matching function to `CHECKS` in
`scripts/crosscheck.py`. It should solve the question from the given values only.

## Asking Claude Code for more templates

Something like this works well:

> Add 5 new templates in the style of Set 23 2F Q4 (parcel postage table), for
> Number → Measures & money. Follow docs/TEMPLATES.md, include foundational/core/
> stretch levels, add cross-check functions, and run the tests and the cross-check.
