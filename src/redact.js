const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(?:password|passwd|pwd|secret|token|api[_-]?key|authorization)\s*[=:]\s*["']?[^\s"'&,;]+/gi,
  /\bsk-[A-Za-z0-9]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bglpat-[A-Za-z0-9\-_]{20,}\b/g,
];

const SENSITIVE_QUERY_KEYS = new Set([
  'token',
  'access_token',
  'refresh_token',
  'api_key',
  'apikey',
  'key',
  'secret',
  'password',
  'auth',
  'authorization',
]);

/**
 * @param {unknown} value
 * @param {number} [maxLen]
 */
export function redactString(value, maxLen = 2000) {
  let text = String(value ?? '');
  for (const pattern of SECRET_PATTERNS) {
    text = text.replace(pattern, '[REDACTED]');
  }
  if (text.length > maxLen) {
    text = `${text.slice(0, maxLen)}…`;
  }
  return text;
}

/**
 * @param {string} url
 */
export function redactUrl(url) {
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : undefined);
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    return u.toString();
  } catch {
    return redactString(url, 500);
  }
}

/**
 * Reject hardcoded secrets in init config.
 * @param {Record<string, unknown>} config
 */
export function assertNoHardcodedSecrets(config) {
  const forbidden = ['clientSecret', 'client_secret', 'token', 'apiKey', 'api_key', 'password'];
  const stack = [{ value: config, path: 'config' }];

  while (stack.length) {
    const { value, path } = stack.pop();
    if (!value || typeof value !== 'object') continue;
    if (typeof value === 'function') continue;

    for (const [key, child] of Object.entries(value)) {
      const nextPath = `${path}.${key}`;
      if (forbidden.includes(key) && typeof child === 'string' && child.length > 0) {
        throw new Error(
          `[Reports] Refusing hardcoded secret at ${nextPath}. Use getAccessToken() / headers() / auth of the host app instead.`,
        );
      }
      if (child && typeof child === 'object' && typeof child !== 'function') {
        stack.push({ value: child, path: nextPath });
      }
    }
  }
}
