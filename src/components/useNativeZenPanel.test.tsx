// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DEFAULT_ZEN_MODE_SETTINGS } from '../utils/zenModeSettings';

const native = vi.hoisted(() => ({ invoke: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@tauri-apps/api/core', () => ({ invoke: native.invoke }));
vi.mock('../api/tauri', () => ({ isDesktopRuntime: true }));
vi.mock('../platform/distribution', () => ({ isAppStore: true }));
import { useNativeZenPanel, type NativeZenAction } from './useNativeZenPanel';

const state = { appearance: DEFAULT_ZEN_MODE_SETTINGS, pinned: false, tasks: [{ id: 'a', title: '整理', busy: false }] };
function Panel({ paused = false, onAction }: { paused?: boolean; onAction: (value: NativeZenAction) => void }) {
  useNativeZenPanel(state, paused, onAction);
  return null;
}
afterEach(() => { cleanup(); document.body.innerHTML = ''; });

it('sends appearance and tasks, routes actions, and restores the webview for dialogs and exit', async () => {
  native.invoke.mockClear();
  const action = vi.fn();
  const view = render(<Panel onAction={action} />);
  await waitFor(() => expect(native.invoke).toHaveBeenCalledWith('set_native_zen_panel', { payload: JSON.stringify(state) }));
  act(() => window.dispatchEvent(new CustomEvent('semidone-native-zen', { detail: { action: 'task', taskId: 'a' } })));
  expect(action).toHaveBeenCalledWith({ action: 'task', taskId: 'a' });
  view.rerender(<Panel paused onAction={action} />);
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith('set_native_zen_panel', { payload: null }));
  view.rerender(<Panel onAction={action} />);
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith('set_native_zen_panel', { payload: JSON.stringify(state) }));
  const dialog = document.createElement('div'); dialog.setAttribute('aria-modal', 'true');
  document.body.appendChild(dialog);
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith('set_native_zen_panel', { payload: null }));
  dialog.remove();
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith('set_native_zen_panel', { payload: JSON.stringify(state) }));
  view.unmount();
  await waitFor(() => expect(native.invoke).toHaveBeenLastCalledWith('set_native_zen_panel', { payload: null }));
});
