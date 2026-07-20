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
  let originalOpen = null;
  let originalSend = null;

  function push(entry) {
    buffer.push(entry);
    if (buffer.length > size) buffer.shift();
  }

  function start() {
    if (active || typeof window === 'undefined') return;
    active = true;

    if (typeof window.fetch === 'function') {
      originalFetch = window.fetch.bind(window);
      window.fetch = async (input, init = {}) => {
        const method = (init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();
        const url = redactUrl(typeof input === 'string' ? input : input.url || String(input));
        const started = performance.now();
        try {
          const response = await originalFetch(input, init);
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
    }

    if (typeof XMLHttpRequest !== 'undefined') {
      originalOpen = XMLHttpRequest.prototype.open;
      originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function (method, url, ...rest) {
        this.__rpMethod = String(method || 'GET').toUpperCase();
        this.__rpUrl = redactUrl(String(url));
        this.__rpStart = 0;
        return originalOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function (...args) {
        this.__rpStart = performance.now();
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
        return originalSend.apply(this, args);
      };
    }
  }

  function stop() {
    if (!active) return;
    if (originalFetch) window.fetch = originalFetch;
    if (originalOpen) XMLHttpRequest.prototype.open = originalOpen;
    if (originalSend) XMLHttpRequest.prototype.send = originalSend;
    originalFetch = null;
    originalOpen = null;
    originalSend = null;
    active = false;
  }

  function snapshot() {
    return buffer.map((e) => ({ ...e }));
  }

  return { start, stop, snapshot };
}
