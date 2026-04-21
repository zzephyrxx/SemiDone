import { create } from 'zustand';
import { toast } from 'sonner';
import type { 
  UsageRecord, 
  UsageStats, 
  UsageDetail, 
  PomodoroState 
} from '../types';

interface UsageStore {
  // 使用时长数据
  usageRecords: UsageRecord[];
  currentSession: UsageRecord | null;
  stats: UsageStats;
  
  // 番茄钟状态
  pomodoro: PomodoroState;
  pomodoroInterval: NodeJS.Timeout | null;
  
  // 追踪状态
  isTrackingEnabled: boolean;
  sessionStartTime: number;
  dailyStartTime: number; // 今日应用启动时间
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  saveCurrentSession: () => void;
  loadUsageData: () => void;
  calculateStats: () => void;
  getUsageDetails: (days: number) => UsageDetail[];
  
  // 番茄钟Actions
  startPomodoro: () => void;
  pausePomodoro: () => void;
  resetPomodoro: () => void;
  switchPomodoroMode: () => void;
  updatePomodoroSettings: (settings: Partial<Pick<PomodoroState, 'workDuration' | 'breakDuration' | 'longBreakDuration' | 'cyclesBeforeLongBreak'>>) => void;
  
  // 清空所有数据
  clearAllData: () => void;

  // 工具方法
  formatTime: (seconds: number) => string;
  formatMinutes: (minutes: number) => string;
}

const DEFAULT_POMODORO: PomodoroState = {
  isActive: false,
  currentMode: 'work',
  timeLeft: 25 * 60, // 25分钟
  cycle: 0,
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4
};

export const useUsageStore = create<UsageStore>((set, get) => ({
  usageRecords: [],
  currentSession: null,
  stats: {
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    averageDaily: 0,
    totalSessions: 0,
    longestSession: 0
  },
  
  pomodoro: DEFAULT_POMODORO,
  pomodoroInterval: null,
  
  isTrackingEnabled: false,
  sessionStartTime: 0,
  dailyStartTime: 0,

  startTracking: () => {
    const now = Date.now();
    // 使用本地日期而非 UTC 日期，避免时区问题
    const today = new Date().toLocaleDateString('zh-CN');
    
    // 检查是否为新的一天，如果是则重置dailyStartTime
    const storedDate = localStorage.getItem('daily_start_date');
    let dailyStart = now;
    
    if (storedDate === today) {
      // 同一天，获取之前保存的启动时间
      const storedStartTime = localStorage.getItem('daily_start_time');
      if (storedStartTime) {
        dailyStart = parseInt(storedStartTime, 10);
      }
    } else {
      // 新的一天，保存新的启动时间和日期
      localStorage.setItem('daily_start_date', today);
      localStorage.setItem('daily_start_time', now.toString());
    }

    set({
      isTrackingEnabled: true,
      sessionStartTime: now,
      dailyStartTime: dailyStart
    });

    // 每分钟更新一次统计
    const trackingInterval = setInterval(() => {
      const state = get();
      if (state.isTrackingEnabled) {
        state.calculateStats();
      }
    }, 60000); // 每分钟检查一次

    // 保存interval引用用于清理
    (window as any).usageTrackingInterval = trackingInterval;
  },

  stopTracking: () => {
    const state = get();
    
    if (state.currentSession && state.isTrackingEnabled) {
      const now = Date.now();
      const duration = Math.floor((now - state.sessionStartTime) / (1000 * 60));
      
      if (duration >= 1) { // 至少使用1分钟才记录
        const completedSession: UsageRecord = {
          ...state.currentSession,
          endTime: now,
          duration
        };

        const updatedRecords = [...state.usageRecords, completedSession];
        localStorage.setItem('usage_records', JSON.stringify(updatedRecords));

        set({
          usageRecords: updatedRecords,
          currentSession: null,
          isTrackingEnabled: false,
          sessionStartTime: 0
        });

        state.calculateStats();
        toast.success(`本次使用 ${state.formatMinutes(duration)}`);
      }
    }

    // 清理tracking interval
    if ((window as any).usageTrackingInterval) {
      clearInterval((window as any).usageTrackingInterval);
      (window as any).usageTrackingInterval = null;
    }

    set({
      isTrackingEnabled: false,
      currentSession: null,
      sessionStartTime: 0
    });
  },

  saveCurrentSession: () => {
    const state = get();
    if (state.currentSession) {
      const existingRecords = [...state.usageRecords];
      const existingIndex = existingRecords.findIndex(r => r.id === state.currentSession!.id);
      
      if (existingIndex >= 0) {
        existingRecords[existingIndex] = state.currentSession;
      } else {
        existingRecords.push(state.currentSession);
      }
      
      localStorage.setItem('usage_records', JSON.stringify(existingRecords));
      set({ usageRecords: existingRecords });
    }
  },

  loadUsageData: () => {
    try {
      const stored = localStorage.getItem('usage_records');
      if (stored) {
        const records: UsageRecord[] = JSON.parse(stored);

        // 清理旧的会话记录，只保留最近30天的
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();
        const recentRecords = records.filter(r => r.startTime >= cutoffTime);

        set({ usageRecords: recentRecords });
        // 如果有清理掉记录，更新存储
        if (recentRecords.length !== records.length) {
          localStorage.setItem('usage_records', JSON.stringify(recentRecords));
        }
        get().calculateStats();
      }

      // 首先尝试加载当前番茄钟状态
      const currentPomodoroState = localStorage.getItem('pomodoro_current_state');
      if (currentPomodoroState) {
        const savedState = JSON.parse(currentPomodoroState);
        set({ pomodoro: savedState });
        
        // 如果番茄钟之前是运行状态，重新启动定时器
        if (savedState.isActive) {
          get().startPomodoro();
        }
      } else {
        // 加载番茄钟设置（仅在没有当前状态时）
        const pomodoroSettings = localStorage.getItem('pomodoro_settings');
        if (pomodoroSettings) {
          const settings = JSON.parse(pomodoroSettings);
          set({
            pomodoro: {
              ...DEFAULT_POMODORO,
              ...settings,
              timeLeft: settings.workDuration * 60
            }
          });
        }
      }
    } catch (error) {
      console.error('加载使用数据失败:', error);
    }
  },

  calculateStats: () => {
    const { dailyStartTime } = get();
    const now = Date.now();
    // 使用本地日期而非 UTC 日期，避免时区问题
    const today = new Date().toLocaleDateString('zh-CN');
    
    // 计算今日应用运行总时长（分钟）
    const todayMinutes = dailyStartTime > 0 ? Math.floor((now - dailyStartTime) / (1000 * 60)) : 0;
    
    // 从localStorage获取历史数据
    const weekData = JSON.parse(localStorage.getItem('weekly_usage') || '{}');
    const monthData = JSON.parse(localStorage.getItem('monthly_usage') || '{}');

    // 清理旧月份数据，只保留当月数据避免无用数据累积
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const cleanedMonthData: Record<string, number> = {};
    Object.entries(monthData).forEach(([dateStr, minutes]) => {
      const date = new Date(dateStr);
      if (date.getFullYear() === currentYear && date.getMonth() === currentMonth) {
        cleanedMonthData[dateStr] = minutes as number;
      }
    });

    // 清理旧周数据，只保留本周数据
    const startOfWeek = new Date();
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    const weekStartStr = startOfWeek.toLocaleDateString('zh-CN');
    const cleanedWeekData: Record<string, number> = {};
    Object.entries(weekData).forEach(([dateStr, minutes]) => {
      const date = new Date(dateStr);
      const weekStart = new Date(startOfWeek);
      if (date >= weekStart) {
        cleanedWeekData[dateStr] = minutes as number;
      }
    });
    
    // 更新今日数据
    const todayUsage: Record<string, number> = { [today]: todayMinutes };
    const updatedWeekData: Record<string, number> = { ...cleanedWeekData, ...todayUsage };
    const updatedMonthData: Record<string, number> = { ...cleanedMonthData, ...todayUsage };
    
    // 计算本周总时长（复用前面的 startOfWeek）
    let weekMinutes = 0;
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      // 使用本地日期字符串
      const dateStr = date.toLocaleDateString('zh-CN');
      weekMinutes += updatedWeekData[dateStr] || 0;
    }

    // 计算本月总时长
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    let monthMinutes = 0;
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(new Date().getFullYear(), new Date().getMonth(), i);
      const dateStr = date.toLocaleDateString('zh-CN');
      monthMinutes += updatedMonthData[dateStr] || 0;
    }
    
    // 计算平均和其他统计
    const allDays = Object.keys(updatedMonthData);
    const activeDays = allDays.filter(date => (updatedMonthData[date] as number) > 0);
    const totalMinutes = Object.values(updatedMonthData).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
    const averageDaily = activeDays.length > 0 ? Math.round(totalMinutes / activeDays.length) : 0;
    const longestSession = Math.max(...Object.values(updatedMonthData).map(v => typeof v === 'number' ? v : 0), 0);
    
    // 保存数据
    localStorage.setItem('weekly_usage', JSON.stringify(updatedWeekData));
    localStorage.setItem('monthly_usage', JSON.stringify(updatedMonthData));

    set({
      stats: {
        today: todayMinutes,
        thisWeek: weekMinutes,
        thisMonth: monthMinutes,
        averageDaily,
        totalSessions: activeDays.length,
        longestSession
      }
    });
  },

  getUsageDetails: (days: number): UsageDetail[] => {
    const { usageRecords } = get();
    const result: UsageDetail[] = [];
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('zh-CN');
      
      const dayRecords = usageRecords.filter(r => r.date === dateStr);
      const totalMinutes = dayRecords.reduce((sum, r) => sum + r.duration, 0);
      
      if (dayRecords.length > 0) {
        const firstUse = new Date(Math.min(...dayRecords.map(r => r.startTime))).toLocaleTimeString('zh-CN', { hour12: false });
        const lastUse = new Date(Math.max(...dayRecords.map(r => r.endTime))).toLocaleTimeString('zh-CN', { hour12: false });
        
        result.push({
          date: dateStr,
          totalMinutes,
          sessions: dayRecords.length,
          firstUse,
          lastUse
        });
      } else {
        result.push({
          date: dateStr,
          totalMinutes: 0,
          sessions: 0
        });
      }
    }
    
    return result;
  },

  startPomodoro: () => {
    const { pomodoro } = get();
    
    // 如果已经在运行，不执行任何操作
    if (pomodoro.isActive) {
      return;
    }

    // 开始或继续
    const newPomodoroState = { ...pomodoro, isActive: true };
    set({ pomodoro: newPomodoroState });
    
    // 保存番茄钟状态到localStorage
    localStorage.setItem('pomodoro_current_state', JSON.stringify(newPomodoroState));

    const interval = setInterval(() => {
      const currentState = get();
      const { pomodoro: currentPomodoro } = currentState;
      
      if (currentPomodoro.timeLeft <= 0) {
        // 时间到，切换模式
        currentState.switchPomodoroMode();
        return;
      }

      const updatedPomodoro = {
        ...currentPomodoro,
        timeLeft: currentPomodoro.timeLeft - 1
      };
      
      set({ pomodoro: updatedPomodoro });
      
      // 每秒保存当前状态
      localStorage.setItem('pomodoro_current_state', JSON.stringify(updatedPomodoro));
    }, 1000);

    set({ pomodoroInterval: interval });
  },

  pausePomodoro: () => {
    const { pomodoro, pomodoroInterval } = get();
    
    const pausedPomodoro = { ...pomodoro, isActive: false };
    set({ pomodoro: pausedPomodoro });
    
    // 保存暂停状态
    localStorage.setItem('pomodoro_current_state', JSON.stringify(pausedPomodoro));

    if (pomodoroInterval) {
      clearInterval(pomodoroInterval);
      set({ pomodoroInterval: null });
    }
  },

  resetPomodoro: () => {
    const { pomodoro, pomodoroInterval } = get();

    if (pomodoroInterval) {
      clearInterval(pomodoroInterval);
      set({ pomodoroInterval: null });
    }

    const resetState = {
      ...pomodoro,
      isActive: false,
      currentMode: 'work' as const,
      timeLeft: pomodoro.workDuration * 60,
      cycle: 0
    };

    set({ pomodoro: resetState });
    
    // 清除持久化的当前状态
    localStorage.removeItem('pomodoro_current_state');
  },

  switchPomodoroMode: () => {
    const { pomodoro, pomodoroInterval } = get();

    if (pomodoroInterval) {
      clearInterval(pomodoroInterval);
      set({ pomodoroInterval: null });
    }

    let newMode: PomodoroState['currentMode'] = 'work';
    let newCycle = pomodoro.cycle;
    let newTimeLeft = pomodoro.workDuration * 60;

    if (pomodoro.currentMode === 'work') {
      newCycle += 1;
      
      if (newCycle % pomodoro.cyclesBeforeLongBreak === 0) {
        newMode = 'longBreak';
        newTimeLeft = pomodoro.longBreakDuration * 60;
        toast.success(`🎉 完成${newCycle}个番茄钟！开始长休息`);
      } else {
        newMode = 'break';
        newTimeLeft = pomodoro.breakDuration * 60;
        toast.success('✅ 番茄钟完成！开始休息');
      }
    } else {
      newMode = 'work';
      newTimeLeft = pomodoro.workDuration * 60;
      toast.success('⏰ 休息结束！开始专注工作');
    }

    const newPomodoroState = {
      ...pomodoro,
      isActive: true,
      currentMode: newMode,
      timeLeft: newTimeLeft,
      cycle: newCycle
    };

    set({ pomodoro: newPomodoroState });
    
    // 保存切换后的状态
    localStorage.setItem('pomodoro_current_state', JSON.stringify(newPomodoroState));

    // 继续下一阶段
    get().startPomodoro();
  },

  updatePomodoroSettings: (settings) => {
    const { pomodoro } = get();
    const newPomodoro = { ...pomodoro, ...settings };
    
    // 如果当前不在运行状态，更新时间
    if (!pomodoro.isActive) {
      newPomodoro.timeLeft = newPomodoro.workDuration * 60;
    }

    set({ pomodoro: newPomodoro });
    
    // 保存设置
    localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
  },

  formatTime: (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  },

  formatMinutes: (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} 分钟`;
    } else {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      if (remainingMinutes === 0) {
        return `${hours} 小时`;
      } else {
        return `${hours} 小时 ${remainingMinutes} 分钟`;
      }
    }
  },

  clearAllData: () => {
    // 停止追踪和番茄钟
    const state = get();
    if (state.pomodoroInterval) {
      clearInterval(state.pomodoroInterval);
    }
    if ((window as any).usageTrackingInterval) {
      clearInterval((window as any).usageTrackingInterval);
      (window as any).usageTrackingInterval = null;
    }

    // 清除所有 localStorage 中的使用数据
    localStorage.removeItem('usage_records');
    localStorage.removeItem('weekly_usage');
    localStorage.removeItem('monthly_usage');
    localStorage.removeItem('daily_start_date');
    localStorage.removeItem('daily_start_time');
    localStorage.removeItem('pomodoro_current_state');
    localStorage.removeItem('pomodoro_settings');

    // 重置内存状态
    set({
      usageRecords: [],
      currentSession: null,
      stats: {
        today: 0,
        thisWeek: 0,
        thisMonth: 0,
        averageDaily: 0,
        totalSessions: 0,
        longestSession: 0
      },
      pomodoro: DEFAULT_POMODORO,
      pomodoroInterval: null,
      isTrackingEnabled: false,
      sessionStartTime: 0,
      dailyStartTime: 0
    });
  }
}));

// 页面可见性变化处理
if (typeof window !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    const store = useUsageStore.getState();
    
    if (document.hidden) {
      // 页面隐藏，暂停追踪但不停止
      if (store.isTrackingEnabled) {
        // 记录隐藏时间，但继续会话
      }
    } else {
      // 页面显示，如果之前在追踪则继续
      if (!store.isTrackingEnabled) {
        store.startTracking();
      }
    }
  });

  // 页面关闭时保存数据
  window.addEventListener('beforeunload', () => {
    const store = useUsageStore.getState();
    if (store.isTrackingEnabled) {
      store.stopTracking();
    }
  });

  // 应用启动时自动开始追踪
  window.addEventListener('load', () => {
    const store = useUsageStore.getState();
    store.loadUsageData();
    store.startTracking();
  });
}
