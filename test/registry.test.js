import { describe, it, expect, vi } from 'vitest';
import { registerAdapter, getAdapter, listAdapters, dispatch } from '../src/adapters/registry.js';

describe('adapter registry', () => {
  it('registers and retrieves adapters', () => {
    const fn = vi.fn();
    registerAdapter('custom-x', fn);
    expect(getAdapter('custom-x')).toBe(fn);
    expect(listAdapters()).toContain('custom-x');
  });

  it('rejects invalid registrations', () => {
    expect(() => registerAdapter('', () => {})).toThrow();
    expect(() => registerAdapter('name', null)).toThrow();
  });

  it('returns null for unknown adapters', () => {
    expect(getAdapter('nope-does-not-exist')).toBeNull();
  });

  it('dispatches to a function adapter directly', async () => {
    const adapter = vi.fn().mockResolvedValue({ ok: true });
    const report = { id: 'r1' };
    const config = { adapter };
    await expect(dispatch(report, config)).resolves.toEqual({ ok: true });
    expect(adapter).toHaveBeenCalledWith(report, config);
  });

  it('dispatches to a named adapter', async () => {
    const adapter = vi.fn().mockResolvedValue('sent');
    registerAdapter('custom-y', adapter);
    await expect(dispatch({ id: 'r2' }, { adapter: 'custom-y' })).resolves.toBe('sent');
  });

  it('throws a helpful error for unknown adapter names', async () => {
    await expect(dispatch({}, { adapter: 'ghost' })).rejects.toThrow(/Unknown adapter: ghost/);
  });
});
