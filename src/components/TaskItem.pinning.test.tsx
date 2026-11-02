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

  it.each([
    ['high', '#F05A28', '#BE1E2D'],
    ['medium', '#F5C518', '#D4A017'],
    ['low', '#7BCF3B', '#4F9A18'],
  ] as const)('shows a clickable %s priority pin outside the title flow', (priority, light, dark) => {
    render(<MemoryRouter><TaskItem task={{ ...baseTask, priority, isPinned: true }} /></MemoryRouter>);

    const title = screen.getByRole('heading', { name: '长期关注事项' });
    const pinButton = screen.getByRole('button', { name: '取消置顶' });

    expect(title.parentElement).not.toContainElement(pinButton);
    expect(screen.getByTitle('点击查看详情')).toContainElement(pinButton);
    expect(pinButton).toHaveClass('task-corner-pin');
    const icon = pinButton.querySelector('.task-pin-icon');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
    expect(icon?.querySelector('g')).toHaveAttribute('transform', 'rotate(35 16 16)');
    expect(icon?.querySelector('g > path:first-child')).toHaveAttribute('fill', light);
    expect(icon?.querySelector('g > path:nth-child(2)')).toHaveAttribute('fill', dark);
    expect(screen.getByTitle('点击查看详情').querySelector('.task-pin-fold')).toBeNull();

    fireEvent.click(pinButton);
    expect(updateTask).toHaveBeenCalledWith('focus', { isPinned: false });
  });

  it('keeps shadow references independent for multiple pinned cards', () => {
    const { container } = render(<MemoryRouter>
      <TaskItem task={{ ...baseTask, isPinned: true }} />
      <TaskItem task={{ ...baseTask, id: 'second', isPinned: true, priority: 'low' }} />
    </MemoryRouter>);
    const icons = [...container.querySelectorAll('.task-pin-icon')];
    const ids = icons.map(icon => icon.querySelector('filter')?.id);
    expect(new Set(ids).size).toBe(2);
    icons.forEach((icon, index) => expect(icon.querySelector('g')).toHaveAttribute('filter', `url(#${ids[index]})`));
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
