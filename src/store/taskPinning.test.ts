import { describe, expect, it } from 'vitest';
import type { Task } from '../types';
import { getFilteredTasks } from './taskStore';

function task(overrides: Partial<Task> & Pick<Task, 'id' | 'title'>): Task {
  return {
    completed: false,
    priority: 'medium',
    createdAt: '2026-07-17T08:00:00Z',
    updatedAt: '2026-07-17T08:00:00Z',
    ...overrides,
  };
}

describe('task pinning order', () => {
  it('keeps pinned cards ahead of normal cards while retaining the selected sort', () => {
    const tasks = [
      task({ id: 'normal-new', title: '普通新任务', createdAt: '2026-07-17T10:00:00Z' }),
      task({ id: 'pinned-old', title: '置顶旧任务', createdAt: '2026-07-15T10:00:00Z', isPinned: true }),
      task({ id: 'pinned-new', title: '置顶新任务', createdAt: '2026-07-16T10:00:00Z', isPinned: true }),
    ];

    expect(getFilteredTasks(tasks, 'pending', '', { field: 'createdAt', order: 'desc' }).map(item => item.id))
      .toEqual(['pinned-new', 'pinned-old', 'normal-new']);
  });

  it('keeps normal completed cards at the end of the all view', () => {
    const tasks = [
      task({ id: 'normal-completed', title: '普通已完成', completed: true }),
      task({ id: 'normal-pending', title: '普通未完成' }),
      task({ id: 'pinned-completed', title: '置顶已完成', completed: true, isPinned: true }),
    ];

    expect(getFilteredTasks(tasks, 'all', '', { field: 'createdAt', order: 'desc' }).map(item => item.id))
      .toEqual(['pinned-completed', 'normal-pending', 'normal-completed']);
  });
});
