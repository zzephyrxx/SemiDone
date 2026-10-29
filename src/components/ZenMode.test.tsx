// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/tauri';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import type { Task } from '../types';
import { DEFAULT_ZEN_MODE_SETTINGS } from '../utils/zenModeSettings';
import ZenMode from './ZenMode';
import { normalizeGlassPresetSettings } from '../utils/liquidGlassSettings';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));

const pending: Task = {
  id: 'pending', title: '整理实验结果', completed: false, priority: 'high',
  createdAt: '2026-10-20T08:00:00Z', updatedAt: '2026-10-20T08:00:00Z',
  description: '不应在Zen 列表显示的详细描述',
};

beforeEach(async () => {
  localStorage.clear();
  await api.settings.updateSettings(useSettingsStore.getState().settings);
  useSettingsStore.setState((state) => ({ settings: {
    ...state.settings, theme: 'pink', animationsEnabled: true, zenMode: { ...DEFAULT_ZEN_MODE_SETTINGS, enabled: true, active: true },
  } }));
  useTaskStore.setState({
    tasks: [], filter: 'completed', searchQuery: '不匹配的搜索', loading: false,
    sortConfig: { field: 'createdAt', order: 'desc' },
  });
  localStorage.setItem('windows-todo-tasks', JSON.stringify([
    pending, { ...pending, id: 'done', title: '已完成的工作', completed: true },
  ]));
});
afterEach(() => { cleanup(); document.getElementById('zen-typography-styles')?.remove(); document.getElementById('zen-panel-material-css')?.remove(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('Zen mode', () => {
  it('adapts its configuration panel to glass live without changing the transparent task window', async () => {
    const css = document.createElement('style'); css.id = 'zen-panel-material-css';
    css.textContent = ['zenMode.css', 'workspace.css', 'ui.css', 'liquidGlassSurfaces.css'].map(file => readFileSync(resolve('src/styles', file), 'utf8')).join('\n');
    document.head.append(css);
    const view = render(<ZenMode onClose={vi.fn()} />);
    await screen.findByText(pending.title);
    const windowStyle = view.container.querySelector<HTMLElement>('.zen-mode')!.style.cssText;
    fireEvent.click(screen.getByRole('button', { name: 'Zen 模式配置' }));
    const panel = screen.getByRole('region', { name: 'Zen 模式配置' });
    const font = screen.getByRole('spinbutton', { name: '字体大小' });
    for (const preset of ['standard', 'extreme'] as const) {
      for (const enabled of [true, false, true]) {
        act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: normalizeGlassPresetSettings({ preset, enabled }) } })));
        expect(panel).toHaveAttribute('data-material', enabled ? 'glass' : 'solid');
        const filter = (panel as HTMLElement).style.getPropertyValue('--surface-filter');
        if (enabled) {
          expect(filter).toMatch(/^blur\(/);
          if (preset === 'extreme') expect(filter).toContain('chromatic-refraction');
        } else {
          expect(filter).toBe('none');
          expect(getComputedStyle(panel).getPropertyValue('backdrop-filter')).toBe('none');
        }
        expect(getComputedStyle(panel).position).toBe('absolute');
        expect(getComputedStyle(panel).overflowY).toBe('auto');
        expect(screen.getByRole('spinbutton', { name: '字体大小' })).toBe(font);
        expect(view.container.querySelector<HTMLElement>('.zen-mode')!.style.cssText).toBe(windowStyle);
        expect(screen.getByText(pending.title)).toBeVisible();
      }
    }
    fireEvent.click(screen.getByRole('button', { name: '收起配置' }));
    expect(screen.getByRole('button', { name: 'Zen 模式配置' })).toHaveFocus();
  });
  it('shows all pending titles independently of full-mode filters and persists completion', async () => {
    render(<ZenMode onClose={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: '完成：整理实验结果' });
    expect(screen.queryByText('已完成的工作')).not.toBeInTheDocument();
    expect(screen.queryByText(pending.description!)).not.toBeInTheDocument();
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox.closest('li')).toHaveClass('is-exiting'));
    expect(screen.getByText(pending.title)).toBeVisible();
    fireEvent.animationEnd(checkbox.closest('li')!);
    expect(await screen.findByText('没有未完成的待办', {}, { timeout: 2200 })).toBeVisible();
    expect((await api.tasks.getTasks()).data?.find((task) => task.id === pending.id)?.completed).toBe(true);
    expect(useTaskStore.getState().celebration.show).toBe(false);
    expect(useTaskStore.getState()).toMatchObject({ filter: 'completed', searchQuery: '不匹配的搜索' });
  });

  it('keeps the task visible and allows retry when completion cannot be saved', async () => {
    vi.spyOn(api.tasks, 'updateTask').mockResolvedValue({ success: false, error: '写入失败' });
    render(<ZenMode onClose={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: '完成：整理实验结果' });
    fireEvent.click(checkbox);
    await waitFor(() => expect(checkbox).not.toBeDisabled());
    expect(checkbox).not.toBeChecked();
    expect(screen.getByText(pending.title)).toBeVisible();
  });

  it('keeps the completed row visible long enough to see the strike and flight', async () => {
    render(<ZenMode onClose={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: '完成：整理实验结果' });
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(checkbox); });
    expect(checkbox).toHaveAttribute('aria-busy', 'true');
    expect(checkbox.closest('li')).not.toHaveClass('is-exiting');
    expect(screen.queryByText('保存中…')).not.toBeInTheDocument();
    act(() => vi.advanceTimersByTime(162));
    expect(checkbox).not.toBeChecked();
    act(() => vi.advanceTimersByTime(1));
    expect(checkbox).toBeChecked();
    expect(screen.getByText('任务已完成')).toBeInTheDocument();
    expect(checkbox.closest('li')).toHaveClass('is-exiting');
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByText(pending.title)).toBeVisible();
    fireEvent.animationEnd(screen.getByText(pending.title));
    expect(screen.getByText(pending.title)).toBeVisible();
    act(() => vi.advanceTimersByTime(189));
    expect(screen.queryByText(pending.title)).not.toBeInTheDocument();
    expect(screen.getByText('没有未完成的待办')).toBeVisible();
  });

  it('also leaves a visible completion pause when interface animation is disabled', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
    useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } }));
    render(<ZenMode onClose={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: '完成：整理实验结果' });
    vi.useFakeTimers();
    await act(async () => { fireEvent.click(checkbox); });
    act(() => vi.advanceTimersByTime(163));
    act(() => vi.advanceTimersByTime(175));
    expect(screen.getByText(pending.title)).toBeVisible();
    act(() => vi.advanceTimersByTime(139));
    expect(screen.queryByText(pending.title)).not.toBeInTheDocument();
  });

  it('prevents duplicate completion while saving', async () => {
    let resolveSave!: (value: Awaited<ReturnType<typeof api.tasks.updateTask>>) => void;
    vi.spyOn(api.tasks, 'updateTask').mockImplementation(() => new Promise((resolve) => { resolveSave = resolve; }));
    render(<ZenMode onClose={vi.fn()} />);
    const checkbox = await screen.findByRole('checkbox', { name: '完成：整理实验结果' });
    vi.useFakeTimers();
    fireEvent.click(checkbox);
    fireEvent.click(checkbox);
    expect(api.tasks.updateTask).toHaveBeenCalledOnce();
    expect(checkbox).toBeDisabled();
    act(() => vi.advanceTimersByTime(326));
    expect(checkbox).not.toBeChecked();
    expect(checkbox).toHaveAttribute('aria-busy', 'true');
    await act(async () => { resolveSave({ success: true, data: { ...pending, completed: true } }); });
    act(() => vi.advanceTimersByTime(162));
    expect(checkbox).not.toBeChecked();
    act(() => vi.advanceTimersByTime(1));
    expect(checkbox).toBeChecked();
    expect(checkbox).toHaveAttribute('aria-busy', 'false');
  });

  it('applies and saves appearance, then returns without changing the full-mode theme', async () => {
    render(<ZenMode onClose={vi.fn()} />);
    await screen.findByText(pending.title);
    fireEvent.click(screen.getByRole('button', { name: 'Zen 模式配置' }));
    fireEvent.click(screen.getByRole('button', { name: '文字颜色' }));
    fireEvent.change(screen.getByRole('textbox', { name: '文字颜色色值' }), { target: { value: '#aabbcc' } });
    expect(screen.getByRole('region', { name: '文字颜色调色盘' })).toBeVisible();
    fireEvent.keyDown(screen.getByRole('textbox', { name: '文字颜色色值' }), { key: 'Escape' });
    expect(screen.queryByRole('region', { name: '文字颜色调色盘' })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Zen 模式配置' })).toBeVisible();
    expect(screen.getByRole('button', { name: '文字颜色' })).toHaveFocus();
    expect(screen.getByRole('spinbutton', { name: '面板透明度' })).toHaveAttribute('aria-valuenow', '35');
    expect(screen.getByRole('spinbutton', { name: '行底色透明度' })).toHaveAttribute('aria-valuenow', '92');
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: '面板透明度' }), { key: 'End' });
    fireEvent.keyDown(screen.getByRole('spinbutton', { name: '行底色透明度' }), { key: 'Home' });
    await waitFor(async () => expect((await api.settings.getSettings()).data?.zenMode).toMatchObject({
      textColor: '#aabbcc', backgroundOpacity: 0, rowOpacity: 100, enabled: true,
    }));
    expect(document.querySelector('.zen-mode')).toHaveStyle('--zen-text: #aabbcc');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Zen 模式配置' })).not.toBeInTheDocument();
    expect(useSettingsStore.getState().settings.zenMode?.enabled).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: '返回完整模式' }));
    await waitFor(() => expect(useSettingsStore.getState().settings.zenMode?.active).toBe(false));
    expect(useSettingsStore.getState().settings.zenMode?.enabled).toBe(true);
    expect(useSettingsStore.getState().settings.theme).toBe('pink');
    expect((await api.settings.getSettings()).data?.zenMode?.textColor).toBe('#aabbcc');
  });

  it('does not complete a task when its title or row background is clicked', async () => {
    const save = vi.spyOn(api.tasks, 'updateTask');
    render(<ZenMode onClose={vi.fn()} />);
    const title = await screen.findByText(pending.title);
    fireEvent.click(title);
    fireEvent.click(title.closest('li')!);
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole('checkbox', { name: '完成：整理实验结果' })).not.toBeChecked();
  });

  it('persists the font size and applies it without changing the row background opacity', async () => {
    const style = document.createElement('style'); style.id = 'zen-typography-styles';
    style.textContent = ['zenMode.css', 'workspace.css', 'ui.css'].map(name => readFileSync(resolve('src/styles', name), 'utf8')).join('\n');
    document.head.append(style);
    render(<ZenMode onClose={vi.fn()} />);
    await screen.findByText(pending.title);
    expect(screen.getByText('SemiDone Zen')).toBeVisible();
    expect(screen.queryByRole('region', { name: 'Zen 模式配置' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Zen 模式配置' }));
    const font = screen.getByRole('spinbutton', { name: '字体大小' });
    expect(font).toHaveAttribute('aria-valuemin', '12');
    expect(font).toHaveAttribute('aria-valuemax', '28');
    fireEvent.keyDown(font, { key: 'PageUp' });
    fireEvent.keyDown(font, { key: 'ArrowDown' });
    await waitFor(async () => expect((await api.settings.getSettings()).data?.zenMode?.fontSize).toBe(24));
    expect(document.querySelector('.zen-mode')).toHaveStyle('--zen-font-size: 24px');
    const actual = document.querySelector('.zen-task-list .zen-task-title')!;
    const preview = document.querySelector('.zen-preview .zen-task-title')!;
    for (const property of ['fontSize', 'lineHeight', 'fontFamily'] as const) {
      expect(getComputedStyle(preview)[property]).toBe(getComputedStyle(actual)[property]);
    }
    expect(document.querySelector('.zen-preview .zen-task-toggle svg rect')).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
    await waitFor(() => expect(useSettingsStore.getState().settings.zenMode)
      .toMatchObject({ active: true, enabled: true, fontSize: 15 }));
  });
});
