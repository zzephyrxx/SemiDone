// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePinnedWindowGuard } from './usePinnedWindowGuard';

const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  onFocusChanged: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({
    onFocusChanged: mocks.onFocusChanged,
  }),
}));

function Harness({ isPinned }: { isPinned: boolean }) {
  usePinnedWindowGuard(isPinned);
  return null;
}

beforeEach(() => {
  vi.useFakeTimers();
  mocks.invoke.mockReset();
  mocks.invoke.mockResolvedValue(undefined);
  mocks.onFocusChanged.mockReset();
  mocks.onFocusChanged.mockResolvedValue(vi.fn());
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('usePinnedWindowGuard', () => {
  it('reasserts native topmost state after a pinned window becomes visible again', async () => {
    render(<Harness isPinned />);

    await act(async () => {
      vi.advanceTimersByTime(80);
    });
    expect(mocks.invoke).toHaveBeenCalledOnce();
    expect(mocks.invoke).toHaveBeenLastCalledWith('reassert_window_topmost');

    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      vi.advanceTimersByTime(80);
    });
    expect(mocks.invoke).toHaveBeenCalledTimes(2);
  });

  it('debounces duplicate browser and native focus events into one restore', async () => {
    let focusListener: ((event: { payload: boolean }) => void) | undefined;
    mocks.onFocusChanged.mockImplementation(async (listener) => {
      focusListener = listener;
      return vi.fn();
    });
    render(<Harness isPinned />);

    await act(async () => {
      await Promise.resolve();
      window.dispatchEvent(new Event('focus'));
      focusListener?.({ payload: true });
      vi.advanceTimersByTime(80);
    });

    expect(mocks.invoke).toHaveBeenCalledOnce();
  });

  it('cancels a queued reassert as soon as window pinning is disabled', async () => {
    const { rerender } = render(<Harness isPinned />);

    rerender(<Harness isPinned={false} />);
    await act(async () => {
      await Promise.resolve();
      vi.advanceTimersByTime(200);
    });

    expect(mocks.invoke).not.toHaveBeenCalled();
  });
  it('does not install restore behavior while window pinning is disabled', async () => {
    render(<Harness isPinned={false} />);

    window.dispatchEvent(new Event('focus'));
    document.dispatchEvent(new Event('visibilitychange'));
    await act(async () => {
      vi.advanceTimersByTime(200);
    });

    expect(mocks.onFocusChanged).not.toHaveBeenCalled();
    expect(mocks.invoke).not.toHaveBeenCalled();
  });
});
