import { postJson } from '../transport/http.js';
import { formatContextMarkdown } from './format-context.js';

/**
 * Slack incoming webhook — text/blocks only, no base64 images.
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendSlack(report, config) {
  const cfg = config.slack || config;
  const url = cfg.webhookUrl || cfg.url;
  if (!url) throw new Error('slack.webhookUrl is required');

  const screenshotNote =
    report.screenshot?.status === 'captured'
      ? `Screenshot: present in full webhook payload only (${report.screenshot.bytes} bytes) — omitted here`
      : `Screenshot: ${report.screenshot?.status || 'none'}`;

  const text = [
    `*[${report.type}] ${report.title}*`,
    report.message,
    `URL: ${report.page?.url || '—'}`,
    `UA: ${report.browser?.userAgent || '—'}`,
    screenshotNote,
  ].join('\n');

  const body = {
    text: `[${report.type}] ${report.title}`,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `[${report.type}] ${report.title}`.slice(0, 150) },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: text.slice(0, 2900) },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `id=\`${report.id}\` · ${report.createdAt}`,
          },
        ],
      },
    ],
    // Condensed context for humans; full markdown available if needed by bots
    attachments: [
      {
        color: report.type === 'bug' ? '#E74C3C' : '#0B6E4F',
        text: formatContextMarkdown({ ...report, screenshot: { status: report.screenshot?.status } }).slice(
          0,
          2900,
        ),
      },
    ],
  };

  return postJson({
    url,
    body,
    credentials: 'omit',
  });
}
