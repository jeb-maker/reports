import { assertNoHardcodedSecrets, redactString } from './redact.js';
import {
  collectContext,
  createConsoleCapture,
  createErrorCapture,
  createNetworkCapture,
  captureScreenshot,
} from './collect/index.js';
import { resolveI18n } from './i18n/fr.js';
import { createUi } from './ui/widget.js';
import { dispatch, registerAdapter, getAdapter, listAdapters } from './adapters/registry.js';
import { connectOAuth, clearToken, loadToken } from './oauth/providers.js';

/** @typedef {object} ReportPayload */

let state = null;
let epoch = 0;

/**
 * Core entry — no built-in adapters bundled.
 * Pass `adapter: sendJira` (function) or `registerAdapter('jira', sendJira)` then `adapter: 'jira'`.
 * @param {Record<string, unknown>} config
 */
export function init(config = {}) {
  assertNoHardcodedSecrets(config);

  const cfg = {
    types: ['bug', 'help', 'suggestion', 'question'],
    locale: 'fr',
    theme: { primary: '#0B6E4F' },
    adapter: 'webhook',
    screenshot: { enabled: true, requireConsent: true, maxBytes: 400_000 },
    consoleCapture: true,
    consoleBufferSize: 100,
    networkCapture: true,
    errorCapture: true,
    loadGoogleFonts: false,
    ...config,
  };

  const i18n = resolveI18n(cfg.i18n || cfg.labels);
  const showAuth = needsAuthUi(cfg);
  const myEpoch = ++epoch;

  const consoleCap = createConsoleCapture({
    size: cfg.consoleBufferSize,
    redact: redactString,
  });
  const errorCap = createErrorCapture({
    size: cfg.errorBufferSize || 50,
    redact: redactString,
  });
  const networkCap = createNetworkCapture();

  const ui = createUi({
    i18n,
    theme: cfg.theme,
    types: cfg.types,
    showAuth,
    loadGoogleFonts: cfg.loadGoogleFonts === true,
    getAuthState: () => {
      const tok = loadToken();
      return { connected: Boolean(tok?.token), label: tok?.meta?.provider };
    },
    onConnect: () => connect(cfg),
    onLogout: () => logout(),
    onSubmit: (form) => submitReport(form, cfg, { consoleCap, errorCap, networkCap, ui, epoch: myEpoch }),
  });

  if (state) {
    state.consoleCap.stop();
    state.errorCap.stop();
    state.networkCap.stop();
    state.ui.destroy();
  }

  if (cfg.consoleCapture !== false) consoleCap.start();
  if (cfg.errorCapture !== false) errorCap.start();
  if (cfg.networkCapture !== false) networkCap.start();

  state = { cfg, ui, consoleCap, errorCap, networkCap, epoch: myEpoch };
  ui.mount();
  return Reports;
}

function needsAuthUi(cfg) {
  const name = typeof cfg.adapter === 'string' ? cfg.adapter : '';
  const block = cfg[name];
  if (!block || typeof block !== 'object') return false;
  return block.auth === 'oauth' || block.auth === 'token';
}

/**
 * @param {Record<string, unknown>} [cfg]
 */
export async function connect(cfg) {
  const c = cfg || state?.cfg;
  if (!c) throw new Error('Reports.init() required');
  const name = typeof c.adapter === 'string' ? c.adapter : '';
  const block = c[name] || {};

  if (block.clientSecret || block.client_secret) {
    throw new Error('[Reports] clientSecret is forbidden in the browser.');
  }

  if (typeof block.getAccessToken === 'function') {
    const token = await block.getAccessToken();
    if (!token) throw new Error('getAccessToken() returned empty');
    return token;
  }

  if (block.auth !== 'oauth') {
    throw new Error('connect() requires auth: "oauth" or getAccessToken()');
  }

  let providerKey = name;
  if (name === 'jira') {
    if (block.variant !== 'datacenter') {
      throw new Error(
        'Jira Cloud OAuth token exchange needs your host app (client secret). Provide getAccessToken() after your app exchanges the code, or use auth: "url". PKCE connect() works for variant: "datacenter".',
      );
    }
    providerKey = 'jiraDatacenter';
  }
  if (name === 'github') {
    throw new Error(
      'GitHub OAuth requires a host endpoint (client secret). Use auth: "url" or getAccessToken().',
    );
  }

  return connectOAuth(providerKey, block);
}

export function logout() {
  clearToken();
}

export function open() {
  ensureReady().ui.open();
}

export function close() {
  ensureReady().ui.close();
}

/**
 * @param {{ clearAuth?: boolean }} [opts]
 */
export function destroy(opts = {}) {
  if (!state) return;
  state.consoleCap.stop();
  state.errorCap.stop();
  state.networkCap.stop();
  state.ui.destroy();
  if (opts.clearAuth) clearToken();
  state = null;
}

/**
 * @param {object} form
 */
export async function submit(form) {
  const s = ensureReady();
  const payload =
    typeof HTMLFormElement !== 'undefined' && form instanceof HTMLFormElement
      ? Object.fromEntries(new FormData(form))
      : form;
  return submitReport(payload, s.cfg, { ...s, epoch: s.epoch });
}

async function submitReport(form, cfg, caps) {
  const startedEpoch = caps.epoch;
  const isStale = () => !state || state.epoch !== startedEpoch;

  let metadata = {};
  try {
    const metaPromise =
      typeof cfg.metadata === 'function' ? Promise.resolve(cfg.metadata()) : Promise.resolve(cfg.metadata || {});
    metadata = await Promise.race([
      metaPromise,
      new Promise((_, rej) => setTimeout(() => rej(new Error('metadata_timeout')), 3000)),
    ]);
  } catch (err) {
    metadata = { error: err?.message === 'metadata_timeout' ? 'metadata_timeout' : 'metadata() failed' };
  }

  if (metadata && typeof metadata === 'object') {
    try {
      metadata = JSON.parse(redactString(JSON.stringify(metadata), 8000));
    } catch {
      metadata = { error: 'metadata_redact_failed' };
    }
  }

  if (isStale()) throw new Error('Submit aborted (widget destroyed)');

  const context = collectContext();
  const id =
    globalThis.crypto?.randomUUID?.() || `rp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  /** @type {ReportPayload} */
  const report = {
    schemaVersion: 1,
    id,
    createdAt: new Date().toISOString(),
    type: form.type || 'bug',
    title: redactString(form.title || '', 500),
    message: redactString(form.message || '', 5000),
    email: form.email ? String(form.email).trim() : undefined,
    consentScreenshot: Boolean(form.consentScreenshot),
    ...context,
    console: caps.consoleCap.snapshot(),
    errors: caps.errorCap.snapshot(),
    network: caps.networkCap.snapshot(),
    actions: [],
    metadata,
    screenshot: { status: 'skipped' },
  };

  const shotEnabled = cfg.screenshot?.enabled !== false;
  const needsConsent = cfg.screenshot?.requireConsent !== false;
  const wantsShot = shotEnabled && (!needsConsent || form.consentScreenshot);

  if (wantsShot) {
    if (isStale()) throw new Error('Submit aborted (widget destroyed)');
    report.screenshot = await captureScreenshot({
      maxBytes: cfg.screenshot?.maxBytes || 400_000,
      ignoreRoot: caps.ui?.root || null,
      html2canvas: cfg.screenshot?.html2canvas || null,
    });
  }

  if (isStale()) throw new Error('Submit aborted (widget destroyed)');
  return dispatch(report, cfg);
}

function ensureReady() {
  if (!state) throw new Error('Call Reports.init(config) first');
  return state;
}

export const Reports = {
  init,
  open,
  close,
  destroy,
  connect,
  logout,
  submit,
  registerAdapter,
  listAdapters,
};

export { registerAdapter, getAdapter, listAdapters, dispatch };

export default Reports;
