import { useState } from 'react';
import { partLabel } from '../engine/labels';
import type { Block, Question } from '../engine/types';
import { DEFAULT_OPTIONS, shareLink } from '../state';

/** Where problem reports go: issues on the public repository. */
export const ISSUES_URL = 'https://github.com/fanpulse-og/problem-solving-generator/issues/new';

const blockText = (b: Block): string =>
  b.kind === 'text'
    ? b.text
    : b.kind === 'box'
      ? b.lines.join(' / ')
      : b.kind === 'cards'
        ? b.values.join('  ')
        : b.kind === 'table'
          ? [b.table.header?.join(' | '), ...b.table.rows.map((r) => r.join(' | '))].filter(Boolean).join('\n')
          : '[diagram]';

/** The question, its link, answer and mark scheme as plain text, ready for an issue or an email. */
export function problemReport(q: Question): { title: string; body: string } {
  const link = shareLink('board', [q.code], DEFAULT_OPTIONS);
  const question = [...q.content.stem.map(blockText), ...q.content.parts.map((p) => `${p.label ? `${partLabel(p.label)} ` : ''}${p.blocks.map(blockText).join(' ')} [${p.marks}]`)].join('\n');
  const answers = q.answers.map((a, i) => `${q.content.parts[i]?.label ? `${partLabel(q.content.parts[i].label!)} ` : ''}${a.text}`).join('\n');
  const scheme = q.scheme
    .map((steps, i) => `${q.content.parts[i]?.label ? `${partLabel(q.content.parts[i].label!)}\n` : ''}${steps.map((s) => `${s.code}  ${s.working}  (${s.note})`).join('\n')}`)
    .join('\n');
  const body = [
    '**What is wrong?**',
    '(Please describe the problem: the maths, the wording, the diagram, the mark scheme…)',
    '',
    `**Question ID:** \`${q.code}\``,
    `**Link:** ${link}`,
    '',
    '**Question**',
    '```',
    question,
    '```',
    '**Answer shown**',
    '```',
    answers,
    '```',
    '**Mark scheme**',
    '```',
    scheme,
    '```',
  ].join('\n');
  return { title: `Problem with ${q.template.title} (${q.code})`, body };
}

/** "Report a problem" (a pre-filled GitHub issue) and "Copy problem report" (for an email). */
export function ReportProblem({ q }: { q: Question }) {
  const [copied, setCopied] = useState(false);
  const { title, body } = problemReport(q);
  // GitHub ignores very long pre-filled bodies, so trim the mark scheme if needed.
  const issueUrl = `${ISSUES_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body.length > 6000 ? `${body.slice(0, 6000)}\n…` : body)}`;
  const copy = async () => {
    const text = `${title}\n\n${body}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      prompt('Copy this report:', text);
    }
  };
  return (
    <>
      <a className="button-link" href={issueUrl} target="_blank" rel="noopener noreferrer">
        Report a problem
      </a>
      <button type="button" onClick={copy}>
        {copied ? 'Report copied' : 'Copy problem report'}
      </button>
    </>
  );
}
