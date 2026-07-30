// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StartupTip from './StartupTip';

const WELCOME_STORAGE_KEY = 'welcome_shown_5.2.0';

function renderWelcome() {
  render(<StartupTip />);
  act(() => vi.advanceTimersByTime(800));
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('StartupTip welcome dialog', () => {
  it('renders an accessible 5.2 release overview with the signature header curve', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog.parentElement).toHaveAttribute('data-no-overlay');
    expect(dialog.parentElement).not.toHaveClass('bg-[#0077B6]/30');
    expect(dialog.parentElement).not.toHaveClass('backdrop-blur-[3px]');
    expect(dialog).toHaveClass('shadow-[0_14px_36px_rgba(15,23,42,0.12)]');
    expect(dialog).not.toHaveClass('shadow-[0_24px_70px_rgba(0,119,182,0.3)]');
    expect(screen.getByText('v5.1.0 + v5.2.0 更新内容')).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(screen.getByText('当前版本已是最新时，设置页会明确显示“已是最新”')).toBeVisible();
    expect(screen.getByText('发现新版本时，仅在设置页提供更新入口，不再弹出提示')).toBeVisible();
    expect(screen.getByText('修复 Windows 显示桌面后窗口置顶失效的问题')).toBeVisible();
    expect(screen.getByText('减少了误选、误拖、意外选中文字等异常操作')).toBeVisible();
    expect(screen.getByText('移除了应用内无效的右键功能')).toBeVisible();
    expect(screen.getByText('修复了已完成任务仍显示逾期时间的问题')).toBeVisible();
    expect(screen.getByText('增加了悬浮球模式下超出边界的判定逻辑')).toBeVisible();
    expect(screen.getByTestId('welcome-header-curve')).toBeVisible();
  });

  it('remembers the choice when starting with “本版本不再显示” selected', () => {
    renderWelcome();

    fireEvent.click(screen.getByRole('checkbox', { name: '本版本不再显示' }));
    fireEvent.click(screen.getByRole('button', { name: '开始使用' }));

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

  it('shows the new release even when the previous version was suppressed', () => {
    localStorage.setItem('welcome_shown_5.0.1', 'true');
    renderWelcome();

    expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  });
});
