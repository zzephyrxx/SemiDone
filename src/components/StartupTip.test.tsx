// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StartupTip from './StartupTip';
import { useSettingsStore } from '../store/settingsStore';

const WELCOME_STORAGE_KEY = 'welcome_shown_7.0.0';

function renderWelcome() {
  render(<StartupTip />);
  act(() => vi.advanceTimersByTime(800));
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', zenMode: { ...state.settings.zenMode!, active: false } } }));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StartupTip welcome dialog', () => {
  it('still presents the welcome when Zen is enabled but its window is not active', () => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...state.settings.zenMode!, enabled: true, active: false } } }));
    renderWelcome();
    expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  });
  it('renders the approved 7.0.0 release overview', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveAttribute('data-no-overlay');
    expect(dialog).toHaveClass('liquid-glass-modal-surface');
    expect(dialog.querySelectorAll('.liquid-glass-modal-surface')).toHaveLength(0);
    expect(screen.queryByTestId('welcome-header-curve')).not.toBeInTheDocument();

    expect(screen.getByText('V7.0.0 · 2026.10')).toBeVisible();
    expect(screen.getByText('V7.0.0 更新内容')).toBeVisible();
    expect(screen.queryByText(/5\.0.*主要更新/)).not.toBeInTheDocument();
    expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual([
      '全新 V7 界面：窄窗顶部悬浮导航，宽屏左侧悬浮导航。',
      '液态玻璃提供标准、极致两档预设，导航文字与图标保持清晰。',
      '新增任务完成淡化右滑、导航拖动选择和列表补位动效，支持全局字号与动效开关。',
      '关闭窗口默认收起到托盘，可从托盘恢复窗口或明确退出应用。',
      '关闭与公告弹窗支持拖动，条状和悬浮球模式下不再显示遮挡弹窗。',
      '修复完成任务时出现横向滚动条的问题，移除全部完成浮动提示。',
    ]);
    expect(screen.getByRole('button', { name: '开始体验' })).toBeVisible();
  });

  it('remembers the choice when starting with “本版本不再显示” selected', () => {
    renderWelcome();

    fireEvent.click(screen.getByRole('checkbox', { name: '本版本不再显示' }));
    fireEvent.click(screen.getByRole('button', { name: '开始体验' }));

    expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBe('true');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('allows dismissing from the header without suppressing this version', () => {
    renderWelcome();

    fireEvent.click(screen.getByRole('button', { name: '关闭欢迎弹窗' }));

    expect(localStorage.getItem(WELCOME_STORAGE_KEY)).toBeNull();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('stays hidden when this version was already suppressed', () => {
    localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    renderWelcome();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows 7.0.0 even when previous versions were suppressed', () => {
    localStorage.setItem('welcome_shown_5.2.0', 'true');
    localStorage.setItem('welcome_shown_6.0', 'true');
    localStorage.setItem('welcome_shown_6.1.0', 'true');
    renderWelcome();

    expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  });
});
