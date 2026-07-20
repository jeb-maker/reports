import { describe, it, expect } from 'vitest';
import { fr, resolveI18n } from '../src/i18n/fr.js';

describe('resolveI18n', () => {
  it('returns the French defaults without overrides', () => {
    const i18n = resolveI18n();
    expect(i18n.buttonLabel).toBe(fr.buttonLabel);
    expect(i18n.types.bug).toBe(fr.types.bug);
  });

  it('deep merges overrides without mutating defaults', () => {
    const i18n = resolveI18n({ buttonLabel: 'Report', types: { bug: 'Bug!' } });
    expect(i18n.buttonLabel).toBe('Report');
    expect(i18n.types.bug).toBe('Bug!');
    expect(i18n.types.help).toBe(fr.types.help);
    expect(fr.buttonLabel).toBe('Signaler');
    expect(fr.types.bug).toBe('Problème / bug');
  });

  it('ignores undefined overrides', () => {
    const i18n = resolveI18n({ buttonLabel: undefined });
    expect(i18n.buttonLabel).toBe(fr.buttonLabel);
  });
});
