/**
 * @param {unknown[]} args
 * @param {(s: string, max?: number) => string} redact
 */
function serializeArgs(args, redact) {
  return args
    .map((arg) => {
      if (typeof arg === 'string') return redact(arg);
      if (arg instanceof Error) return redact(`${arg.name}: ${arg.message}\n${arg.stack || ''}`);
      try {
        return redact(JSON.stringify(arg));
      } catch {
        return redact(String(arg));
      }
    })
    .join(' ');
}

/**
 * @param {{ size?: number, redact: (s: string, max?: number) => string }} options
 */
export function createConsoleCapture({ size = 100, redact }) {
  /** @type {{ level: string, message: string, ts: string }[]} */
  const buffer = [];
  const levels = ['log', 'info', 'warn', 'error'];
  /** @type {Record<string, Function>} */
  const originals = {};
  let active = false;

  function push(level, args) {
    buffer.push({
      level,
      message: serializeArgs(args, redact),
      ts: new Date().toISOString(),
    });
    if (buffer.length > size) buffer.shift();
  }

  function start() {
    if (active || typeof console === 'undefined') return;
    active = true;
    for (const level of levels) {
      originals[level] = console[level];
      console[level] = (...args) => {
        try {
          push(level, args);
        } catch {
          /* ignore capture errors */
        }
        return originals[level].apply(console, args);
      };
    }
  }

  function stop() {
    if (!active) return;
    for (const level of levels) {
      if (originals[level]) console[level] = originals[level];
    }
    active = false;
  }

  function snapshot() {
    return buffer.map((entry) => ({ ...entry }));
  }

  return { start, stop, snapshot };
}
