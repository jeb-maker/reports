const SECRET_PATTERNS = [
  /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi,
  /(?:password|passwd|pwd|secret|token|api[_-]?key|authorization)["']?\s*[=:]\s*["']?[^\s"'&,;]+/gi,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{10,}\b/g,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g,
  /\bghp_[A-Za-z0-9]{20,}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
  /\bglpat-[A-Za-z0-9\-_]{20,}\b/g,
  /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
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
  'code',
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
    const head = Math.floor(maxLen * 0.75);
    const tail = Math.floor(maxLen * 0.2);
    text = `${text.slice(0, head)}…${text.slice(-tail)}`;
  }
  return text;
}

/**
 * @param {string} url
 */
export function redactUrl(url) {
  try {
    const u = new URL(url, typeof location !== 'undefined' ? location.href : undefined);
    u.username = '';
    u.password = '';
    for (const key of [...u.searchParams.keys()]) {
      if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
        u.searchParams.set(key, '[REDACTED]');
      }
    }
    if (u.hash && u.hash.length > 1) {
      const hashParams = new URLSearchParams(u.hash.slice(1));
      let changed = false;
      for (const key of [...hashParams.keys()]) {
        if (SENSITIVE_QUERY_KEYS.has(key.toLowerCase())) {
          hashParams.set(key, '[REDACTED]');
          changed = true;
        }
      }
      if (changed) u.hash = hashParams.toString();
    }
    // Second pass: catch secrets embedded in path segments or unusual spots.
    return redactString(u.toString(), 2000);
  } catch {
    return redactString(url, 500);
  }
}

/**
 * Reject hardcoded secrets in init config.
 * @param {Record<string, unknown>} config
 */
export function assertNoHardcodedSecrets(config) {
  const forbidden = new Set([
    'clientSecret',
    'client_secret',
    'token',
    'apiKey',
    'api_key',
    'password',
    'access_token',
    'refresh_token',
    'personal_access_token',
    'private_key',
    'signing_secret',
    'webhook_secret',
    'service_role_key',
    'sessionToken',
  ]);
  /** @type {WeakSet<object>} */
  const seen = new WeakSet();
  const stack = [{ value: config, path: 'config', depth: 0 }];
  let nodes = 0;

  while (stack.length) {
    const { value, path, depth } = stack.pop();
    if (!value || typeof value !== 'object' || typeof value === 'function') continue;
    if (seen.has(value)) continue;
    seen.add(value);
    if (depth > 8 || ++nodes > 500) continue;

    for (const [key, child] of Object.entries(value)) {
      const nextPath = `${path}.${key}`;
      if (forbidden.has(key) && child != null && typeof child !== 'function') {
        throw new Error(
          `[Reports] Refusing hardcoded secret at ${nextPath}. Use getAccessToken() / headers() / auth of the host app instead.`,
        );
      }
      if (child && typeof child === 'object' && typeof child !== 'function') {
        stack.push({ value: child, path: nextPath, depth: depth + 1 });
      }
    }
  }
}
