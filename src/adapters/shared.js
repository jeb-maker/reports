import { postJson } from '../transport/http.js';
import { formatContextMarkdown, typeToIssueKind } from './format-context.js';
import { loadToken } from '../oauth/providers.js';

/**
 * Resolve access token from config or session.
 * @param {Record<string, unknown>} cfg
 */
export async function resolveToken(cfg) {
  if (typeof cfg.getAccessToken === 'function') {
    return cfg.getAccessToken();
  }
  const stored = loadToken();
  return stored?.token || null;
}

/**
 * @param {Record<string, unknown>} cfg
 * @param {unknown} body
 * @param {{ getAccessToken?: Function, apiUrl?: string, method?: string }} [extra]
 */
export async function sendViaAuth(cfg, body, extra = {}) {
  const hasTokenFn = typeof cfg.getAccessToken === 'function';
  const auth =
    cfg.auth ||
    (cfg.url ? 'url' : hasTokenFn || loadToken()?.token ? 'token' : null);

  if (auth === 'url') {
    if (!cfg.url) throw new Error('auth: "url" requires url');
    return postJson({
      url: cfg.url,
      body,
      credentials: cfg.credentials || 'include',
      headers: cfg.headers,
      getAccessToken: cfg.getAccessToken,
    });
  }

  if (auth === 'token' || auth === 'oauth') {
    const token = await resolveToken({ ...cfg, ...extra });
    if (!token) throw new Error('No access token. Call Reports.connect() or provide getAccessToken().');
    const apiUrl = extra.apiUrl || cfg.apiUrl;
    if (!apiUrl) {
      throw new Error('Missing apiUrl for token/oauth send');
    }
    const extraHeaders =
      typeof cfg.headers === 'function' ? await cfg.headers() : cfg.headers || {};
    return postJson({
      url: apiUrl,
      body,
      method: extra.method || 'POST',
      headers: {
        ...extraHeaders,
        Authorization: `Bearer ${token}`,
      },
      credentials: cfg.credentials || 'omit',
    });
  }

  throw new Error(`Unsupported auth mode: ${auth}. Use "url", "token", or "oauth".`);
}

export { formatContextMarkdown, typeToIssueKind };
