import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { sendWebhook } from '../src/adapters/webhook.js';
import { sendSlack } from '../src/adapters/slack.js';
import { sendGitHub } from '../src/adapters/github.js';
import { sendJira } from '../src/adapters/jira.js';
import { sendRedmine } from '../src/adapters/redmine.js';
import { sendGitLab } from '../src/adapters/gitlab.js';
import { sendLinear } from '../src/adapters/linear.js';
import { sendAzureDevOps } from '../src/adapters/azure-devops.js';
import { buildAuthHeader, sendViaAuth } from '../src/adapters/shared.js';
import { saveToken, clearToken } from '../src/oauth/pkce.js';

const report = {
  id: 'rp_1',
  type: 'bug',
  createdAt: '2026-01-01T00:00:00.000Z',
  title: 'Broken',
  message: 'Details',
  page: { url: 'https://app.example/' },
  browser: { userAgent: 'UA' },
  viewport: { innerWidth: 1, innerHeight: 1, devicePixelRatio: 1, colorScheme: 'light' },
};

let fetchMock;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(
    new Response('{"ok":true}', { status: 200, headers: { 'content-type': 'application/json' } }),
  );
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  clearToken();
});

function lastCall() {
  const [url, init] = fetchMock.mock.calls.at(-1);
  return { url, init, body: init.body ? JSON.parse(init.body) : null };
}

describe('buildAuthHeader', () => {
  it('defaults to Bearer', () => {
    expect(buildAuthHeader('t', {})).toEqual({ Authorization: 'Bearer t' });
  });

  it('supports the Redmine API key header', () => {
    expect(buildAuthHeader('t', {}, { authScheme: 'redmine' })).toEqual({ 'X-Redmine-API-Key': 't' });
  });

  it('supports Basic auth for Azure DevOps PATs', () => {
    expect(buildAuthHeader('pat', {}, { authScheme: 'basic' })).toEqual({
      Authorization: `Basic ${btoa(':pat')}`,
    });
  });

  it('supports raw Authorization for Linear API keys', () => {
    expect(buildAuthHeader('lin_key', {}, { authScheme: 'apiKey' })).toEqual({
      Authorization: 'lin_key',
    });
  });
});

describe('sendViaAuth', () => {
  it('does not forward Bearer to url mode by default', async () => {
    await sendViaAuth(
      { auth: 'url', url: '/api/feedback', getAccessToken: () => 'secret' },
      { a: 1 },
    );
    const { init } = lastCall();
    expect(init.headers.get('authorization')).toBeNull();
    expect(init.credentials).toBe('same-origin');
  });

  it('forwards Bearer only with forwardBearer: true', async () => {
    await sendViaAuth(
      { auth: 'url', url: '/api/feedback', forwardBearer: true, getAccessToken: () => 'secret' },
      { a: 1 },
    );
    expect(lastCall().init.headers.get('authorization')).toBe('Bearer secret');
  });

  it('requires a token in token mode', async () => {
    await expect(
      sendViaAuth({ auth: 'token' }, {}, { apiUrl: 'https://api.example/' }),
    ).rejects.toThrow(/No access token/);
  });

  it('uses the stored OAuth token when the provider matches', async () => {
    saveToken('stored-tok', { provider: 'gitlab' });
    await sendViaAuth({ auth: 'token' }, {}, { apiUrl: 'https://api.example/', provider: 'gitlab' });
    expect(lastCall().init.headers.get('authorization')).toBe('Bearer stored-tok');
  });

  it('rejects a stored token from a different provider', async () => {
    saveToken('stored-tok', { provider: 'gitlab' });
    await expect(
      sendViaAuth({ auth: 'token' }, {}, { apiUrl: 'https://api.example/', provider: 'github' }),
    ).rejects.toThrow(/No access token/);
  });

  it('rejects unsupported auth modes', async () => {
    await expect(sendViaAuth({ auth: 'magic' }, {})).rejects.toThrow(/Unsupported auth mode/);
  });
});

describe('sendWebhook', () => {
  it('requires webhook.url', async () => {
    await expect(sendWebhook(report, {})).rejects.toThrow(/webhook\.url/);
  });

  it('posts the full report', async () => {
    await sendWebhook(report, { webhook: { url: '/api/feedback' } });
    const { url, body } = lastCall();
    expect(url).toBe('/api/feedback');
    expect(body.id).toBe('rp_1');
  });
});

describe('sendSlack', () => {
  it('requires slack.webhookUrl', async () => {
    await expect(sendSlack(report, {})).rejects.toThrow(/slack\.webhookUrl/);
  });

  it('sends blocks without any screenshot data URL', async () => {
    await sendSlack(
      { ...report, screenshot: { status: 'captured', dataUrl: 'data:image/png;base64,AAAA', bytes: 4 } },
      { slack: { webhookUrl: 'https://hooks.slack.example/x' } },
    );
    const { init, body } = lastCall();
    expect(init.credentials).toBe('omit');
    expect(body.blocks.length).toBeGreaterThan(0);
    expect(init.body).not.toContain('data:image/png');
  });
});

describe('sendGitHub', () => {
  it('uses url mode when configured', async () => {
    await sendGitHub(report, { github: { auth: 'url', url: '/api/feedback/github' } });
    const { url, body } = lastCall();
    expect(url).toBe('/api/feedback/github');
    expect(body.title).toBe('[bug] Broken');
    expect(body.report.id).toBe('rp_1');
  });

  it('requires owner/repo in token mode', async () => {
    await expect(
      sendGitHub(report, { github: { auth: 'token', getAccessToken: () => 't' } }),
    ).rejects.toThrow(/owner and github\.repo/);
  });

  it('calls the GitHub API with correct headers in token mode', async () => {
    await sendGitHub(report, {
      github: { auth: 'token', getAccessToken: () => 'gh-tok', owner: 'o', repo: 'r' },
    });
    const { url, init } = lastCall();
    expect(url).toBe('https://api.github.com/repos/o/r/issues');
    expect(init.headers.get('authorization')).toBe('Bearer gh-tok');
    expect(init.headers.get('accept')).toBe('application/vnd.github+json');
    expect(init.headers.get('x-github-api-version')).toBe('2022-11-28');
  });
});

describe('sendJira', () => {
  it('refuses clientSecret', async () => {
    await expect(sendJira(report, { jira: { clientSecret: 'x' } })).rejects.toThrow(/forbidden/);
  });

  it('requires projectKey outside url mode', async () => {
    await expect(sendJira(report, { jira: { auth: 'token' } })).rejects.toThrow(/projectKey/);
  });

  it('sends ADF description to Jira Cloud', async () => {
    await sendJira(report, {
      jira: { auth: 'token', getAccessToken: () => 't', cloudId: 'cid', projectKey: 'SUP' },
    });
    const { url, body } = lastCall();
    expect(url).toBe('https://api.atlassian.com/ex/jira/cid/rest/api/3/issue');
    expect(body.fields.project.key).toBe('SUP');
    expect(body.fields.issuetype.name).toBe('Bug');
    expect(body.fields.description.type).toBe('doc');
  });

  it('sends plain text description to Data Center', async () => {
    await sendJira(report, {
      jira: {
        auth: 'token',
        getAccessToken: () => 't',
        variant: 'datacenter',
        baseUrl: 'https://jira.example/',
        projectKey: 'SUP',
      },
    });
    const { url, body } = lastCall();
    expect(url).toBe('https://jira.example/rest/api/2/issue');
    expect(typeof body.fields.description).toBe('string');
  });

  it('requires cloudId for Cloud token mode', async () => {
    await expect(
      sendJira(report, { jira: { auth: 'token', getAccessToken: () => 't', projectKey: 'SUP' } }),
    ).rejects.toThrow(/cloudId/);
  });
});

describe('sendRedmine', () => {
  it('uses the X-Redmine-API-Key header by default', async () => {
    await sendRedmine(report, {
      redmine: { auth: 'token', getAccessToken: () => 'rm-key', baseUrl: 'https://rm.example', projectId: 1 },
    });
    const { url, init, body } = lastCall();
    expect(url).toBe('https://rm.example/issues.json');
    expect(init.headers.get('x-redmine-api-key')).toBe('rm-key');
    expect(body.issue.subject).toBe('[bug] Broken');
  });

  it('requires baseUrl outside url mode', async () => {
    await expect(
      sendRedmine(report, { redmine: { auth: 'token', getAccessToken: () => 'k' } }),
    ).rejects.toThrow(/baseUrl/);
  });
});

describe('sendGitLab', () => {
  it('creates an issue with joined labels', async () => {
    await sendGitLab(report, {
      gitlab: { auth: 'token', getAccessToken: () => 'gl', projectId: 42, labels: ['a', 'b'] },
    });
    const { url, body } = lastCall();
    expect(url).toBe('https://gitlab.com/api/v4/projects/42/issues');
    expect(body.labels).toBe('a,b');
  });

  it('encodes namespaced project paths', async () => {
    await sendGitLab(report, {
      gitlab: { auth: 'token', getAccessToken: () => 'gl', projectId: 'group/app' },
    });
    expect(lastCall().url).toBe('https://gitlab.com/api/v4/projects/group%2Fapp/issues');
  });
});

describe('sendLinear', () => {
  it('sends a GraphQL mutation with Bearer by default', async () => {
    await sendLinear(report, { linear: { auth: 'token', getAccessToken: () => 'lin', teamId: 'T1' } });
    const { url, init, body } = lastCall();
    expect(url).toBe('https://api.linear.app/graphql');
    expect(init.headers.get('authorization')).toBe('Bearer lin');
    expect(body.variables.input.teamId).toBe('T1');
  });

  it('sends a raw Authorization header with useApiKey', async () => {
    await sendLinear(report, {
      linear: { auth: 'token', getAccessToken: () => 'lin_api_xxx', teamId: 'T1', useApiKey: true },
    });
    expect(lastCall().init.headers.get('authorization')).toBe('lin_api_xxx');
  });
});

describe('sendAzureDevOps', () => {
  it('creates a Bug work item with PAT Basic auth', async () => {
    await sendAzureDevOps(report, {
      azureDevOps: {
        auth: 'token',
        getAccessToken: () => 'pat',
        usePat: true,
        organization: 'org',
        project: 'proj',
      },
    });
    const { url, init, body } = lastCall();
    expect(url).toBe('https://dev.azure.com/org/proj/_apis/wit/workitems/$Bug?api-version=7.1');
    expect(init.headers.get('authorization')).toBe(`Basic ${btoa(':pat')}`);
    expect(init.headers.get('content-type')).toBe('application/json-patch+json');
    expect(body.find((op) => op.path === '/fields/System.Title').value).toBe('[bug] Broken');
    expect(body.some((op) => op.path === '/fields/Microsoft.VSTS.TCM.ReproSteps')).toBe(true);
  });

  it('requires organization and project in token mode', async () => {
    await expect(
      sendAzureDevOps(report, { azureDevOps: { auth: 'token', getAccessToken: () => 'p' } }),
    ).rejects.toThrow(/organization and project/);
  });
});
