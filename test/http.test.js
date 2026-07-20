import { describe, it, expect, vi, afterEach } from 'vitest';
import { postJson } from '../src/transport/http.js';

function mockFetch(response) {
  const fn = vi.fn().mockResolvedValue(response);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('postJson', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('POSTs JSON and parses a JSON response', async () => {
    const fetchMock = mockFetch(jsonResponse({ ok: true }));
    const result = await postJson({ url: '/api', body: { a: 1 } });
    expect(result).toEqual({ ok: true });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/api');
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('same-origin');
    expect(init.body).toBe('{"a":1}');
    expect(init.headers.get('content-type')).toBe('application/json');
  });

  it('supports async headers functions', async () => {
    const fetchMock = mockFetch(jsonResponse({}));
    await postJson({ url: '/api', body: {}, headers: async () => ({ 'X-App': 'demo' }) });
    expect(fetchMock.mock.calls[0][1].headers.get('x-app')).toBe('demo');
  });

  it('attaches Bearer token from getAccessToken', async () => {
    const fetchMock = mockFetch(jsonResponse({}));
    await postJson({ url: '/api', body: {}, getAccessToken: async () => 'tok123' });
    expect(fetchMock.mock.calls[0][1].headers.get('authorization')).toBe('Bearer tok123');
  });

  it('throws with status and body excerpt on HTTP errors', async () => {
    mockFetch(new Response('bad request detail', { status: 400, statusText: 'Bad Request' }));
    const err = await postJson({ url: '/api', body: {} }).catch((e) => e);
    expect(err).toBeInstanceOf(Error);
    expect(err.status).toBe(400);
    expect(err.body).toBe('bad request detail');
  });

  it('returns raw text for non-JSON responses', async () => {
    mockFetch(new Response('plain', { status: 200, headers: { 'content-type': 'text/plain' } }));
    await expect(postJson({ url: '/api', body: {} })).resolves.toBe('plain');
  });

  it('returns null for empty responses', async () => {
    mockFetch(new Response(null, { status: 204 }));
    await expect(postJson({ url: '/api', body: {} })).resolves.toBeNull();
  });

  it('passes a string body through unchanged', async () => {
    const fetchMock = mockFetch(jsonResponse({}));
    await postJson({ url: '/api', body: '{"raw":1}' });
    expect(fetchMock.mock.calls[0][1].body).toBe('{"raw":1}');
  });
});
