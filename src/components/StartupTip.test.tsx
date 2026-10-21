// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StartupTip from './StartupTip';

const WELCOME_STORAGE_KEY = 'welcome_shown_6.1.0';

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
  it('renders an accessible 6.1.0 release overview covering changes since 5.0', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-glass-layout', 'unified');
    expect(dialog.parentElement).toHaveAttribute('data-no-overlay');
    expect(dialog).toHaveClass('liquid-glass-modal-surface');
    expect(dialog.querySelectorAll('.liquid-glass-modal-surface')).toHaveLength(0);
    expect(screen.queryByTestId('welcome-header-curve')).not.toBeInTheDocument();

    expect(screen.getByText('V6.1.0 · 2026.10')).toBeVisible();
    expect(screen.getByText('V6.1.0 更新内容')).toBeVisible();
    expect(screen.getByText(/5\.0 之后的主要更新/)).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(/新增 Zen 禅模式/)).toBeVisible();
    expect(screen.getByText(/液态玻璃.*实时预览/)).toBeVisible();
    expect(screen.getByText(/跨天使用时长/)).toBeVisible();
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

  it('shows 6.1.0 even when previous versions were suppressed', () => {
    localStorage.setItem('welcome_shown_5.2.0', 'true');
    localStorage.setItem('welcome_shown_6.0', 'true');
    renderWelcome();

    expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  });
});
