// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useNativePinMode } from './useNativePinMode';

const invoke = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock('@tauri-apps/api/core', () => ({ invoke }));
afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers(); });

describe('native pin view synchronization', () => {
  it('switches tool-window eligibility on view changes without changing the pin choice', () => {
    const { rerender } = renderHook(({ compact }) => useNativePinMode(compact), {
      initialProps: { compact: false },
    });
    expect(invoke).toHaveBeenLastCalledWith('set_window_pin_mode', { compact: false });
    rerender({ compact: true });
    expect(invoke).toHaveBeenLastCalledWith('set_window_pin_mode', { compact: true });
    rerender({ compact: false });
    expect(invoke).toHaveBeenLastCalledWith('set_window_pin_mode', { compact: false });
    expect(invoke).toHaveBeenCalledTimes(3);
  });

  it('does not keep issuing pin-enable commands from background browser timers', () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useNativePinMode(true));
    act(() => vi.advanceTimersByTime(10_000));
    expect(invoke).toHaveBeenCalledOnce();
    unmount();
    act(() => vi.advanceTimersByTime(10_000));
    expect(invoke).toHaveBeenCalledOnce();
  });
});
