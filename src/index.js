/**
 * Full package entry — core + all built-in adapters registered.
 * For a smaller bundle, use `@jeb-maker/reports/core` + only the adapters you need.
 */
import Reports, {
  init,
  open,
  close,
  destroy,
  connect,
  logout,
  submit,
  registerAdapter,
  getAdapter,
  listAdapters,
  dispatch,
} from './core.js';
import { registerAllAdapters } from './adapters/index.js';

registerAllAdapters();

export {
  Reports,
  init,
  open,
  close,
  destroy,
  connect,
  logout,
  submit,
  registerAdapter,
  getAdapter,
  listAdapters,
  dispatch,
};

export {
  sendWebhook,
  sendSlack,
  sendGitHub,
  sendJira,
  sendRedmine,
  sendGitLab,
  sendLinear,
  sendAzureDevOps,
} from './adapters/index.js';

export default Reports;

if (typeof window !== 'undefined' && !window.Reports) {
  window.Reports = Reports;
}
