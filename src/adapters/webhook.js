import { postJson } from '../transport/http.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendWebhook(report, config) {
  const cfg = config.webhook || {};
  if (!cfg.url) throw new Error('webhook.url is required');
  return postJson({
    url: cfg.url,
    body: report,
    credentials: cfg.credentials || 'same-origin',
    headers: cfg.headers,
    getAccessToken: cfg.forwardBearer === true ? cfg.getAccessToken : undefined,
    timeoutMs: cfg.timeoutMs,
  });
}
