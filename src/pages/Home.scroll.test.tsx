// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types';
import Home from './Home';

const mocks = vi.hoisted(() => ({
  storeState: {
    filteredTasks: [] as Task[],
    loading: false,
    filter: 'pending',
    searchQuery: '',
    loadTasks: vi.fn(),
    celebration: { show: false, message: '', isAllComplete: false },
    hideCelebration: vi.fn(),
    editingTaskId: null as string | null,
    statsBarCollapsed: false,
    setStatsBarCollapsed: vi.fn(),
  },
}));

vi.mock('../store/taskStore', () => {
  const useTaskStore = Object.assign(
    (selector: (state: typeof mocks.storeState) => unknown) => selector(mocks.storeState),
    { getState: () => mocks.storeState },
  );
  return { useTaskStore };
});

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: () => ({ settings: { theme: 'light' } }),
}));

vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector,
}));

vi.mock('../components/TaskItem', () => ({
  default: ({ task }: { task: Task }) => <div>{task.title}</div>,
}));
vi.mock('../components/TaskStats', () => ({
  default: () => null,
  StatsCollapsedButton: () => null,
}));
vi.mock('../components/TaskFilter', () => ({ default: () => null }));
vi.mock('../components/QuickAddTask', () => ({ default: () => null }));
vi.mock('../components/CelebrationAnimation', () => ({ default: () => null }));
vi.mock('../components/UsageButton', () => ({ default: () => null }));

class ResizeObserverMock {
  observe() {}
  disconnect() {}
}

const tasks: Task[] = Array.from({ length: 20 }, (_, index) => ({
  id: `task-${index}`,
  title: `Task ${index}`,
  completed: false,
  priority: 'medium',
  createdAt: `2026-07-17T08:${String(index).padStart(2, '0')}:00Z`,
  updatedAt: `2026-07-17T08:${String(index).padStart(2, '0')}:00Z`,
}));

function getTaskScroller(): HTMLDivElement {
  const scroller = screen.getByText('Task 0').closest('.overflow-y-auto');
  if (!(scroller instanceof HTMLDivElement)) throw new Error('Task scroller not found');
  return scroller;
}

function scrollTo(scroller: HTMLDivElement, top: number) {
  scroller.scrollTop = top;
  fireEvent.scroll(scroller);
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', ResizeObserverMock);
  mocks.storeState.filteredTasks = tasks;
  mocks.storeState.filter = 'pending';
  mocks.storeState.editingTaskId = null;
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe('home task-list scroll position', () => {
  it('keeps the current position when a task update replaces the task array', () => {
    const view = render(<Home />);
    const scroller = getTaskScroller();
    scrollTo(scroller, 380);

    mocks.storeState.filteredTasks = [...tasks];
    view.rerender(<Home />);

    expect(scroller.scrollTop).toBe(380);
  });

  it('keeps the current position when inline editing starts', () => {
    const view = render(<Home />);
    const scroller = getTaskScroller();
    scrollTo(scroller, 380);

    mocks.storeState.editingTaskId = 'task-4';
    view.rerender(<Home />);

    expect(scroller.scrollTop).toBe(380);
  });

  it('resets to the top when the active task filter changes', () => {
    const view = render(<Home />);
    const scroller = getTaskScroller();
    scrollTo(scroller, 380);

    mocks.storeState.filter = 'completed';
    view.rerender(<Home />);

    expect(scroller.scrollTop).toBe(0);
  });
});
