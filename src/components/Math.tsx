import katex from 'katex';
import { Fragment, useMemo } from 'react';

/**
 * Renders text containing $…$ inline maths (KaTeX) and \n line breaks.
 * Non-breaking spaces from number grouping become thin spaces inside maths.
 */
export function MathText({ text, className }: { text: string; className?: string }) {
  const parts = useMemo(() => split(text), [text]);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        p.math ? (
          <span key={i} dangerouslySetInnerHTML={{ __html: renderTex(p.s) }} />
        ) : (
          <Fragment key={i}>
            {/* Runs of spaces would collapse in HTML; keep them as em spaces. */}
            {p.s.replace(/ {2,}/g, (m) => '\u2003'.repeat(Math.ceil(m.length / 3))).split('\n').map((line, j, arr) => (
              <Fragment key={j}>
                {line}
                {j < arr.length - 1 && <br />}
              </Fragment>
            ))}
          </Fragment>
        ),
      )}
    </span>
  );
}

function split(text: string): { s: string; math: boolean }[] {
  const out: { s: string; math: boolean }[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ s: text.slice(last, m.index), math: false });
    out.push({ s: m[1], math: true });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ s: text.slice(last), math: false });
  return out;
}

const cache = new Map<string, string>();
function renderTex(tex: string): string {
  let html = cache.get(tex);
  if (!html) {
    try {
      html = katex.renderToString(tex.replace(/ /g, '\\,'), { throwOnError: true, output: 'html' });
    } catch {
      html = tex; // tests guarantee this never happens for shipped templates
    }
    cache.set(tex, html);
  }
  return html;
}
