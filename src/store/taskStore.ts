import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { Task, TaskStats, CreateTaskRequest, UpdateTaskRequest, TaskFilter, Priority, RecurrenceRule, SortConfig, SortOrder } from '../types';
import { api } from '../api/tauri';
import { toast } from 'sonner';

// 本地计算任务统计（避免每次调用 Rust API）
const computeLocalStats = (tasks: Task[]): TaskStats => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayStr = today.toISOString().split('T')[0];

  let overdue = 0;
  let todayCount = 0;

  tasks.forEach(task => {
    if (task.dueDate && !task.completed) {
      const dueDateStr = task.dueDate.split('T')[0];
      if (dueDateStr < todayStr) {
        overdue++;
      } else if (dueDateStr === todayStr) {
        todayCount++;
      }
    }
  });

  return {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
    overdue,
    today: todayCount,
    highPriority: tasks.filter(t => t.priority === 'high').length,
    mediumPriority: tasks.filter(t => t.priority === 'medium').length,
    lowPriority: tasks.filter(t => t.priority === 'low').length,
  };
};

// 计算下一个周期日期
const calculateNextDueDate = (currentDueDate: string, recurrence: RecurrenceRule): string => {
  const current = new Date(currentDueDate);
  let next: Date;

  switch (recurrence.type) {
    case 'day':
      next = new Date(current.getTime() + recurrence.interval * 24 * 60 * 60 * 1000);
      break;
    case 'week': {
      // 按周重复：优先找当前周内后续日期；若没有，则跳到 interval 周后的目标周
      if (recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
        const targetDays = [...recurrence.daysOfWeek].sort((a, b) => a - b);
        const currentDay = current.getDay();

        const nextDayInCurrentWeek = targetDays.find(day => day > currentDay);
        if (nextDayInCurrentWeek !== undefined) {
          const daysUntilNext = nextDayInCurrentWeek - currentDay;
          next = new Date(current.getTime() + daysUntilNext * 24 * 60 * 60 * 1000);
        } else {
          const firstTargetDay = targetDays[0];
          const startOfCurrentWeek = new Date(current);
          startOfCurrentWeek.setDate(current.getDate() - currentDay);
          startOfCurrentWeek.setHours(0, 0, 0, 0);

          next = new Date(startOfCurrentWeek);
          next.setDate(startOfCurrentWeek.getDate() + recurrence.interval * 7 + firstTargetDay);
          next.setHours(current.getHours(), current.getMinutes(), current.getSeconds(), current.getMilliseconds());
        }
      } else {
        // 如果没有指定周几，则按 interval 周重复
        next = new Date(current.getTime() + recurrence.interval * 7 * 24 * 60 * 60 * 1000);
      }
      break;
    }
    case 'month': {
      // 按月重复：支持多天选择
      if (recurrence.daysOfMonth && recurrence.daysOfMonth.length > 0) {
        const targetDays = [...recurrence.daysOfMonth].sort((a, b) => a - b);
        const currentDay = current.getDate();

        // 获取指定年月的天数
        const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();

        // 从当前月份开始，按 interval 逐月查找
        next = new Date(current);
        let found = false;
        let year = next.getFullYear();
        let month = next.getMonth();

        for (let i = 0; i < 24 && !found; i++) {
          // 按 interval 个月递增
          const targetMonth = month + i * recurrence.interval;
          const targetYear = year + Math.floor(targetMonth / 12);
          const actualMonth = targetMonth % 12;

          // 检查这个月是否有目标日期
          const daysInThisMonth = getDaysInMonth(targetYear, actualMonth);
          // 在目标日期中找到第一个 <= 这个月最大天数的
          const validTarget = targetDays.find(d => d <= daysInThisMonth);

          if (validTarget !== undefined) {
            // 如果是当前月（i=0），找 > currentDay 的
            if (i === 0) {
              const nextTarget = targetDays.find(d => d > currentDay);
              if (nextTarget !== undefined) {
                next.setDate(nextTarget);
                found = true;
              }
              // 如果没找到，当前月没有更大的了，不found，继续循环
            } else {
              // 非当前月，用第一个有效的目标日期
              next.setFullYear(targetYear, actualMonth, validTarget);
              found = true;
            }
          }
        }

        // 如果没找到，兜底加 interval 个月
        if (!found) {
          next = new Date(current);
          next.setMonth(next.getMonth() + recurrence.interval);
        }
      } else {
        // 如果没有指定日期，按 interval 月重复
        next = new Date(current);
        next.setMonth(next.getMonth() + recurrence.interval);
      }
      break;
    }
    default:
      next = new Date(current.getTime() + recurrence.interval * 24 * 60 * 60 * 1000);
  }

  return next.toISOString();
};

interface TaskState {
  // 状态
  tasks: Task[];
  stats: TaskStats;
  loading: boolean;
  filter: TaskFilter;
  searchQuery: string;
  selectedTask: Task | null;
  filteredTasks: Task[];
  celebration: {
    show: boolean;
    message: string;
    isAllComplete: boolean;
  };
  editingTaskId: string | null;
  sortConfig: SortConfig;
  statsBarCollapsed: boolean;

  // 操作
  loadTasks: () => Promise<void>;
  createTask: (request: CreateTaskRequest) => Promise<void>;
  updateTask: (id: string, updates: UpdateTaskRequest) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskComplete: (id: string) => Promise<void>;
  setFilter: (filter: TaskFilter) => void;
  setSearchQuery: (query: string) => void;
  setSelectedTask: (task: Task | null) => void;
  refreshStats: () => Promise<void>;
  showCelebration: (message: string, isAllComplete?: boolean) => void;
  hideCelebration: () => void;
  setEditingTaskId: (id: string | null) => void;
  setSortConfig: (config: SortConfig) => void;
  setStatsBarCollapsed: (collapsed: boolean) => void;
}

// 计算过滤后的待办列表
const getFilteredTasks = (tasks: Task[], filter: TaskFilter, searchQuery: string, sortConfig: SortConfig): Task[] => {
  let filtered = tasks;

  // 按状态筛选
  switch (filter) {
    case 'pending':
      filtered = tasks.filter(task => !task.completed);
      break;
    case 'completed':
      filtered = tasks.filter(task => task.completed);
      break;
    case 'overdue':
      filtered = tasks.filter(task => {
        if (task.completed || !task.dueDate) return false;
        return new Date(task.dueDate) < new Date();
      });
      break;
    case 'today':
      filtered = tasks.filter(task => {
        if (!task.dueDate) return false;
        const today = new Date().toDateString();
        return new Date(task.dueDate).toDateString() === today;
      });
      break;
    default:
      filtered = tasks;
  }

  // 按搜索关键词筛选
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(task =>
      task.title.toLowerCase().includes(query) ||
      (task.description && task.description.toLowerCase().includes(query))
    );
  }

  // 排序
  const { field, order } = sortConfig;
  const multiplier = order === 'asc' ? 1 : -1;

  // 在"全部"标签下，已完成的任务保持在最后面，不参与排序
  const completedTasks = filter === 'all' ? filtered.filter(t => t.completed) : [];
  const notCompletedTasks = filter === 'all' ? filtered.filter(t => !t.completed) : filtered;

  const sortTasks = (tasks: Task[]): Task[] => {
    return [...tasks].sort((a, b) => {
      switch (field) {
        case 'dueDate': {
          // 没有截止日期的排到最后
          if (!a.dueDate && !b.dueDate) return 0;
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          const aTime = new Date(a.dueDate).getTime();
          const bTime = new Date(b.dueDate).getTime();
          return (aTime - bTime) * multiplier;
        }
        case 'priority': {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority || 'medium'];
          const bPriority = priorityOrder[b.priority || 'medium'];
          return (aPriority - bPriority) * multiplier;
        }
        case 'createdAt': {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return (aTime - bTime) * multiplier;
        }
        case 'updatedAt': {
          const aTime = new Date(a.updatedAt).getTime();
          const bTime = new Date(b.updatedAt).getTime();
          return (aTime - bTime) * multiplier;
        }
        default:
          return 0;
      }
    });
  };

  return [...sortTasks(notCompletedTasks), ...completedTasks];
};

export const useTaskStore = create<TaskState>()(devtools(
  (set, get) => ({
    // 初始状态
    tasks: [],
    stats: {
      total: 0,
      completed: 0,
      pending: 0,
      overdue: 0,
      today: 0,
    },
    loading: false,
    filter: 'pending',
    searchQuery: '',
    selectedTask: null,
    filteredTasks: [],
    celebration: {
      show: false,
      message: '',
      isAllComplete: false
    },
    editingTaskId: null,
    sortConfig: { field: 'createdAt', order: 'desc' },
    statsBarCollapsed: false,

    // 操作
    loadTasks: async () => {
      set({ loading: true });
      try {
        const response = await api.tasks.getTasks();
        if (response.success) {
          const state = get();
          const filteredTasks = getFilteredTasks(response.data, state.filter, state.searchQuery, state.sortConfig);
          set({ tasks: response.data, filteredTasks });
          get().refreshStats();
        } else {
          toast.error(response.error || '加载待办失败');
        }
      } catch (error) {
        console.error('Load tasks error:', error);
        toast.error('加载待办失败');
      } finally {
        set({ loading: false });
      }
    },
    
    createTask: async (request: CreateTaskRequest) => {
      try {
        const response = await api.tasks.createTask(request);
        if (response.success) {
          set(state => {
            const newTasks = [...state.tasks, response.data];
            const filteredTasks = getFilteredTasks(newTasks, state.filter, state.searchQuery, state.sortConfig);
            return { tasks: newTasks, filteredTasks };
          });
          get().refreshStats();
          toast.success('待办创建成功');
        } else {
          toast.error(response.error || '创建待办失败');
        }
      } catch (error) {
        console.error('Create task error:', error);
        toast.error('创建待办失败');
      }
    },
    
    updateTask: async (id: string, updates: UpdateTaskRequest) => {
      try {
        const response = await api.tasks.updateTask(id, updates);
        if (response.success && response.data) {
          set(state => {
            const newTasks = state.tasks.map(task =>
              task.id === id ? response.data! : task
            );
            const filteredTasks = getFilteredTasks(newTasks, state.filter, state.searchQuery, state.sortConfig);
            return { tasks: newTasks, filteredTasks };
          });
          get().refreshStats();
          toast.success('待办更新成功');
        } else {
          toast.error(response.error || '更新待办失败');
        }
      } catch (error) {
        console.error('Update task error:', error);
        toast.error('更新待办失败');
      }
    },
    
    deleteTask: async (id: string) => {
      try {
        const response = await api.tasks.deleteTask(id);
        if (response.success) {
          set(state => {
            const newTasks = state.tasks.filter(task => task.id !== id);
            const filteredTasks = getFilteredTasks(newTasks, state.filter, state.searchQuery, state.sortConfig);
            return {
              tasks: newTasks,
              filteredTasks,
              selectedTask: state.selectedTask?.id === id ? null : state.selectedTask
            };
          });
          get().refreshStats();
          toast.success('待办删除成功');
        } else {
          toast.error(response.error || '删除待办失败');
        }
      } catch (error) {
        console.error('Delete task error:', error);
        toast.error('删除待办失败');
      }
    },
    
    toggleTaskComplete: async (id: string) => {
      const task = get().tasks.find(t => t.id === id);
      if (!task) return;

      const wasCompleted = task.completed;

      // 处理循环任务：完成时创建下一个周期任务
      if (!wasCompleted && task.recurrence) {
        // 优先使用当前任务的截止日期作为基准日期，避免提前完成时重复生成同一天
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const fallbackBaseDate = `${year}-${month}-${day}`;
        const baseDate = task.dueDate || fallbackBaseDate;
        // 计算下一个到期日
        const nextDueDate = calculateNextDueDate(baseDate, task.recurrence);

        // 创建新的周期任务
        const createNextRecurrenceTask = async () => {
          const newTaskRequest: CreateTaskRequest = {
            title: task.title,
            description: task.description,
            priority: task.priority,
            dueDate: nextDueDate,
            attachments: task.attachments,
            recurrence: task.recurrence, // 子任务继承 recurrence，用于下次完成时创建再下一个
          };

          try {
            const response = await api.tasks.createTask(newTaskRequest);
            if (response.success && response.data) {
              set(state => {
                const newTasks = [...state.tasks, response.data!];
                const filteredTasks = getFilteredTasks(newTasks, state.filter, state.searchQuery, state.sortConfig);
                return { tasks: newTasks, filteredTasks };
              });
              return response.data;
            }
          } catch (error) {
            console.error('创建下一个循环任务失败:', error);
          }

          return null;
        };

        // 先完成当前任务（清除 recurrence 使其变成普通任务），再创建下一个
        await get().updateTask(id, { completed: true, recurrence: null, clearRecurrence: true });
        const createdTask = await createNextRecurrenceTask();
        if (createdTask) {
          toast.success(`已创建下一个周期任务：${new Date(nextDueDate).toLocaleDateString()}`);
        }
      } else {
        await get().updateTask(id, { completed: !task.completed });
      }

      // Show celebration when completing a task
      if (!wasCompleted) {
        // Check if this will be the last task to complete
        const currentTasks = get().tasks;
        const pendingTasks = currentTasks.filter(t => !t.completed);

        if (pendingTasks.length === 0 && currentTasks.length > 0) {
          // This is the last task - show only all complete animation
          get().showCelebration('🏅 恭喜！所有待办都完成了！🏅', true);
        } else {
          // Regular task completion
          const celebrationMessages = [
            '太棒了！又完成一个待办 🎉',
            '干得漂亮！继续保持 ✨',
            '待办完成！你真厉害 🌟',
            '又一个目标达成！👏',
            '完成得很好！加油 💪',
            '高效收尾！待办清单又轻了一步 📉',
            '待办搞定！离目标又近一截 🚀',
            '利落完成！这份执行力超赞 👍',
            '又清一项！节奏把握得刚刚好 ⏱️'
          ];
          const randomMessage = celebrationMessages[Math.floor(Math.random() * celebrationMessages.length)];
          get().showCelebration(randomMessage);
        }
      }
    },
    
    setFilter: (filter: TaskFilter) => {
      set(state => {
        const filteredTasks = getFilteredTasks(state.tasks, filter, state.searchQuery, state.sortConfig);
        return { filter, filteredTasks };
      });
    },

    setSearchQuery: (searchQuery: string) => {
      set(state => {
        const filteredTasks = getFilteredTasks(state.tasks, state.filter, searchQuery, state.sortConfig);
        return { searchQuery, filteredTasks };
      });
    },

    setSortConfig: (sortConfig: SortConfig) => {
      set(state => {
        const filteredTasks = getFilteredTasks(state.tasks, state.filter, state.searchQuery, sortConfig);
        return { sortConfig, filteredTasks };
      });
    },

    setStatsBarCollapsed: (collapsed: boolean) => {
      set({ statsBarCollapsed: collapsed });
    },

    setSelectedTask: (selectedTask: Task | null) => {
      set({ selectedTask });
    },
    
    refreshStats: async () => {
      // 本地计算 stats，避免调用 Rust API
      const tasks = get().tasks;
      const stats = computeLocalStats(tasks);
      set({ stats });
    },

    showCelebration: (message: string, isAllComplete = false) => {
      set({ celebration: { show: true, message, isAllComplete } });
    },

    hideCelebration: () => {
      set({ celebration: { show: false, message: '', isAllComplete: false } });
    },

    setEditingTaskId: (editingTaskId: string | null) => {
      set({ editingTaskId });
    },
  }),
  {
    name: 'task-store',
  }
));