/**
 * Auto-report uncaught JS errors and unhandled promise rejections.
 *
 * Guards against noisy pages: reports are deduplicated by error signature,
 * throttled by a cooldown, and capped per session. The submit callback is
 * awaited with a catch-all so a failing adapter can never re-trigger the
 * reporter (which would loop).
 *
 * @param {object} options
 * @param {(error: { message: string, stack?: string, source?: string }) => Promise<unknown>} options.submit
 * @param {number} [options.maxPerSession] Max auto-reports per page session.
 * @param {number} [options.cooldownMs] Minimum delay between two auto-reports.
 */
export function createAutoReporter({ submit, maxPerSession = 5, cooldownMs = 30_000 }) {
  /** @type {Set<string>} */
  const seen = new Set();
  let sentCount = 0;
  let lastSentAt = 0;
  let inFlight = false;
  let active = false;
  /** @type {((ev: ErrorEvent) => void) | null} */
  let onError = null;
  /** @type {((ev: PromiseRejectionEvent) => void) | null} */
  let onRejection = null;

  async function maybeSubmit(message, stack, source) {
    if (!message || inFlight || sentCount >= maxPerSession) return;
    if (sentCount > 0 && Date.now() - lastSentAt < cooldownMs) return;
    const signature = `${message}|${source || ''}`.slice(0, 300);
    if (seen.has(signature)) return;
    seen.add(signature);

    inFlight = true;
    sentCount += 1;
    lastSentAt = Date.now();
    try {
      await submit({ message, stack, source });
    } catch {
      /* never throw from the auto-reporter */
    } finally {
      inFlight = false;
    }
  }

  function start() {
    if (active || typeof window === 'undefined') return;
    active = true;

    onError = (ev) => {
      // Resource load errors have neither message nor error — skip them.
      const message = ev.message || ev.error?.message;
      if (!message) return;
      maybeSubmit(
        String(message),
        ev.error?.stack,
        ev.filename ? `${ev.filename}:${ev.lineno}:${ev.colno}` : undefined,
      );
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
      if (!message) return;
      maybeSubmit(message, stack, 'unhandledrejection');
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

  return { start, stop };
}
