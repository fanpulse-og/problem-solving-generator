# Problem Solving Generator

A static web app that generates fresh, Edexcel-style GCSE maths **problem-solving**
questions (AO2/AO3) for KS3 and KS4 lessons, complete with worked, student-friendly
mark schemes.

- **Build:** choose a tier (KS3, KS4 Foundation, KS4 Higher), topics, difficulty
  (foundational / core / stretch), question style, calculator or non-calculator,
  and how many questions you want. Any question can be regenerated or shared as a link.
- **Board:** one question at a time, large enough for a projector. Reveal the
  answer, then the worked solution step by step. Keys: ← → change question,
  A answer, Space next step, R reset.
- **Worksheet:** a printable A4 sheet with one worked example, then foundational →
  core → stretch questions, and an answer sheet with mark schemes on a new page.
  Use your browser's Print → Save as PDF.

There's no backend, no accounts and no database. Every question is built from a
template and a seed, so its link always reproduces exactly the same question.

## Running it

You need Node.js 20 or later.

```bash
npm install
npm run dev        # open the printed localhost address
```

> On this Mac, Node was installed to `~/.local/node`. If `npm` isn't found, run
> `export PATH=~/.local/node/bin:$PATH` first, or add that line to `~/.zshrc`.

## Checking the maths

Correct maths is the top priority, so there are three layers of checks:

```bash
npm test             # every template × tier × level × calculator mode, 500 seeds each
npm run crosscheck   # an independent Python program re-solves exported questions
npm run quality      # ~2,000 seeds per template: untidy answers, heavy non-calculator
                     # arithmetic, wrong mark totals, failures → docs/quality-report.md
```

**Non-calculator questions** must only need manageable hand arithmetic
(`src/engine/arithmetic.ts`). The rule is checked on the mark-scheme working: up to
3-digit × 2-digit multiplication, division by a "friendly" number (1–12, 15, 16, 25,
75, 125 times a power of ten) or with a friendly whole-number answer, and no number
with more than 6 significant digits. Generation retries any non-calculator question
that breaks the rule, and the tests enforce it.

1. **Exact arithmetic.** The app uses fractions, never floating point, for anything
   a student sees. Rounding of π and square-root answers rejects values close to a
   rounding boundary.
2. **`check()` in every template.** It recomputes the answer by a different route
   (substituting back, brute-force search, a different formula), and the tests run it
   on every generated question. The tests also check that marks match the mark scheme,
   KaTeX renders, punctuation follows Edexcel style, and sets contain no duplicates.
3. **Independent cross-check.** `scripts/crosscheck.py` shares no code with the app.
   It re-solves each exported question from its given values and compares answers.
   A deliberate-corruption test confirmed it catches altered answers.

`tests/golden.test.ts` pins questions whose answers were worked out by hand.

## Adding templates

See **[docs/TEMPLATES.md](docs/TEMPLATES.md)**. In short: copy
`src/templates/_skeleton.ts` into the right strand folder and fill it in. Then run
`npm test`, and add a function to `scripts/crosscheck.py`.

## Deploying (free)

`npm run build` creates a static site in `dist/`. Asset paths are relative, so it
works anywhere.

- **Netlify or Vercel:** import the repository with build command `npm run build`
  and output folder `dist`. Or drag the `dist` folder onto Netlify Drop.
- **GitHub Pages:** push to GitHub, then in *Settings → Pages* set *Source* to
  *GitHub Actions*. The included workflow (`.github/workflows/deploy.yml`) runs
  the tests and publishes on every push to `main`.

The reference papers in `:reference/` are git-ignored and are never published.

## Project layout

```
src/engine/      types, exact fractions, seeded RNG, formatting, set generation
src/contexts/    names and reskinnable scenarios
src/templates/   one file per question type, grouped by strand
src/diagrams/    SVG diagrams drawn from each question's numbers
src/components/  question, mark scheme and controls components
src/views/       Build, Board and Worksheet views
tests/           500-seed template tests and hand-verified golden questions
scripts/         sample export, Python cross-check, text preview
```
