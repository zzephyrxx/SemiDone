// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cleanup, render, within } from '@testing-library/react';
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

it('aligns the return control outside the independent content widths of calendar, statistics and settings', () => {
  style = document.createElement('style');
  style.textContent = readFileSync(resolve('src/styles/workspace.css'), 'utf8');
  document.head.append(style);
  const view = render(<MemoryRouter><div className="workspace-shell">
    <TaskCalendarContent tasks={[]} /><UsageStats /><Other />
  </div></MemoryRouter>);
  const pages = view.container.querySelectorAll('.calendar-page, .usage-page, .settings-page');
  expect(pages).toHaveLength(3);
  for (const page of pages) {
    const header = page.firstElementChild!;
    expect(header).toHaveClass('workspace-page-header');
    const control = within(header as HTMLElement).getByText('返回').closest('.workspace-back')!;
    expect(control.parentElement).toBe(header);
    expect(getComputedStyle(header).maxWidth).toBe('880px');
    expect(getComputedStyle(header).height).toBe('40px');
    expect(getComputedStyle(header).minHeight).toBe('40px');
    expect(getComputedStyle(header).marginBottom).toBe('12px');
    expect(getComputedStyle(control).padding).toBe('0px');
    expect(control.querySelector('svg')).toHaveAttribute('width', '16');
  }
});
