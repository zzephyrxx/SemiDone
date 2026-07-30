// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { Task } from '../types';
import TaskDetail from './TaskDetail';

const mocks = vi.hoisted(() => ({
  tasks: [] as Task[],
  updateTask: vi.fn(),
  deleteTask: vi.fn(),
  toggleTaskComplete: vi.fn(),
}));

vi.mock('../store/taskStore', () => ({
  useTaskStore: () => ({
    tasks: mocks.tasks,
    updateTask: mocks.updateTask,
    deleteTask: mocks.deleteTask,
    toggleTaskComplete: mocks.toggleTaskComplete,
  }),
}));

vi.mock('../api/tauri', () => ({
  api: {
    attachment: {
      getAttachmentAsBase64: vi.fn(),
      deleteAttachment: vi.fn(),
    },
  },
}));

vi.mock('../components/DeleteConfirmDialog', () => ({
  default: () => null,
}));

vi.mock('../components/RecurrenceEditor', () => ({
  default: () => null,
}));

vi.mock('../components/TaskAttachmentsSection', () => ({
  default: () => null,
}));

const overdueTask: Task = {
  id: 'overdue-task',
  title: '历史任务',
  completed: false,
  priority: 'medium',
  dueDate: '2000-01-01T09:00:00',
  createdAt: '1999-12-01T09:00:00',
  updatedAt: '2000-01-02T09:00:00',
};

function renderTaskDetail(task: Task) {
  mocks.tasks = [task];
  return render(
    <MemoryRouter initialEntries={[`/task/${task.id}`]}>
      <Routes>
        <Route path="/task/:id" element={<TaskDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.tasks = [];
  mocks.updateTask.mockReset();
  mocks.deleteTask.mockReset();
  mocks.toggleTaskComplete.mockReset();
});

afterEach(cleanup);

describe('TaskDetail due date status', () => {
  it('does not show a live overdue count for a completed task', () => {
    renderTaskDetail({
      ...overdueTask,
      completed: true,
      completedAt: '2000-01-01T08:00:00',
    });

    expect(screen.getByText('截止日期')).toBeVisible();
    expect(screen.queryByText(/^已逾期 \d+ 天$/)).not.toBeInTheDocument();
  });

  it('continues to show the overdue count for an unfinished task', () => {
    renderTaskDetail(overdueTask);

    expect(screen.getByText(/^已逾期 \d+ 天$/)).toBeVisible();
  });
});
