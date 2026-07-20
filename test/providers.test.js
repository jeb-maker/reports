import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { connectOAuth, providers, loadToken, clearToken } from '../src/oauth/providers.js';
import * as pkce from '../src/oauth/pkce.js';

describe('providers.buildAuthorizeUrl', () => {
  it('builds the Jira Data Center authorize URL with PKCE params', async () => {
    const url = await providers.jiraDatacenter.buildAuthorizeUrl(
      { baseUrl: 'https://jira.example/', clientId: 'cid', redirectUri: 'https://app/cb' },
      { challenge: 'CHAL', state: 'STATE' },
    );
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://jira.example/rest/oauth2/latest/authorize');
    expect(u.searchParams.get('client_id')).toBe('cid');
    expect(u.searchParams.get('response_type')).toBe('code');
    expect(u.searchParams.get('code_challenge')).toBe('CHAL');
    expect(u.searchParams.get('code_challenge_method')).toBe('S256');
    expect(u.searchParams.get('state')).toBe('STATE');
    expect(u.searchParams.get('scope')).toBe('WRITE');
  });

  it('builds the GitLab authorize URL with gitlab.com default', async () => {
    const url = await providers.gitlab.buildAuthorizeUrl(
      { clientId: 'cid', redirectUri: 'https://app/cb' },
      { challenge: 'CHAL', state: 'STATE' },
    );
    const u = new URL(url);
    expect(u.origin + u.pathname).toBe('https://gitlab.com/oauth/authorize');
    expect(u.searchParams.get('scope')).toBe('api');
  });
});

describe('connectOAuth', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: 'oauth-tok', refresh_token: 'r' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearToken();
    sessionStorage.clear();
  });

  function mockPopupEcho() {
    // Echo back the state that connectOAuth stored, like a real callback page.
    return vi.spyOn(pkce, 'openOAuthPopup').mockImplementation(async () => ({
      code: 'auth-code',
      state: sessionStorage.getItem('reports.oauth.state'),
    }));
  }

  it('refuses clientSecret', async () => {
    await expect(connectOAuth('gitlab', { clientSecret: 'x' })).rejects.toThrow(/clientSecret/);
  });

  it('refuses GitHub', async () => {
    await expect(connectOAuth('github', {})).rejects.toThrow(/GitHub OAuth/);
  });

  it('rejects unknown providers', async () => {
    await expect(connectOAuth('nope', {})).rejects.toThrow(/Unknown OAuth provider/);
  });

  it('completes the GitLab PKCE flow and stores the token in memory', async () => {
    mockPopupEcho();
    const token = await connectOAuth('gitlab', {
      clientId: 'cid',
      redirectUri: 'https://app/cb',
    });
    expect(token).toBe('oauth-tok');

    const stored = loadToken();
    expect(stored.token).toBe('oauth-tok');
    expect(stored.meta.provider).toBe('gitlab');
    expect(stored.meta.raw.refresh_token).toBeUndefined();

    const [url, init] = fetch.mock.calls[0];
    expect(url).toBe('https://gitlab.com/oauth/token');
    const body = new URLSearchParams(init.body);
    expect(body.get('grant_type')).toBe('authorization_code');
    expect(body.get('code')).toBe('auth-code');
    expect(body.get('code_verifier')).toBeTruthy();

    // PKCE artifacts must be cleaned up.
    expect(sessionStorage.getItem('reports.oauth.verifier')).toBeNull();
    expect(sessionStorage.getItem('reports.oauth.state')).toBeNull();
  });

  it('rejects on state mismatch (CSRF guard)', async () => {
    vi.spyOn(pkce, 'openOAuthPopup').mockResolvedValue({ code: 'c', state: 'forged' });
    await expect(
      connectOAuth('gitlab', { clientId: 'cid', redirectUri: 'https://app/cb' }),
    ).rejects.toThrow(/state mismatch/);
    expect(loadToken()).toBeNull();
  });

  it('surfaces token exchange failures', async () => {
    mockPopupEcho();
    fetch.mockResolvedValue(new Response('denied', { status: 401 }));
    await expect(
      connectOAuth('gitlab', { clientId: 'cid', redirectUri: 'https://app/cb' }),
    ).rejects.toThrow(/token exchange failed: 401/);
  });

  it('rejects a response without access_token', async () => {
    mockPopupEcho();
    fetch.mockResolvedValue(
      new Response('{}', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    await expect(
      connectOAuth('gitlab', { clientId: 'cid', redirectUri: 'https://app/cb' }),
    ).rejects.toThrow(/No access_token/);
  });
});
