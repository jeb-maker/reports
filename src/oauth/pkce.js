/**
 * PKCE helpers for public OAuth clients (e.g. Jira Data Center).
 */

function base64UrlEncode(buffer) {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function randomString(length = 64) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const values = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(values, (v) => chars[v % chars.length]).join('');
}

export async function createPkcePair() {
  const verifier = randomString(64);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  const challenge = base64UrlEncode(digest);
  return { verifier, challenge, method: 'S256' };
}

/**
 * @param {{ authorizeUrl: string, width?: number, height?: number }} options
 * @returns {Promise<{ code: string, state: string }>}
 */
export function openOAuthPopup({ authorizeUrl, width = 520, height = 700 }) {
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

    const expectedOrigin = (() => {
      try {
        return new URL(authorizeUrl).origin;
      } catch {
        return null;
      }
    })();

    function cleanup() {
      window.removeEventListener('message', onMessage);
      clearInterval(timer);
    }

    function onMessage(event) {
      if (event.origin !== window.location.origin) return;
      const data = event.data;
      if (!data || data.type !== 'reports-oauth-callback') return;
      cleanup();
      try {
        popup.close();
      } catch {
        /* ignore */
      }
      if (data.error) reject(new Error(data.error));
      else resolve({ code: data.code, state: data.state });
    }

    window.addEventListener('message', onMessage);

    const timer = setInterval(() => {
      if (popup.closed) {
        cleanup();
        reject(new Error('OAuth popup closed'));
      }
    }, 500);

    // unused but keeps expectedOrigin referenced for future origin checks on redirect pages
    void expectedOrigin;
  });
}

const TOKEN_KEY = 'reports.oauth.token';

export function saveToken(token, meta = {}) {
  try {
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({ token, meta, savedAt: Date.now() }));
  } catch {
    /* ignore */
  }
}

export function loadToken() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}
