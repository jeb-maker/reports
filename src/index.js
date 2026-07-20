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
import { dispatch } from './adapters/index.js';
import { connectOAuth, clearToken, loadToken } from './oauth/providers.js';

/** @typedef {object} ReportPayload */

let state = null;

/**
 * @param {Record<string, unknown>} config
 */
export function init(config = {}) {
  if (state) destroy();

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
    ...config,
  };

  const i18n = resolveI18n(cfg.i18n || cfg.labels);

  const consoleCap = createConsoleCapture({
    size: cfg.consoleBufferSize,
    redact: redactString,
  });
  const errorCap = createErrorCapture();
  const networkCap = createNetworkCapture();

  if (cfg.consoleCapture !== false) consoleCap.start();
  errorCap.start();
  if (cfg.networkCapture !== false) networkCap.start();

  const showAuth = needsAuthUi(cfg);

  const ui = createUi({
    i18n,
    theme: cfg.theme,
    types: cfg.types,
    showAuth,
    getAuthState: () => {
      const tok = loadToken();
      return { connected: Boolean(tok?.token), label: tok?.meta?.provider };
    },
    onConnect: () => connect(cfg),
    onLogout: () => logout(),
    onSubmit: (form) => submitReport(form, cfg, { consoleCap, errorCap, networkCap, ui }),
  });

  ui.mount();

  state = { cfg, ui, consoleCap, errorCap, networkCap };
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

export function destroy() {
  if (!state) return;
  state.consoleCap.stop();
  state.errorCap.stop();
  state.networkCap.stop();
  state.ui.destroy();
  clearToken();
  state = null;
}

/**
 * Build + send a report programmatically.
 * @param {object} form
 */
export async function submit(form) {
  const s = ensureReady();
  return submitReport(form, s.cfg, s);
}

async function submitReport(form, cfg, caps) {
  const context = collectContext();
  let metadata = {};
  try {
    metadata = typeof cfg.metadata === 'function' ? await cfg.metadata() : cfg.metadata || {};
  } catch {
    metadata = { error: 'metadata() failed' };
  }

  /** @type {ReportPayload} */
  const report = {
    schemaVersion: 1,
    id: crypto.randomUUID?.() || `rp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: new Date().toISOString(),
    type: form.type || 'bug',
    title: form.title || '',
    message: form.message || '',
    email: form.email,
    consentScreenshot: Boolean(form.consentScreenshot),
    ...context,
    console: caps.consoleCap.snapshot(),
    errors: caps.errorCap.snapshot(),
    network: caps.networkCap.snapshot(),
    // Reserved for post-V1 action trail
    actions: [],
    metadata,
    screenshot: { status: 'skipped' },
  };

  const shotEnabled = cfg.screenshot?.enabled !== false;
  const needsConsent = cfg.screenshot?.requireConsent !== false;
  const wantsShot = shotEnabled && (!needsConsent || form.consentScreenshot);

  if (wantsShot) {
    report.screenshot = await captureScreenshot({
      maxBytes: cfg.screenshot?.maxBytes || 400_000,
      ignoreRoot: caps.ui?.root || null,
    });
  }

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
};

// UMD / IIFE global
if (typeof window !== 'undefined') {
  window.Reports = Reports;
}
