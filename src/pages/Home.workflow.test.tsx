// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Home from './Home';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Task } from '../types';

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
    await openHome();
    fireEvent.click(screen.getByRole('button', { name: `完成待办：${fixture.title}` }));
    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100'));
    fireEvent.click(screen.getByRole('button', { name: '已完成' }));
    expect(screen.getByRole('heading', { name: fixture.title })).toBeVisible();
    expect(JSON.parse(localStorage.getItem('windows-todo-tasks')!)[0].completed).toBe(true);
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
    expect(screen.queryByText('今日到期', { selector: '.overview-metric > span' })).not.toBeInTheDocument();
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
