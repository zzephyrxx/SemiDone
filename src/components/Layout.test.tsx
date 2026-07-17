// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Layout from './Layout';

const mocks = vi.hoisted(() => ({
  settings: {
    collapseMode: 'bar',
    theme: 'light',
    isPinned: false,
    useCapsuleMode: false,
    username: '',
    avatar: undefined as string | undefined,
  },
  toggleIsPinned: vi.fn(),
  toggleIsCollapsed: vi.fn(),
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: mocks.settings,
    toggleIsPinned: mocks.toggleIsPinned,
    toggleIsCollapsed: mocks.toggleIsCollapsed,
  }),
}));

vi.mock('../store/usageStore', () => ({
  useUsageStore: () => ({
    pomodoro: { isActive: false, currentMode: 'work', timeLeft: 1500, cycle: 0 },
    formatTime: () => '25:00',
  }),
}));

vi.mock('../data/quotes', () => ({
  getQuotesByTheme: () => ['第一条名言', '第二条名言'],
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('./UserProfileModal', () => ({ default: () => null }));
vi.mock('./CloseConfirmDialog', () => ({ default: () => null }));

beforeEach(() => {
  localStorage.clear();
  mocks.settings.collapseMode = 'bar';
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Layout header', () => {
  it('rotates the bar-mode quote every five seconds', () => {
    render(<MemoryRouter><Layout /></MemoryRouter>);
    expect(screen.getByText('第一条名言')).toBeVisible();

    act(() => vi.advanceTimersByTime(5000));

    expect(screen.getByText('第二条名言')).toBeVisible();
  });

  it('keeps the task calendar hover label consistent with adjacent header actions', () => {
    mocks.settings.collapseMode = 'expanded';
    render(<MemoryRouter><Layout /></MemoryRouter>);

    const taskCalendarLink = screen.getByTitle('任务视图');
    expect(taskCalendarLink).toHaveAttribute('href', '/task-calendar');
  });
});
