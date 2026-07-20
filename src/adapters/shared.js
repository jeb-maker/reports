import { postJson } from '../transport/http.js';
import { formatContextMarkdown, typeToIssueKind } from './format-context.js';
import { loadToken } from '../oauth/providers.js';

/**
 * @param {Record<string, unknown>} cfg
 * @param {string} [expectedProvider]
 */
export async function resolveToken(cfg, expectedProvider) {
  if (typeof cfg.getAccessToken === 'function') {
    return cfg.getAccessToken();
  }
  const stored = loadToken();
  if (!stored?.token) return null;
  if (expectedProvider && stored.meta?.provider && stored.meta.provider !== expectedProvider) {
    return null;
  }
  return stored.token;
}

/**
 * @param {Record<string, unknown>} cfg
 * @returns {Promise<Record<string, string>>}
 */
async function resolveUserHeaders(cfg) {
  if (typeof cfg.headers === 'function') return (await cfg.headers()) || {};
  return cfg.headers || {};
}

/**
 * Build Authorization (or custom) header for token mode.
 * @param {string} token
 * @param {Record<string, unknown>} cfg
 * @param {{ authScheme?: string }} [extra]
 */
export function buildAuthHeader(token, cfg, extra = {}) {
  const scheme = extra.authScheme || cfg.authScheme || 'bearer';
  switch (String(scheme).toLowerCase()) {
    case 'redmine':
    case 'x-redmine-api-key':
      return { 'X-Redmine-API-Key': token };
    case 'basic': {
      // Azure DevOps PAT: Basic base64(":" + pat)
      const user = cfg.username != null ? String(cfg.username) : '';
      const encoded = btoa(`${user}:${token}`);
      return { Authorization: `Basic ${encoded}` };
    }
    case 'apikey':
    case 'api-key':
    case 'raw':
      // Linear personal API keys: Authorization: <key> (no Bearer)
      return { Authorization: token };
    case 'bearer':
    default:
      return { Authorization: `Bearer ${token}` };
  }
}

/**
 * @param {Record<string, unknown>} cfg
 * @param {unknown} body
 * @param {{ apiUrl?: string, method?: string, authScheme?: string, provider?: string }} [extra]
 */
export async function sendViaAuth(cfg, body, extra = {}) {
  const hasTokenFn = typeof cfg.getAccessToken === 'function';
  const stored = loadToken();
  const storedMatches =
    Boolean(stored?.token) &&
    (!extra.provider || !stored.meta?.provider || stored.meta.provider === extra.provider);
  const auth =
    cfg.auth ||
    (hasTokenFn || storedMatches ? 'token' : cfg.url ? 'url' : null);

  if (auth === 'url') {
    if (!cfg.url) throw new Error('auth: "url" requires url');
    // Never forward tracker OAuth tokens to arbitrary URLs by default.
    return postJson({
      url: cfg.url,
      body,
      credentials: cfg.credentials || 'same-origin',
      headers: cfg.headers,
      getAccessToken: cfg.forwardBearer === true ? cfg.getAccessToken : undefined,
      timeoutMs: cfg.timeoutMs,
    });
  }

  if (auth === 'token' || auth === 'oauth') {
    const token = await resolveToken(cfg, extra.provider);
    if (!token) throw new Error('No access token. Call Reports.connect() or provide getAccessToken().');
    const apiUrl = extra.apiUrl || cfg.apiUrl;
    if (!apiUrl) {
      throw new Error('Missing apiUrl for token/oauth send');
    }
    const userHeaders = await resolveUserHeaders(cfg);
    const authHeaders = buildAuthHeader(token, cfg, extra);
    return postJson({
      url: apiUrl,
      body,
      method: extra.method || 'POST',
      headers: { ...userHeaders, ...authHeaders },
      credentials: cfg.credentials || 'omit',
      timeoutMs: cfg.timeoutMs,
    });
  }

  throw new Error(`Unsupported auth mode: ${auth}. Use "url", "token", or "oauth".`);
}

export { formatContextMarkdown, typeToIssueKind };
