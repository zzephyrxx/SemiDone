// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import LiquidGlassRuntime from './LiquidGlassRuntime';
import { useSettingsStore } from '../store/settingsStore';

const native = vi.hoisted(() => ({ setShadow: vi.fn(async (_enabled: boolean) => undefined) }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ setShadow: native.setShadow }) }));
vi.mock('../api/tauri', () => ({ isDesktopRuntime: true, api: {} }));
vi.mock('../platform/runtime', () => ({ isMacOS: true, FULL_WINDOW_SIZE: { width: 550, height: 800 }, FULL_WINDOW_MINIMUM: { width: 400, height: 500 } }));
vi.mock('../platform/distribution', () => ({ isAppStore: true }));
vi.mock('../ui/motion', () => ({ useReducedMotion: () => false }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });
it('toggles the native shadow without resizing when the preference changes', async () => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, windowShadowEnabled: true } }));
  render(<LiquidGlassRuntime />);
  await waitFor(() => expect(native.setShadow).toHaveBeenLastCalledWith(true));
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, windowShadowEnabled: false } })));
  await waitFor(() => expect(native.setShadow).toHaveBeenLastCalledWith(false));
  expect(native.setShadow).toHaveBeenCalledTimes(2);
});
