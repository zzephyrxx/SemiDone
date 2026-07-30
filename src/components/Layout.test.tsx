// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
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
  startDragging: vi.fn(),
  pomodoro: { isActive: false, currentMode: 'work', timeLeft: 1500, cycle: 0 },
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
    pomodoro: mocks.pomodoro,
    formatTime: () => '25:00',
  }),
}));

vi.mock('../data/quotes', () => ({
  getQuotesByTheme: () => ['第一条名言', '第二条名言'],
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/window', () => ({
  getCurrentWindow: () => ({ startDragging: mocks.startDragging }),
}));
vi.mock('./UserProfileModal', () => ({ default: () => null }));
vi.mock('./CloseConfirmDialog', () => ({ default: () => null }));

beforeEach(() => {
  localStorage.clear();
  mocks.settings.collapseMode = 'bar';
  mocks.pomodoro.isActive = false;
  mocks.startDragging.mockReset();
  mocks.startDragging.mockResolvedValue(undefined);
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

  it('hides the app name on narrow windows instead of shrinking the user avatar', () => {
    mocks.settings.collapseMode = 'expanded';
    render(<MemoryRouter><Layout /></MemoryRouter>);

    expect(screen.getByRole('heading', { name: 'SemiDone' })).toHaveClass('max-[430px]:hidden');
    expect(screen.getByTitle('用户资料')).toHaveClass('shrink-0');
    expect(screen.getByAltText('Logo3D')).toHaveClass('shrink-0');
  });

  it('keeps a four-pixel gap between the active pomodoro dot and bar expand button', () => {
    mocks.pomodoro.isActive = true;
    render(<MemoryRouter><Layout /></MemoryRouter>);

    expect(screen.getByTestId('pomodoro-status-dot')).toHaveClass('mr-1');
    expect(screen.getByTitle('展开窗口')).toBeVisible();
  });

  it('drags the window from nested title-bar content but not from controls or right-click', () => {
    render(<MemoryRouter><Layout /></MemoryRouter>);

    const quote = screen.getByText('第一条名言');
    fireEvent.mouseDown(quote, { button: 0 });
    expect(mocks.startDragging).toHaveBeenCalledOnce();

    fireEvent.mouseDown(screen.getByTitle('展开窗口'), { button: 0 });
    fireEvent.mouseDown(quote, { button: 2 });
    expect(mocks.startDragging).toHaveBeenCalledOnce();
  });
});
