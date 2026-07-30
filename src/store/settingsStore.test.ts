// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../types';

const mocks = vi.hoisted(() => ({
  updateSettings: vi.fn(),
  setAutostartEnabled: vi.fn(),
  invoke: vi.fn(),
  setSize: vi.fn(),
  setSizeConstraints: vi.fn(),
  setResizable: vi.fn(),
  setPosition: vi.fn(),
  innerSize: vi.fn(),
  scaleFactor: vi.fn(),
  currentMonitor: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('../api/tauri', () => ({
  api: {
    settings: { updateSettings: mocks.updateSettings },
    autostart: { setAutostartEnabled: mocks.setAutostartEnabled },
  },
}));

vi.mock('@tauri-apps/api/core', () => ({
  invoke: mocks.invoke,
}));

vi.mock('@tauri-apps/api/window', () => {
  class LogicalSize {
    constructor(
      public width: number,
      public height: number,
    ) {}
  }

  class PhysicalPosition {
    constructor(
      public x: number,
      public y: number,
    ) {}
  }

  return {
    getCurrentWindow: () => ({
      setSize: mocks.setSize,
      setSizeConstraints: mocks.setSizeConstraints,
      setResizable: mocks.setResizable,
      setPosition: mocks.setPosition,
      innerSize: mocks.innerSize,
      scaleFactor: mocks.scaleFactor,
    }),
    currentMonitor: mocks.currentMonitor,
    LogicalSize,
    PhysicalPosition,
  };
});

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
    mocks.invoke.mockResolvedValue(undefined);
    mocks.setSize.mockResolvedValue(undefined);
    mocks.setSizeConstraints.mockResolvedValue(undefined);
    mocks.setResizable.mockResolvedValue(undefined);
    mocks.setPosition.mockResolvedValue(undefined);
    mocks.innerSize.mockResolvedValue({
      toLogical: () => ({ width: 550, height: 1000 }),
    });
    mocks.scaleFactor.mockResolvedValue(1);
    mocks.currentMonitor.mockResolvedValue({
      position: { x: -1920, y: 0 },
      size: { width: 1920, height: 1080 },
      scaleFactor: 1.5,
    });
    localStorage.clear();
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
    expect(mocks.invoke).toHaveBeenCalledWith('set_window_topmost', { enabled: true });
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('stops the native topmost watchdog when window pinning is disabled', async () => {
    useSettingsStore.setState({
      settings: { ...defaultSettings, isPinned: true },
      loading: false,
    });

    await useSettingsStore.getState().toggleIsPinned();

    expect(useSettingsStore.getState().settings.isPinned).toBe(false);
    expect(mocks.invoke).toHaveBeenCalledWith('set_window_topmost', { enabled: false });
  });

  it('keeps the autostart error popup when the operation fails', async () => {
    mocks.setAutostartEnabled.mockResolvedValue({ success: false, error: 'permission denied' });

    await useSettingsStore.getState().toggleAutoStart();

    expect(mocks.toastError).toHaveBeenCalledWith('permission denied');
  });

  it('snaps to the current monitor using DPI-aware physical coordinates without a popup', async () => {
    useSettingsStore.setState({
      settings: {
        ...defaultSettings,
        isCollapsed: true,
        collapseMode: 'floating',
        useCapsuleMode: true,
      },
      loading: false,
    });

    await useSettingsStore.getState().setEdgeSnap(true, 'right');

    expect(mocks.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 30, height: 30 }),
    );
    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(1, null);
    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(2, {
      minWidth: 30,
      minHeight: 30,
      maxWidth: 30,
      maxHeight: 30,
    });
    expect(mocks.setPosition).toHaveBeenCalledWith(
      expect.objectContaining({ x: -45, y: 517 }),
    );
    expect(mocks.setSizeConstraints.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSize.mock.invocationCallOrder[0]);
    expect(mocks.setSize.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSizeConstraints.mock.invocationCallOrder[1]);
    expect(mocks.setSizeConstraints.mock.invocationCallOrder[1])
      .toBeLessThan(mocks.setPosition.mock.invocationCallOrder[0]);
    expect(useSettingsStore.getState().settings).toMatchObject({
      isEdgeSnapped: true,
      edgePosition: 'right',
    });
    expect(mocks.toastError).not.toHaveBeenCalled();
  });

  it.each([
    { useCapsuleMode: false, expectedSize: { width: 550, height: 65 } },
    { useCapsuleMode: true, expectedSize: { width: 60, height: 60 } },
  ])(
    'locks a collapsed size without changing the native resizable style',
    async ({ useCapsuleMode, expectedSize }) => {
      useSettingsStore.setState({
        settings: {
          ...defaultSettings,
          useCapsuleMode,
        },
        loading: false,
      });

      await useSettingsStore.getState().toggleIsCollapsed();

      expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(1, null);
      expect(mocks.setSize).toHaveBeenCalledWith(
        expect.objectContaining(expectedSize),
      );
      expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(2, {
        minWidth: expectedSize.width,
        minHeight: expectedSize.height,
        maxWidth: expectedSize.width,
        maxHeight: expectedSize.height,
      });
      expect(mocks.setResizable).not.toHaveBeenCalled();
      expect(mocks.setSizeConstraints.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.setSize.mock.invocationCallOrder[0]);
      expect(mocks.setSize.mock.invocationCallOrder[0])
        .toBeLessThan(mocks.setSizeConstraints.mock.invocationCallOrder[1]);
    },
  );

  it('restores expanded constraints without changing the native resizable style', async () => {
    localStorage.setItem(
      'expandedWindowSize',
      JSON.stringify({ width: 640, height: 840 }),
    );
    useSettingsStore.setState({
      settings: {
        ...defaultSettings,
        isCollapsed: true,
        collapseMode: 'floating',
        useCapsuleMode: true,
      },
      loading: false,
    });

    await useSettingsStore.getState().toggleIsCollapsed();

    expect(mocks.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 640, height: 840 }),
    );
    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(1, null);
    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(2, {
      minWidth: 400,
      minHeight: 700,
    });
    expect(mocks.setResizable).not.toHaveBeenCalled();
    expect(mocks.setSizeConstraints.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSize.mock.invocationCallOrder[0]);
    expect(mocks.setSize.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSizeConstraints.mock.invocationCallOrder[1]);
  });

  it('relocks the floating size after leaving edge snap', async () => {
    useSettingsStore.setState({
      settings: {
        ...defaultSettings,
        isCollapsed: true,
        collapseMode: 'floating',
        useCapsuleMode: true,
        isEdgeSnapped: true,
      },
      loading: false,
    });

    await useSettingsStore.getState().setEdgeSnap(false);

    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(1, null);
    expect(mocks.setSize).toHaveBeenCalledWith(
      expect.objectContaining({ width: 60, height: 60 }),
    );
    expect(mocks.setSizeConstraints).toHaveBeenNthCalledWith(2, {
      minWidth: 60,
      minHeight: 60,
      maxWidth: 60,
      maxHeight: 60,
    });
    expect(mocks.setSizeConstraints.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSize.mock.invocationCallOrder[0]);
    expect(mocks.setSize.mock.invocationCallOrder[0])
      .toBeLessThan(mocks.setSizeConstraints.mock.invocationCallOrder[1]);
  });
});
