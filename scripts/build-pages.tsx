// Static landing pages for search engines, written into dist/ after `vite build`:
//   /<level>/                 e.g. /gcse-higher/            every question type at that level
//   /<level>/<strand>/        e.g. /gcse-higher/algebra/    one strand of it
//   /gcse/<type>/, /a-level/<type>/                         one question type, with sample questions
// plus sitemap.xml. The pages are plain HTML (no app code), sharing the app's stylesheet.
// Usage: vite-node scripts/build-pages.tsx   (run by `npm run build`)
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MarkScheme, QuestionView } from '../src/components/QuestionView';
import { buildQuestion } from '../src/engine/generate';
import { TEMPLATES } from '../src/engine/registry';
import { LEVELS, STRANDS, isALevel, levelsFor, type Question, type Template, type Tier } from '../src/engine/types';

const SITE = 'https://mathsproblemsolving.uk';
const NAME = 'Maths Problem Solving';
const DIST = 'dist';
const TODAY = new Date().toISOString().slice(0, 10);

const TIER: Record<Tier, { slug: string; name: string; blurb: string }> = {
  KS3: { slug: 'ks3', name: 'KS3', blurb: 'Problem-solving questions for Years 7, 8 and 9, pitched to build towards GCSE.' },
  F: { slug: 'gcse-foundation', name: 'GCSE Foundation', blurb: 'Questions in the style of Edexcel GCSE (9–1) Foundation papers, grades 1 to 5.' },
  H: { slug: 'gcse-higher', name: 'GCSE Higher', blurb: 'Questions in the style of Edexcel GCSE (9–1) Higher papers, grades 4 to 9.' },
  Y12: { slug: 'a-level-year-12', name: 'A-level Year 12', blurb: 'First-year A-level content, in the style of Edexcel AS papers (8MA0).' },
  Y13: { slug: 'a-level-year-13', name: 'A-level Year 13', blurb: 'Second-year A-level content, in the style of Edexcel A-level papers (9MA0).' },
};
const TIER_ORDER: Tier[] = ['KS3', 'F', 'H', 'Y12', 'Y13'];

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const list = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
/** For mid-sentence use; names such as Venn keep their capital. */
const lowerFirst = (s: string) => (/^[A-Z][a-z]/.test(s) && !/^(Venn|Pythagoras|Fibonacci)/.test(s) ? s[0].toLowerCase() + s.slice(1) : s);

/** The section a question type lives in, and its page address. */
const section = (t: Template) => (t.tiers.some(isALevel) ? 'a-level' : 'gcse');
const typePath = (t: Template) => `/${section(t)}/${slugify(t.title)}/`;
const tierPath = (tier: Tier) => `/${TIER[tier].slug}/`;
const strandPath = (tier: Tier, strand: string) => `/${TIER[tier].slug}/${slugify(strand)}/`;
/** The hardest level a type is offered at: its samples are generated there. */
const topTier = (t: Template) => [...TIER_ORDER].reverse().find((x) => t.tiers.includes(x))!;
const at = (tier: Tier) => TEMPLATES.filter((t) => t.tiers.includes(tier));

// Two question types must never share an address.
const paths = new Map<string, string>();
for (const t of TEMPLATES) {
  const p = typePath(t);
  if (paths.has(p)) throw new Error(`${t.id} and ${paths.get(p)} would both be at ${p}`);
  paths.set(p, t.id);
}

/** A link into the app, e.g. the Board with these questions. */
function appLink(view: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params).toString().replace(/%2C/g, ',');
  return `/#/${view}${q ? `?${q}` : ''}`;
}

const cssFile = readdirSync(join(DIST, 'assets')).find((f) => /^index-.*\.css$/.test(f));
if (!cssFile) throw new Error('Run `vite build` first: dist/assets has no stylesheet.');

const PAGE_CSS = `
.seo{max-width:52rem;margin:0 auto;padding:1.5rem 16px 3rem}
.seo h1{font-size:1.9rem;line-height:1.2;margin:.4rem 0 .6rem}
.seo h2{font-size:1.3rem;margin:2rem 0 .6rem}
.seo h3{font-size:1.05rem;margin:1.2rem 0 .3rem}
.seo .lead{font-size:1.05rem;color:var(--ink-soft);margin:0 0 1rem}
.crumbs{font-size:.85rem;color:var(--ink-soft);margin:0}
.crumbs a,.seo-list a,.seo-foot a{color:var(--accent)}
.facts{display:flex;flex-wrap:wrap;gap:.4rem;padding:0;margin:0 0 1.2rem;list-style:none}
.facts li{border:1px solid var(--line);border-radius:999px;background:var(--paper);padding:.1rem .65rem;font-size:.85rem}
.cta{display:flex;flex-wrap:wrap;gap:.5rem;margin:0 0 .5rem}
.cta a.go{background:var(--brand);border-color:var(--brand);color:#fff;font-weight:600}
.sample{background:var(--paper);border:1px solid var(--line);border-radius:10px;padding:1rem 1.1rem;margin:.6rem 0 1rem}
.sample summary{cursor:pointer;color:var(--accent);font-weight:600;margin-top:.8rem;font-family:var(--sans)}
.seo-list{padding-left:1.2rem;margin:.2rem 0 .6rem;columns:2;column-gap:2rem}
.seo-list li{break-inside:avoid;margin:.15rem 0}
.seo-list small{color:var(--ink-soft)}
.seo-foot{margin-top:2.5rem;padding-top:1rem;border-top:1px solid var(--line);font-size:.9rem;color:var(--ink-soft)}
@media (max-width:640px){.seo-list{columns:1}.seo h1{font-size:1.5rem}}
`;

interface Page {
  path: string;
  title: string;
  description: string;
  crumbs: [name: string, path: string][];
  body: string;
}

function html(p: Page): string {
  const url = SITE + p.path;
  const crumbs = [['Home', '/'] as [string, string], ...p.crumbs];
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map(([name, path], i) => ({ '@type': 'ListItem', position: i + 1, name, item: SITE + path })),
  };
  return `<!doctype html>
<html lang="en-GB">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${esc(p.title)}</title>
    <meta name="description" content="${esc(p.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
    <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta property="og:type" content="article" />
    <meta property="og:site_name" content="${NAME}" />
    <meta property="og:title" content="${esc(p.title)}" />
    <meta property="og:description" content="${esc(p.description)}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${SITE}/og-image.png" />
    <meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/assets/${cssFile}" />
    <style>${PAGE_CSS}</style>
    <script type="application/ld+json">${JSON.stringify(ld)}</script>
    <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "530e1943251844e3be049b83e1221a29"}'></script>
  </head>
  <body>
    <div class="app">
      <header class="topbar">
        <a class="brand" href="/">
          <svg class="logo" viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="7" fill="#2563eb" /><path d="M5.5 17.5h4l4.2 7.5L20.5 8H27" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" /></svg>
          <span>${NAME}</span>
        </a>
        <a class="tuition" href="/">Open the question generator</a>
      </header>
      <main class="seo">
        <p class="crumbs">${crumbs.map(([name, path], i) => (i === crumbs.length - 1 ? esc(name) : `<a href="${path}">${esc(name)}</a>`)).join(' › ')}</p>
${p.body}
        <footer class="seo-foot">
          <p>Browse: ${TIER_ORDER.map((t) => `<a href="${tierPath(t)}">${TIER[t].name}</a>`).join(' · ')}</p>
          <p><a href="/">${NAME}</a> is free, with no ads and no sign-up. <a href="/privacy.html">Privacy</a>. Not affiliated with Pearson Edexcel.</p>
        </footer>
      </main>
    </div>
  </body>
</html>
`;
}

const render = (el: ReactElement) => renderToStaticMarkup(el);
const calcWord = (t: Template) => (isALevel(t.tiers[0]) ? 'Calculator allowed' : t.calculator === 'calc' ? 'Calculator' : t.calculator === 'non-calc' ? 'Non-calculator' : 'Calculator and non-calculator');
const tierNames = (t: Template) => list(TIER_ORDER.filter((x) => t.tiers.includes(x)).map((x) => TIER[x].name));

/** Links to question types, grouped under their sub-topic. */
function typeList(ts: Template[]): string {
  const bySub = new Map<string, Template[]>();
  for (const t of ts) bySub.set(t.subtopic, [...(bySub.get(t.subtopic) ?? []), t]);
  return `<ul class="seo-list">${[...bySub]
    .flatMap(([sub, group]) => group.map((t) => `<li><a href="${typePath(t)}">${esc(t.title)}</a> <small>${esc(sub)}</small></li>`))
    .join('')}</ul>`;
}

function typePage(t: Template): Page {
  const tier = topTier(t);
  const calc = t.calculator === 'either' ? 'non-calc' : t.calculator;
  const samples: [string, Question][] = levelsFor(t, tier).map((level) => [LEVELS.find((l) => l.id === level)!.label, buildQuestion(t, level, tier, calc, 'web1')]);
  const codes = samples.map(([, q]) => q.code).join(',');
  const where = isALevel(tier) ? TIER[tier].name : t.tiers.includes('H') && t.tiers.length === 1 ? 'GCSE Higher' : 'GCSE';
  const topic = lowerFirst(t.title);
  const related = at(tier).filter((x) => x.strand === t.strand && x.id !== t.id);
  const body = `
        <h1>${esc(t.title)}: ${where} questions with mark schemes</h1>
        <p class="lead">Free Edexcel-style ${esc(t.strand)} questions on ${esc(topic)}, for ${tierNames(t)}. Each one has a full worked mark scheme, and the generator makes new versions with different numbers every time.</p>
        <ul class="facts"><li>${esc(t.strand)}</li><li>${esc(t.subtopic)}</li><li>${tierNames(t)}</li><li>${calcWord(t)}</li></ul>
        <p class="cta">
          <a class="button-link go" href="${appLink('worksheet', { q: codes, t: t.title })}">Make a printable worksheet</a>
          <a class="button-link" href="${appLink('board', { q: codes })}">Show on the board</a>
          <a class="button-link" href="${appLink('practice', { q: codes })}">Practise and check answers</a>
        </p>
${samples
  .map(
    ([label, q]) => `        <h2>${label} question (${TIER[tier].name})</h2>
        <div class="sample">
          ${render(<QuestionView q={q} />)}
          <details><summary>Show the worked mark scheme</summary>${render(<MarkScheme q={q} />)}</details>
        </div>`,
  )
  .join('\n')}
        <h2>Want different numbers?</h2>
        <p>These are samples. <a href="${appLink('build', { tier, strands: t.strand, topics: t.subtopic })}">Open the generator on ${esc(t.subtopic)}</a> to get fresh questions, pick the difficulty, and print a worksheet with an answer sheet.</p>
${related.length ? `        <h2>More ${TIER[tier].name} ${esc(t.strand)} questions</h2>\n        ${typeList(related)}` : ''}`;
  return {
    path: typePath(t),
    title: `${t.title}: ${where} questions with mark schemes | ${NAME}`,
    description: `Free ${where} maths questions on ${topic}, Edexcel style, each with a worked mark scheme. Print a worksheet or generate new questions with different numbers.`,
    crumbs: [[TIER[tier].name, tierPath(tier)], [t.strand, strandPath(tier, t.strand)], [t.title, typePath(t)]],
    body,
  };
}

const strandsAt = (tier: Tier) => STRANDS.filter((s) => at(tier).some((t) => t.strand === s));

function tierPage(tier: Tier): Page {
  const { name, blurb } = TIER[tier];
  const ts = at(tier);
  const body = `
        <h1>${name} maths questions with mark schemes</h1>
        <p class="lead">${blurb} ${ts.length} question types, each with a worked mark scheme and new numbers every time. Free, no ads, no sign-up.</p>
        <p class="cta">
          <a class="button-link go" href="${appLink('build', { tier })}">Build a set of ${name} questions</a>
          <a class="button-link" href="/">How it works</a>
        </p>
${strandsAt(tier)
  .map((s) => `        <h2><a href="${strandPath(tier, s)}">${name} ${esc(s)}</a></h2>\n        ${typeList(ts.filter((t) => t.strand === s))}`)
  .join('\n')}`;
  return {
    path: tierPath(tier),
    title: `${name} maths questions with mark schemes | ${NAME}`,
    description: `Free ${name} maths questions in the Edexcel style: ${list(strandsAt(tier).map((s) => s.toLowerCase()))}. ${ts.length} question types with worked mark schemes and printable worksheets.`,
    crumbs: [[name, tierPath(tier)]],
    body,
  };
}

function strandPage(tier: Tier, strand: string): Page {
  const { name } = TIER[tier];
  const ts = at(tier).filter((t) => t.strand === strand);
  const subs = [...new Set(ts.map((t) => t.subtopic))];
  const body = `
        <h1>${name} ${esc(strand)} questions with mark schemes</h1>
        <p class="lead">${ts.length} types of ${name} ${esc(strand)} question in the Edexcel style, covering ${esc(list(subs.map(lowerFirst)))}. Every question has a worked mark scheme.</p>
        <p class="cta">
          <a class="button-link go" href="${appLink('build', { tier, strands: strand })}">Build a set of ${name} ${esc(strand)} questions</a>
          <a class="button-link" href="${tierPath(tier)}">All ${name} topics</a>
        </p>
${subs.map((sub) => `        <h2>${esc(sub)}</h2>\n        <ul class="seo-list">${ts.filter((t) => t.subtopic === sub).map((t) => `<li><a href="${typePath(t)}">${esc(t.title)}</a></li>`).join('')}</ul>`).join('\n')}`;
  return {
    path: strandPath(tier, strand),
    title: `${name} ${strand} questions with mark schemes | ${NAME}`,
    description: `Free ${name} ${strand} questions, Edexcel style, with worked mark schemes: ${list(subs.slice(0, 6).map(lowerFirst))}${subs.length > 6 ? ' and more' : ''}.`,
    crumbs: [[name, tierPath(tier)], [strand, strandPath(tier, strand)]],
    body,
  };
}

const pages: Page[] = [...TIER_ORDER.flatMap((tier) => [tierPage(tier), ...strandsAt(tier).map((s) => strandPage(tier, s))]), ...TEMPLATES.map(typePage)];

for (const p of pages) {
  const file = join(DIST, p.path, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, html(p));
}

const urls = ['/', ...pages.map((p) => p.path), '/privacy.html'];
writeFileSync(
  join(DIST, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${SITE}${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}\n</urlset>\n`,
);
console.log(`Wrote ${pages.length} landing pages and sitemap.xml (${urls.length} addresses).`);
