import { invoke, isTauri } from '@tauri-apps/api/core';
import type {
  ApiResponse,
  CreateTaskRequest,
  Settings,
  Task,
  TaskStats,
  UpdateTaskRequest,
  UsagePersistedData,
} from '../types';
import * as localStorageApi from './localStorage';

const isTauriAvailable = isTauri();
export const isDesktopRuntime = isTauriAvailable;
type InvokeArgs = Record<string, unknown>;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function invokeWithBrowserFallback<T>(
  command: string,
  args: InvokeArgs | undefined,
  browserFallback: () => Promise<ApiResponse<T>>,
): Promise<ApiResponse<T>> {
  if (!isTauriAvailable) return browserFallback();

  try {
    return await invoke<ApiResponse<T>>(command, args);
  } catch (error) {
    console.error(`Tauri command ${command} failed:`, error);
    return { success: false, error: `${command} 调用失败: ${errorMessage(error)}` };
  }
}

async function invokeDesktopOnly<T>(command: string, args?: InvokeArgs): Promise<ApiResponse<T>> {
  if (!isTauriAvailable) {
    return { success: false, error: 'Tauri不可用' };
  }

  try {
    return await invoke<ApiResponse<T>>(command, args);
  } catch (error) {
    console.error(`Tauri command ${command} failed:`, error);
    return { success: false, error: `${command} 调用失败: ${errorMessage(error)}` };
  }
}

export const taskApi = {
  getTasks: () => invokeWithBrowserFallback<Task[]>(
    'get_tasks',
    undefined,
    () => localStorageApi.taskApi.getTasks(),
  ),

  createTask: (request: CreateTaskRequest) => invokeWithBrowserFallback<Task>(
    'create_task',
    { request },
    () => localStorageApi.taskApi.createTask(request),
  ),

  updateTask: (id: string, updates: UpdateTaskRequest) => invokeWithBrowserFallback<Task | null>(
    'update_task',
    { id, updates },
    () => localStorageApi.taskApi.updateTask(id, updates),
  ),

  deleteTask: (id: string) => invokeWithBrowserFallback<boolean>(
    'delete_task',
    { id },
    () => localStorageApi.taskApi.deleteTask(id),
  ),

  getTaskStats: () => invokeWithBrowserFallback<TaskStats>(
    'get_task_stats',
    undefined,
    () => localStorageApi.taskApi.getTaskStats(),
  ),
};

export const settingsApi = {
  getSettings: () => invokeWithBrowserFallback<Settings>(
    'get_settings',
    undefined,
    () => localStorageApi.settingsApi.getSettings(),
  ),

  updateSettings: (settings: Settings) => invokeWithBrowserFallback<boolean>(
    'update_settings',
    { settings },
    () => localStorageApi.settingsApi.updateSettings(settings),
  ),
};

export const usageApi = {
  getUsageData: () => invokeWithBrowserFallback<UsagePersistedData | null>(
    'get_usage_data',
    undefined,
    () => localStorageApi.usageApi.getUsageData(),
  ),

  saveUsageData: (usageData: UsagePersistedData) => invokeWithBrowserFallback<boolean>(
    'save_usage_data',
    { usageData },
    () => localStorageApi.usageApi.saveUsageData(usageData),
  ),

  clearUsageData: () => invokeWithBrowserFallback<boolean>(
    'clear_usage_data',
    undefined,
    () => localStorageApi.usageApi.clearUsageData(),
  ),
};

export const dataApi = {
  exportData: () => invokeWithBrowserFallback<string>(
    'export_data',
    undefined,
    () => localStorageApi.dataApi.exportData(),
  ),

  importData: (jsonData: string) => invokeWithBrowserFallback<boolean>(
    'import_data',
    { jsonData },
    () => localStorageApi.dataApi.importData(jsonData),
  ),

  clearAllData: () => invokeWithBrowserFallback<boolean>(
    'clear_all_data',
    undefined,
    () => localStorageApi.dataApi.clearAllData(),
  ),
};

export const autostartApi = {
  getAutostartEnabled: () => invokeDesktopOnly<boolean>('get_autostart_enabled'),
  setAutostartEnabled: (enabled: boolean) => invokeDesktopOnly<boolean>(
    'set_autostart_enabled',
    { enabled },
  ),
};

export const attachmentApi = {
  saveAttachment: (
    taskId: string,
    attachmentId: string,
    fileName: string,
    fileData: string,
  ) => invokeDesktopOnly<string>('save_attachment', {
    taskId,
    attachmentId,
    fileName,
    fileData,
  }),

  getAttachmentPath: (relativePath: string) => invokeDesktopOnly<string>(
    'get_attachment_path',
    { relativePath },
  ),

  getAttachmentAsBase64: (relativePath: string) => invokeDesktopOnly<string>(
    'get_attachment_as_base64',
    { relativePath },
  ),

  deleteAttachment: (relativePath: string) => invokeDesktopOnly<boolean>(
    'delete_attachment',
    { relativePath },
  ),

  deleteTaskAttachments: (taskId: string) => invokeDesktopOnly<boolean>(
    'delete_task_attachments',
    { taskId },
  ),

  openFileByPath: (filePath: string) => invokeDesktopOnly<boolean>(
    'open_file_by_path',
    { filePath },
  ),

  openFileWithSystem: (fileName: string, fileData: string, fileType: string) =>
    invokeDesktopOnly<boolean>('open_file_with_system', {
      fileName,
      fileData,
      fileType,
    }),

  openFolderInExplorer: (folderPath: string) => invokeDesktopOnly<boolean>(
    'open_folder_in_explorer',
    { folderPath },
  ),
};

export const dataDirApi = {
  getDataDir: () => invokeDesktopOnly<string>('get_data_dir_path'),
  setDataDir: (path: string) => invokeDesktopOnly<boolean>('set_data_dir', { path }),
  migrateDataDir: (newPath: string) => invokeDesktopOnly<boolean>('migrate_data_dir', { newPath }),
};

export const api = {
  tasks: taskApi,
  settings: settingsApi,
  usage: usageApi,
  data: dataApi,
  autostart: autostartApi,
  attachment: attachmentApi,
  dataDir: dataDirApi,
};

export default api;
