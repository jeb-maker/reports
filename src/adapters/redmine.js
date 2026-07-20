import { formatContextMarkdown } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendRedmine(report, config) {
  const cfg = config.redmine || {};
  const issue = {
    subject: `[${report.type}] ${report.title}`.slice(0, 240),
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
  return sendViaAuth(cfg, payload, { apiUrl: `${base}/issues.json` });
}
