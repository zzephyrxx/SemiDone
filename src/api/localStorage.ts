import type { Task, Settings, CreateTaskRequest, UpdateTaskRequest, TaskStats, ApiResponse, Theme } from '../types';
import { v4 as uuidv4 } from 'uuid';

// localStorage键名常量
const STORAGE_KEYS = {
  TASKS: 'windows-todo-tasks',
  SETTINGS: 'windows-todo-settings',
} as const;

// 默认设置
const DEFAULT_SETTINGS: Settings = {
  theme: 'light' as Theme,
  notifications: true,
  autoSave: true,
  isPinned: false,
  isCollapsed: false,
  collapseMode: 'expanded',
  useCapsuleMode: false,
};

// 辅助函数：安全的JSON解析
function safeJsonParse<T>(json: string | null, defaultValue: T): T {
  if (!json) return defaultValue;
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

// 辅助函数：创建API响应
function createResponse<T>(data: T, success: boolean = true, error?: string): ApiResponse<T> {
  return {
    success,
    data: success ? data : undefined,
    error: success ? undefined : error,
  };
}

// 待办相关API
export const taskApi = {
  // 获取所有待办
  async getTasks(): Promise<ApiResponse<Task[]>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = safeJsonParse(tasksJson, []);
      return createResponse(tasks);
    } catch (error) {
      return createResponse([], false, `获取待办失败: ${error}`);
    }
  },

  // 创建新待办
  async createTask(request: CreateTaskRequest): Promise<ApiResponse<Task>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = safeJsonParse(tasksJson, []);
      
      const newTask: Task = {
        id: uuidv4(),
        title: request.title,
        description: request.description || '',
        completed: false,
        priority: request.priority || 'medium',
        dueDate: request.dueDate,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        attachments: request.attachments || [],
      };
      
      tasks.push(newTask);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      
      return createResponse(newTask);
    } catch (error) {
      return createResponse({} as Task, false, `创建待办失败: ${error}`);
    }
  },

  // 更新待办
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<ApiResponse<Task | null>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = safeJsonParse(tasksJson, []);
      
      const taskIndex = tasks.findIndex((task: Task) => task.id === id);
      if (taskIndex === -1) {
        return createResponse(null, false, '待办不存在');
      }
      
      const updatedTask = {
        ...tasks[taskIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };
      
      tasks[taskIndex] = updatedTask;
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks));
      
      return createResponse(updatedTask);
    } catch (error) {
      return createResponse(null, false, `更新待办失败: ${error}`);
    }
  },

  // 删除待办
  async deleteTask(id: string): Promise<ApiResponse<boolean>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = safeJsonParse(tasksJson, []);
      
      const filteredTasks = tasks.filter((task: Task) => task.id !== id);
      localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(filteredTasks));
      
      return createResponse(true);
    } catch (error) {
      return createResponse(false, false, `删除待办失败: ${error}`);
    }
  },

  // 获取待办统计
  async getTaskStats(): Promise<ApiResponse<TaskStats>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS);
      const tasks = safeJsonParse(tasksJson, []);
      
      const today = new Date().toDateString();
      
      const stats: TaskStats = {
        total: tasks.length,
        completed: tasks.filter((task: Task) => task.completed).length,
        pending: tasks.filter((task: Task) => !task.completed).length,
        overdue: tasks.filter((task: Task) => {
          if (!task.dueDate || task.completed) return false;
          return new Date(task.dueDate) < new Date();
        }).length,
        today: tasks.filter((task: Task) => {
          if (!task.dueDate) return false;
          return new Date(task.dueDate).toDateString() === today;
        }).length,
        highPriority: tasks.filter((task: Task) => task.priority === 'high').length,
        mediumPriority: tasks.filter((task: Task) => task.priority === 'medium').length,
        lowPriority: tasks.filter((task: Task) => task.priority === 'low').length,
      };
      
      return createResponse(stats);
    } catch (error) {
      return createResponse({ total: 0, completed: 0, pending: 0, overdue: 0, today: 0, highPriority: 0, mediumPriority: 0, lowPriority: 0 }, false, `获取统计失败: ${error}`);
    }
  },
};

// 设置相关API
export const settingsApi = {
  // 获取设置
  async getSettings(): Promise<ApiResponse<Settings>> {
    try {
      const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      const settings = safeJsonParse(settingsJson, DEFAULT_SETTINGS);
      return createResponse(settings);
    } catch (error) {
      return createResponse(DEFAULT_SETTINGS, false, `获取设置失败: ${error}`);
    }
  },

  // 更新设置
  async updateSettings(settings: Settings): Promise<ApiResponse<boolean>> {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
      return createResponse(true);
    } catch (error) {
      return createResponse(false, false, `更新设置失败: ${error}`);
    }
  },
};

// 数据管理API
export const dataApi = {
  // 导出数据
  async exportData(): Promise<ApiResponse<string>> {
    try {
      const tasksJson = localStorage.getItem(STORAGE_KEYS.TASKS) || '[]';
      const settingsJson = localStorage.getItem(STORAGE_KEYS.SETTINGS) || JSON.stringify(DEFAULT_SETTINGS);
      
      const exportData = {
        tasks: JSON.parse(tasksJson),
        settings: JSON.parse(settingsJson),
        exportDate: new Date().toISOString(),
      };
      
      return createResponse(JSON.stringify(exportData, null, 2));
    } catch (error) {
      return createResponse('', false, `导出数据失败: ${error}`);
    }
  },

  // 导入数据
  async importData(jsonData: string): Promise<ApiResponse<boolean>> {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.tasks) {
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(data.tasks));
      }
      
      if (data.settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(data.settings));
      }
      
      return createResponse(true);
    } catch (error) {
      return createResponse(false, false, `导入数据失败: ${error}`);
    }
  },

  // 清空所有数据
  async clearAllData(): Promise<ApiResponse<boolean>> {
    try {
      localStorage.removeItem(STORAGE_KEYS.TASKS);
      localStorage.removeItem(STORAGE_KEYS.SETTINGS);
      return createResponse(true);
    } catch (error) {
      return createResponse(false, false, `清空数据失败: ${error}`);
    }
  },
};

// 统一的API对象
export const api = {
  tasks: taskApi,
  settings: settingsApi,
  data: dataApi,
};

export default api;