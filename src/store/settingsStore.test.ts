// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../types';

const mocks = vi.hoisted(() => ({
  getSettings: vi.fn(),
  setZenWindowMode: vi.fn(),
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
    settings: { getSettings: mocks.getSettings, updateSettings: mocks.updateSettings },
    autostart: { setAutostartEnabled: mocks.setAutostartEnabled },
  },
}));

vi.mock('../services/zenWindowService', () => ({ setZenWindowMode: mocks.setZenWindowMode }));

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
  liquidGlass: {
    enabled: true,
    blur: 6,
    refraction: 42,
    dispersion: true,
  },
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
    mocks.setZenWindowMode.mockResolvedValue(undefined);
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

  it('updates liquid glass immediately and persists normalized values', async () => {
    await useSettingsStore.getState().setLiquidGlass({
      blur: 99,
      refraction: -5,
      dispersion: false,
    });

    expect(useSettingsStore.getState().settings.liquidGlass).toEqual({
      enabled: true,
      blur: 10,
      refraction: 0,
      dispersion: false,
    });
    expect(mocks.updateSettings).toHaveBeenCalledWith(
      expect.objectContaining({
        liquidGlass: {
          enabled: true,
          blur: 10,
          refraction: 0,
          dispersion: false,
        },
      }),
    );
    expect(mocks.toastSuccess).not.toHaveBeenCalled();
  });

  it('loads older settings with a disabled default Zen mode', async () => {
    mocks.getSettings.mockResolvedValue({ success: true, data: defaultSettings });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({
      enabled: false, backgroundOpacity: 65, rowOpacity: 8,
    });
  });

  it('serializes rapid appearance updates and retains the latest colors and mode', async () => {
    let finishFirst!: (value: { success: boolean }) => void;
    mocks.updateSettings.mockImplementationOnce(() => new Promise((resolve) => { finishFirst = resolve; }));
    const first = useSettingsStore.getState().setZenMode({ enabled: true, textColor: '#112233' });
    await vi.waitFor(() => expect(mocks.updateSettings).toHaveBeenCalledTimes(1));
    const second = useSettingsStore.getState().setZenMode({ textColor: '#aabbcc', backgroundOpacity: 0 });
    expect(mocks.updateSettings).toHaveBeenCalledTimes(1);
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({
      enabled: true, textColor: '#aabbcc', backgroundOpacity: 0,
    });
    finishFirst({ success: true });
    await Promise.all([first, second]);
    expect(mocks.updateSettings).toHaveBeenLastCalledWith(expect.objectContaining({
      zenMode: expect.objectContaining({ enabled: true, textColor: '#aabbcc', backgroundOpacity: 0 }),
    }));
  });

  it('rolls back failed zen-mode saves while preserving an unrelated setting change', async () => {
    mocks.updateSettings.mockResolvedValue({ success: false, error: '磁盘写入失败' });
    const save = useSettingsStore.getState().setZenMode({ enabled: true });
    useSettingsStore.setState((state) => ({ settings: { ...state.settings, theme: 'pink' } }));
    await save;
    expect(useSettingsStore.getState().settings.zenMode).toBeUndefined();
    expect(useSettingsStore.getState().settings.theme).toBe('pink');
    expect(mocks.toastError).toHaveBeenCalledWith('磁盘写入失败');
  });

  it('finishes in full mode when Zen is disabled during a pending entry resize', async () => {
    useSettingsStore.setState((state) => ({ settings: { ...state.settings, zenMode: {
      enabled: true, active: false, fontSize: 15, textColor: '#ffffff', rowColor: '#ffffff',
      backgroundColor: '#000000', backgroundOpacity: 65, rowOpacity: 8,
    } } }));
    let finishResize!: () => void;
    mocks.setZenWindowMode.mockImplementationOnce(() => new Promise<void>((resolve) => { finishResize = resolve; }));
    const enter = useSettingsStore.getState().setZenMode({ active: true });
    await vi.waitFor(() => expect(mocks.setZenWindowMode).toHaveBeenCalledWith(true));
    const disable = useSettingsStore.getState().setZenMode({ enabled: false });
    finishResize();
    await Promise.all([enter, disable]);
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({ enabled: false, active: false });
    expect(mocks.setZenWindowMode).toHaveBeenLastCalledWith(false);
  });

  it('migrates the former setting name and retains its colors', async () => {
    mocks.getSettings.mockResolvedValue({ success: true, data: {
      ...defaultSettings, minimalMode: { enabled: true, textColor: '#abcdef' },
    } });
    await useSettingsStore.getState().loadSettings();
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({
      enabled: true, active: false, fontSize: 15, textColor: '#abcdef',
    });
    expect(useSettingsStore.getState().settings.minimalMode).toBeUndefined();
  });

});
