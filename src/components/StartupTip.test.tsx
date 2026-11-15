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
  it('presents a user-focused release overview with local data guidance', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveAttribute('data-no-overlay');
    expect(dialog).toHaveClass('liquid-glass-modal-surface');
    expect(dialog.querySelectorAll('.liquid-glass-modal-surface')).toHaveLength(0);
    expect(screen.queryByTestId('welcome-header-curve')).not.toBeInTheDocument();

    expect(screen.getByText('V7.0.0 · 2026.11')).toBeVisible();
    expect(screen.getByText('V7.0.0 更新内容')).toBeVisible();
    expect(screen.queryByText(/5\.0.*主要更新/)).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '少一点忙乱，多一点从容。' })).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByRole('heading', { name: '把计划理清，让行动更轻松' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '需要时在眼前，专注时退到一旁' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '看见时间，也记得休息' })).toBeVisible();
    expect(screen.getByRole('heading', { name: '熟悉的日常，焕新的模样' })).toBeVisible();
    expect(screen.getByLabelText('数据与使用提示')).toHaveTextContent('待办保存在本机');
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
