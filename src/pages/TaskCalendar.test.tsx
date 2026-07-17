// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { Task } from '../types';
import { TaskCalendarContent } from './TaskCalendar';

afterEach(cleanup);

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

    expect(screen.getByRole('heading', { name: '任务视图' })).toBeVisible();
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

    fireEvent.click(screen.getByRole('button', { name: '周视图' }));
    expect(screen.getByText('7月13日 - 7月19日')).toBeVisible();
    expect(screen.getByText('本周完成')).toBeVisible();
  });
});
