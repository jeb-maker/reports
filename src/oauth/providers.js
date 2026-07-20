import { createPkcePair, openOAuthPopup, randomString, saveToken, loadToken, clearToken } from './pkce.js';

/**
 * Provider configs for OAuth PKCE where supported.
 */

export const providers = {
  /**
   * Jira Data Center / Server OAuth2 provider API.
   */
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
      return `${base}/rest/oauth2/latest/authorize?${params}`;
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
      if (!res.ok) throw new Error(`Jira DC token exchange failed: ${res.status}`);
      return res.json();
    },
  },

  github: {
    id: 'github',
    async buildAuthorizeUrl(config, { challenge, state }) {
      // GitHub supports PKCE for OAuth Apps in recent flows; scopes for issues
      const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: config.redirectUri,
        scope: (config.scopes || ['repo']).join(' '),
        state,
        code_challenge: challenge,
        code_challenge_method: 'S256',
      });
      return `https://github.com/login/oauth/authorize?${params}`;
    },
    async exchangeCode() {
      throw new Error(
        'GitHub token exchange requires a host-app endpoint (client secret). Use getAccessToken() or auth: "url".',
      );
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
      return `${base}/oauth/authorize?${params}`;
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
      if (!res.ok) throw new Error(`GitLab token exchange failed: ${res.status}`);
      return res.json();
    },
  },
};

/**
 * Start OAuth connect for a tracker config with auth: 'oauth'.
 * @param {string} providerKey
 * @param {Record<string, unknown>} config
 */
export async function connectOAuth(providerKey, config) {
  if (config.clientSecret || config.client_secret) {
    throw new Error('[Reports] clientSecret must not be used in the browser bundle.');
  }

  const provider = providers[providerKey];
  if (!provider) throw new Error(`Unknown OAuth provider: ${providerKey}`);

  const { verifier, challenge } = await createPkcePair();
  const state = randomString(32);
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
}

export { loadToken, clearToken, saveToken };
