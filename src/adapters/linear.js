import { formatContextMarkdown, sliceChars } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendLinear(report, config) {
  const cfg = { ...(config.linear || {}) };
  // Personal API keys: Authorization without Bearer. OAuth tokens: Bearer.
  if (!cfg.authScheme) {
    cfg.authScheme = cfg.useApiKey === true ? 'apiKey' : 'bearer';
  }

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
        title: sliceChars(`[${report.type}] ${report.title}`, 240),
        description: formatContextMarkdown(report),
        labelIds: cfg.labelIds || undefined,
      },
    },
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { graphql: mutation, report });
  }

  return sendViaAuth(cfg, mutation, { apiUrl: 'https://api.linear.app/graphql', provider: 'linear' });
}
