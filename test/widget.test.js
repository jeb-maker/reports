import { describe, it, expect, vi, afterEach } from 'vitest';
import { createUi } from '../src/ui/widget.js';
import { resolveI18n } from '../src/i18n/fr.js';

function makeUi(overrides = {}) {
  const onSubmit = overrides.onSubmit || vi.fn().mockResolvedValue({});
  const ui = createUi({
    i18n: resolveI18n(),
    onSubmit,
    ...overrides,
  });
  ui.mount();
  return { ui, onSubmit };
}

function shadow() {
  return document.getElementById('reports-root').shadowRoot;
}

afterEach(() => {
  document.getElementById('reports-root')?.remove();
});

describe('createUi', () => {
  it('mounts a shadow-DOM host with a FAB', () => {
    makeUi();
    const host = document.getElementById('reports-root');
    expect(host).toBeTruthy();
    expect(host.getAttribute('data-html2canvas-ignore')).toBe('true');
    expect(shadow().querySelector('.rp-fab')).toBeTruthy();
  });

  it('mount is idempotent', () => {
    const { ui } = makeUi();
    ui.mount();
    expect(document.querySelectorAll('#reports-root')).toHaveLength(1);
  });

  it('opens an accessible modal with the configured types', () => {
    const { ui } = makeUi({ types: ['bug', 'question'] });
    ui.open();
    const modal = shadow().querySelector('.rp-modal');
    expect(modal.getAttribute('role')).toBe('dialog');
    expect(modal.getAttribute('aria-modal')).toBe('true');
    const options = [...shadow().querySelectorAll('#rp-type option')].map((o) => o.value);
    expect(options).toEqual(['bug', 'question']);
  });

  it('escapes hostile i18n strings', () => {
    const { ui } = makeUi({ i18n: resolveI18n({ modalTitle: '<img src=x onerror=alert(1)>' }) });
    ui.open();
    expect(shadow().querySelector('#rp-title').innerHTML).not.toContain('<img');
  });

  it('shows an inline error when required fields are empty', async () => {
    const { ui, onSubmit } = makeUi();
    ui.open();
    shadow().querySelector('.rp-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await Promise.resolve();
    expect(onSubmit).not.toHaveBeenCalled();
    const status = shadow().querySelector('.rp-status');
    expect(status.hidden).toBe(false);
    expect(status.className).toContain('err');
  });

  it('submits trimmed values and shows success', async () => {
    const { ui, onSubmit } = makeUi();
    ui.open();
    const root = shadow();
    root.querySelector('#rp-title-input').value = '  Bug title  ';
    root.querySelector('#rp-message').value = 'Something broke';
    root.querySelector('#rp-email').value = 'a@b.co';
    root.querySelector('.rp-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce());

    expect(onSubmit).toHaveBeenCalledWith({
      type: 'bug',
      title: 'Bug title',
      message: 'Something broke',
      email: 'a@b.co',
      consentScreenshot: false,
    });
    await vi.waitFor(() => {
      const status = root.querySelector('.rp-status');
      expect(status.hidden).toBe(false);
      expect(status.className).toContain('ok');
    });
  });

  it('shows the adapter error message on failure', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('boom-adapter'));
    const { ui } = makeUi({ onSubmit });
    ui.open();
    const root = shadow();
    root.querySelector('#rp-title-input').value = 'T';
    root.querySelector('#rp-message').value = 'M';
    root.querySelector('.rp-form').dispatchEvent(new Event('submit', { cancelable: true }));
    await vi.waitFor(() => {
      const status = root.querySelector('.rp-status');
      expect(status.textContent).toBe('boom-adapter');
      expect(status.getAttribute('role')).toBe('alert');
    });
  });

  it('closes on Escape', () => {
    const { ui } = makeUi();
    ui.open();
    expect(shadow().querySelector('.rp-backdrop').hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(shadow().querySelector('.rp-backdrop').hidden).toBe(true);
  });

  it('shows the auth box when showAuth is set', () => {
    const { ui } = makeUi({
      showAuth: true,
      getAuthState: () => ({ connected: true, label: 'gitlab' }),
    });
    ui.open();
    const box = shadow().querySelector('.rp-auth');
    expect(box.hidden).toBe(false);
    expect(shadow().querySelector('.rp-auth-status').textContent).toContain('gitlab');
  });

  it('destroy removes the host and key listener', () => {
    const { ui } = makeUi();
    ui.open();
    ui.destroy();
    expect(document.getElementById('reports-root')).toBeNull();
    expect(() =>
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })),
    ).not.toThrow();
  });

  it('applies only valid theme colors', () => {
    const { ui } = makeUi({ theme: { primary: '#123456', primaryInk: 'url(javascript:1)' } });
    const host = document.getElementById('reports-root');
    expect(host.style.getPropertyValue('--rp-primary')).toBe('#123456');
    expect(host.style.getPropertyValue('--rp-primary-ink')).toBe('');
    ui.destroy();
  });
});
