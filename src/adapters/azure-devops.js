import { formatContextMarkdown } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendAzureDevOps(report, config) {
  const cfg = config.azureDevOps || {};
  const workItemType = cfg.workItemType || (report.type === 'bug' ? 'Bug' : 'Task');
  const patch = [
    { op: 'add', path: '/fields/System.Title', value: `[${report.type}] ${report.title}`.slice(0, 240) },
    { op: 'add', path: '/fields/System.Description', value: formatContextMarkdown(report) },
  ];

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth(
      { ...cfg, auth: cfg.auth || 'url' },
      { patch, workItemType, project: cfg.project, report },
    );
  }

  const org = cfg.organization;
  const project = encodeURIComponent(cfg.project);
  if (!org || !cfg.project) throw new Error('azureDevOps.organization and project required');

  const apiUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`;

  return sendViaAuth(
    {
      ...cfg,
      headers: async () => ({
        'Content-Type': 'application/json-patch+json',
        ...(typeof cfg.headers === 'function' ? await cfg.headers() : cfg.headers || {}),
      }),
    },
    patch,
    { apiUrl },
  );
}
