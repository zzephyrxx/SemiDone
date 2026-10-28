// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, expect, it, vi } from 'vitest';
import { useTaskStore } from '../store/taskStore';
import TaskDetail from './TaskDetail';
import type { Task } from '../types';

afterEach(() => { cleanup(); document.getElementById('detail-layout-styles')?.remove(); vi.restoreAllMocks(); });

it('wraps unbroken URLs in the detail view and editors without changing saved text', async () => {
  const url = 'https://example.com/' + 'a'.repeat(70);
  const description = url + '\n' + 'b'.repeat(160);
  const task: Task = { id: 'long-url', title: url, description, completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  const updateTask = vi.fn().mockResolvedValue(undefined);
  useTaskStore.setState({ tasks: [task], updateTask });
  const style = document.createElement('style'); style.id = 'detail-layout-styles';
  style.textContent = readFileSync(resolve('src/styles/workspace.css'), 'utf8');
  document.head.append(style);
  const view = render(<MemoryRouter initialEntries={['/task/long-url']}><Routes><Route path="/task/:id" element={<TaskDetail />} /></Routes></MemoryRouter>);
  expect(getComputedStyle(view.container.querySelector('.task-detail-content')!).minWidth).toBe('0px');
  const heading = screen.getByRole('heading', { name: url });
  expect(getComputedStyle(heading).overflowWrap).toBe('anywhere');
  expect(getComputedStyle(view.container.querySelector('div.task-detail-text')!).overflowWrap).toBe('anywhere');
  fireEvent.click(screen.getByRole('button', { name: '编辑待办' }));
  for (const [name, value] of [['待办标题', url], ['待办描述', description]]) {
    const editor = screen.getByRole('textbox', { name });
    expect(editor.tagName).toBe('TEXTAREA');
    expect(editor).toHaveAttribute('wrap', 'soft');
    expect(editor).toHaveValue(value);
    expect(getComputedStyle(editor).overflowWrap).toBe('anywhere');
  }
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ title: url, description })));
});

it('keeps empty descriptions compact and retains edit and delete actions as accessible icons', async () => {
  const task: Task = { id: 'empty-description', title: '只有标题的待办', description: '  \n ', completed: false, priority: 'medium', createdAt: '', updatedAt: '' };
  const deleteTask = vi.fn(), updateTask = vi.fn().mockResolvedValue(undefined);
  useTaskStore.setState({ tasks: [task], deleteTask, updateTask });
  const style = document.createElement('style'); style.id = 'detail-layout-styles';
  style.textContent = readFileSync(resolve('src/styles/workspace.css'), 'utf8'); document.head.append(style);
  const view = render(<MemoryRouter initialEntries={['/task/empty-description']}><Routes><Route path="/task/:id" element={<TaskDetail />} /></Routes></MemoryRouter>);
  const description = view.container.querySelector('.task-detail-description')!;
  expect(description).toHaveAttribute('data-empty', 'true');
  expect(description).toHaveTextContent('暂无描述');
  expect(getComputedStyle(description).minHeight).toBe('0px');
  for (const name of ['编辑待办', '删除待办']) {
    const button = screen.getByRole('button', { name });
    expect(button.textContent).toBe('');
    expect(button.querySelector('svg')).not.toBeNull();
  }
  fireEvent.click(screen.getByRole('button', { name: '删除待办' }));
  const confirmation = screen.getByRole('alertdialog', { name: '确认删除' });
  expect(confirmation).toBeVisible(); expect(deleteTask).not.toHaveBeenCalled();
  fireEvent.click(within(confirmation).getByRole('button', { name: '取消' }));
  fireEvent.click(screen.getByRole('button', { name: '编辑待办' }));
  expect(screen.getByRole('textbox', { name: '待办描述' })).toHaveAttribute('rows', '2');
  fireEvent.change(screen.getByRole('textbox', { name: '待办描述' }), { target: { value: '补充描述' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ description: '补充描述' })));
});

it('edits the deadline using the shared in-page date and time picker', async () => {
  const task: Task = { id: 'deadline', title: '修改日期', completed: false, priority: 'medium', dueDate: '2099-01-15T09:00', createdAt: '', updatedAt: '' };
  const updateTask = vi.fn().mockResolvedValue(undefined);
  useTaskStore.setState({ tasks: [task], updateTask });
  render(<MemoryRouter initialEntries={['/task/deadline']}><Routes><Route path="/task/:id" element={<TaskDetail />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '编辑待办' }));
  const trigger = document.querySelector<HTMLButtonElement>('button[aria-expanded]')!;
  fireEvent.click(trigger);
  const picker = screen.getByRole('group', { name: '选择截止日期' });
  expect(picker.querySelector('input[type="date"], input[type="time"]')).toBeNull();
  fireEvent.click(within(picker).getByRole('button', { name: '2099年1月16日' }));
  fireEvent.change(within(picker).getByRole('spinbutton', { name: '小时' }), { target: { value: '17' } });
  fireEvent.change(within(picker).getByRole('spinbutton', { name: '分钟' }), { target: { value: '25' } });
  fireEvent.click(within(picker).getByRole('button', { name: '确定' }));
  expect(trigger).toHaveFocus();
  fireEvent.click(trigger);
  fireEvent.change(screen.getByRole('spinbutton', { name: '小时' }), { target: { value: '20' } });
  fireEvent.click(within(screen.getByRole('group', { name: '选择截止日期' })).getByRole('button', { name: '取消' }));
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ dueDate: '2099-01-16T17:25' })));
});

it('sends an explicit deadline removal when clearing an existing deadline', async () => {
  const task: Task = { id: 'clear-deadline', title: '清除日期', completed: false, priority: 'medium', dueDate: '2099-01-15T09:00', createdAt: '', updatedAt: '' };
  const updateTask = vi.fn().mockResolvedValue(undefined);
  useTaskStore.setState({ tasks: [task], updateTask });
  render(<MemoryRouter initialEntries={['/task/clear-deadline']}><Routes><Route path="/task/:id" element={<TaskDetail />} /></Routes></MemoryRouter>);
  fireEvent.click(screen.getByRole('button', { name: '编辑待办' }));
  fireEvent.click(document.querySelector<HTMLButtonElement>('button[aria-expanded]')!);
  fireEvent.click(within(screen.getByRole('group', { name: '选择截止日期' })).getByRole('button', { name: '清除' }));
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(updateTask).toHaveBeenCalledWith(task.id, expect.objectContaining({ clearDueDate: true, dueDate: undefined })));
});
