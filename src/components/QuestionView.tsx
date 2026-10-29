import type { Block, MarkStep, Question } from '../engine/types';
import { Diagram } from '../diagrams/Diagram';
import { MathText } from './Math';

export function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case 'text':
      return (
        <p className="qline">
          <MathText text={block.text} />
        </p>
      );
    case 'box':
      return (
        <div className="qbox">
          {block.lines.map((l, i) => (
            <div key={i}>
              <MathText text={l} />
            </div>
          ))}
        </div>
      );
    case 'cards':
      return (
        <div className="qcards" role="list" aria-label="Cards">
          {block.values.map((v, i) => (
            <div key={i} className="qcard" role="listitem">
              <MathText text={v} />
            </div>
          ))}
        </div>
      );
    case 'table': {
      const { header, rows, rowHeaders } = block.table;
      return (
        <div className="qtable-wrap">
          <table className="qtable">
            {header && (
              <thead>
                <tr>
                  {header.map((h, i) => (
                    <th key={i} scope="col">
                      <MathText text={h} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {rows.map((r, ri) => (
                <tr key={ri}>
                  {r.map((c, ci) =>
                    rowHeaders && ci === 0 ? (
                      <th key={ci} scope="row">
                        <MathText text={c} />
                      </th>
                    ) : (
                      <td key={ci} className={c === '' ? 'blank' : undefined}>
                        <MathText text={c} />
                      </td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
    case 'diagram':
      return <Diagram spec={block.diagram} />;
  }
}

export function marksLabel(n: number): string {
  return `(${n} mark${n === 1 ? '' : 's'})`;
}

/** A question as it appears on a paper: stem, parts with marks on the right. */
export function QuestionView({ q, number }: { q: Question; number?: number }) {
  const { stem, parts } = q.content;
  const single = parts.length === 1 && parts[0].label === null;
  return (
    <div className="question">
      {number !== undefined && <div className="qnum">{number}</div>}
      <div className="qbody">
        {stem.map((b, i) => (
          <BlockView key={i} block={b} />
        ))}
        {parts.map((p, i) => (
          <div key={i} className={single ? 'qpart single' : 'qpart'}>
            {!single && <div className="qlabel">({p.label})</div>}
            <div className="qpart-body">
              {p.blocks.map((b, j) => (
                <BlockView key={j} block={b} />
              ))}
              <div className="qmarks">{marksLabel(p.marks)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Answer only, part by part. */
export function AnswerView({ q }: { q: Question }) {
  const parts = q.content.parts;
  return (
    <div className="answers">
      {q.answers.map((a, i) => (
        <div key={i} className="answer-line">
          {parts[i].label && <span className="qlabel">({parts[i].label})</span>}
          <MathText text={a.text} />
        </div>
      ))}
    </div>
  );
}

/**
 * Mark scheme in a "handwritten" style: working in a handwriting font, the
 * Edexcel mark code as an examiner's red tag, and a student-friendly note.
 */
export function MarkScheme({ q, upTo }: { q: Question; upTo?: number }) {
  let count = 0;
  const parts = q.content.parts;
  return (
    <div className="scheme">
      {q.scheme.map((steps, pi) => {
        const visible: MarkStep[] = [];
        for (const s of steps) {
          if (upTo !== undefined && count >= upTo) break;
          visible.push(s);
          count++;
        }
        if (visible.length === 0) return null;
        return (
          <div key={pi} className="scheme-part">
            {parts[pi].label && <div className="scheme-label">({parts[pi].label})</div>}
            <ol className="scheme-steps">
              {visible.map((s, si) => (
                <li key={si} className="scheme-step">
                  <span className={`mark-tag mark-${s.code[0]}`} aria-label={`${s.code} mark`}>
                    {s.code}
                  </span>
                  <div>
                    <div className="hand working">
                      <MathText text={s.working} />
                    </div>
                    {s.note && (
                      <div className="hand note">
                        <MathText text={s.note} />
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
            {visible.length === steps.length && (
              <div className="hand scheme-answer">
                Answer: <MathText text={q.answers[pi].text} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function totalSteps(q: Question): number {
  return q.scheme.reduce((s, p) => s + p.length, 0);
}
