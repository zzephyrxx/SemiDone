// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import UsageTimer from './UsageTimer';
import { useUsageStore } from '../store/usageStore';
import { useSettingsStore } from '../store/settingsStore';

const original = useUsageStore.getState();
const save = vi.fn();
beforeEach(() => {
  save.mockReset();
  useUsageStore.setState({ ...original, pomodoro: { ...original.pomodoro }, loadUsageData: vi.fn().mockResolvedValue(undefined), updatePomodoroSettings: save });
  useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', animationsEnabled: false } }));
});
afterEach(() => { cleanup(); document.getElementById('timer-material-css')?.remove(); useUsageStore.setState(original); });

it.each([true, false])('follows the global glass switch live and saves without changing timer-card layout, initially glass=%s', enabled => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled } } }));
  const css = document.createElement('style'); css.id = 'timer-material-css';
  css.textContent = readFileSync(resolve('src/styles/liquidGlassSurfaces.css'), 'utf8'); document.head.append(css);
  const view = render(<UsageTimer />);
  const trigger = screen.getByRole('button', { name: '番茄钟设置' });
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: '番茄钟设置' });
  expect(view.container).not.toContainElement(dialog);
  const surface = dialog.querySelector<HTMLElement>('.ui-surface')!;
  for (const active of [enabled, !enabled, enabled]) {
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: active } } })));
    expect(surface).toHaveAttribute('data-material', active ? 'glass' : 'solid');
    if (active) expect(surface.style.getPropertyValue('--surface-filter')).toMatch(/^blur\(/);
    else {
      expect(surface.style.getPropertyValue('--surface-filter')).toBe('none');
      expect(getComputedStyle(surface).getPropertyValue('backdrop-filter')).toBe('none');
    }
  }
  fireEvent.change(within(dialog).getByRole('spinbutton', { name: '专注时长' }), { target: { value: '35' } });
  fireEvent.click(within(dialog).getByRole('button', { name: '保存' }));
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ workDuration: 35 }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(trigger).toHaveFocus();
});

it('discards settings when cancelled and restores focus to the gear button', () => {
  render(<UsageTimer />);
  const trigger = screen.getByRole('button', { name: '番茄钟设置' });
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole('spinbutton', { name: '专注时长' }), { target: { value: '35' } });
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(save).not.toHaveBeenCalled(); expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  expect(screen.getByRole('spinbutton', { name: '专注时长' })).toHaveValue(original.pomodoro.workDuration);
  fireEvent.click(screen.getByRole('button', { name: '关闭番茄钟设置' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
