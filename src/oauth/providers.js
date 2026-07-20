import { createPkcePair, openOAuthPopup, randomString, saveToken, loadToken, clearToken } from './pkce.js';

export const providers = {
  jiraDatacenter: {
    id: 'jira-datacenter',
    async buildAuthorizeUrl(config, { challenge, state }) {
      const base = config.baseUrl.replace(/\/$/, '');
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: (config.scopes || ['WRITE']).join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return `${base}/rest/oauth2/latest/authorize?${params.toString()}`;
    },
    async exchangeCode(config, { code, verifier }) {
      const base = config.baseUrl.replace(/\/$/, '');
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      });
      const res = await fetch(`${base}/rest/oauth2/latest/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`Jira DC token exchange failed: ${res.status} ${detail}`);
      }
      return res.json();
    },
  },

  gitlab: {
    id: 'gitlab',
    async buildAuthorizeUrl(config, { challenge, state }) {
      const base = (config.baseUrl || 'https://gitlab.com').replace(/\/$/, '');
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        response_type: 'code',
        scope: (config.scopes || ['api']).join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return `${base}/oauth/authorize?${params.toString()}`;
    },
    async exchangeCode(config, { code, verifier }) {
      const base = (config.baseUrl || 'https://gitlab.com').replace(/\/$/, '');
      const body = new URLSearchParams({
        client_id: config.clientId,
        code,
        grant_type: 'authorization_code',
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      });
      const res = await fetch(`${base}/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) {
        const detail = (await res.text().catch(() => '')).slice(0, 300);
        throw new Error(`GitLab token exchange failed: ${res.status} ${detail}`);
      }
      return res.json();
    },
  },
};

/**
 * @param {string} providerKey
 * @param {Record<string, unknown>} config
 */
export async function connectOAuth(providerKey, config) {
  if (config.clientSecret || config.client_secret) {
    throw new Error('[Reports] clientSecret must not be used in the browser bundle.');
  }

  if (providerKey === 'github') {
    throw new Error(
      'GitHub OAuth Apps require a client secret for token exchange. Use auth: "url" (host endpoint) or getAccessToken().',
    );
  }

  const provider = providers[providerKey];
  if (!provider) throw new Error(`Unknown OAuth provider: ${providerKey}`);

  const { verifier, challenge } = await createPkcePair();
  const state = randomString(32);

  try {
    sessionStorage.setItem('reports.oauth.verifier', verifier);
    sessionStorage.setItem('reports.oauth.state', state);
    sessionStorage.setItem('reports.oauth.provider', providerKey);

    const authorizeUrl = await provider.buildAuthorizeUrl(config, { challenge, state });
    const { code, state: returnedState } = await openOAuthPopup({ authorizeUrl });

    if (returnedState !== state) throw new Error('OAuth state mismatch');

    const tokenResponse = await provider.exchangeCode(config, { code, verifier });
    const accessToken = tokenResponse.access_token;
    if (!accessToken) throw new Error('No access_token in OAuth response');

    saveToken(accessToken, { provider: providerKey, raw: tokenResponse });
    return accessToken;
  } finally {
    try {
      sessionStorage.removeItem('reports.oauth.verifier');
      sessionStorage.removeItem('reports.oauth.state');
      sessionStorage.removeItem('reports.oauth.provider');
    } catch {
      /* ignore */
    }
  }
}

export { loadToken, clearToken, saveToken };
