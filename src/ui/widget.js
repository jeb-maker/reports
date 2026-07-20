const STYLES = `
:host {
  all: initial;
  font-family: "DM Sans", "Segoe UI", sans-serif;
  --rp-primary: #0B6E4F;
  --rp-primary-ink: #063D2C;
  --rp-surface: #F7FAF8;
  --rp-ink: #14201B;
  --rp-muted: #5A6B63;
  --rp-danger: #B42318;
  --rp-radius: 14px;
  --rp-shadow: 0 18px 50px rgba(6, 61, 44, 0.18);
}

* { box-sizing: border-box; }

.rp-fab {
  position: fixed;
  right: 20px;
  bottom: 20px;
  z-index: 2147483000;
  border: 0;
  cursor: pointer;
  padding: 14px 18px;
  border-radius: 999px;
  background: var(--rp-primary);
  color: #fff;
  font: 600 14px/1 "DM Sans", sans-serif;
  letter-spacing: 0.02em;
  box-shadow: 0 10px 30px rgba(11, 110, 79, 0.35);
  transition: transform 160ms ease, box-shadow 160ms ease;
}
.rp-fab:hover { transform: translateY(-2px); box-shadow: 0 14px 34px rgba(11, 110, 79, 0.45); }
.rp-fab:focus-visible { outline: 3px solid #A8E6CF; outline-offset: 2px; }

.rp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2147483001;
  background:
    radial-gradient(1200px 600px at 10% -10%, rgba(11, 110, 79, 0.18), transparent 55%),
    radial-gradient(900px 500px at 100% 100%, rgba(20, 32, 27, 0.25), transparent 50%),
    rgba(10, 18, 14, 0.48);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px;
  animation: rp-fade 180ms ease;
}
@media (min-width: 640px) {
  .rp-backdrop { align-items: center; }
}

@keyframes rp-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes rp-rise {
  from { opacity: 0; transform: translateY(16px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

.rp-modal {
  width: min(440px, 100%);
  max-height: min(90vh, 720px);
  overflow: auto;
  background:
    linear-gradient(180deg, rgba(255,255,255,0.92), rgba(247,250,248,0.96)),
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(11,110,79,0.015) 3px);
  color: var(--rp-ink);
  border-radius: var(--rp-radius);
  box-shadow: var(--rp-shadow);
  border: 1px solid rgba(11, 110, 79, 0.12);
  padding: 22px 22px 18px;
  animation: rp-rise 220ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.rp-modal h2 {
  margin: 0 0 4px;
  font-family: "Source Serif 4", "Iowan Old Style", Georgia, serif;
  font-weight: 600;
  font-size: 1.45rem;
  color: var(--rp-primary-ink);
}

.rp-sub {
  margin: 0 0 18px;
  color: var(--rp-muted);
  font-size: 0.9rem;
}

.rp-field { margin-bottom: 12px; }
.rp-field label {
  display: block;
  font-size: 0.78rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--rp-muted);
  margin-bottom: 6px;
}
.rp-field input,
.rp-field select,
.rp-field textarea {
  width: 100%;
  border: 1px solid rgba(20, 32, 27, 0.14);
  border-radius: 10px;
  padding: 10px 12px;
  font: 15px/1.4 "DM Sans", sans-serif;
  background: rgba(255,255,255,0.9);
  color: var(--rp-ink);
}
.rp-field textarea { min-height: 110px; resize: vertical; }
.rp-field input:focus,
.rp-field select:focus,
.rp-field textarea:focus {
  outline: 2px solid rgba(11, 110, 79, 0.35);
  border-color: var(--rp-primary);
}

.rp-check {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 0.92rem;
  color: var(--rp-ink);
  margin: 8px 0 14px;
}
.rp-check input { margin-top: 3px; }

.rp-auth {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(11, 110, 79, 0.06);
  font-size: 0.88rem;
}
.rp-auth button {
  border: 0;
  background: transparent;
  color: var(--rp-primary);
  font-weight: 600;
  cursor: pointer;
  text-decoration: underline;
}

.rp-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 8px;
}
.rp-btn {
  border: 0;
  border-radius: 10px;
  padding: 10px 14px;
  font: 600 14px/1 "DM Sans", sans-serif;
  cursor: pointer;
}
.rp-btn[disabled] { opacity: 0.55; cursor: wait; }
.rp-btn-ghost {
  background: transparent;
  color: var(--rp-muted);
}
.rp-btn-primary {
  background: var(--rp-primary);
  color: #fff;
}

.rp-status {
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.9rem;
}
.rp-status.ok { background: rgba(11, 110, 79, 0.1); color: var(--rp-primary-ink); }
.rp-status.err { background: rgba(180, 35, 24, 0.08); color: var(--rp-danger); }

.rp-sr-only {
  position: absolute;
  width: 1px; height: 1px;
  padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0,0,0,0); border: 0;
}
`;

/**
 * @param {object} options
 */
export function createUi(options) {
  const {
    i18n,
    theme = {},
    types = ['bug', 'help', 'suggestion', 'question'],
    onSubmit,
    onConnect,
    onLogout,
    getAuthState,
    showAuth = false,
  } = options;

  const host = document.createElement('div');
  host.id = 'reports-root';
  host.setAttribute('data-html2canvas-ignore', 'true');
  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = STYLES;
  if (theme.primary) style.textContent += `:host { --rp-primary: ${theme.primary}; }`;
  if (theme.primaryInk) style.textContent += `:host { --rp-primary-ink: ${theme.primaryInk}; }`;
  shadow.appendChild(style);

  // Optional fonts
  if (!document.getElementById('reports-fonts')) {
    const link = document.createElement('link');
    link.id = 'reports-fonts';
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap';
    document.head.appendChild(link);
  }

  const fab = document.createElement('button');
  fab.type = 'button';
  fab.className = 'rp-fab';
  fab.textContent = i18n.buttonLabel;
  fab.setAttribute('aria-label', i18n.buttonLabel);
  shadow.appendChild(fab);

  /** @type {HTMLElement | null} */
  let backdrop = null;
  let open = false;

  function ensureModal() {
    if (backdrop) return backdrop;
    backdrop = document.createElement('div');
    backdrop.className = 'rp-backdrop';
    backdrop.setAttribute('role', 'presentation');
    backdrop.innerHTML = `
      <div class="rp-modal" role="dialog" aria-modal="true" aria-labelledby="rp-title">
        <h2 id="rp-title">${escapeHtml(i18n.modalTitle)}</h2>
        <p class="rp-sub">Décrivez le problème — le contexte technique sera joint automatiquement.</p>
        <div class="rp-auth" hidden>
          <span class="rp-auth-status"></span>
          <button type="button" class="rp-auth-btn"></button>
        </div>
        <form class="rp-form" novalidate>
          <div class="rp-field">
            <label for="rp-type">${escapeHtml(i18n.typeLabel)}</label>
            <select id="rp-type" name="type" required>
              ${types
                .map(
                  (t) =>
                    `<option value="${escapeHtml(t)}">${escapeHtml(i18n.types[t] || t)}</option>`,
                )
                .join('')}
            </select>
          </div>
          <div class="rp-field">
            <label for="rp-title-input">${escapeHtml(i18n.titleLabel)}</label>
            <input id="rp-title-input" name="title" required maxlength="200" />
          </div>
          <div class="rp-field">
            <label for="rp-message">${escapeHtml(i18n.messageLabel)}</label>
            <textarea id="rp-message" name="message" required maxlength="5000"></textarea>
          </div>
          <div class="rp-field">
            <label for="rp-email">${escapeHtml(i18n.emailLabel)}</label>
            <input id="rp-email" name="email" type="email" />
          </div>
          <label class="rp-check">
            <input type="checkbox" name="screenshot" />
            <span>${escapeHtml(i18n.screenshotConsent)}</span>
          </label>
          <div class="rp-actions">
            <button type="button" class="rp-btn rp-btn-ghost rp-cancel">${escapeHtml(i18n.cancelLabel)}</button>
            <button type="submit" class="rp-btn rp-btn-primary rp-submit">${escapeHtml(i18n.submitLabel)}</button>
          </div>
          <div class="rp-status" hidden></div>
        </form>
      </div>
    `;
    shadow.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) close();
    });
    backdrop.querySelector('.rp-cancel').addEventListener('click', () => close());
    backdrop.querySelector('.rp-form').addEventListener('submit', handleSubmit);
    backdrop.querySelector('.rp-auth-btn').addEventListener('click', async () => {
      const state = getAuthState?.() || {};
      try {
        if (state.connected) await onLogout?.();
        else await onConnect?.();
        refreshAuth();
      } catch (err) {
        showStatus('err', err?.message || i18n.error);
      }
    });

    return backdrop;
  }

  function refreshAuth() {
    if (!showAuth || !backdrop) return;
    const box = backdrop.querySelector('.rp-auth');
    const status = backdrop.querySelector('.rp-auth-status');
    const btn = backdrop.querySelector('.rp-auth-btn');
    box.hidden = false;
    const state = getAuthState?.() || {};
    status.textContent = state.connected
      ? `${i18n.connectedLabel}${state.label ? ` · ${state.label}` : ''}`
      : 'Non connecté au tracker';
    btn.textContent = state.connected ? i18n.logoutLabel : i18n.connectLabel;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    const form = /** @type {HTMLFormElement} */ (ev.target);
    const fd = new FormData(form);
    const title = String(fd.get('title') || '').trim();
    const message = String(fd.get('message') || '').trim();
    if (!title || !message) {
      showStatus('err', i18n.required);
      return;
    }

    const submitBtn = form.querySelector('.rp-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = i18n.sending;
    showStatus(null);

    try {
      await onSubmit({
        type: String(fd.get('type') || 'bug'),
        title,
        message,
        email: String(fd.get('email') || '').trim() || undefined,
        consentScreenshot: fd.get('screenshot') === 'on',
      });
      showStatus('ok', i18n.success);
      form.reset();
      setTimeout(() => close(), 1200);
    } catch (err) {
      showStatus('err', err?.message || i18n.error);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = i18n.submitLabel;
    }
  }

  function showStatus(kind, text) {
    if (!backdrop) return;
    const el = backdrop.querySelector('.rp-status');
    if (!kind) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    el.className = `rp-status ${kind}`;
    el.textContent = text;
  }

  function openModal() {
    ensureModal();
    refreshAuth();
    backdrop.hidden = false;
    open = true;
    backdrop.querySelector('#rp-title-input')?.focus();
  }

  function close() {
    if (backdrop) backdrop.hidden = true;
    open = false;
  }

  fab.addEventListener('click', () => (open ? close() : openModal()));

  function mount() {
    if (!document.body.contains(host)) document.body.appendChild(host);
  }

  function destroy() {
    host.remove();
    backdrop = null;
  }

  return {
    mount,
    open: openModal,
    close,
    destroy,
    get root() {
      return host;
    },
  };
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
