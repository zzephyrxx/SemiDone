// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import StartupTip from './StartupTip';

const WELCOME_STORAGE_KEY = 'welcome_shown_6.0';

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
  it('renders an accessible unified V6 liquid-glass release overview', () => {
    renderWelcome();

    const dialog = screen.getByRole('dialog', { name: '欢迎使用 SemiDone' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('data-glass-layout', 'unified');
    expect(dialog.parentElement).toHaveAttribute('data-no-overlay');
    expect(dialog).toHaveClass('liquid-glass-modal-surface');
    expect(dialog.querySelectorAll('.liquid-glass-modal-surface')).toHaveLength(0);
    expect(screen.queryByTestId('welcome-header-curve')).not.toBeInTheDocument();

    expect(screen.getByText('V6.0 · 液态玻璃首批更新')).toBeVisible();
    expect(screen.getByText('V6.0 更新内容')).toBeVisible();
    expect(screen.getByText(/V6\.0 正在持续开发/)).toBeVisible();
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getByText(/可与明亮、深色和梦粉主题共同使用/)).toBeVisible();
    expect(screen.getByText(/支持 1–10 级模糊/)).toBeVisible();
    expect(screen.getByText(/扩大色散边缘范围/)).toBeVisible();
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

  it('shows V6 even when the previous version was suppressed', () => {
    localStorage.setItem('welcome_shown_5.2.0', 'true');
    renderWelcome();

    expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  });
});
