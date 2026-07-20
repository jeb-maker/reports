/**
 * @param {{ size?: number, redact: (s: string, max?: number) => string }} options
 */
export function createConsoleCapture({ size = 100, redact }) {
  /** @type {{ level: string, message: string, ts: string }[]} */
  const buffer = [];
  const levels = ['log', 'info', 'warn', 'error'];
  /** @type {Record<string, Function>} */
  const originals = {};
  /** @type {Record<string, Function>} */
  const wrappers = {};
  let active = false;

  function serializeArgs(args) {
    return args
      .map((arg) => {
        if (typeof arg === 'string') return redact(arg);
        if (arg && typeof arg === 'object' && typeof arg.message === 'string') {
          return redact(`${arg.name || 'Error'}: ${arg.message}\n${arg.stack || ''}`);
        }
        try {
          return redact(JSON.stringify(arg));
        } catch {
          return redact(String(arg));
        }
      })
      .join(' ');
  }

  function push(level, args) {
    buffer.push({
      level,
      message: serializeArgs(args),
      ts: new Date().toISOString(),
    });
    if (buffer.length > size) buffer.shift();
  }

  function start() {
    if (active || typeof console === 'undefined') return;
    active = true;
    for (const level of levels) {
      originals[level] = console[level];
      wrappers[level] = (...args) => {
        try {
          push(level, args);
        } catch {
          /* ignore */
        }
        return originals[level].apply(console, args);
      };
      console[level] = wrappers[level];
    }
  }

  function stop() {
    if (!active) return;
    for (const level of levels) {
      if (console[level] === wrappers[level]) {
        console[level] = originals[level];
      }
    }
    active = false;
  }

  function snapshot() {
    return buffer.map((entry) => ({ ...entry }));
  }

  return { start, stop, snapshot };
}
