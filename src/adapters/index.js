import { sendWebhook } from './webhook.js';
import { sendSlack } from './slack.js';
import { sendGitHub } from './github.js';
import { sendJira } from './jira.js';
import { sendRedmine } from './redmine.js';
import { sendGitLab } from './gitlab.js';
import { sendLinear } from './linear.js';
import { sendAzureDevOps } from './azure-devops.js';
import { registerAdapter, dispatch, getAdapter, listAdapters } from './registry.js';

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

/** Register every built-in adapter (used by the full package entry). */
export function registerAllAdapters() {
  for (const [name, fn] of Object.entries(BUILTIN)) {
    registerAdapter(name, fn);
  }
}

export {
  sendWebhook,
  sendSlack,
  sendGitHub,
  sendJira,
  sendRedmine,
  sendGitLab,
  sendLinear,
  sendAzureDevOps,
  registerAdapter,
  dispatch,
  getAdapter,
  listAdapters,
  BUILTIN as adapters,
};
