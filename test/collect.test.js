import { describe, it, expect, vi, afterEach } from 'vitest';
import { createConsoleCapture } from '../src/collect/console.js';
import { createErrorCapture } from '../src/collect/errors.js';
import { createNetworkCapture } from '../src/collect/network.js';
import { collectContext } from '../src/collect/context.js';
import { redactString } from '../src/redact.js';

describe('createConsoleCapture', () => {
  const cap = createConsoleCapture({ size: 3, redact: redactString });

  afterEach(() => cap.stop());

  it('captures console calls and redacts secrets', () => {
    cap.start();
    console.log('hello', { a: 1 });
    console.warn('token: supersecret');
    const snap = cap.snapshot();
    cap.stop();

    expect(snap.some((e) => e.level === 'log' && e.message.includes('hello {"a":1}'))).toBe(true);
    const warn = snap.find((e) => e.level === 'warn');
    expect(warn.message).not.toContain('supersecret');
  });

  it('enforces the buffer size', () => {
    cap.start();
    for (let i = 0; i < 10; i++) console.log(`msg-${i}`);
    const snap = cap.snapshot();
    cap.stop();
    expect(snap.length).toBeLessThanOrEqual(3);
    expect(snap.at(-1).message).toBe('msg-9');
  });

  it('restores original console methods on stop', () => {
    const original = console.log;
    cap.start();
    expect(console.log).not.toBe(original);
    cap.stop();
    expect(console.log).toBe(original);
  });

  it('serializes Error objects with stack', () => {
    cap.start();
    console.error(new Error('kaboom'));
    const snap = cap.snapshot();
    cap.stop();
    expect(snap.at(-1).message).toContain('kaboom');
  });
});

describe('createErrorCapture', () => {
  it('captures window error events', () => {
    const cap = createErrorCapture({ size: 5, redact: redactString });
    cap.start();
    window.dispatchEvent(
      new ErrorEvent('error', { message: 'boom', filename: 'app.js', lineno: 1, colno: 2 }),
    );
    const snap = cap.snapshot();
    cap.stop();
    expect(snap).toHaveLength(1);
    expect(snap[0].message).toBe('boom');
    expect(snap[0].source).toBe('app.js:1:2');
  });

  it('captures unhandled rejections with Error reasons', () => {
    const cap = createErrorCapture({ size: 5, redact: redactString });
    cap.start();
    const event = new Event('unhandledrejection');
    event.reason = new Error('rejected!');
    window.dispatchEvent(event);
    const snap = cap.snapshot();
    cap.stop();
    expect(snap).toHaveLength(1);
    expect(snap[0].message).toBe('rejected!');
    expect(snap[0].source).toBe('unhandledrejection');
  });

  it('stops listening after stop()', () => {
    const cap = createErrorCapture({ size: 5 });
    cap.start();
    cap.stop();
    window.dispatchEvent(new ErrorEvent('error', { message: 'late' }));
    expect(cap.snapshot()).toHaveLength(0);
  });
});

describe('createNetworkCapture', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('records failed fetches (status >= 400) with redacted URL', async () => {
    window.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    const cap = createNetworkCapture();
    cap.start();
    await window.fetch('https://api.example/x?token=secret');
    cap.stop();
    const snap = cap.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].status).toBe(500);
    expect(snap[0].url).not.toContain('secret');
  });

  it('ignores successful fetches', async () => {
    window.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    const cap = createNetworkCapture();
    cap.start();
    await window.fetch('https://api.example/ok');
    cap.stop();
    expect(cap.snapshot()).toHaveLength(0);
  });

  it('records network errors thrown by fetch', async () => {
    window.fetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const cap = createNetworkCapture();
    cap.start();
    await expect(window.fetch('https://down.example/')).rejects.toThrow();
    cap.stop();
    const snap = cap.snapshot();
    expect(snap).toHaveLength(1);
    expect(snap[0].error).toBe('Failed to fetch');
  });

  it('restores fetch on stop', () => {
    const original = vi.fn();
    window.fetch = original;
    const cap = createNetworkCapture();
    cap.start();
    expect(window.fetch).not.toBe(original);
    cap.stop();
    expect(window.fetch).toBe(original);
  });
});

describe('collectContext', () => {
  it('returns page, browser and viewport info', () => {
    const ctx = collectContext();
    expect(ctx.page).toBeDefined();
    expect(ctx.browser.userAgent).toBeTruthy();
    expect(typeof ctx.viewport.innerWidth).toBe('number');
  });
});
