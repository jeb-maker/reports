import { describe, it, expect } from 'vitest';
import {
  formatContextMarkdown,
  markdownToSimpleAdf,
  markdownToSimpleHtml,
  escapeHtml,
  typeToIssueKind,
  sliceChars,
} from '../src/adapters/format-context.js';

const baseReport = {
  id: 'rp_1',
  type: 'bug',
  createdAt: '2026-01-01T00:00:00.000Z',
  title: 'Broken button',
  message: 'It does nothing',
  page: { url: 'https://app.example/x', title: 'Page X' },
  browser: { userAgent: 'TestUA/1.0' },
  viewport: { innerWidth: 800, innerHeight: 600, devicePixelRatio: 2, colorScheme: 'dark' },
};

describe('formatContextMarkdown', () => {
  it('includes core report fields', () => {
    const md = formatContextMarkdown(baseReport);
    expect(md).toContain('It does nothing');
    expect(md).toContain('**Type:** bug');
    expect(md).toContain('rp_1');
    expect(md).toContain('https://app.example/x');
    expect(md).toContain('TestUA/1.0');
    expect(md).toContain('800×600');
  });

  it('includes optional sections only when present', () => {
    const md = formatContextMarkdown(baseReport);
    expect(md).not.toContain('### Metadata');
    expect(md).not.toContain('### Recent errors');

    const rich = formatContextMarkdown({
      ...baseReport,
      email: 'user@example.com',
      metadata: { appVersion: '1.2.3' },
      errors: [{ message: 'boom', stack: 'Error: boom\n  at x' }],
      console: [{ level: 'warn', message: 'careful' }],
      network: [{ method: 'GET', url: '/api', status: 500 }],
      screenshot: { status: 'captured', mime: 'image/png', bytes: 1234, method: 'display-media' },
    });
    expect(rich).toContain('**Email:** user@example.com');
    expect(rich).toContain('appVersion');
    expect(rich).toContain('boom');
    expect(rich).toContain('[warn] careful');
    expect(rich).toContain('GET /api → 500');
    expect(rich).toContain('### Screenshot');
  });

  it('never embeds screenshot data URLs', () => {
    const md = formatContextMarkdown({
      ...baseReport,
      screenshot: { status: 'captured', dataUrl: 'data:image/png;base64,AAAA', bytes: 4 },
    });
    expect(md).not.toContain('data:image/png');
  });
});

describe('markdownToSimpleAdf', () => {
  it('produces a valid ADF doc with paragraphs and hard breaks', () => {
    const adf = markdownToSimpleAdf('line1\nline2\n\npara2');
    expect(adf.type).toBe('doc');
    expect(adf.version).toBe(1);
    expect(adf.content).toHaveLength(2);
    expect(adf.content[0].content.map((n) => n.type)).toEqual(['text', 'hardBreak', 'text']);
  });

  it('handles empty input', () => {
    const adf = markdownToSimpleAdf('');
    expect(adf.content[0].content[0]).toEqual({ type: 'text', text: ' ' });
  });
});

describe('escapeHtml / markdownToSimpleHtml', () => {
  it('escapes HTML entities', () => {
    expect(escapeHtml(`<img src="x" onerror='a'> & \``)).toBe(
      '&lt;img src=&quot;x&quot; onerror=&#39;a&#39;&gt; &amp; `',
    );
  });

  it('converts newlines to <br/>', () => {
    expect(markdownToSimpleHtml('a\nb')).toBe('<div>a<br/>b</div>');
  });
});

describe('typeToIssueKind', () => {
  it('maps known types', () => {
    expect(typeToIssueKind('bug')).toBe('bug');
    expect(typeToIssueKind('suggestion')).toBe('enhancement');
    expect(typeToIssueKind('help')).toBe('support');
    expect(typeToIssueKind('question')).toBe('question');
  });

  it('falls back for unknown types', () => {
    expect(typeToIssueKind('other')).toBe('other');
    expect(typeToIssueKind('')).toBe('task');
  });
});

describe('sliceChars', () => {
  it('slices by code points, not code units', () => {
    expect(sliceChars('a😀b', 2)).toBe('a😀');
    expect(sliceChars('abc', 10)).toBe('abc');
    expect(sliceChars(null, 3)).toBe('');
  });
});
