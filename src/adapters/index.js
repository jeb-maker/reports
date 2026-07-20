import { sendWebhook } from './webhook.js';
import { sendSlack } from './slack.js';
import { sendGitHub } from './github.js';
import { sendJira } from './jira.js';
import { sendRedmine } from './redmine.js';
import { sendGitLab } from './gitlab.js';
import { sendLinear } from './linear.js';
import { sendAzureDevOps } from './azure-devops.js';

const BUILTIN = {
  webhook: sendWebhook,
  slack: sendSlack,
  github: sendGitHub,
  jira: sendJira,
  redmine: sendRedmine,
  gitlab: sendGitLab,
  linear: sendLinear,
  azureDevOps: sendAzureDevOps,
};

/**
 * @param {import('../index.js').ReportPayload} report
 * @param {Record<string, unknown>} config
 */
export async function dispatch(report, config) {
  const adapter = config.adapter;

  if (typeof adapter === 'function') {
    return adapter(report, config);
  }

  const name = typeof adapter === 'string' ? adapter : 'webhook';
  const fn = BUILTIN[name];
  if (!fn) {
    throw new Error(`Unknown adapter: ${name}. Known: ${Object.keys(BUILTIN).join(', ')}`);
  }
  return fn(report, config);
}

export { BUILTIN as adapters };
