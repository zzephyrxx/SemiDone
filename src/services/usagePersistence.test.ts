import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PomodoroState } from '../types';

const usageApiMocks = vi.hoisted(() => ({
  getUsageData: vi.fn(),
  saveUsageData: vi.fn(),
  clearUsageData: vi.fn(),
}));

vi.mock('../api/tauri', () => ({
  api: { usage: usageApiMocks },
}));

import {
  LEGACY_USAGE_KEYS,
  clearLegacyUsageData,
  clearPersistedUsageData,
  loadPersistedUsageData,
  normalizeUsageData,
  readLegacyUsageData,
  savePersistedUsageData,
} from './usagePersistence';

class MemoryStorage implements Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }
}

const defaultPomodoro: PomodoroState = {
  isActive: false,
  currentMode: 'work',
  timeLeft: 1500,
  cycle: 0,
  workDuration: 25,
  breakDuration: 5,
  longBreakDuration: 15,
  cyclesBeforeLongBreak: 4,
};

describe('legacy usage migration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when no legacy usage data exists', () => {
    const storage = new MemoryStorage();

    expect(readLegacyUsageData(storage, defaultPomodoro)).toBeNull();
  });

  it('combines all legacy keys into one versioned usage document', () => {
    const storage = new MemoryStorage();
    storage.setItem('usage_records', JSON.stringify([
      { id: 'record-1', date: '2026/7/16', startTime: 10, endTime: 20, duration: 1, type: 'active' },
    ]));
    storage.setItem('weekly_usage', JSON.stringify({ '2026/7/16': 12 }));
    storage.setItem('monthly_usage', JSON.stringify({ '2026/7/16': 12 }));
    storage.setItem('daily_start_date', '2026/7/16');
    storage.setItem('daily_start_time', '12345');
    storage.setItem('pomodoro_current_state', JSON.stringify({ ...defaultPomodoro, timeLeft: 900 }));

    expect(readLegacyUsageData(storage, defaultPomodoro)).toEqual({
      schemaVersion: 1,
      usageRecords: [
        { id: 'record-1', date: '2026/7/16', startTime: 10, endTime: 20, duration: 1, type: 'active' },
      ],
      weeklyUsage: { '2026/7/16': 12 },
      monthlyUsage: { '2026/7/16': 12 },
      dailyStartDate: '2026/7/16',
      dailyStartTime: 12345,
      pomodoro: { ...defaultPomodoro, timeLeft: 900 },
    });
  });

  it('uses safe defaults when legacy JSON is malformed', () => {
    const storage = new MemoryStorage();
    storage.setItem('usage_records', '{not-json');
    storage.setItem('weekly_usage', '[]');
    storage.setItem('daily_start_time', 'not-a-number');

    expect(readLegacyUsageData(storage, defaultPomodoro)).toEqual({
      schemaVersion: 1,
      usageRecords: [],
      weeklyUsage: {},
      monthlyUsage: {},
      dailyStartDate: null,
      dailyStartTime: 0,
      pomodoro: defaultPomodoro,
    });
  });

  it('removes legacy keys only after migration succeeds', () => {
    const storage = new MemoryStorage();
    for (const key of LEGACY_USAGE_KEYS) {
      storage.setItem(key, 'legacy');
    }

    clearLegacyUsageData(storage);

    for (const key of LEGACY_USAGE_KEYS) {
      expect(storage.getItem(key)).toBeNull();
    }
  });

  it('normalizes incomplete persisted data', () => {
    expect(normalizeUsageData({ dailyStartTime: Number.NaN }, defaultPomodoro)).toEqual({
      schemaVersion: 1,
      usageRecords: [],
      weeklyUsage: {},
      monthlyUsage: {},
      dailyStartDate: null,
      dailyStartTime: 0,
      pomodoro: defaultPomodoro,
    });
  });

  it('prefers the canonical usage document over legacy keys', async () => {
    const storage = new MemoryStorage();
    storage.setItem('weekly_usage', JSON.stringify({ legacy: 10 }));
    usageApiMocks.getUsageData.mockResolvedValue({
      success: true,
      data: { schemaVersion: 1, weeklyUsage: { canonical: 20 } },
    });

    const result = await loadPersistedUsageData(defaultPomodoro, storage);

    expect(result.weeklyUsage).toEqual({ canonical: 20 });
    expect(usageApiMocks.saveUsageData).not.toHaveBeenCalled();
    expect(storage.getItem('weekly_usage')).not.toBeNull();
  });

  it('migrates legacy data and removes old keys after a successful save', async () => {
    const storage = new MemoryStorage();
    storage.setItem('weekly_usage', JSON.stringify({ legacy: 10 }));
    usageApiMocks.getUsageData.mockResolvedValue({ success: true, data: null });
    usageApiMocks.saveUsageData.mockResolvedValue({ success: true, data: true });

    const result = await loadPersistedUsageData(defaultPomodoro, storage);

    expect(result.weeklyUsage).toEqual({ legacy: 10 });
    expect(usageApiMocks.saveUsageData).toHaveBeenCalledWith(result);
    expect(storage.getItem('weekly_usage')).toBeNull();
  });

  it('keeps legacy keys when the canonical save fails', async () => {
    const storage = new MemoryStorage();
    storage.setItem('weekly_usage', JSON.stringify({ legacy: 10 }));
    usageApiMocks.getUsageData.mockResolvedValue({ success: false, error: 'offline' });
    usageApiMocks.saveUsageData.mockResolvedValue({ success: false, error: 'write failed' });

    await loadPersistedUsageData(defaultPomodoro, storage);

    expect(storage.getItem('weekly_usage')).not.toBeNull();
  });

  it('delegates save and clear operations to the canonical API', async () => {
    const storage = new MemoryStorage();
    storage.setItem('usage_records', 'legacy');
    const data = readLegacyUsageData(storage, defaultPomodoro)!;
    usageApiMocks.saveUsageData.mockResolvedValue({ success: true, data: true });
    usageApiMocks.clearUsageData.mockResolvedValue({ success: true, data: true });

    await expect(savePersistedUsageData(data)).resolves.toBe(true);
    await expect(clearPersistedUsageData(storage)).resolves.toBe(true);
    expect(storage.getItem('usage_records')).toBeNull();
  });
});
