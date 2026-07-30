import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const persistenceMocks = vi.hoisted(() => ({
  clearPersistedUsageData: vi.fn(),
  loadPersistedUsageData: vi.fn(),
  savePersistedUsageData: vi.fn(),
}));

vi.mock('../services/usagePersistence', () => persistenceMocks);

import { useUsageStore } from './usageStore';

const defaultPomodoro = { ...useUsageStore.getState().pomodoro };

function localDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toLocaleDateString('zh-CN');
}

function resetStore(): void {
  useUsageStore.setState({
    usageRecords: [],
    currentSession: null,
    stats: {
      today: 0,
      thisWeek: 0,
      thisMonth: 0,
      averageDaily: 0,
      totalSessions: 0,
      longestSession: 0,
    },
    weeklyUsage: {},
    monthlyUsage: {},
    pomodoro: { ...defaultPomodoro },
    pomodoroInterval: null,
    isTrackingEnabled: false,
    isUsageDataLoaded: false,
    sessionStartTime: 0,
    dailyStartTime: 0,
    dailyStartDate: null,
  });
}

describe('usage tracking statistics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 21, 10, 0, 0));
    persistenceMocks.clearPersistedUsageData.mockResolvedValue(true);
    persistenceMocks.savePersistedUsageData.mockResolvedValue(true);
    persistenceMocks.loadPersistedUsageData.mockReset();
    resetStore();
  });

  afterEach(() => {
    useUsageStore.getState().clearAllData();
    vi.clearAllTimers();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('removes impossible 5.0.0 daily totals while preserving valid history', async () => {
    const monday = localDate(2026, 7, 20);
    const today = localDate(2026, 7, 21);
    persistenceMocks.loadPersistedUsageData.mockResolvedValue({
      schemaVersion: 1,
      usageRecords: [],
      weeklyUsage: { [monday]: 127, [today]: 5_586 },
      monthlyUsage: { [monday]: 127, [today]: 5_586 },
      dailyStartDate: localDate(2026, 7, 17),
      dailyStartTime: new Date(2026, 6, 17, 12, 54).getTime(),
      pomodoro: { ...defaultPomodoro },
    });

    await useUsageStore.getState().loadUsageData();

    const state = useUsageStore.getState();
    expect(state.stats).toMatchObject({
      today: 0,
      thisWeek: 127,
      thisMonth: 127,
      averageDaily: 127,
    });
    expect(state.weeklyUsage[today]).toBeUndefined();
    expect(state.monthlyUsage[today]).toBeUndefined();
    expect(state.dailyStartTime).toBe(0);
  });

  it('adds only new whole minutes and never counts the same interval twice', () => {
    const today = localDate(2026, 7, 21);
    useUsageStore.setState({
      isUsageDataLoaded: true,
      weeklyUsage: { [today]: 10 },
      monthlyUsage: { [today]: 10 },
    });

    useUsageStore.getState().startTracking();
    vi.setSystemTime(new Date(2026, 6, 21, 10, 2, 30));
    useUsageStore.getState().calculateStats();
    expect(useUsageStore.getState().stats.today).toBe(12);

    useUsageStore.getState().calculateStats();
    expect(useUsageStore.getState().stats.today).toBe(12);

    vi.setSystemTime(new Date(2026, 6, 21, 10, 3, 0));
    useUsageStore.getState().calculateStats();
    expect(useUsageStore.getState().stats.today).toBe(13);
  });

  it('splits a running session across local calendar days', () => {
    vi.setSystemTime(new Date(2026, 6, 21, 23, 58, 30));
    useUsageStore.setState({ isUsageDataLoaded: true });
    useUsageStore.getState().startTracking();

    vi.setSystemTime(new Date(2026, 6, 22, 0, 0, 30));
    useUsageStore.getState().calculateStats();

    const state = useUsageStore.getState();
    expect(state.weeklyUsage[localDate(2026, 7, 21)]).toBe(1);
    expect(state.weeklyUsage[localDate(2026, 7, 22)]).toBe(1);
    expect(state.stats.today).toBe(1);
  });

  it('does not let a delayed legacy load replace an active session timestamp', async () => {
    const today = localDate(2026, 7, 21);
    let resolveLoad!: (value: unknown) => void;
    persistenceMocks.loadPersistedUsageData.mockReturnValue(new Promise((resolve) => {
      resolveLoad = resolve;
    }));

    useUsageStore.getState().startTracking();
    const loading = useUsageStore.getState().loadUsageData();
    vi.setSystemTime(new Date(2026, 6, 21, 10, 2, 0));
    resolveLoad({
      schemaVersion: 1,
      usageRecords: [],
      weeklyUsage: { [today]: 5_586 },
      monthlyUsage: { [today]: 5_586 },
      dailyStartDate: localDate(2026, 7, 17),
      dailyStartTime: new Date(2026, 6, 17, 12, 54).getTime(),
      pomodoro: { ...defaultPomodoro },
    });
    await loading;

    const state = useUsageStore.getState();
    expect(state.stats.today).toBe(2);
    expect(state.sessionStartTime).toBe(new Date(2026, 6, 21, 10, 2, 0).getTime());
  });
});
