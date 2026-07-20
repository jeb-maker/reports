import { describe, it, expect } from 'vitest';
import { redactString, redactUrl, assertNoHardcodedSecrets } from '../src/redact.js';

describe('redactString', () => {
  it('redacts Bearer tokens', () => {
    expect(redactString('Authorization: Bearer abc.def-123')).toContain('[REDACTED]');
    expect(redactString('Authorization: Bearer abc.def-123')).not.toContain('abc.def-123');
  });

  it('redacts key/value secrets', () => {
    const out = redactString('password=hunter2 api_key: "sk-live" token: xyz');
    expect(out).not.toContain('hunter2');
    expect(out).not.toContain('xyz');
  });

  it('redacts vendor token formats', () => {
    const samples = [
      'ghp_0123456789abcdefghijklmnop',
      'github_pat_0123456789abcdefghijklmnop',
      'glpat-0123456789abcdefghij',
      'xoxb-1234567890-abcdefghij',
      'AKIAIOSFODNN7EXAMPLE',
      'sk-proj-abcdefghij0123456789',
      'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.c2ln',
    ];
    for (const s of samples) {
      expect(redactString(`value ${s} end`), s).not.toContain(s);
    }
  });

  it('keeps normal text unchanged', () => {
    expect(redactString('hello world')).toBe('hello world');
  });

  it('truncates long strings with head and tail', () => {
    const out = redactString('a'.repeat(5000), 100);
    expect(out.length).toBeLessThan(120);
    expect(out).toContain('…');
  });

  it('coerces non-string values', () => {
    expect(redactString(null)).toBe('');
    expect(redactString(42)).toBe('42');
  });
});

describe('redactUrl', () => {
  it('strips credentials from URL', () => {
    const out = redactUrl('https://user:pass@example.com/path');
    expect(out).not.toContain('user');
    expect(out).not.toContain('pass');
  });

  it('redacts sensitive query params', () => {
    const out = redactUrl('https://example.com/?token=abc&x=1&API_KEY=zz');
    expect(out).not.toContain('abc');
    expect(out).not.toContain('zz');
    expect(out).toContain('x=1');
    expect(out).toContain('[REDACTED]');
  });

  it('redacts sensitive hash params (OAuth implicit flow)', () => {
    const out = redactUrl('https://example.com/#access_token=secret123&token_type=bearer');
    expect(out).not.toContain('secret123');
  });

  it('falls back to redactString for unparseable input', () => {
    const out = redactUrl('not a url with password=oops');
    expect(out).not.toContain('oops');
  });
});

describe('assertNoHardcodedSecrets', () => {
  it('accepts a clean config', () => {
    expect(() =>
      assertNoHardcodedSecrets({ adapter: 'jira', jira: { auth: 'url', url: '/api' } }),
    ).not.toThrow();
  });

  it('rejects top-level and nested secrets', () => {
    expect(() => assertNoHardcodedSecrets({ token: 'abc' })).toThrow(/hardcoded secret/);
    expect(() => assertNoHardcodedSecrets({ jira: { clientSecret: 'abc' } })).toThrow(
      /config\.jira\.clientSecret/,
    );
    expect(() => assertNoHardcodedSecrets({ a: { b: { api_key: 'k' } } })).toThrow();
  });

  it('allows getAccessToken functions', () => {
    expect(() =>
      assertNoHardcodedSecrets({ jira: { getAccessToken: () => 'runtime-token' } }),
    ).not.toThrow();
  });

  it('survives circular references', () => {
    const cfg = { a: {} };
    cfg.a.self = cfg;
    expect(() => assertNoHardcodedSecrets(cfg)).not.toThrow();
  });
});
