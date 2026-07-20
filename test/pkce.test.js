import { describe, it, expect, afterEach } from 'vitest';
import { randomString, createPkcePair, saveToken, loadToken, clearToken } from '../src/oauth/pkce.js';

afterEach(() => clearToken());

describe('randomString', () => {
  it('generates strings of the requested length from the allowed alphabet', () => {
    const s = randomString(64);
    expect(s).toHaveLength(64);
    expect(s).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('generates unique values', () => {
    expect(randomString(32)).not.toBe(randomString(32));
  });
});

describe('createPkcePair', () => {
  it('produces an S256 challenge matching the verifier', async () => {
    const { verifier, challenge, method } = await createPkcePair();
    expect(method).toBe('S256');
    expect(verifier.length).toBeGreaterThanOrEqual(43);
    // base64url, no padding
    expect(challenge).toMatch(/^[A-Za-z0-9\-_]+$/);

    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
    const expected = btoa(String.fromCharCode(...new Uint8Array(digest)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    expect(challenge).toBe(expected);
  });
});

describe('token storage', () => {
  it('keeps tokens in memory only', () => {
    saveToken('tok', { provider: 'gitlab' });
    expect(loadToken()).toMatchObject({ token: 'tok', meta: { provider: 'gitlab' } });
    expect(sessionStorage.getItem('reports.oauth.token')).toBeNull();
    expect(localStorage.length).toBe(0);
  });

  it('strips refresh_token and id_token from raw metadata', () => {
    saveToken('tok', {
      provider: 'gitlab',
      raw: { access_token: 'tok', refresh_token: 'refresh', id_token: 'idt', expires_in: 3600 },
    });
    const stored = loadToken();
    expect(stored.meta.raw.refresh_token).toBeUndefined();
    expect(stored.meta.raw.id_token).toBeUndefined();
    expect(stored.meta.raw.expires_in).toBe(3600);
  });

  it('clearToken wipes the memory token', () => {
    saveToken('tok');
    clearToken();
    expect(loadToken()).toBeNull();
  });
});
