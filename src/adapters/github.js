import { formatContextMarkdown, sliceChars } from './format-context.js';
import { sendViaAuth } from './shared.js';

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function sendGitHub(report, config) {
  const cfg = config.github || {};
  const title = sliceChars(`[${report.type}] ${report.title}`, 240);
  const body = {
    title,
    body: formatContextMarkdown(report),
    labels: cfg.labels || ['feedback'],
  };

  if (cfg.auth === 'url' || cfg.url) {
    return sendViaAuth({ ...cfg, auth: cfg.auth || 'url' }, { ...body, report });
  }

  const owner = cfg.owner;
  const repo = cfg.repo;
  if (!owner || !repo) throw new Error('github.owner and github.repo are required for token/oauth');

  return sendViaAuth(
    {
      ...cfg,
      headers: async () => ({
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(typeof cfg.headers === 'function' ? await cfg.headers() : cfg.headers || {}),
      }),
    },
    body,
    {
      apiUrl: `https://api.github.com/repos/${owner}/${repo}/issues`,
      provider: 'github',
    },
  );
}
