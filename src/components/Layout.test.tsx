// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from './Layout';

const mocks = vi.hoisted(() => ({
  settings: {
    collapseMode: 'bar',
    theme: 'light',
    isPinned: false,
    useCapsuleMode: false,
    username: '',
    avatar: undefined as string | undefined,
    zenMode: undefined as { enabled: boolean; active: boolean } | undefined,
  },
  toggleIsPinned: vi.fn(),
  toggleIsCollapsed: vi.fn(),
  setZenMode: vi.fn(),
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: mocks.settings,
    toggleIsPinned: mocks.toggleIsPinned,
    toggleIsCollapsed: mocks.toggleIsCollapsed,
    setZenMode: mocks.setZenMode,
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
vi.mock('./ZenMode', () => ({ default: () => <div>Zen 视图</div> }));
vi.mock('../utils/windowDragging', () => ({ startWindowDragging: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  mocks.settings.collapseMode = 'bar';
  mocks.settings.zenMode = undefined;
  vi.clearAllMocks();
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Layout header', () => {
  it('navigates between workspace pages and marks the current destination', () => {
    mocks.settings.collapseMode = 'expanded';
    render(<MemoryRouter><Routes><Route path="/" element={<Layout />}>
      <Route index element={<p>待办内容</p>} />
      <Route path="settings" element={<p>设置内容</p>} />
    </Route></Routes></MemoryRouter>);
    expect(screen.getByRole('link', { name: '待办' })).toHaveAttribute('aria-current', 'page');
    fireEvent.click(screen.getByRole('link', { name: '设置' }));
    expect(screen.getByText('设置内容')).toBeVisible();
    expect(screen.getByRole('link', { name: '设置' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('link', { name: '待办' })).not.toHaveAttribute('aria-current');
  });

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

  it('enters Zen mode from the header and replaces the full interface', () => {
    mocks.settings.collapseMode = 'expanded';
    mocks.settings.zenMode = { enabled: true, active: false };
    const view = render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: '进入 Zen 模式' }));
    expect(mocks.setZenMode).toHaveBeenCalledWith({ active: true });
    mocks.settings.zenMode = { enabled: true, active: true };
    view.rerender(<MemoryRouter><Layout /></MemoryRouter>);
    expect(screen.getByText('Zen 视图')).toBeVisible();
    expect(screen.queryByTitle('任务视图')).not.toBeInTheDocument();
  });

  it('hides the Zen entry when the setting is switched off', () => {
    mocks.settings.collapseMode = 'expanded';
    mocks.settings.zenMode = { enabled: false, active: false };
    render(<MemoryRouter><Layout /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: /进入.*Zen/ })).not.toBeInTheDocument();
    expect(screen.getByTitle('设置')).toBeVisible();
  });
});
