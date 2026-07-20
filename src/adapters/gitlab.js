import { formatContextMarkdown, sliceChars } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendGitLab(report, config) {
  const cfg = config.gitlab || {};
  const labelsRaw = cfg.labels || ['feedback'];
  const labels = Array.isArray(labelsRaw) ? labelsRaw.join(',') : String(labelsRaw);

  const body = {
    title: sliceChars(`[${report.type}] ${report.title}`, 240),
    description: formatContextMarkdown(report),
    labels,
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { ...body, report });
  }

  const base = (cfg.baseUrl || 'https://gitlab.com').replace(/\/$/, '');
  const projectId = encodeURIComponent(String(cfg.projectId));
  return sendViaAuth(cfg, body, {
    apiUrl: `${base}/api/v4/projects/${projectId}/issues`,
    provider: 'gitlab',
  });
}
