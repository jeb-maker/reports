import { redactString, redactUrl } from '../redact.js';

/**
 * Capture failed fetch / XHR only. Never stores Authorization/Cookie/body.
 * @param {{ size?: number }} options
 */
export function createNetworkCapture({ size = 40 } = {}) {
  /** @type {{ method: string, url: string, status?: number, durationMs?: number, error?: string, ts: string }[]} */
  const buffer = [];
  let active = false;
  let originalFetch = null;
  let wrappedFetch = null;
  let originalOpen = null;
  let originalSend = null;
  let wrappedOpen = null;
  let wrappedSend = null;

  function push(entry) {
    buffer.push(entry);
    if (buffer.length > size) buffer.shift();
  }

  function start() {
    if (active || typeof window === 'undefined') return;
    active = true;

    if (typeof window.fetch === 'function') {
      originalFetch = window.fetch;
      wrappedFetch = async function reportsFetch(input, init = {}) {
        const method = (init.method || (typeof input === 'object' && input && input.method) || 'GET').toUpperCase();
        let rawUrl;
        if (typeof input === 'string') rawUrl = input;
        else if (input && typeof input === 'object' && typeof input.url === 'string') rawUrl = input.url;
        else rawUrl = String(input);
        const url = redactUrl(rawUrl);
        const started = performance.now();
        try {
          const response = await originalFetch.call(window, input, init);
          if (response.status >= 400) {
            push({
              method,
              url,
              status: response.status,
              durationMs: Math.round(performance.now() - started),
              ts: new Date().toISOString(),
            });
          }
          return response;
        } catch (err) {
          push({
            method,
            url,
            error: redactString(err?.message || String(err), 300),
            durationMs: Math.round(performance.now() - started),
            ts: new Date().toISOString(),
          });
          throw err;
        }
      };
      window.fetch = wrappedFetch;
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      originalOpen = XMLHttpRequest.prototype.open;
      originalSend = XMLHttpRequest.prototype.send;

      wrappedOpen = function reportsXhrOpen(method, url, ...rest) {
        this.__rpMethod = String(method || 'GET').toUpperCase();
        this.__rpUrl = redactUrl(String(url));
        this.__rpStart = 0;
        if (!this.__rpLoadendBound) {
          this.__rpLoadendBound = true;
          this.addEventListener('loadend', () => {
            const status = this.status;
            if (status === 0 || status >= 400) {
              push({
                method: this.__rpMethod || 'GET',
                url: this.__rpUrl || '',
                status: status || undefined,
                error: status === 0 ? 'network_error' : undefined,
                durationMs: this.__rpStart ? Math.round(performance.now() - this.__rpStart) : undefined,
                ts: new Date().toISOString(),
              });
            }
          });
        }
        return originalOpen.call(this, method, url, ...rest);
      };

      wrappedSend = function reportsXhrSend(...args) {
        this.__rpStart = performance.now();
        return originalSend.apply(this, args);
      };

      XMLHttpRequest.prototype.open = wrappedOpen;
      XMLHttpRequest.prototype.send = wrappedSend;
    }
  }

  function stop() {
    if (!active) return;
    if (wrappedFetch && window.fetch === wrappedFetch) window.fetch = originalFetch;
    if (wrappedOpen && XMLHttpRequest.prototype.open === wrappedOpen) {
      XMLHttpRequest.prototype.open = originalOpen;
    }
    if (wrappedSend && XMLHttpRequest.prototype.send === wrappedSend) {
      XMLHttpRequest.prototype.send = originalSend;
    }
    originalFetch = null;
    wrappedFetch = null;
    originalOpen = null;
    originalSend = null;
    wrappedOpen = null;
    wrappedSend = null;
    active = false;
  }

  function snapshot() {
    return buffer.map((e) => ({ ...e }));
  }

  return { start, stop, snapshot };
}
