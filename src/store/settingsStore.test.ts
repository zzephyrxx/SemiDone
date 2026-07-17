// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../types';

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  setAutostartEnabled: vi.fn(),
  setAlwaysOnTop: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../api/tauri', () => ({
  api: {
    settings: { updateSettings: mocks.updateSettings },
    autostart: { setAutostartEnabled: mocks.setAutostartEnabled },
  },
}));

vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ setAlwaysOnTop: mocks.setAlwaysOnTop }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

import { useSettingsStore } from './settingsStore';

const defaultSettings: Settings = {
  theme: 'light',
  notifications: true,
  autoSave: true,
  isPinned: false,
  isCollapsed: false,
  collapseMode: 'expanded',
  useCapsuleMode: false,
  transparentEnabled: false,
  transparentLevel: 100,
  isEdgeSnapped: false,
  edgePosition: 'right',
  autoStart: false,
};

describe('settings action notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateSettings.mockResolvedValue({ success: true, data: true });
    mocks.setAutostartEnabled.mockResolvedValue({ success: true, data: true });
    mocks.setAlwaysOnTop.mockResolvedValue(undefined);
    useSettingsStore.setState({ settings: { ...defaultSettings }, loading: false });
  });

  it('toggles capsule mode without a success popup', async () => {
    await useSettingsStore.getState().toggleCapsuleMode();

    expect(useSettingsStore.getState().settings.useCapsuleMode).toBe(true);
    expect(mocks.updateSettings).toHaveBeenCalledOnce();
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('toggles autostart without a success popup', async () => {
    await useSettingsStore.getState().toggleAutoStart();

    expect(useSettingsStore.getState().settings.autoStart).toBe(true);
    expect(mocks.setAutostartEnabled).toHaveBeenCalledWith(true);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('toggles window pinning without a success popup', async () => {
    await useSettingsStore.getState().toggleIsPinned();

    expect(useSettingsStore.getState().settings.isPinned).toBe(true);
    expect(mocks.setAlwaysOnTop).toHaveBeenCalledWith(true);
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('keeps the autostart error popup when the operation fails', async () => {
    mocks.setAutostartEnabled.mockResolvedValue({ success: false, error: 'permission denied' });

    await useSettingsStore.getState().toggleAutoStart();

    expect(mocks.toastError).toHaveBeenCalledWith('permission denied');
  });
});
