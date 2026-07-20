/**
 * @param {{ size?: number }} options
 */
export function createErrorCapture({ size = 50 } = {}) {
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
        message: ev.message || String(ev.error || 'Error'),
        stack: ev.error?.stack,
        source: ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined,
        ts: new Date().toISOString(),
      });
    };

    onRejection = (ev) => {
      const reason = ev.reason;
      push({
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
        source: 'unhandledrejection',
        ts: new Date().toISOString(),
      });
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
  }

  function stop() {
    if (!active || typeof window === 'undefined') return;
    if (onError) window.removeEventListener('error', onError);
    if (onRejection) window.removeEventListener('unhandledrejection', onRejection);
    onError = null;
    onRejection = null;
    active = false;
  }

  function snapshot() {
    return buffer.map((e) => ({ ...e }));
  }

  return { start, stop, snapshot };
}
