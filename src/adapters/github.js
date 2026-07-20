import { formatContextMarkdown } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendGitHub(report, config) {
  const cfg = config.github || {};
  const title = `[${report.type}] ${report.title}`.slice(0, 240);
  const body = {
    title,
    body: formatContextMarkdown(report),
    labels: cfg.labels || ['feedback'],
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { ...body, report });
  }

  const owner = cfg.owner;
  const repo = cfg.repo;
  if (!owner || !repo) throw new Error('github.owner and github.repo are required for token/oauth');

  return sendViaAuth(cfg, body, {
    apiUrl: `https://api.github.com/repos/${owner}/${repo}/issues`,
  });
}
