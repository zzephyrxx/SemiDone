// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import TaskItem from './TaskItem';
import type { Task } from '../types';

afterEach(() => { cleanup(); document.getElementById('task-layout-styles')?.remove(); vi.restoreAllMocks(); });
it('keeps the title font size unchanged when switching into inline editing', () => {
  const style = document.createElement('style'); style.id = 'task-layout-styles';
  const workspaceCss = readFileSync(resolve('src/styles/workspace.css'), 'utf8');
  const interfaceCss = readFileSync(resolve('src/styles/ui.css'), 'utf8');
  // jsdom does not evaluate custom-property multiplication; retain the real selector cascade at 100% scale.
  style.textContent = (workspaceCss + interfaceCss).replace(/calc\((\d+(?:\.\d+)?)px \* var\(--ui-font-scale(?:, 1)?\)\)/g, '$1px');
  document.head.append(style);
  const task: Task = { id: 'layout-check', title: '检查编辑字号', description: '任务描述', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  useTaskStore.setState({ editingTaskId: null });
  render(<MemoryRouter><div className="workspace-shell"><div className="home-task-row"><TaskItem task={task} /></div></div></MemoryRouter>);
  const titleSize = getComputedStyle(screen.getByRole('heading', { name: task.title })).fontSize;
  expect(titleSize).not.toBe('');
  expect(screen.getByText(task.description!)).toBeVisible();
  act(() => useTaskStore.getState().setEditingTaskId(task.id));
  expect(getComputedStyle(screen.getByRole('textbox', { name: '待办标题' })).fontSize).toBe(titleSize);
  expect(screen.getByRole('textbox', { name: '待办描述' })).toHaveAttribute('rows', '2');
});

it('omits the description preview when a task has no description', () => {
  const task: Task = { id: 'no-description', title: '只有标题', description: '   ', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  useTaskStore.setState({ editingTaskId: null });
  const view = render(<MemoryRouter><TaskItem task={task} /></MemoryRouter>);
  expect(view.container.querySelector('.task-card-description')).not.toBeInTheDocument();
});

it('keeps completed and pending completion icons at the same size', () => {
  const style = document.createElement('style'); style.id = 'task-layout-styles';
  style.textContent = readFileSync(resolve('src/styles/workspace.css'), 'utf8'); document.head.append(style);
  const base: Task = { id: 'pending', title: '未完成', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  render(<MemoryRouter><div className="workspace-shell">
    <div className="home-task-row"><TaskItem task={base} /></div>
    <div className="home-task-row"><TaskItem task={{ ...base, id: 'done', title: '已完成', completed: true }} /></div>
  </div></MemoryRouter>);
  for (const name of ['完成待办：未完成', '标记未完成：已完成']) {
    const svg = screen.getByRole('button', { name }).querySelector('svg')!;
    expect(getComputedStyle(svg).width).toBe('21px');
    expect(getComputedStyle(svg).height).toBe('21px');
  }
});

it('selects and saves a due date in a separate dialog without stretching the card or opening native popups', async () => {
  const task: Task = { id: 'edit-date', title: '编辑截止时间', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  const updateTask = vi.spyOn(useTaskStore.getState(), 'updateTask').mockResolvedValue(undefined);
  useTaskStore.setState({ editingTaskId: null });
  render(<MemoryRouter><TaskItem task={task} /></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '编辑待办' }));
  const trigger = screen.getByRole('button', { name: '设置截止日期' });
  const editor = trigger.closest('.task-edit-form')!;
  fireEvent.click(trigger);
  const dialog = screen.getByRole('dialog', { name: '选择截止日期' });
  const picker = screen.getByRole('group', { name: '选择截止日期' });
  expect(dialog).toContainElement(picker);
  expect(editor).not.toContainElement(dialog);
  expect(editor.querySelector('.due-date-picker')).toBeNull();
  expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
  expect(within(dialog).getByRole('spinbutton', { name: '小时' })).toHaveFocus();
  expect(picker.querySelector('input[type="date"],input[type="time"]')).toBeNull();
  const date = new Date();
  fireEvent.click(within(picker).getByRole('button', { name: `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日` }));
  fireEvent.change(within(picker).getByRole('spinbutton', { name: '小时' }), { target: { value: '16' } });
  fireEvent.change(within(picker).getByRole('spinbutton', { name: '分钟' }), { target: { value: '45' } });
  fireEvent.click(within(picker).getByText('时间'));
  expect(editor.querySelector('input[aria-label="待办标题"]')).toBeVisible();
  fireEvent.click(within(picker).getByRole('button', { name: '确定' }));
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.keyDown(screen.getByRole('spinbutton', { name: '分钟' }), { key: 'Escape' });
  expect(trigger).toHaveFocus();
  fireEvent.click(screen.getByRole('button', { name: '保存更改' }));
  const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ dueDate: `${day}T16:45` })));
});
