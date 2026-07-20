/** @type {Map<string, Function>} */
const registry = new Map();

/**
 * Register a named adapter for use with `adapter: 'name'`.
 * @param {string} name
 * @param {(report: object, config: object) => Promise<unknown>} fn
 */
export function registerAdapter(name, fn) {
  if (!name || typeof fn !== 'function') {
    throw new Error('registerAdapter(name, fn) requires a string name and a function');
  }
  registry.set(name, fn);
}

/**
 * @param {string} name
 */
export function getAdapter(name) {
  return registry.get(name) || null;
}

export function listAdapters() {
  return [...registry.keys()];
}

/**
 * @param {object} report
 * @param {Record<string, unknown>} config
 */
export async function dispatch(report, config) {
  const adapter = config.adapter;

  if (typeof adapter === 'function') {
    return adapter(report, config);
  }

  const name = typeof adapter === 'string' ? adapter : 'webhook';
  const fn = registry.get(name);
  if (!fn) {
    const known = [...registry.keys()];
    const hint =
      known.length === 0
        ? 'No adapters registered. Import from @jeb-maker/reports (full) or registerAdapter() / pass adapter as a function.'
        : `Known: ${known.join(', ')}`;
    throw new Error(`Unknown adapter: ${name}. ${hint}`);
  }
  return fn(report, config);
}
