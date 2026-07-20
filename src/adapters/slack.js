import { postJson } from '../transport/http.js';
import { formatContextMarkdown, sliceChars } from './format-context.js';

/**
 * Slack incoming webhook — text/blocks only, no base64 images.
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendSlack(report, config) {
  const cfg = config.slack || {};
  const url = cfg.webhookUrl || cfg.url;
  if (!url) throw new Error('slack.webhookUrl is required');

  const title = sliceChars(`[${report.type}] ${report.title}`, 150);
  const bytesNote =
    report.screenshot?.bytes != null ? `${report.screenshot.bytes} bytes` : 'size unknown';

  const screenshotNote =
    report.screenshot?.status === 'captured'
      ? `Screenshot: present in full webhook/raw payload only (${bytesNote}) — omitted here`
      : `Screenshot: ${report.screenshot?.status || 'none'}`;

  const text = sliceChars(
    [
      `*${title}*`,
      report.message || '',
      `URL: ${report.page?.url || '—'}`,
      `UA: ${report.browser?.userAgent || '—'}`,
      screenshotNote,
    ].join('\n'),
    2900,
  );

  const body = {
    text: title,
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: title },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text },
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
    attachments: [
      {
        color: report.type === 'bug' ? '#E74C3C' : '#0B6E4F',
        text: sliceChars(
          formatContextMarkdown({ ...report, screenshot: { status: report.screenshot?.status } }),
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
