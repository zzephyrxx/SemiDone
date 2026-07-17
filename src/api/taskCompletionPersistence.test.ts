// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types';
import { taskApi } from './localStorage';

const STORAGE_KEY = 'windows-todo-tasks';

function storedTask(): Task {
  return {
    id: 'task-1',
    title: '需要完成的任务',
    completed: false,
    priority: 'medium',
    createdAt: '2026-07-01T08:00:00.000Z',
    updatedAt: '2026-07-01T08:00:00.000Z',
  };
}

describe('browser task completion persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEY, JSON.stringify([storedTask()]));
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('records a stable completedAt timestamp and preserves it during later edits', async () => {
    vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
    const completed = await taskApi.updateTask('task-1', { completed: true });

    expect(completed.data).toMatchObject({
      completed: true,
      completedAt: '2026-07-15T10:00:00.000Z',
    });

    vi.setSystemTime(new Date('2026-07-20T10:00:00.000Z'));
    const edited = await taskApi.updateTask('task-1', { title: '完成后修改标题' });

    expect(edited.data?.completedAt).toBe('2026-07-15T10:00:00.000Z');
    expect(edited.data?.updatedAt).toBe('2026-07-20T10:00:00.000Z');
  });

  it('clears completedAt when a task is marked pending again', async () => {
    vi.setSystemTime(new Date('2026-07-15T10:00:00.000Z'));
    await taskApi.updateTask('task-1', { completed: true });

    const reopened = await taskApi.updateTask('task-1', { completed: false });

    expect(reopened.data?.completed).toBe(false);
    expect(reopened.data?.completedAt).toBeUndefined();
  });
});
