// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import LiquidGlassRuntime from '../components/LiquidGlassRuntime';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../types';
import { addDays, format } from 'date-fns';

vi.mock('../components/UsageButton', () => ({ default: () => null }));
vi.mock('../components/CelebrationAnimation', () => ({ default: () => null }));

const fixture: Task = { id: 'prototype-task', title: '整理本周计划', completed: false, priority: 'medium',
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };

beforeEach(() => {
  localStorage.clear();
  localStorage.setItem('windows-todo-tasks', JSON.stringify([fixture]));
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  useTaskStore.setState({ tasks: [], filteredTasks: [], filter: 'all', searchQuery: '', editingTaskId: null,
    statsBarCollapsed: false, sortConfig: { field: 'createdAt', order: 'desc' } });
  useSettingsStore.setState({ settings: { ...useSettingsStore.getState().settings, theme: 'light' } });
});

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

async function openHome() {
  render(<MemoryRouter><Home /></MemoryRouter>);
  await screen.findByRole('heading', { name: fixture.title });
}

describe('V7 home workflows with browser persistence', () => {
  it.each([true, false])('saves deadline and recurrence in child dialogs without losing creation state, with glass=%s', async enabled => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', animationsEnabled: false, liquidGlass: { ...state.settings.liquidGlass, enabled } } }));
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: '新建待办' }));
    const dialog = screen.getByRole('dialog', { name: '新建待办' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '待办标题' }), { target: { value: '带截止时间的待办' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '显示高级选项' }));
    fireEvent.change(within(dialog).getByRole('textbox', { name: '待办描述' }), { target: { value: '确认时间和描述一起保存' } });
    const trigger = within(dialog).getByRole('button', { name: '设置截止日期' });
    fireEvent.click(trigger);
    const dateDialog = screen.getByRole('dialog', { name: '选择截止日期' });
    const picker = within(dateDialog).getByRole('group', { name: '选择截止日期' });
    expect(picker.closest('form')).toBeNull();
    expect(picker.closest('.ui-surface')).toHaveAttribute('data-material', enabled ? 'glass' : 'solid');
    expect(dialog.parentElement!.inert).toBe(true);
    expect(picker.querySelector('input[type="date"], input[type="time"]')).toBeNull();
    const now = new Date(), next = addDays(now, 1);
    if (next.getMonth() !== now.getMonth()) fireEvent.click(within(picker).getByRole('button', { name: '下个月' }));
    fireEvent.click(within(picker).getByRole('button', { name: format(next, 'yyyy年M月d日') }));
    fireEvent.change(within(picker).getByRole('spinbutton', { name: '小时' }), { target: { value: '14' } });
    fireEvent.change(within(picker).getByRole('spinbutton', { name: '分钟' }), { target: { value: '35' } });
    fireEvent.click(within(picker).getByRole('button', { name: '确定' }));
    expect(screen.queryByRole('dialog', { name: '选择截止日期' })).not.toBeInTheDocument();
    expect(Boolean(dialog.parentElement!.inert)).toBe(false);
    fireEvent.click(trigger);
    const reopened = screen.getByRole('group', { name: '选择截止日期' });
    fireEvent.keyDown(within(reopened).getByRole('spinbutton', { name: '分钟' }), { key: 'Escape' });
    expect(dialog).toBeVisible(); expect(trigger).toHaveFocus();
    const repeat = within(dialog).getByRole('button', { name: '不重复' });
    fireEvent.click(repeat);
    const repeatDialog = screen.getByRole('dialog', { name: '设置重复周期' });
    expect(repeatDialog.querySelector('.ui-surface')).toHaveAttribute('data-material', enabled ? 'glass' : 'solid');
    fireEvent.click(within(repeatDialog).getByRole('button', { name: '周' }));
    fireEvent.click(within(repeatDialog).getByRole('button', { name: '三' }));
    fireEvent.keyDown(within(repeatDialog).getByRole('spinbutton'), { key: 'Enter', ctrlKey: true });
    expect(screen.getByRole('dialog', { name: '新建待办' })).toBeVisible();
    expect(within(dialog).getByRole('textbox', { name: '待办标题' })).toHaveValue('带截止时间的待办');
    fireEvent.click(within(repeatDialog).getByRole('button', { name: '确定' }));
    fireEvent.click(repeat);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: '设置重复周期' })).not.toBeInTheDocument();
    expect(repeat).toHaveFocus(); expect(dialog).toBeVisible();
    fireEvent.click(within(dialog).getByRole('button', { name: '创建待办' }));
    await screen.findByRole('heading', { name: '带截止时间的待办' });
    const saved: Task[] = JSON.parse(localStorage.getItem('windows-todo-tasks')!);
    expect(saved.find(task => task.title === '带截止时间的待办')).toMatchObject({ dueDate: `${format(next, 'yyyy-MM-dd')}T14:35`, description: '确认时间和描述一起保存', recurrence: { type: 'week', interval: 1, daysOfWeek: [1, 3] } });
  });

  it('keeps the real search icon above a plain input with glass on or off, and leaves search/clear working', async () => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: true } } }));
    const style = document.createElement('style');
    style.textContent = ['workspace.css', 'liquidGlassSurfaces.css'].map(name => readFileSync(resolve('src/styles', name), 'utf8')).join('\n'); document.head.append(style);
    try {
      const view = render(<MemoryRouter><LiquidGlassRuntime /><div className="workspace-shell"><Home /></div></MemoryRouter>);
      await screen.findByRole('heading', { name: fixture.title });
      const page = screen.getByRole('region', { name: '待办页面' });
      expect(getComputedStyle(page).overflowX).toBe('hidden');
      expect(getComputedStyle(page).overflowY).toBe('auto');
      const input = screen.getByRole('textbox', { name: '搜索待办' });
      const icon = view.container.querySelector('.home-search-icon')!;
      for (const enabled of [true, false, true]) {
        act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled } } })));
        expect(getComputedStyle(input).getPropertyValue('backdrop-filter')).toBe('none');
        expect(getComputedStyle(input).display).toBe('block');
        expect(getComputedStyle(icon).filter).toBe('none'); expect(getComputedStyle(icon).pointerEvents).toBe('none');
        expect(Number(getComputedStyle(icon).zIndex)).toBeGreaterThan(Number(getComputedStyle(input).zIndex));
      }
      fireEvent.change(input, { target: { value: '不存在的任务' } });
      expect(screen.queryByRole('heading', { name: fixture.title })).not.toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: '清除搜索' }));
      expect(input).toHaveValue(''); expect(screen.getByRole('heading', { name: fixture.title })).toBeVisible();
    } finally { style.remove(); }
  });
  it('creates a task from the new toolbar and keeps the previous task', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: '新建待办' }));
    const dialog = screen.getByRole('dialog', { name: '新建待办' });
    fireEvent.change(within(dialog).getByRole('textbox', { name: '待办标题' }), { target: { value: '准备下周组会' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '创建待办' }));
    await screen.findByRole('heading', { name: '准备下周组会' });
    expect(screen.getByRole('heading', { name: fixture.title })).toBeVisible();
    const saved: Task[] = JSON.parse(localStorage.getItem('windows-todo-tasks')!);
    expect(saved.map(task => task.title)).toEqual([fixture.title, '准备下周组会']);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建待办' })).toHaveFocus();
  });

  it('completes a task, updates the overview, and retains it in the completed filter', async () => {
    useTaskStore.getState().setFilter('pending');
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: `完成待办：${fixture.title}` }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100'));
    expect(useTaskStore.getState().celebration.isAllComplete).toBe(true);
    expect(screen.queryByText('所有待办已完成')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '关闭完成提示' })).not.toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(fixture.title, { selector: 'h3' })).not.toBeInTheDocument());
    expect(screen.getByText('没有待完成的待办')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '已完成' }));
    expect(screen.getByRole('heading', { name: fixture.title })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('windows-todo-tasks')!)[0].completed).toBe(true);
  });

  it('shows every task in all and moves a newly completed task behind pending tasks', async () => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } }));
    const second = { ...fixture, id: 'second', title: '继续处理的待办', createdAt: '2025-01-01T10:00:00Z' };
    const done = { ...fixture, id: 'done', title: '先前已完成', completed: true, isPinned: true };
    localStorage.setItem('windows-todo-tasks', JSON.stringify([done, fixture, second]));
    await openHome();
    const rows = () => Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]')).map(row => row.dataset.taskRow);
    expect(rows()).toEqual([fixture.id, second.id, done.id]);
    fireEvent.click(screen.getByRole('button', { name: `完成待办：${fixture.title}` }));
    await waitFor(() => expect(rows()).toEqual([second.id, done.id, fixture.id]));
    expect(screen.getByRole('button', { name: `标记未完成：${fixture.title}` })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: '待完成' }));
    expect(rows()).toEqual([second.id]);
    fireEvent.click(screen.getByRole('button', { name: '已完成' }));
    expect(rows()).toEqual([done.id, fixture.id]);
    fireEvent.click(screen.getByRole('button', { name: '全部' }));
    expect(rows()).toEqual([second.id, done.id, fixture.id]);
  });

  it('searches and clears the query without changing saved tasks', async () => {
    await openHome();
    fireEvent.change(screen.getByRole('textbox', { name: '搜索待办' }), { target: { value: '不存在的任务' } });
    expect(screen.queryByRole('heading', { name: fixture.title })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '清除搜索' }));
    expect(screen.getByRole('heading', { name: fixture.title })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('windows-todo-tasks')!)).toEqual([fixture]);
  });

  it('collapses only the overview and keeps task actions available', async () => {
    await openHome();
    fireEvent.click(screen.getByTitle('折叠统计面板'));
    await waitFor(() => expect(screen.queryByText('今日到期', { selector: '.overview-metric > span' })).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: `完成待办：${fixture.title}` })).toBeVisible();
    fireEvent.click(screen.getByTitle('展开统计面板'));
    expect(screen.getByText('今日到期', { selector: '.overview-metric > span' })).toBeVisible();
  });

  it('cancels creation with Escape and restores focus to the toolbar', async () => {
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: '新建待办' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '新建待办' })).toHaveFocus();
    expect(JSON.parse(localStorage.getItem('windows-todo-tasks')!)).toEqual([fixture]);
  });
});
