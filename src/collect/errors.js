/**
 * @param {{ size?: number, redact?: (s: string, max?: number) => string }} options
 */
export function createErrorCapture({ size = 50, redact = (s) => s } = {}) {
  /** @type {{ message: string, stack?: string, source?: string, ts: string }[]} */
  const buffer = [];
  /** @type {((ev: ErrorEvent) => void) | null} */
  let onError = null;
  /** @type {((ev: PromiseRejectionEvent) => void) | null} */
  let onRejection = null;
  let active = false;

  function push(entry) {
    buffer.push(entry);
    if (buffer.length > size) buffer.shift();
  }

  function start() {
    if (active || typeof window === 'undefined') return;
    active = true;

    onError = (ev) => {
      push({
        message: redact(ev.message || String(ev.error || 'Error'), 4000),
        stack: ev.error?.stack ? redact(ev.error.stack, 4000) : undefined,
        source: ev.filename ? redact(`${ev.filename}:${ev.lineno}:${ev.colno}`, 500) : undefined,
        ts: new Date().toISOString(),
      });
    };

    onRejection = (ev) => {
      const reason = ev.reason;
      let message;
      let stack;
      if (reason && typeof reason === 'object' && typeof reason.message === 'string') {
        message = reason.message;
        stack = reason.stack;
      } else {
        try {
          message = typeof reason === 'string' ? reason : JSON.stringify(reason);
        } catch {
          message = String(reason);
        }
      }
      push({
        message: redact(message, 4000),
        stack: stack ? redact(stack, 4000) : undefined,
        source: 'unhandledrejection',
        ts: new Date().toISOString(),
      });
    };

    window.addEventListener('error', onError, true);
    window.addEventListener('unhandledrejection', onRejection, true);
  }

  function stop() {
    if (!active || typeof window === 'undefined') return;
    if (onError) window.removeEventListener('error', onError, true);
    if (onRejection) window.removeEventListener('unhandledrejection', onRejection, true);
    onError = null;
    onRejection = null;
    active = false;
  }

  function snapshot() {
    return buffer.map((e) => ({ ...e }));
  }

  return { start, stop, snapshot };
}
