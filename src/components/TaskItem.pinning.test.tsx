// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types';
import TaskItem from './TaskItem';

const updateTask = vi.fn().mockResolvedValue(undefined);

vi.mock('../store/taskStore', () => ({
  useTaskStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    toggleTaskComplete: vi.fn(),
    deleteTask: vi.fn(),
    updateTask,
    editingTaskId: null,
    setEditingTaskId: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  updateTask.mockClear();
});

const baseTask: Task = {
  id: 'focus',
  title: '长期关注事项',
  completed: false,
  priority: 'high',
  createdAt: '2026-07-17T08:00:00Z',
  updatedAt: '2026-07-17T08:00:00Z',
};

describe('TaskItem pin action', () => {
  it('pins an unpinned task from the card', () => {
    render(<MemoryRouter><TaskItem task={baseTask} /></MemoryRouter>);

    fireEvent.mouseEnter(screen.getByTitle('点击查看详情'));
    fireEvent.click(screen.getByRole('button', { name: '置顶待办' }));
    expect(updateTask).toHaveBeenCalledWith('focus', { isPinned: true });
  });

  it('shows a clickable pinned marker beside the task title', () => {
    render(<MemoryRouter><TaskItem task={{ ...baseTask, isPinned: true }} /></MemoryRouter>);

    const title = screen.getByRole('heading', { name: '长期关注事项' });
    const pinButton = screen.getByRole('button', { name: '取消置顶' });

    expect(title.parentElement).toContainElement(pinButton);
    expect(pinButton).toHaveClass('text-primary');
    expect(pinButton.querySelector('svg')).toHaveClass('fill-current');

    fireEvent.click(pinButton);
    expect(updateTask).toHaveBeenCalledWith('focus', { isPinned: false });
  });

  it('does not restyle the whole card when pinned', () => {
    render(<MemoryRouter><TaskItem task={{ ...baseTask, isPinned: true }} /></MemoryRouter>);

    expect(screen.getByTitle('点击查看详情')).not.toHaveClass(
      'ring-1',
      'ring-amber-400/60',
      'border-amber-400/50',
    );
  });

  it('keeps edit and delete actions hidden until the pinned card is hovered', () => {
    render(<MemoryRouter><TaskItem task={{ ...baseTask, isPinned: true }} /></MemoryRouter>);

    const card = screen.getByTitle('点击查看详情');
    const editButton = screen.getByRole('button', { name: '编辑待办' });
    const deleteButton = screen.getByRole('button', { name: '删除待办' });
    const actions = editButton.parentElement;

    expect(actions).toHaveClass('opacity-0');
    expect(actions).toContainElement(deleteButton);
    expect(actions).not.toContainElement(screen.getByRole('button', { name: '取消置顶' }));

    fireEvent.mouseEnter(card);
    expect(actions).toHaveClass('opacity-100');
  });
});
