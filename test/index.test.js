import { describe, it, expect } from 'vitest';
import ReportsDefault, { Reports, listAdapters, sendWebhook, sendJira } from '../src/index.js';

describe('full package entry', () => {
  it('registers all built-in adapters', () => {
    const names = listAdapters();
    for (const name of [
      'webhook',
      'slack',
      'github',
      'jira',
      'redmine',
      'gitlab',
      'linear',
      'azureDevOps',
    ]) {
      expect(names, name).toContain(name);
    }
  });

  it('exposes the Reports facade as default and named export', () => {
    expect(ReportsDefault).toBe(Reports);
    expect(typeof Reports.init).toBe('function');
    expect(typeof Reports.submit).toBe('function');
    expect(typeof Reports.destroy).toBe('function');
  });

  it('re-exports adapter functions', () => {
    expect(typeof sendWebhook).toBe('function');
    expect(typeof sendJira).toBe('function');
  });

  it('exposes window.Reports for script-tag usage', () => {
    expect(window.Reports).toBe(Reports);
  });
});
