import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { Reports, init, destroy, submit, connect } from '../src/core.js';
import { clearToken } from '../src/oauth/pkce.js';

beforeEach(() => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }),
    ),
  );
});

afterEach(() => {
  destroy({ clearAuth: true });
  clearToken();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

const form = { type: 'bug', title: 'T', message: 'M' };

describe('init', () => {
  it('mounts the widget into the document', () => {
    init({ adapter: () => ({ ok: true }), screenshot: { enabled: false } });
    expect(document.getElementById('reports-root')).toBeTruthy();
  });

  it('returns the Reports facade for chaining', () => {
    expect(init({ adapter: () => ({}) })).toBe(Reports);
  });

  it('rejects hardcoded secrets in config', () => {
    expect(() => init({ jira: { token: 'hardcoded' } })).toThrow(/hardcoded secret/);
  });

  it('re-init replaces the previous widget instead of duplicating it', () => {
    init({ adapter: () => ({}) });
    init({ adapter: () => ({}) });
    expect(document.querySelectorAll('#reports-root')).toHaveLength(1);
  });
});

describe('submit', () => {
  it('throws before init', () => {
    expect(() => Reports.open()).toThrow(/init/);
    return expect(submit(form)).rejects.toThrow(/init/);
  });

  it('builds a schemaVersion 1 report and dispatches it', async () => {
    const adapter = vi.fn().mockResolvedValue({ ok: true });
    init({ adapter, screenshot: { enabled: false } });
    await submit(form);

    expect(adapter).toHaveBeenCalledOnce();
    const report = adapter.mock.calls[0][0];
    expect(report.schemaVersion).toBe(1);
    expect(report.id).toBeTruthy();
    expect(report.type).toBe('bug');
    expect(report.title).toBe('T');
    expect(report.message).toBe('M');
    expect(report.screenshot.status).toBe('skipped');
    expect(Array.isArray(report.console)).toBe(true);
    expect(Array.isArray(report.errors)).toBe(true);
    expect(Array.isArray(report.network)).toBe(true);
    expect(report.page).toBeDefined();
  });

  it('redacts secrets from title and message', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({ adapter, screenshot: { enabled: false } });
    await submit({ ...form, title: 'Bearer abc123token', message: 'password=hunter2' });
    const report = adapter.mock.calls[0][0];
    expect(report.title).not.toContain('abc123token');
    expect(report.message).not.toContain('hunter2');
  });

  it('resolves metadata from a function and redacts it', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({
      adapter,
      screenshot: { enabled: false },
      metadata: () => ({ userId: 'u1', apiNote: 'token: leaked' }),
    });
    await submit(form);
    const { metadata } = adapter.mock.calls[0][0];
    expect(metadata.userId).toBe('u1');
    expect(JSON.stringify(metadata)).not.toContain('leaked');
  });

  it('reports metadata() failures without blocking the submit', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({
      adapter,
      screenshot: { enabled: false },
      metadata: () => {
        throw new Error('nope');
      },
    });
    await submit(form);
    expect(adapter.mock.calls[0][0].metadata).toEqual({ error: 'metadata() failed' });
  });

  it('aborts when the widget is destroyed mid-submit', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({
      adapter,
      screenshot: { enabled: false },
      metadata: async () => {
        destroy();
        return {};
      },
    });
    await expect(submit(form)).rejects.toThrow(/aborted/i);
    expect(adapter).not.toHaveBeenCalled();
  });

  it('skips the screenshot without consent', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({ adapter, screenshot: { enabled: true, requireConsent: true } });
    await submit({ ...form, consentScreenshot: false });
    expect(adapter.mock.calls[0][0].screenshot.status).toBe('skipped');
  });
});

describe('connect', () => {
  it('throws before init', async () => {
    await expect(connect()).rejects.toThrow(/init/);
  });

  it('refuses clientSecret', async () => {
    await expect(
      connect({ adapter: 'gitlab', gitlab: { auth: 'oauth', clientSecret: 'x' } }),
    ).rejects.toThrow(/clientSecret/);
  });

  it('delegates to getAccessToken when provided', async () => {
    const token = await connect({
      adapter: 'jira',
      jira: { getAccessToken: async () => 'runtime-token' },
    });
    expect(token).toBe('runtime-token');
  });

  it('rejects an empty token from getAccessToken', async () => {
    await expect(
      connect({ adapter: 'jira', jira: { getAccessToken: async () => '' } }),
    ).rejects.toThrow(/empty/);
  });

  it('refuses PKCE for Jira Cloud', async () => {
    await expect(
      connect({ adapter: 'jira', jira: { auth: 'oauth', clientId: 'c' } }),
    ).rejects.toThrow(/Jira Cloud/);
  });

  it('refuses browser OAuth for GitHub', async () => {
    await expect(
      connect({ adapter: 'github', github: { auth: 'oauth', clientId: 'c' } }),
    ).rejects.toThrow(/GitHub OAuth/);
  });

  it('requires auth: oauth otherwise', async () => {
    await expect(connect({ adapter: 'jira', jira: { auth: 'url' } })).rejects.toThrow(
      /requires auth/,
    );
  });
});

describe('destroy', () => {
  it('unmounts and restores instrumented globals', () => {
    const fetchBefore = window.fetch;
    const logBefore = console.log;
    init({ adapter: () => ({}) });
    destroy();
    expect(document.getElementById('reports-root')).toBeNull();
    expect(window.fetch).toBe(fetchBefore);
    expect(console.log).toBe(logBefore);
  });

  it('is a no-op when not initialized', () => {
    expect(() => destroy()).not.toThrow();
  });
});
