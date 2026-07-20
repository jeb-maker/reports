import { formatContextMarkdown } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendGitLab(report, config) {
  const cfg = config.gitlab || {};
  const body = {
    title: `[${report.type}] ${report.title}`.slice(0, 240),
    description: formatContextMarkdown(report),
    labels: (cfg.labels || ['feedback']).join(','),
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { ...body, report });
  }

  const base = (cfg.baseUrl || 'https://gitlab.com').replace(/\/$/, '');
  const projectId = encodeURIComponent(String(cfg.projectId));
  return sendViaAuth(cfg, body, {
    apiUrl: `${base}/api/v4/projects/${projectId}/issues`,
  });
}
