import { expect, it } from 'vitest';
import type { Task } from '../types';
import { isZenTaskAvailable } from './zenTaskAvailability';
const task: Task = { id: 'a', title: 'Task', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
it('shows all pending recurring occurrences regardless of their deadline', () => {
  for (const dueDate of ['2000-01-01', '2099-11-05', '2099-11-05T01:00:00Z', undefined]) {
    expect(isZenTaskAvailable({ ...task, dueDate, recurrence: { type: 'week', interval: 1 } })).toBe(true);
  }
});
it('excludes completed occurrences while keeping ordinary pending tasks', () => {
  expect(isZenTaskAvailable(task)).toBe(true);
  expect(isZenTaskAvailable({ ...task, completed: true, recurrence: { type: 'day', interval: 1 } })).toBe(false);
});
