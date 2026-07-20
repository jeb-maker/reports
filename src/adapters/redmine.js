import { formatContextMarkdown, sliceChars } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendRedmine(report, config) {
  const cfg = { ...(config.redmine || {}), authScheme: (config.redmine || {}).authScheme || 'redmine' };
  const issue = {
    subject: sliceChars(`[${report.type}] ${report.title}`, 240),
    description: formatContextMarkdown(report),
    project_id: cfg.projectId,
    tracker_id: cfg.trackerId,
    priority_id: cfg.priorityId,
  };

  const payload = { issue, report };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, payload);
  }

  const base = (cfg.baseUrl || '').replace(/\/$/, '');
  if (!base) throw new Error('redmine.baseUrl or redmine.url required');
  return sendViaAuth(cfg, { issue }, { apiUrl: `${base}/issues.json`, provider: 'redmine' });
}
