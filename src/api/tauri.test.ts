import { beforeEach, describe, expect, it, vi } from 'vitest';

const coreMocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  isTauri: vi.fn(() => true),
}));

const localMocks = vi.hoisted(() => ({
  getTasks: vi.fn(),
  createTask: vi.fn(),
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  getTaskStats: vi.fn(),
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
  getUsageData: vi.fn(),
  saveUsageData: vi.fn(),
  clearUsageData: vi.fn(),
  exportData: vi.fn(),
  importData: vi.fn(),
  clearAllData: vi.fn(),
}));

vi.mock('@tauri-apps/api/core', () => coreMocks);
vi.mock('./localStorage', () => ({
  taskApi: {
    getTasks: localMocks.getTasks,
    createTask: localMocks.createTask,
    updateTask: localMocks.updateTask,
    deleteTask: localMocks.deleteTask,
    getTaskStats: localMocks.getTaskStats,
  },
  settingsApi: {
    getSettings: localMocks.getSettings,
    updateSettings: localMocks.updateSettings,
  },
  usageApi: {
    getUsageData: localMocks.getUsageData,
    saveUsageData: localMocks.saveUsageData,
    clearUsageData: localMocks.clearUsageData,
  },
  dataApi: {
    exportData: localMocks.exportData,
    importData: localMocks.importData,
    clearAllData: localMocks.clearAllData,
  },
}));

describe('Tauri API storage boundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    coreMocks.isTauri.mockReturnValue(true);
  });

  it('does not write or read local fallback data after a desktop invoke failure', async () => {
    coreMocks.invoke.mockRejectedValue(new Error('backend unavailable'));
    localMocks.getTasks.mockResolvedValue({ success: true, data: [{ id: 'local-only' }] });
    const { taskApi } = await import('./tauri');

    const response = await taskApi.getTasks();

    expect(response).toEqual({
      success: false,
      error: 'get_tasks 调用失败: backend unavailable',
    });
    expect(localMocks.getTasks).not.toHaveBeenCalled();
  });

  it('still uses local storage when the app is intentionally running in a browser', async () => {
    coreMocks.isTauri.mockReturnValue(false);
    localMocks.getTasks.mockResolvedValue({ success: true, data: [] });
    const { taskApi } = await import('./tauri');

    await expect(taskApi.getTasks()).resolves.toEqual({ success: true, data: [] });
    expect(coreMocks.invoke).not.toHaveBeenCalled();
    expect(localMocks.getTasks).toHaveBeenCalledOnce();
  });

  it('routes every browser-capable API through its explicit browser adapter', async () => {
    coreMocks.isTauri.mockReturnValue(false);
    for (const mock of Object.values(localMocks)) {
      mock.mockResolvedValue({ success: true, data: true });
    }
    const { api } = await import('./tauri');
    const taskRequest = { title: 'test' };
    const taskUpdate = { completed: true };
    const settings = {
      theme: 'light' as const,
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
      collapseMode: 'expanded' as const,
      useCapsuleMode: false,
    };
    const usageData = {
      schemaVersion: 1 as const,
      usageRecords: [],
      weeklyUsage: {},
      monthlyUsage: {},
      dailyStartDate: null,
      dailyStartTime: 0,
      pomodoro: {
        isActive: false,
        currentMode: 'work' as const,
        timeLeft: 1500,
        cycle: 0,
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        cyclesBeforeLongBreak: 4,
      },
    };

    await Promise.all([
      api.tasks.getTasks(),
      api.tasks.createTask(taskRequest),
      api.tasks.updateTask('task-1', taskUpdate),
      api.tasks.deleteTask('task-1'),
      api.tasks.getTaskStats(),
      api.settings.getSettings(),
      api.settings.updateSettings(settings),
      api.usage.getUsageData(),
      api.usage.saveUsageData(usageData),
      api.usage.clearUsageData(),
      api.data.exportData(),
      api.data.importData('{}'),
      api.data.clearAllData(),
    ]);

    expect(coreMocks.invoke).not.toHaveBeenCalled();
    for (const mock of Object.values(localMocks)) expect(mock).toHaveBeenCalledOnce();
  });

  it('returns an explicit unavailable error for desktop-only APIs in a browser', async () => {
    coreMocks.isTauri.mockReturnValue(false);
    const { api } = await import('./tauri');

    const responses = await Promise.all([
      api.autostart.getAutostartEnabled(),
      api.autostart.setAutostartEnabled(true),
      api.attachment.saveAttachment('task', 'attachment', 'file.txt', 'data'),
      api.attachment.getAttachmentPath('task/file.txt'),
      api.attachment.getAttachmentAsBase64('task/file.txt'),
      api.attachment.deleteAttachment('task/file.txt'),
      api.attachment.deleteTaskAttachments('task'),
      api.attachment.openFileByPath('C:/file.txt'),
      api.attachment.openFileWithSystem('file.txt', 'data', 'text/plain'),
      api.attachment.openFolderInExplorer('C:/'),
      api.dataDir.getDataDir(),
      api.dataDir.setDataDir('C:/data'),
      api.dataDir.migrateDataDir('C:/new-data'),
    ]);

    for (const response of responses) {
      expect(response).toEqual({ success: false, error: 'Tauri不可用' });
    }
  });

  it('passes through successful desktop responses without touching local storage', async () => {
    coreMocks.invoke.mockResolvedValue({ success: true, data: [] });
    const { api } = await import('./tauri');

    await expect(api.tasks.getTasks()).resolves.toEqual({ success: true, data: [] });
    expect(localMocks.getTasks).not.toHaveBeenCalled();
  });

  it('returns desktop-only invoke failures without hiding non-Error values', async () => {
    coreMocks.invoke.mockRejectedValue('permission denied');
    const { api } = await import('./tauri');

    await expect(api.dataDir.getDataDir()).resolves.toEqual({
      success: false,
      error: 'get_data_dir_path 调用失败: permission denied',
    });
  });
});
