import { formatContextMarkdown, markdownToSimpleHtml, sliceChars } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendAzureDevOps(report, config) {
  const cfg = config.azureDevOps || {};
  const workItemType = cfg.workItemType || (report.type === 'bug' ? 'Bug' : 'Task');
  const html = markdownToSimpleHtml(formatContextMarkdown(report));

  const patch = [
    { op: 'add', path: '/fields/System.Title', value: sliceChars(`[${report.type}] ${report.title}`, 240) },
  ];

  if (workItemType === 'Bug') {
    patch.push({ op: 'add', path: '/fields/Microsoft.VSTS.TCM.ReproSteps', value: html });
  } else {
    patch.push({ op: 'add', path: '/fields/System.Description', value: html });
  }

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth(
      { ...cfg, auth: cfg.auth || 'url' },
      { patch, workItemType, project: cfg.project, report },
    );
  }

  const org = cfg.organization;
  if (!org || !cfg.project) throw new Error('azureDevOps.organization and project required');
  const project = encodeURIComponent(cfg.project);

  const apiUrl = `https://dev.azure.com/${org}/${project}/_apis/wit/workitems/$${encodeURIComponent(workItemType)}?api-version=7.1`;

  return sendViaAuth(
    {
      ...cfg,
      authScheme: cfg.authScheme || (cfg.usePat === true ? 'basic' : 'bearer'),
      headers: async () => ({
        'Content-Type': 'application/json-patch+json',
        ...(typeof cfg.headers === 'function' ? await cfg.headers() : cfg.headers || {}),
      }),
    },
    patch,
    { apiUrl, provider: 'azureDevOps' },
  );
}
