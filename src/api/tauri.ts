import { invoke, isTauri } from '@tauri-apps/api/core';
import type { Task, Settings, CreateTaskRequest, UpdateTaskRequest, TaskStats, ApiResponse } from '../types';
import * as localStorageApi from './localStorage';

// 检测Tauri是否可用
const isTauriAvailable = isTauri();

// 如果Tauri不可用，使用localStorage API
if (!isTauriAvailable) {
  console.log('Tauri不可用，使用localStorage作为fallback存储');
}

// 待办相关API
export const taskApi = {
  // 获取所有待办
  async getTasks(): Promise<ApiResponse<Task[]>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_tasks');
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.taskApi.getTasks();
      }
    }
    return await localStorageApi.taskApi.getTasks();
  },

  // 创建新待办
  async createTask(request: CreateTaskRequest): Promise<ApiResponse<Task>> {
    if (isTauriAvailable) {
      try {
        return await invoke('create_task', { request });
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.taskApi.createTask(request);
      }
    }
    return await localStorageApi.taskApi.createTask(request);
  },

  // 更新待办
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<ApiResponse<Task | null>> {
    if (isTauriAvailable) {
      try {
        return await invoke('update_task', { id, updates });
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.taskApi.updateTask(id, updates);
      }
    }
    return await localStorageApi.taskApi.updateTask(id, updates);
  },

  // 删除待办
  async deleteTask(id: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('delete_task', { id });
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.taskApi.deleteTask(id);
      }
    }
    return await localStorageApi.taskApi.deleteTask(id);
  },

  // 获取待办统计
  async getTaskStats(): Promise<ApiResponse<TaskStats>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_task_stats');
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.taskApi.getTaskStats();
      }
    }
    return await localStorageApi.taskApi.getTaskStats();
  },
};

// 设置相关API
export const settingsApi = {
  // 获取设置
  async getSettings(): Promise<ApiResponse<Settings>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_settings');
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.settingsApi.getSettings();
      }
    }
    return await localStorageApi.settingsApi.getSettings();
  },

  // 更新设置
  async updateSettings(settings: Settings): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('update_settings', { settings });
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.settingsApi.updateSettings(settings);
      }
    }
    return await localStorageApi.settingsApi.updateSettings(settings);
  },
};

// 数据管理API
export const dataApi = {
  // 导出数据
  async exportData(): Promise<ApiResponse<string>> {
    if (isTauriAvailable) {
      try {
        return await invoke('export_data');
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.dataApi.exportData();
      }
    }
    return await localStorageApi.dataApi.exportData();
  },

  // 导入数据
  async importData(jsonData: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('import_data', { jsonData: jsonData });
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.dataApi.importData(jsonData);
      }
    }
    return await localStorageApi.dataApi.importData(jsonData);
  },

  // 清空所有数据
  async clearAllData(): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('clear_all_data');
      } catch (error) {
        console.warn('Tauri API调用失败，使用localStorage fallback:', error);
        return await localStorageApi.dataApi.clearAllData();
      }
    }
    return await localStorageApi.dataApi.clearAllData();
  },
};

// 自启动API
export const autostartApi = {
  // 获取自启动状态
  async getAutostartEnabled(): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_autostart_enabled');
      } catch (error) {
        console.warn('获取自启动状态失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 设置自启动状态
  async setAutostartEnabled(enabled: boolean): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('set_autostart_enabled', { enabled });
      } catch (error) {
        console.warn('设置自启动状态失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },
};

// 附件API
export const attachmentApi = {
  // 保存附件到文件系统
  async saveAttachment(
    taskId: string,
    attachmentId: string,
    fileName: string,
    fileData: string // Base64 encoded
  ): Promise<ApiResponse<string>> {
    if (isTauriAvailable) {
      try {
        return await invoke('save_attachment', {
          taskId,
          attachmentId,
          fileName,
          fileData,
        });
      } catch (error) {
        console.warn('保存附件失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 获取附件路径
  async getAttachmentPath(relativePath: string): Promise<ApiResponse<string>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_attachment_path', { relativePath: relativePath });
      } catch (error) {
        console.warn('获取附件路径失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 获取附件 Base64 数据（用于预览）
  async getAttachmentAsBase64(relativePath: string): Promise<ApiResponse<string>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_attachment_as_base64', { relativePath: relativePath });
      } catch (error) {
        console.warn('获取附件数据失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 删除附件
  async deleteAttachment(relativePath: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('delete_attachment', { relativePath: relativePath });
      } catch (error) {
        console.warn('删除附件失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 删除任务的所有附件
  async deleteTaskAttachments(taskId: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('delete_task_attachments', { taskId: taskId });
      } catch (error) {
        console.warn('删除任务附件失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 通过文件路径打开文件
  async openFileByPath(filePath: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('open_file_by_path', { filePath: filePath });
      } catch (error) {
        console.warn('打开文件失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 在文件管理器中打开文件夹
  async openFolderInExplorer(folderPath: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('open_folder_in_explorer', { folderPath: folderPath });
      } catch (error) {
        console.warn('打开文件夹失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },
};

// 数据目录API
export const dataDirApi = {
  // 获取当前数据目录
  async getDataDir(): Promise<ApiResponse<string>> {
    if (isTauriAvailable) {
      try {
        return await invoke('get_data_dir_path');
      } catch (error) {
        console.warn('获取数据目录失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },

  // 设置数据目录
  async setDataDir(path: string): Promise<ApiResponse<boolean>> {
    if (isTauriAvailable) {
      try {
        return await invoke('set_data_dir', { path });
      } catch (error) {
        console.warn('设置数据目录失败:', error);
        return { success: false, error: String(error) };
      }
    }
    return { success: false, error: 'Tauri不可用' };
  },
};

// 统一的API对象
export const api = {
  tasks: taskApi,
  settings: settingsApi,
  data: dataApi,
  autostart: autostartApi,
  attachment: attachmentApi,
  dataDir: dataDirApi,
};

export default api;