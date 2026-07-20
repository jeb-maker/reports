import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { createAutoReporter } from '../src/collect/auto-report.js';
import { init, destroy } from '../src/core.js';

function fireError(message, { error, filename } = {}) {
  window.dispatchEvent(new ErrorEvent('error', { message, error, filename, lineno: 1, colno: 2 }));
}

function fireRejection(reason) {
  const event = new Event('unhandledrejection');
  event.reason = reason;
  window.dispatchEvent(event);
}

describe('createAutoReporter (unit)', () => {
  let submit;
  let reporter;

  beforeEach(() => {
    submit = vi.fn().mockResolvedValue({});
  });

  afterEach(() => reporter?.stop());

  it('submits uncaught errors with message, stack and source', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    const error = new Error('boom');
    fireError('boom', { error, filename: 'app.js' });
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit).toHaveBeenCalledWith({
      message: 'boom',
      stack: error.stack,
      source: 'app.js:1:2',
    });
  });

  it('submits unhandled rejections', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    fireRejection(new Error('rejected!'));
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
    expect(submit.mock.calls[0][0]).toMatchObject({
      message: 'rejected!',
      source: 'unhandledrejection',
    });
  });

  it('deduplicates identical errors', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    fireError('same error', { filename: 'app.js' });
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
    fireError('same error', { filename: 'app.js' });
    fireError('same error', { filename: 'app.js' });
    await new Promise((r) => setTimeout(r, 10));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('enforces the cooldown between distinct errors', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 60_000 });
    reporter.start();
    fireError('first');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
    fireError('second');
    await new Promise((r) => setTimeout(r, 10));
    expect(submit).toHaveBeenCalledOnce();
  });

  it('caps auto-reports per session', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0, maxPerSession: 2 });
    reporter.start();
    fireError('e1');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(1));
    fireError('e2');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
    fireError('e3');
    await new Promise((r) => setTimeout(r, 10));
    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('never throws when submit fails (no error loop)', async () => {
    submit = vi.fn().mockRejectedValue(new Error('adapter down'));
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    fireError('trigger');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledOnce());
    // A second, different error must still work after the failure.
    fireError('trigger 2');
    await vi.waitFor(() => expect(submit).toHaveBeenCalledTimes(2));
  });

  it('ignores resource load errors (no message)', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    window.dispatchEvent(new ErrorEvent('error', {}));
    await new Promise((r) => setTimeout(r, 10));
    expect(submit).not.toHaveBeenCalled();
  });

  it('stops listening after stop()', async () => {
    reporter = createAutoReporter({ submit, cooldownMs: 0 });
    reporter.start();
    reporter.stop();
    fireError('late');
    await new Promise((r) => setTimeout(r, 10));
    expect(submit).not.toHaveBeenCalled();
  });
});

describe('autoReport via Reports.init (integration)', () => {
  afterEach(() => {
    destroy();
    vi.unstubAllGlobals();
  });

  it('is disabled by default', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({ adapter, screenshot: { enabled: false } });
    fireError('unreported');
    await new Promise((r) => setTimeout(r, 20));
    expect(adapter).not.toHaveBeenCalled();
  });

  it('dispatches a full auto report on uncaught errors', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    const error = new Error('auto boom');
    init({
      adapter,
      autoReport: { errors: true, cooldownMs: 0 },
      screenshot: { enabled: false },
    });
    fireError('auto boom', { error, filename: 'app.js' });
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledOnce());

    const report = adapter.mock.calls[0][0];
    expect(report.schemaVersion).toBe(1);
    expect(report.type).toBe('bug');
    expect(report.trigger).toBe('auto:error');
    expect(report.title).toBe('[auto] auto boom');
    expect(report.message).toContain('auto boom');
    expect(report.consentScreenshot).toBe(false);
    // The triggering error is already in the buffered errors.
    expect(report.errors.some((e) => e.message === 'auto boom')).toBe(true);
  });

  it('never captures a screenshot, even without consent requirement', async () => {
    const getDisplayMedia = vi.fn();
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia },
    });
    const adapter = vi.fn().mockResolvedValue({});
    init({
      adapter,
      autoReport: { errors: true, cooldownMs: 0 },
      screenshot: { enabled: true, requireConsent: false },
    });
    fireError('shot check');
    await vi.waitFor(() => expect(adapter).toHaveBeenCalledOnce());
    expect(getDisplayMedia).not.toHaveBeenCalled();
    expect(adapter.mock.calls[0][0].screenshot.status).toBe('skipped');
    delete navigator.mediaDevices;
  });

  it('manual submits stay trigger: manual', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    const api = init({ adapter, screenshot: { enabled: false } });
    await api.submit({ type: 'bug', title: 'T', message: 'M' });
    expect(adapter.mock.calls[0][0].trigger).toBe('manual');
  });

  it('destroy removes the auto-report listeners', async () => {
    const adapter = vi.fn().mockResolvedValue({});
    init({ adapter, autoReport: { errors: true, cooldownMs: 0 } });
    destroy();
    fireError('after destroy');
    await new Promise((r) => setTimeout(r, 20));
    expect(adapter).not.toHaveBeenCalled();
  });
});
