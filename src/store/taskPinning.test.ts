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

  it('includes completed cards after pending cards in all, including pinned cards', () => {
    const tasks = [
      task({ id: 'normal-completed', title: '普通已完成', completed: true }),
      task({ id: 'normal-pending', title: '普通未完成' }),
      task({ id: 'pinned-completed', title: '置顶已完成', completed: true, isPinned: true }),
    ];

    expect(getFilteredTasks(tasks, 'all', '', { field: 'createdAt', order: 'desc' }).map(item => item.id))
      .toEqual(['normal-pending', 'pinned-completed', 'normal-completed']);
    expect(getFilteredTasks(tasks, 'completed', '', { field: 'createdAt', order: 'desc' }).map(item => item.id))
      .toEqual(['pinned-completed', 'normal-completed']);
    const today = new Date().toISOString();
    expect(getFilteredTasks(tasks.map(item => ({ ...item, dueDate: today })), 'today', '', { field: 'createdAt', order: 'desc' }).map(item => item.id))
      .toEqual(['normal-pending']);
  });

  it.each(['createdAt', 'updatedAt', 'dueDate', 'priority'] as const)('preserves %s sorting and pinning within both completion groups', field => {
    const tasks = [true, false].flatMap(completed => [4, 1, 3, 2].map(rank => task({
      id: `${completed ? 'done' : 'pending'}-${rank}`, title: `任务 ${rank}`, completed,
      isPinned: rank <= 2, priority: rank % 2 === 1 ? 'low' : 'high',
      createdAt: `2026-07-${10 + rank}T08:00:00Z`, updatedAt: `2026-07-${10 + rank}T09:00:00Z`, dueDate: `2026-08-${10 + rank}T10:00`,
    })));
    const originalOrder = tasks.map(item => item.id);
    for (const order of ['asc', 'desc'] as const) {
      const ranks = order === 'asc' ? [1, 2, 3, 4] : [2, 1, 4, 3];
      expect(getFilteredTasks(tasks, 'all', '', { field, order }).map(item => item.id))
        .toEqual(['pending', 'done'].flatMap(status => ranks.map(rank => `${status}-${rank}`)));
    }
    expect(tasks.map(item => item.id)).toEqual(originalOrder);
    expect(getFilteredTasks(tasks, 'all', '任务 4', { field, order: 'asc' }).map(item => item.id)).toEqual(['pending-4', 'done-4']);
  });
});
