// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types';
import { TaskCalendarContent } from './TaskCalendar';

beforeEach(() => localStorage.removeItem('semidone-calendar-view'));
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

const tasks: Task[] = [
  {
    id: 'one',
    title: '写完日历视图',
    completed: true,
    priority: 'high',
    createdAt: '2026-07-01T08:00:00+08:00',
    updatedAt: '2026-07-01T09:00:00+08:00',
    completedAt: '2026-07-15T10:00:00+08:00',
  },
  {
    id: 'two',
    title: '补齐测试',
    completed: true,
    priority: 'medium',
    createdAt: '2026-07-01T08:00:00+08:00',
    updatedAt: '2026-07-01T09:00:00+08:00',
    completedAt: '2026-07-16T10:00:00+08:00',
  },
  {
    id: 'pending',
    title: '未完成任务',
    completed: false,
    priority: 'low',
    createdAt: '2026-07-01T08:00:00+08:00',
    updatedAt: '2026-07-01T09:00:00+08:00',
  },
];

describe('TaskCalendarContent', () => {
  it('renders a month calendar with completion counts and task details', () => {
    render(
      <MemoryRouter>
        <TaskCalendarContent tasks={tasks} initialAnchor={new Date(2026, 6, 15)} />
      </MemoryRouter>,
    );

    const views = screen.getByRole('group', { name: '日历视图' });
    expect(views).toBeVisible();
    expect(views.closest('section')).not.toBeNull();
    expect(screen.queryByText('任务视图')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '月视图' }));
    expect(screen.getByText('2026年7月')).toBeVisible();
    expect(screen.getByText('本月完成')).toBeVisible();
    expect(screen.getByText('写完日历视图')).toBeVisible();
    expect(screen.getByRole('button', { name: '7月15日，完成1项' })).toBeVisible();
  });

  it('only provides week and month views', () => {
    render(
      <MemoryRouter>
        <TaskCalendarContent tasks={tasks} initialAnchor={new Date(2026, 6, 15)} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('button', { name: '月视图' })).toBeVisible();
    expect(screen.queryByRole('button', { name: '日视图' })).not.toBeInTheDocument();

    expect(screen.getByRole('button', { name: '周视图' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('7月13日 - 7月19日')).toBeVisible();
    expect(screen.getByText('本周完成')).toBeVisible();
  });
});

it('remembers both view choices across page remounts', () => {
  const calendar = () => <MemoryRouter><TaskCalendarContent tasks={tasks} initialAnchor={new Date(2026, 6, 15)} /></MemoryRouter>;
  let view = render(calendar());
  fireEvent.click(screen.getByRole('button', { name: '月视图' }));
  view.unmount();
  view = render(calendar());
  expect(screen.getByRole('button', { name: '月视图' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: '周视图' }));
  view.unmount();
  render(calendar());
  expect(screen.getByRole('button', { name: '周视图' })).toHaveAttribute('aria-pressed', 'true');
});
it('falls back to week for invalid preferences and still switches if storage is unavailable', () => {
  localStorage.setItem('semidone-calendar-view', 'invalid');
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Storage unavailable'); });
  render(<MemoryRouter><TaskCalendarContent tasks={tasks} /></MemoryRouter>);
  expect(screen.getByRole('button', { name: '周视图' })).toHaveAttribute('aria-pressed', 'true');
  fireEvent.click(screen.getByRole('button', { name: '月视图' }));
  expect(screen.getByRole('button', { name: '月视图' })).toHaveAttribute('aria-pressed', 'true');
});
