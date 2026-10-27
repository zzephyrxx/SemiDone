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
    closeToTray: undefined as boolean | undefined,
  },
  toggleIsPinned: vi.fn(),
  toggleIsCollapsed: vi.fn(),
  setZenMode: vi.fn(),
  invoke: vi.fn(),
  isTauri: vi.fn(),
  toastError: vi.fn(),
  toastInfo: vi.fn(),
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: (selector: (state: { settings: typeof mocks.settings; toggleIsPinned: typeof mocks.toggleIsPinned; toggleIsCollapsed: typeof mocks.toggleIsCollapsed; setZenMode: typeof mocks.setZenMode }) => unknown) => selector({
    settings: mocks.settings,
    toggleIsPinned: mocks.toggleIsPinned,
    toggleIsCollapsed: mocks.toggleIsCollapsed,
    setZenMode: mocks.setZenMode,
  }),
}));

vi.mock('../store/usageStore', () => ({
  useUsageStore: (selector: (state: { pomodoro: { isActive: boolean; currentMode: string; timeLeft: number; cycle: number }; formatTime: () => string }) => unknown) => selector({
    pomodoro: { isActive: false, currentMode: 'work', timeLeft: 1500, cycle: 0 },
    formatTime: () => '25:00',
  }),
}));

vi.mock('../data/quotes', () => ({
  getQuotesByTheme: () => ['第一条名言', '第二条名言'],
}));

vi.mock('@tauri-apps/api/core', () => ({ invoke: mocks.invoke, isTauri: mocks.isTauri }));
vi.mock('sonner', () => ({ toast: { error: mocks.toastError, info: mocks.toastInfo } }));
vi.mock('./UserProfileModal', () => ({ default: () => null }));
vi.mock('./CloseConfirmDialog', () => ({ default: ({ isOpen, onConfirm }: { isOpen: boolean; onConfirm: () => void }) =>
  isOpen ? <div role="alertdialog"><button onClick={onConfirm}>确认退出</button></div> : null }));
vi.mock('./ZenMode', () => ({ default: ({ onClose }: { onClose: () => void }) => <div>Zen 视图<button onClick={onClose}>关闭 Zen</button></div> }));
vi.mock('./FloatingBall', () => ({ default: ({ onClose }: { onClose: () => void }) => <button onClick={onClose}>关闭悬浮球</button> }));
vi.mock('../utils/windowDragging', () => ({ startWindowDragging: vi.fn() }));

beforeEach(() => {
  localStorage.clear();
  mocks.settings.collapseMode = 'bar';
  mocks.settings.zenMode = undefined;
  mocks.settings.closeToTray = undefined;
  vi.clearAllMocks();
  mocks.isTauri.mockReturnValue(true);
  mocks.invoke.mockResolvedValue(undefined);
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Layout header', () => {
  it('defaults old settings to a native close request without exiting the process', () => {
    mocks.settings.collapseMode = 'expanded';
    render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('关闭到托盘'));
    expect(mocks.invoke).toHaveBeenCalledWith('close_main_window');
    expect(mocks.invoke).not.toHaveBeenCalledWith('exit_app');
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('preserves the compact window shape when closing to the tray', () => {
    render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('关闭到托盘'));
    expect(mocks.invoke).toHaveBeenCalledWith('close_main_window');
    expect(mocks.toggleIsCollapsed).not.toHaveBeenCalled();
  });

  it.each(['floating', 'zen'])('routes the %s close action to the same native policy', (mode) => {
    mocks.settings.collapseMode = mode === 'floating' ? 'floating' : 'expanded';
    if (mode === 'zen') mocks.settings.zenMode = { enabled: true, active: true };
    render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: mode === 'floating' ? '关闭悬浮球' : '关闭 Zen' }));
    expect(mocks.invoke).toHaveBeenCalledWith('close_main_window');
    expect(mocks.setZenMode).not.toHaveBeenCalled();
    expect(mocks.toggleIsCollapsed).not.toHaveBeenCalled();
  });

  it('confirms a full exit only when close-to-tray has been disabled', () => {
    mocks.settings.collapseMode = 'expanded';
    mocks.settings.closeToTray = false;
    render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('关闭应用'));
    expect(mocks.invoke).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '确认退出' }));
    expect(mocks.invoke).toHaveBeenCalledWith('exit_app');
  });

  it.each(['bar', 'floating'])('expands %s mode before presenting an explicit exit confirmation', async mode => {
    mocks.settings.collapseMode = mode; mocks.settings.closeToTray = false;
    const view = render(<MemoryRouter><Layout /></MemoryRouter>);
    await act(async () => { fireEvent.click(mode === 'floating' ? screen.getByRole('button', { name: '关闭悬浮球' }) : screen.getByTitle('展开并关闭应用')); });
    expect(mocks.toggleIsCollapsed).toHaveBeenCalledOnce();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.invoke).not.toHaveBeenCalled();
    mocks.settings.collapseMode = 'expanded';
    view.rerender(<MemoryRouter><Layout /></MemoryRouter>);
    expect(screen.getByRole('alertdialog')).toBeVisible();
  });

  it('reports hide failures without falling back to process exit or browser close', async () => {
    mocks.settings.collapseMode = 'expanded';
    mocks.invoke.mockRejectedValueOnce(new Error('window unavailable'));
    render(<MemoryRouter><Layout /></MemoryRouter>);
    await act(async () => { fireEvent.click(screen.getByTitle('关闭到托盘')); });
    expect(mocks.toastError).toHaveBeenCalledWith('关闭到托盘失败，请重试');
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
  });

  it('does not try to hide the browser preview as a desktop window', () => {
    mocks.settings.collapseMode = 'expanded';
    mocks.isTauri.mockReturnValue(false);
    render(<MemoryRouter><Layout /></MemoryRouter>);
    fireEvent.click(screen.getByTitle('关闭到托盘'));
    expect(mocks.invoke).not.toHaveBeenCalled();
    expect(mocks.toastInfo).toHaveBeenCalledWith('关闭到托盘仅在桌面应用中可用');
  });

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
