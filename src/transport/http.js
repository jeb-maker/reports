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
 */
export async function postJson({
  url,
  body,
  credentials = 'same-origin',
  headers,
  getAccessToken,
  method = 'POST',
}) {
  /** @type {Record<string, string>} */
  const resolvedHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };

  if (typeof headers === 'function') {
    Object.assign(resolvedHeaders, await headers());
  } else if (headers) {
    Object.assign(resolvedHeaders, headers);
  }

  if (typeof getAccessToken === 'function') {
    const token = await getAccessToken();
    if (token) resolvedHeaders.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    credentials,
    headers: resolvedHeaders,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`Request failed: ${res.status} ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res.text();
}

/**
 * @param {object} options
 */
export async function requestJson(options) {
  return postJson(options);
}
