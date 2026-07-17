import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  buildMonthCalendar,
  getCompletedTasksInPeriod,
  getPeriodBounds,
  getTaskCompletionDate,
  toLocalDateKey,
} from './taskCalendar';

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    title: overrides.title ?? '测试任务',
    completed: overrides.completed ?? true,
    priority: overrides.priority ?? 'medium',
    createdAt: overrides.createdAt ?? '2026-07-01T08:00:00+08:00',
    updatedAt: overrides.updatedAt ?? '2026-07-01T09:00:00+08:00',
    ...overrides,
  };
}

describe('task calendar data', () => {
  it('uses completedAt and only falls back to updatedAt for legacy completed tasks', () => {
    const modern = task({
      completedAt: '2026-07-02T10:00:00+08:00',
      updatedAt: '2026-07-10T10:00:00+08:00',
    });
    const legacy = task({ completedAt: undefined, updatedAt: '2026-07-03T10:00:00+08:00' });
    const pending = task({ completed: false, completedAt: undefined });

    expect(toLocalDateKey(getTaskCompletionDate(modern)!)).toBe('2026-07-02');
    expect(toLocalDateKey(getTaskCompletionDate(legacy)!)).toBe('2026-07-03');
    expect(getTaskCompletionDate(pending)).toBeNull();
  });

  it('calculates day, week and month ranges using Monday as the first weekday', () => {
    const anchor = new Date(2026, 6, 15, 12);

    expect(getPeriodBounds('day', anchor)).toMatchObject({
      start: new Date(2026, 6, 15),
      end: new Date(2026, 6, 15, 23, 59, 59, 999),
    });
    expect(toLocalDateKey(getPeriodBounds('week', anchor).start)).toBe('2026-07-13');
    expect(toLocalDateKey(getPeriodBounds('week', anchor).end)).toBe('2026-07-19');
    expect(toLocalDateKey(getPeriodBounds('month', anchor).start)).toBe('2026-07-01');
    expect(toLocalDateKey(getPeriodBounds('month', anchor).end)).toBe('2026-07-31');
  });

  it('returns only completed tasks inside the selected period', () => {
    const tasks = [
      task({ id: 'inside', completedAt: '2026-07-15T10:00:00+08:00' }),
      task({ id: 'outside', completedAt: '2026-06-30T10:00:00+08:00' }),
      task({ id: 'pending', completed: false }),
    ];

    expect(getCompletedTasksInPeriod(tasks, 'month', new Date(2026, 6, 15)).map(item => item.id))
      .toEqual(['inside']);
  });

  it('builds a stable six-week month grid with per-day completion counts', () => {
    const cells = buildMonthCalendar(new Date(2026, 6, 15), [
      task({ id: 'one', completedAt: '2026-07-01T08:00:00+08:00' }),
      task({ id: 'two', completedAt: '2026-07-01T09:00:00+08:00' }),
    ]);

    expect(cells).toHaveLength(42);
    expect(toLocalDateKey(cells[0].date)).toBe('2026-06-29');
    expect(toLocalDateKey(cells[41].date)).toBe('2026-08-09');
    expect(cells.find(cell => cell.key === '2026-07-01')).toMatchObject({
      count: 2,
      inCurrentMonth: true,
    });
  });
});
