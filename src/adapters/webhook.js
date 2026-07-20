import { postJson } from '../transport/http.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendWebhook(report, config) {
  const cfg = config.webhook || config;
  if (!cfg.url) throw new Error('webhook.url is required');
  return postJson({
    url: cfg.url,
    body: report,
    credentials: cfg.credentials || 'omit',
    headers: cfg.headers,
    getAccessToken: cfg.getAccessToken,
  });
}
