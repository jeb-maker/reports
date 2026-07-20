import { formatContextMarkdown } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function sendLinear(report, config) {
  const cfg = config.linear || {};
  const mutation = {
    query: `mutation CreateIssue($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue { id identifier url }
      }
    }`,
    variables: {
      input: {
        teamId: cfg.teamId,
        title: `[${report.type}] ${report.title}`.slice(0, 240),
        description: formatContextMarkdown(report),
        labelIds: cfg.labelIds || undefined,
      },
    },
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { ...mutation, report });
  }

  return sendViaAuth(cfg, mutation, { apiUrl: 'https://api.linear.app/graphql' });
}
