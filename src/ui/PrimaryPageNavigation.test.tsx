// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, fireEvent, render, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import Other from '../pages/Other';
import UsageStats from '../pages/UsageStats';
import { TaskCalendarContent } from '../pages/TaskCalendar';

vi.mock('../api/tauri', () => ({ api: { settings: {}, usage: {
  getUsageData: vi.fn(async () => ({ success: true, data: {} })),
  saveUsageData: vi.fn(async () => ({ success: true })),
} } }));
let style: HTMLStyleElement;
afterEach(() => { cleanup(); style?.remove(); });

it('uses main navigation instead of redundant return controls and retains calendar view selection', () => {
  style = document.createElement('style');
  style.textContent = readFileSync(resolve('src/styles/workspace.css'), 'utf8');
  document.head.append(style);
  const view = render(<MemoryRouter><div className="workspace-shell">
    <TaskCalendarContent tasks={[]} /><UsageStats /><Other />
  </div></MemoryRouter>);
  const pages = view.container.querySelectorAll('.calendar-page, .usage-page, .settings-page');
  expect(pages).toHaveLength(3);
  for (const page of pages) {
    const content = within(page as HTMLElement);
    expect(content.queryByRole('link', { name: '返回' })).not.toBeInTheDocument();
    expect(content.queryByRole('button', { name: '返回' })).not.toBeInTheDocument();
    expect(page.querySelector('.workspace-page-header, .workspace-back')).not.toBeInTheDocument();
  }
  const calendar = within(view.container.querySelector<HTMLElement>('.calendar-page')!);
  fireEvent.click(calendar.getByRole('button', { name: '周视图' }));
  expect(calendar.getByText('本周完成')).toBeVisible();
  fireEvent.click(calendar.getByRole('button', { name: '月视图' }));
  expect(calendar.getByText('本月完成')).toBeVisible();
  expect(view.container.querySelector('.settings-page')!.firstElementChild).toHaveClass('settings-container');
  const index = view.container.querySelector('.settings-index')!;
  expect(getComputedStyle(index).marginTop).toBe('4px');
  expect(getComputedStyle(index).marginBottom).toBe('10.8px');
  expect(getComputedStyle(index.parentElement!).display).toBe('flow-root');
});
