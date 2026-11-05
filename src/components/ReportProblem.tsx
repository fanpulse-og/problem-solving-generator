import { useRef, useState, type FormEvent } from 'react';
import { createPortal } from 'react-dom';
import { partLabel } from '../engine/labels';
import type { Block, Question } from '../engine/types';
import { DEFAULT_OPTIONS, shareLink } from '../state';

/**
 * Reports go to the site owner's email through Web3Forms, as the site has no server.
 * This key is public by design: it can only send email to that one address.
 */
export const REPORT_KEY = 'cad6d9af-9a38-4d41-b7e7-a11b97245270';
const REPORT_URL = 'https://api.web3forms.com/submit';

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

/** The question, its link, answer and mark scheme as plain text, for the email. */
export function problemReport(q: Question): { title: string; body: string } {
  const link = shareLink('board', [q.code], DEFAULT_OPTIONS);
  const label = (i: number) => (q.content.parts[i]?.label ? `${partLabel(q.content.parts[i].label!)} ` : '');
  const question = [...q.content.stem.map(blockText), ...q.content.parts.map((p, i) => `${label(i)}${p.blocks.map(blockText).join(' ')} [${p.marks}]`)].join('\n');
  const answers = q.answers.map((a, i) => `${label(i)}${a.text}`).join('\n');
  const scheme = q.scheme.map((steps, i) => `${label(i)}\n${steps.map((s) => `${s.code}  ${s.working}  (${s.note})`).join('\n')}`).join('\n');
  const body = [`Question ID: ${q.code}`, `Link: ${link}`, '', 'QUESTION', question, '', 'ANSWER SHOWN', answers, '', 'MARK SCHEME', scheme].join('\n');
  return { title: `Problem with ${q.template.title} (${q.code})`, body };
}

/** "Report a problem": a short form that sends the message and the question details by email. */
export function ReportProblem({ q }: { q: Question }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [text, setText] = useState('');
  const [email, setEmail] = useState('');
  const [trap, setTrap] = useState(false);
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');
  const close = () => dialog.current?.close();

  const send = async (e: FormEvent) => {
    e.preventDefault();
    // Only a robot ticks the hidden box: act as if it worked, and send nothing.
    if (trap) {
      setState('sent');
      return;
    }
    setState('sending');
    const { title, body } = problemReport(q);
    try {
      const res = await fetch(REPORT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ access_key: REPORT_KEY, subject: title, from_name: 'Maths Problem Solving', ...(email.trim() ? { email: email.trim() } : {}), message: `${text.trim()}\n\n---\n${body}` }),
      });
      const data = await res.json();
      setState(res.ok && data.success ? 'sent' : 'failed');
    } catch {
      setState('failed');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setState('idle');
          dialog.current?.showModal();
        }}
      >
        Report a problem
      </button>
      {createPortal(
        <dialog ref={dialog} className="report-dialog no-print" aria-labelledby={`report-${q.code}`}>
          <h2 id={`report-${q.code}`}>Report a problem</h2>
          {state === 'sent' ? (
            <>
              <p>Thanks, your report has been sent.</p>
              <div className="report-actions">
                <button type="button" className="primary" onClick={close}>
                  Close
                </button>
              </div>
            </>
          ) : (
            <form onSubmit={send}>
              <p className="report-about">About: {q.template.title}. The question and its mark scheme are sent with your message.</p>
              <label>
                What is wrong?
                <textarea required rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="The answer to part (b) should be 12, because…" />
              </label>
              <label>
                Your email, if you would like a reply
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
                <span className="report-small">
                  Optional. Students do not need to give one. See the{' '}
                  <a href="./privacy.html" target="_blank" rel="noopener">
                    privacy policy
                  </a>
                  .
                </span>
              </label>
              <label className="report-trap" aria-hidden="true">
                Leave this empty
                <input type="checkbox" tabIndex={-1} checked={trap} onChange={(e) => setTrap(e.target.checked)} />
              </label>
              {state === 'failed' && <p className="report-error">Your report could not be sent. Check your connection and try again.</p>}
              <div className="report-actions">
                <button type="button" onClick={close}>
                  Cancel
                </button>
                <button type="submit" className="primary" disabled={state === 'sending' || !REPORT_KEY} title={REPORT_KEY ? undefined : 'Reporting is not switched on yet'}>
                  {state === 'sending' ? 'Sending…' : 'Send report'}
                </button>
              </div>
            </form>
          )}
        </dialog>,
        document.body,
      )}
    </>
  );
}
