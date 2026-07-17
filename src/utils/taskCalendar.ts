import {
  addDays,
  endOfDay,
  endOfMonth,
  endOfWeek,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import type { Task } from '../types';

export type TaskCalendarView = 'week' | 'month';
type TaskCalendarPeriod = 'day' | TaskCalendarView;

export interface TaskCalendarCell {
  date: Date;
  key: string;
  count: number;
  tasks: Task[];
  inCurrentMonth: boolean;
}

export function toLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTaskCompletionDate(task: Task): Date | null {
  if (!task.completed) return null;
  const value = task.completedAt ?? task.updatedAt;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getPeriodBounds(view: TaskCalendarPeriod, anchor: Date): { start: Date; end: Date } {
  switch (view) {
    case 'day':
      return { start: startOfDay(anchor), end: endOfDay(anchor) };
    case 'week':
      return {
        start: startOfWeek(anchor, { weekStartsOn: 1 }),
        end: endOfWeek(anchor, { weekStartsOn: 1 }),
      };
    case 'month':
      return { start: startOfMonth(anchor), end: endOfMonth(anchor) };
  }
}

export function getCompletedTasksInPeriod(
  tasks: Task[],
  view: TaskCalendarPeriod,
  anchor: Date,
): Task[] {
  const { start, end } = getPeriodBounds(view, anchor);
  return tasks
    .filter((task) => {
      const completedAt = getTaskCompletionDate(task);
      return completedAt !== null && completedAt >= start && completedAt <= end;
    })
    .sort((a, b) => getTaskCompletionDate(b)!.getTime() - getTaskCompletionDate(a)!.getTime());
}

function groupCompletedTasksByDate(tasks: Task[]): Map<string, Task[]> {
  const grouped = new Map<string, Task[]>();
  for (const task of tasks) {
    const completedAt = getTaskCompletionDate(task);
    if (!completedAt) continue;
    const key = toLocalDateKey(completedAt);
    const dayTasks = grouped.get(key) ?? [];
    dayTasks.push(task);
    grouped.set(key, dayTasks);
  }
  return grouped;
}

export function buildMonthCalendar(anchor: Date, tasks: Task[]): TaskCalendarCell[] {
  const monthStart = startOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const grouped = groupCompletedTasksByDate(tasks);

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(gridStart, index);
    const key = toLocalDateKey(date);
    const dayTasks = grouped.get(key) ?? [];
    return {
      date,
      key,
      count: dayTasks.length,
      tasks: dayTasks,
      inCurrentMonth: date.getMonth() === anchor.getMonth(),
    };
  });
}
