import { describe, it, expect, vi, afterEach } from 'vitest';
import { captureScreenshot } from '../src/collect/screenshot.js';

function fakeCanvas(dataUrlByMime = {}) {
  return {
    toDataURL: (mime = 'image/png', _quality) =>
      dataUrlByMime[mime] || `data:${mime};base64,${'A'.repeat(100)}`,
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete window.html2canvas;
});

describe('captureScreenshot', () => {
  it('returns unavailable when no capture API exists', async () => {
    const result = await captureScreenshot();
    expect(result.status).toBe('unavailable');
  });

  it('returns denied when the user refuses getDisplayMedia', async () => {
    const err = new DOMException('denied', 'NotAllowedError');
    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: { getDisplayMedia: vi.fn().mockRejectedValue(err) },
    });
    const result = await captureScreenshot();
    expect(result).toEqual({ status: 'denied', error: 'NotAllowedError' });
    delete navigator.mediaDevices;
  });

  it('captures via a host-provided html2canvas', async () => {
    const h2c = vi.fn().mockResolvedValue(fakeCanvas());
    const result = await captureScreenshot({ html2canvas: h2c, maxBytes: 10_000 });
    expect(result.status).toBe('captured');
    expect(result.method).toBe('html2canvas');
    expect(result.mime).toBe('image/png');
    expect(result.dataUrl).toContain('data:image/png');
    expect(h2c).toHaveBeenCalledWith(document.body, expect.objectContaining({ useCORS: true }));
  });

  it('ignores the widget root via ignoreElements', async () => {
    let ignoreElements;
    const h2c = vi.fn().mockImplementation(async (_el, opts) => {
      ignoreElements = opts.ignoreElements;
      return fakeCanvas();
    });
    const root = document.createElement('div');
    const child = document.createElement('span');
    root.appendChild(child);
    await captureScreenshot({ html2canvas: h2c, ignoreRoot: root });
    expect(ignoreElements(root)).toBe(true);
    expect(ignoreElements(child)).toBe(true);
    expect(ignoreElements(document.createElement('p'))).toBe(false);
  });

  it('downgrades to JPEG when the PNG exceeds maxBytes', async () => {
    const bigPng = `data:image/png;base64,${'A'.repeat(4000)}`;
    const smallJpeg = `data:image/jpeg;base64,${'A'.repeat(100)}`;
    const h2c = vi.fn().mockResolvedValue(
      fakeCanvas({ 'image/png': bigPng, 'image/jpeg': smallJpeg }),
    );
    const result = await captureScreenshot({ html2canvas: h2c, maxBytes: 1000 });
    expect(result.status).toBe('captured');
    expect(result.mime).toBe('image/jpeg');
  });

  it('reports too_large when compression is not enough', async () => {
    const huge = `data:image/jpeg;base64,${'A'.repeat(50_000)}`;
    const h2c = vi.fn().mockResolvedValue(fakeCanvas({ 'image/png': huge, 'image/jpeg': huge }));
    const result = await captureScreenshot({ html2canvas: h2c, maxBytes: 1000 });
    expect(result.status).toBe('too_large');
    expect(result.dataUrl).toBeUndefined();
  });

  it('reports html2canvas failures', async () => {
    const h2c = vi.fn().mockRejectedValue(new Error('render failed'));
    const result = await captureScreenshot({ html2canvas: h2c });
    expect(result).toEqual({ status: 'failed', error: 'render failed' });
  });
});
