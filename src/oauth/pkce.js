/**
 * PKCE helpers for public OAuth clients (e.g. Jira Data Center).
 * Access tokens stay in memory only — never persist refresh tokens.
 */

/** @type {{ token: string, meta: Record<string, unknown>, savedAt: number } | null} */
let memoryToken = null;

function base64UrlEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(length = 64) {
  if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
    throw new Error('OAuth requires WebCrypto (crypto.getRandomValues)');
  }
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const max = 256 - (256 % chars.length);
  const out = [];
  while (out.length < length) {
    const values = crypto.getRandomValues(new Uint8Array(length));
    for (const v of values) {
      if (v < max) out.push(chars[v % chars.length]);
      if (out.length >= length) break;
    }
  }
  return out.join('');
}

export async function createPkcePair() {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('OAuth requires WebCrypto (crypto.subtle)');
  }
  const verifier = randomString(64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge, method: 'S256' };
}

/**
 * @param {{ authorizeUrl: string, width?: number, height?: number, timeoutMs?: number }} options
 * @returns {Promise<{ code: string, state: string }>}
 */
export function openOAuthPopup({ authorizeUrl, width = 520, height = 700, timeoutMs = 300_000 }) {
  return new Promise((resolve, reject) => {
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;
    const popup = window.open(
      authorizeUrl,
      'reports-oauth',
      `width=${width},height=${height},left=${left},top=${top}`,
    );

    if (!popup) {
      reject(new Error('Popup blocked'));
      return;
    }

    let settled = false;

    function cleanup() {
      window.removeEventListener('message', onMessage);
      clearInterval(closedTimer);
      clearTimeout(timeout);
    }

    function finish(fn, arg) {
      if (settled) return;
      settled = true;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      fn(arg);
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'reports-oauth-callback') return;
      if (data.error) {
        finish(reject, new Error(String(data.error)));
        return;
      }
      if (!data.code || !data.state) {
        finish(reject, new Error('Invalid OAuth callback payload'));
        return;
      }
      finish(resolve, { code: String(data.code), state: String(data.state) });
    }

    window.addEventListener('message', onMessage);

    const closedTimer = setInterval(() => {
      if (popup.closed) finish(reject, new Error('OAuth popup closed'));
    }, 500);

    const timeout = setTimeout(() => {
      finish(reject, new Error('OAuth timeout'));
    }, timeoutMs);
  });
}

/**
 * @param {string} token
 * @param {Record<string, unknown>} [meta]
 */
export function saveToken(token, meta = {}) {
  // Memory only — strip refresh_token / id_token from meta
  const safeMeta = { ...meta };
  if (safeMeta.raw && typeof safeMeta.raw === 'object') {
    const { refresh_token, id_token, ...rest } = /** @type {Record<string, unknown>} */ (safeMeta.raw);
    safeMeta.raw = rest;
    void refresh_token;
    void id_token;
  }
  memoryToken = { token, meta: safeMeta, savedAt: Date.now() };
}

export function loadToken() {
  return memoryToken;
}

export function clearToken() {
  memoryToken = null;
  try {
    sessionStorage.removeItem('reports.oauth.token');
    sessionStorage.removeItem('reports.oauth.verifier');
    sessionStorage.removeItem('reports.oauth.state');
    sessionStorage.removeItem('reports.oauth.provider');
  } catch {
    /* ignore */
  }
}
