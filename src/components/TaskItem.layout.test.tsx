// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { useTaskStore } from '../store/taskStore';
import TaskItem from './TaskItem';
import type { Task } from '../types';

afterEach(() => { cleanup(); document.getElementById('task-layout-styles')?.remove(); });
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
  act(() => useTaskStore.getState().setEditingTaskId(task.id));
  expect(getComputedStyle(screen.getByRole('textbox', { name: '待办标题' })).fontSize).toBe(titleSize);
  expect(screen.getByRole('textbox', { name: '待办描述' })).toHaveAttribute('rows', '2');
});
