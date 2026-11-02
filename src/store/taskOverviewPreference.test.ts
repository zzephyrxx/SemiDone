// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const key = 'semidone-overview-collapsed';

beforeEach(() => { localStorage.clear(); vi.resetModules(); });
afterEach(() => { vi.restoreAllMocks(); localStorage.clear(); });

describe('task overview preference', () => {
  it.each([true, false])('restores collapsed=%s after the store is recreated', async collapsed => {
    const { useTaskStore } = await import('./taskStore');
    useTaskStore.getState().setStatsBarCollapsed(!collapsed);
    useTaskStore.getState().setStatsBarCollapsed(collapsed);
    vi.resetModules();
    const restarted = await import('./taskStore');
    expect(restarted.useTaskStore.getState().statsBarCollapsed).toBe(collapsed);
  });

  it.each([null, 'invalid'])('defaults to expanded when the preference is %s', async saved => {
    if (saved !== null) localStorage.setItem(key, saved);
    const { useTaskStore } = await import('./taskStore');
    expect(useTaskStore.getState().statsBarCollapsed).toBe(false);
  });

  it('keeps toggling available when storage cannot be read or written', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Unavailable'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Unavailable'); });
    const { useTaskStore } = await import('./taskStore');
    expect(useTaskStore.getState().statsBarCollapsed).toBe(false);
    useTaskStore.getState().setStatsBarCollapsed(true);
    expect(useTaskStore.getState().statsBarCollapsed).toBe(true);
    useTaskStore.getState().setStatsBarCollapsed(false);
    expect(useTaskStore.getState().statsBarCollapsed).toBe(false);
  });
});
