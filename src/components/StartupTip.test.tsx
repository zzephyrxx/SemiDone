// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StartupTip from './StartupTip';

const WELCOME_STORAGE_KEY = 'welcome_shown_5.0.1';

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
  it('renders an accessible 5.0 release overview with the signature header curve', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('v5.0.1 新功能')).toBeVisible();
    expect(screen.getByText('周/月任务视图')).toBeVisible();
    expect(screen.getByText('自动检查新版本')).toBeVisible();
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
});
