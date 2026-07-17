import type { PomodoroState, UsagePersistedData, UsageRecord } from '../types';
import { api } from '../api/tauri';

type StorageAdapter = Pick<Storage, 'getItem' | 'removeItem'>;

export const LEGACY_USAGE_KEYS = [
  'usage_records',
  'weekly_usage',
  'monthly_usage',
  'daily_start_date',
  'daily_start_time',
  'pomodoro_current_state',
  'pomodoro_settings',
] as const;

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseNumberMap(value: string | null): Record<string, number> {
  const parsed = parseJson<unknown>(value, {});
  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') return {};

  return Object.fromEntries(
    Object.entries(parsed).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}

function parseRecords(value: string | null): UsageRecord[] {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed as UsageRecord[] : [];
}

export function createDefaultUsageData(defaultPomodoro: PomodoroState): UsagePersistedData {
  return {
    schemaVersion: 1,
    usageRecords: [],
    weeklyUsage: {},
    monthlyUsage: {},
    dailyStartDate: null,
    dailyStartTime: 0,
    pomodoro: { ...defaultPomodoro },
  };
}

export function normalizeUsageData(
  data: Partial<UsagePersistedData> | null | undefined,
  defaultPomodoro: PomodoroState,
): UsagePersistedData {
  const defaults = createDefaultUsageData(defaultPomodoro);
  if (!data) return defaults;

  return {
    schemaVersion: 1,
    usageRecords: Array.isArray(data.usageRecords) ? data.usageRecords : [],
    weeklyUsage: data.weeklyUsage && typeof data.weeklyUsage === 'object' ? data.weeklyUsage : {},
    monthlyUsage: data.monthlyUsage && typeof data.monthlyUsage === 'object' ? data.monthlyUsage : {},
    dailyStartDate: typeof data.dailyStartDate === 'string' ? data.dailyStartDate : null,
    dailyStartTime: typeof data.dailyStartTime === 'number' && Number.isFinite(data.dailyStartTime)
      ? data.dailyStartTime
      : 0,
    pomodoro: { ...defaultPomodoro, ...(data.pomodoro ?? {}) },
  };
}

export function readLegacyUsageData(
  storage: StorageAdapter,
  defaultPomodoro: PomodoroState,
): UsagePersistedData | null {
  const hasLegacyData = LEGACY_USAGE_KEYS.some((key) => storage.getItem(key) !== null);
  if (!hasLegacyData) return null;

  const pomodoroSettings = parseJson<Partial<PomodoroState>>(storage.getItem('pomodoro_settings'), {});
  const savedPomodoro = parseJson<Partial<PomodoroState> | null>(
    storage.getItem('pomodoro_current_state'),
    null,
  );
  const rawDailyStartTime = Number.parseInt(storage.getItem('daily_start_time') ?? '', 10);

  return {
    schemaVersion: 1,
    usageRecords: parseRecords(storage.getItem('usage_records')),
    weeklyUsage: parseNumberMap(storage.getItem('weekly_usage')),
    monthlyUsage: parseNumberMap(storage.getItem('monthly_usage')),
    dailyStartDate: storage.getItem('daily_start_date'),
    dailyStartTime: Number.isFinite(rawDailyStartTime) ? rawDailyStartTime : 0,
    pomodoro: {
      ...defaultPomodoro,
      ...pomodoroSettings,
      ...(savedPomodoro ?? {}),
    },
  };
}

export function clearLegacyUsageData(storage: StorageAdapter): void {
  for (const key of LEGACY_USAGE_KEYS) {
    storage.removeItem(key);
  }
}

export async function loadPersistedUsageData(
  defaultPomodoro: PomodoroState,
  storage: StorageAdapter = localStorage,
): Promise<UsagePersistedData> {
  const response = await api.usage.getUsageData();
  if (response.success && response.data) {
    return normalizeUsageData(response.data, defaultPomodoro);
  }

  const legacyData = readLegacyUsageData(storage, defaultPomodoro);
  if (!legacyData) return createDefaultUsageData(defaultPomodoro);

  const migrationResponse = await api.usage.saveUsageData(legacyData);
  if (migrationResponse.success) clearLegacyUsageData(storage);
  return legacyData;
}

export async function savePersistedUsageData(data: UsagePersistedData): Promise<boolean> {
  const response = await api.usage.saveUsageData(data);
  if (!response.success) console.error('保存使用数据失败:', response.error);
  return response.success;
}

export async function clearPersistedUsageData(storage: StorageAdapter = localStorage): Promise<boolean> {
  const response = await api.usage.clearUsageData();
  if (response.success) clearLegacyUsageData(storage);
  return response.success;
}
