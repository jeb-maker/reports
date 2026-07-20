/**
 * HTTP transport with dynamic headers / credentials from host app.
 */

/**
 * @param {object} options
 * @param {string} options.url
 * @param {unknown} options.body
 * @param {RequestCredentials} [options.credentials]
 * @param {HeadersInit | (() => HeadersInit | Promise<HeadersInit>)} [options.headers]
 * @param {() => string | Promise<string>} [options.getAccessToken]
 * @param {string} [options.method]
 * @param {number} [options.timeoutMs]
 */
export async function postJson({
  url,
  body,
  credentials = 'same-origin',
  headers,
  getAccessToken,
  method = 'POST',
  timeoutMs = 20_000,
}) {
  const h = new Headers({
    'Content-Type': 'application/json',
    Accept: 'application/json',
  });

  const userHeaders = typeof headers === 'function' ? await headers() : headers || {};
  for (const [k, v] of Object.entries(userHeaders)) {
    if (v != null) h.set(k, String(v));
  }

  if (typeof getAccessToken === 'function') {
    const token = await getAccessToken();
    if (token) h.set('Authorization', `Bearer ${token}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      credentials,
      headers: h,
      body: typeof body === 'string' ? body : JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = (await res.text().catch(() => '')).slice(0, 2000);
      const err = new Error(`Request failed: ${res.status} ${res.statusText}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }

    const contentType = res.headers.get('content-type') || '';
    const raw = await res.text();
    if (!raw) return null;
    if (contentType.includes('application/json')) {
      try {
        return JSON.parse(raw);
      } catch {
        return raw;
      }
    }
    return raw;
  } finally {
    clearTimeout(timer);
  }
}

export async function requestJson(options) {
  return postJson(options);
}
