import { create } from 'zustand';
import type { 
  UsageRecord, 
  UsageStats, 
  UsageDetail, 
  PomodoroState,
  UsagePersistedData,
} from '../types';
import {
  clearPersistedUsageData,
  loadPersistedUsageData,
  savePersistedUsageData,
} from '../services/usagePersistence';

interface UsageStore {
  // 使用时长数据
  usageRecords: UsageRecord[];
  currentSession: UsageRecord | null;
  stats: UsageStats;
  weeklyUsage: Record<string, number>;
  monthlyUsage: Record<string, number>;
  
  // 番茄钟状态
  pomodoro: PomodoroState;
  pomodoroInterval: NodeJS.Timeout | null;
  
  // 追踪状态
  isTrackingEnabled: boolean;
  isUsageDataLoaded: boolean;
  sessionStartTime: number;
  dailyStartTime: number; // 兼容旧版持久化字段；新版本不再用它计算时长
  dailyStartDate: string | null;
  
  // Actions
  startTracking: () => void;
  stopTracking: () => void;
  saveCurrentSession: () => void;
  loadUsageData: () => Promise<void>;
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

function getPersistedData(state: UsageStore): UsagePersistedData {
  return {
    schemaVersion: 1,
    usageRecords: state.usageRecords,
    weeklyUsage: state.weeklyUsage,
    monthlyUsage: state.monthlyUsage,
    // 5.0.0 会持久化应用启动时间，并在下次启动后把离线时间也算入使用时长。
    // 保留字段用于兼容旧数据格式，但不再持久化会话中的时间戳。
    dailyStartDate: null,
    dailyStartTime: 0,
    pomodoro: state.pomodoro,
  };
}

function persistUsageState(state: UsageStore): void {
  void savePersistedUsageData(getPersistedData(state));
}

const MINUTE_MS = 60_000;
let usageLoadPromise: Promise<void> | null = null;
let usageTrackingInterval: ReturnType<typeof setInterval> | null = null;

function getLocalDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN');
}

function getStartOfLocalDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function sanitizeStoredMinutes(dateStr: string, value: unknown, now: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) return 0;

  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return 0;

  const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const todayStart = getStartOfLocalDay(now);
  if (dayStart > todayStart) return 0;

  // 单日统计不可能超过一天；当天统计也不可能超过今天已经过去的分钟数。
  // 超出上限的数据来自 5.0.0 的跨天启动时间 bug，无法可靠还原，因此清零。
  const maximum = dayStart === todayStart
    ? Math.ceil((now - todayStart) / MINUTE_MS)
    : 24 * 60;
  const minutes = Math.floor(value);
  return minutes <= maximum ? minutes : 0;
}

function mergeSanitizedUsage(
  weeklyUsage: Record<string, number>,
  monthlyUsage: Record<string, number>,
  now: number,
): Record<string, number> {
  const merged: Record<string, number> = {};

  for (const source of [monthlyUsage, weeklyUsage]) {
    for (const [dateStr, value] of Object.entries(source)) {
      const minutes = sanitizeStoredMinutes(dateStr, value, now);
      if (minutes > 0) merged[dateStr] = Math.max(merged[dateStr] ?? 0, minutes);
    }
  }

  return merged;
}

function addElapsedMinutes(
  usage: Record<string, number>,
  startTime: number,
  now: number,
): number {
  if (startTime <= 0 || startTime > now) return now;

  const elapsedMinutes = Math.floor((now - startTime) / MINUTE_MS);
  for (let index = 0; index < elapsedMinutes; index += 1) {
    // 按每个完整分钟的中点归属本地日期，避免跨午夜的时长全部落到当天。
    const dateStr = getLocalDate(startTime + index * MINUTE_MS + MINUTE_MS / 2);
    usage[dateStr] = (usage[dateStr] ?? 0) + 1;
  }

  // 只推进已经记账的完整分钟，保留不足一分钟的余量。
  return startTime + elapsedMinutes * MINUTE_MS;
}

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
  weeklyUsage: {},
  monthlyUsage: {},
  
  pomodoro: DEFAULT_POMODORO,
  pomodoroInterval: null,
  
  isTrackingEnabled: false,
  isUsageDataLoaded: false,
  sessionStartTime: 0,
  dailyStartTime: 0,
  dailyStartDate: null,

  startTracking: () => {
    if (get().isTrackingEnabled) return;

    const now = Date.now();
    const today = getLocalDate(now);

    set({
      isTrackingEnabled: true,
      sessionStartTime: now,
      dailyStartTime: now,
      dailyStartDate: today,
    });
    persistUsageState(get());

    // 每分钟更新一次统计
    const trackingInterval = setInterval(() => {
      const state = get();
      if (state.isTrackingEnabled) {
        state.calculateStats();
      }
    }, 60000); // 每分钟检查一次

    // 保存interval引用用于清理
    usageTrackingInterval = trackingInterval;
  },

  stopTracking: () => {
    const state = get();

    // 先把最后一个完整分钟计入统计，再结束本次会话。
    if (state.isTrackingEnabled) state.calculateStats();
    
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
        set({
          usageRecords: updatedRecords,
          currentSession: null,
          isTrackingEnabled: false,
          sessionStartTime: 0
        });

        state.calculateStats();
      }
    }

    // 清理tracking interval
    if (usageTrackingInterval) {
      clearInterval(usageTrackingInterval);
      usageTrackingInterval = null;
    }

    set({
      isTrackingEnabled: false,
      currentSession: null,
      sessionStartTime: 0
    });
    persistUsageState(get());
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
      
      set({ usageRecords: existingRecords });
      persistUsageState(get());
    }
  },

  loadUsageData: async () => {
    if (get().isUsageDataLoaded) return;
    if (usageLoadPromise) return usageLoadPromise;

    usageLoadPromise = (async () => {
      try {
        const persisted = await loadPersistedUsageData(DEFAULT_POMODORO);
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const cutoffTime = thirtyDaysAgo.getTime();
        const recentRecords = persisted.usageRecords.filter(r => r.startTime >= cutoffTime);
        const shouldResumePomodoro = persisted.pomodoro.isActive;

        set({
          usageRecords: recentRecords,
          weeklyUsage: persisted.weeklyUsage,
          monthlyUsage: persisted.monthlyUsage,
          isUsageDataLoaded: true,
          pomodoro: shouldResumePomodoro
            ? { ...persisted.pomodoro, isActive: false }
            : persisted.pomodoro,
        });

        // 不恢复旧版 dailyStartTime；它是造成跨天、离线时间被累计的根源。
        get().calculateStats();
        if (shouldResumePomodoro) get().startPomodoro();
      } catch (error) {
        console.error('加载使用数据失败:', error);
      } finally {
        usageLoadPromise = null;
      }
    })();

    return usageLoadPromise;
  },

  calculateStats: () => {
    const {
      isTrackingEnabled,
      sessionStartTime,
      weeklyUsage,
      monthlyUsage,
    } = get();
    const now = Date.now();
    const today = getLocalDate(now);
    const dailyUsage = mergeSanitizedUsage(weeklyUsage, monthlyUsage, now);
    const nextSessionStartTime = isTrackingEnabled
      ? addElapsedMinutes(dailyUsage, sessionStartTime, now)
      : sessionStartTime;
    
    // 清理旧月份数据，只保留当月数据避免无用数据累积
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const cleanedMonthData: Record<string, number> = {};
    Object.entries(dailyUsage).forEach(([dateStr, minutes]) => {
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
    startOfWeek.setHours(0, 0, 0, 0);
    const cleanedWeekData: Record<string, number> = {};
    Object.entries(dailyUsage).forEach(([dateStr, minutes]) => {
      const date = new Date(dateStr);
      const weekStart = new Date(startOfWeek);
      if (date >= weekStart) {
        cleanedWeekData[dateStr] = minutes as number;
      }
    });
    
    const updatedWeekData = cleanedWeekData;
    const updatedMonthData = cleanedMonthData;
    const todayMinutes = dailyUsage[today] ?? 0;
    
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
    
    set({
      weeklyUsage: updatedWeekData,
      monthlyUsage: updatedMonthData,
      sessionStartTime: nextSessionStartTime,
      dailyStartDate: isTrackingEnabled ? getLocalDate(nextSessionStartTime) : null,
      dailyStartTime: isTrackingEnabled ? nextSessionStartTime : 0,
      stats: {
        today: todayMinutes,
        thisWeek: weekMinutes,
        thisMonth: monthMinutes,
        averageDaily,
        totalSessions: activeDays.length,
        longestSession
      }
    });
    persistUsageState(get());
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
    
    persistUsageState(get());

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
      
      if (updatedPomodoro.timeLeft % 5 === 0) persistUsageState(get());
    }, 1000);

    set({ pomodoroInterval: interval });
  },

  pausePomodoro: () => {
    const { pomodoro, pomodoroInterval } = get();
    
    const pausedPomodoro = { ...pomodoro, isActive: false };
    set({ pomodoro: pausedPomodoro });
    
    persistUsageState(get());

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
    
    persistUsageState(get());
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
      } else {
        newMode = 'break';
        newTimeLeft = pomodoro.breakDuration * 60;
      }
    } else {
      newMode = 'work';
      newTimeLeft = pomodoro.workDuration * 60;
    }

    const newPomodoroState = {
      ...pomodoro,
      isActive: true,
      currentMode: newMode,
      timeLeft: newTimeLeft,
      cycle: newCycle
    };

    set({ pomodoro: newPomodoroState });
    
    persistUsageState(get());

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
    
    persistUsageState(get());
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
    if (usageTrackingInterval) {
      clearInterval(usageTrackingInterval);
      usageTrackingInterval = null;
    }

    void clearPersistedUsageData();

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
      weeklyUsage: {},
      monthlyUsage: {},
      pomodoro: DEFAULT_POMODORO,
      pomodoroInterval: null,
      isTrackingEnabled: false,
      isUsageDataLoaded: true,
      sessionStartTime: 0,
      dailyStartTime: 0,
      dailyStartDate: null,
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
  window.addEventListener('load', async () => {
    const store = useUsageStore.getState();
    await store.loadUsageData();
    useUsageStore.getState().startTracking();
  });
}
