import { formatContextMarkdown, typeToIssueKind } from './format-context.js';
import { sendViaAuth } from './shared.js';

const TYPE_TO_JIRA = {
  bug: 'Bug',
  help: 'Task',
  suggestion: 'Story',
  question: 'Task',
};

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendJira(report, config) {
  const cfg = config.jira || {};

  if (cfg.clientSecret || cfg.client_secret) {
    throw new Error('[Reports] jira.clientSecret is forbidden in the browser. Use getAccessToken or auth: "url".');
  }

  const issueType = cfg.issueType || TYPE_TO_JIRA[report.type] || 'Task';
  const descriptionText = formatContextMarkdown(report);

  // ADF-ish minimal for Cloud; plain string for DC url forward
  const fields = {
    project: { key: cfg.projectKey },
    summary: `[${report.type}] ${report.title}`.slice(0, 240),
    issuetype: { name: issueType },
    labels: cfg.labels || ['user-report'],
    description:
      cfg.variant === 'datacenter'
        ? descriptionText
        : {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: descriptionText.slice(0, 32000) }],
              },
            ],
          },
  };

  const payload = { fields, report, kind: typeToIssueKind(report.type) };

  if (cfg.auth === 'url' || (!cfg.auth && cfg.url)) {
    return sendViaAuth({ ...cfg, auth: 'url' }, payload);
  }

  if (cfg.variant === 'datacenter') {
    const base = (cfg.baseUrl || '').replace(/\/$/, '');
    if (!base && cfg.auth !== 'url') throw new Error('jira.baseUrl required for Data Center');
    return sendViaAuth(cfg, { fields }, {
      apiUrl: `${base}/rest/api/2/issue`,
    });
  }

  // Jira Cloud
  const cloudId = cfg.cloudId;
  if (!cloudId) throw new Error('jira.cloudId is required for Cloud token mode');
  return sendViaAuth(cfg, { fields }, {
    apiUrl: `https://api.atlassian.com/ex/jira/${cloudId}/rest/api/3/issue`,
  });
}
