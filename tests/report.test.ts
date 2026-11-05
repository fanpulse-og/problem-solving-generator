import { describe, expect, it } from 'vitest';
import { problemReport } from '../src/components/ReportProblem';
import { questionFromCode } from '../src/state';

// Tests run outside a browser: give shareLink() the live site's address.
(globalThis as unknown as { location: unknown }).location = { origin: 'https://mathsproblemsolving.uk', pathname: '/' };

describe('problem report', () => {
  it('contains the question ID, a link that reopens it, the answer and every mark-scheme step', () => {
    const q = questionFromCode('ratio-reverse-percentage.stretch.F.nc.p0')!;
    const { title, body } = problemReport(q);
    expect(title).toContain(q.code);
    expect(body).toContain(`Question ID: ${q.code}`);
    expect(body).toContain('https://mathsproblemsolving.uk/#/board?q=ratio-reverse-percentage.stretch.F.nc.p0');
    for (const a of q.answers) expect(body).toContain(a.text);
    for (const s of q.scheme.flat()) expect(body).toContain(s.working);
  });
});
