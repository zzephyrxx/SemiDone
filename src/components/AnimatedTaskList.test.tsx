// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Task } from '../types';
import AnimatedTaskList from './AnimatedTaskList';
import { ROW, taskWindow } from '../ui/taskWindow';
import { useSettingsStore } from '../store/settingsStore';
import { useState } from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const counter = vi.hoisted(() => ({ renders: 0 }));
vi.mock('./TaskItem', () => ({ default: ({ task }: { task: Task }) => { counter.renders++; return <div className="task-card">{task.title}</div>; } }));
const tasks: Task[] = Array.from({ length: 100 }, (_, i) => ({ id: `t${i}`, title: `Task ${i}`, completed: false, priority: 'medium', createdAt: '', updatedAt: '' }));
function PageList({ resetKey = 'all' }: { resetKey?: string }) {
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return <div ref={setRoot} data-testid="page-scroll"><div>日期、概览和工具栏</div>
    <AnimatedTaskList tasks={tasks} editingTaskId={null} resetKey={resetKey} scrollRoot={root} scrollInset={42} /></div>;
}
beforeEach(() => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, fontScale: 100, animationsEnabled: true } }));
  vi.useFakeTimers(); counter.renders = 0;
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(624);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe('keyed virtual task transitions', () => {
  it('virtualizes against the whole-page scroller with the header offset and preserves its position', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: this.classList.contains('home-task-list') ? 500 - this.parentElement!.scrollTop : 100, height: 624 } as DOMRect;
    });
    const view = render(<PageList />);
    const root = screen.getByTestId('page-scroll');
    expect(screen.getByLabelText('待办列表')).not.toHaveClass('overflow-y-auto');
    fireEvent.scroll(root, { target: { scrollTop: 400 + 30 * ROW } });
    expect(screen.getByText('Task 30')).toBeVisible(); expect(screen.queryByText('Task 0')).not.toBeInTheDocument();
    expect(document.querySelectorAll('[data-task-row]').length).toBeLessThan(20);
    view.rerender(<PageList />); expect(root.scrollTop).toBe(400 + 30 * ROW);
    view.unmount(); const before = counter.renders;
    fireEvent.scroll(root, { target: { scrollTop: 0 } }); expect(counter.renders).toBe(before);
  });
  it('resets results below the pinned toolbar instead of forcing the whole page to its top', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: this.classList.contains('home-task-list') ? 500 - this.parentElement!.scrollTop : 100, height: 624 } as DOMRect;
    });
    const view = render(<PageList />); const root = screen.getByTestId('page-scroll');
    fireEvent.scroll(root, { target: { scrollTop: 1000 } });
    view.rerender(<PageList resetKey="pending" />);
    expect(root.scrollTop).toBe(358); expect(screen.getByText('Task 0')).toBeVisible();
  });
  it('remeasures the header when its height changes without changing the page scroll position', () => {
    let offset = 400; const notify: (() => void)[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { notify.push(callback); } observe() {} disconnect() {} });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: this.classList.contains('home-task-list') ? 100 + offset - this.parentElement!.scrollTop : 100, height: 624 } as DOMRect;
    });
    render(<PageList />); const root = screen.getByTestId('page-scroll');
    fireEvent.scroll(root, { target: { scrollTop: 400 + 30 * ROW } });
    const first = document.querySelector<HTMLElement>('[data-task-row]')!.dataset.taskRow;
    offset = 600; act(() => notify.forEach(callback => callback()));
    expect(root.scrollTop).toBe(400 + 30 * ROW);
    expect(document.querySelector<HTMLElement>('[data-task-row]')!.dataset.taskRow).not.toBe(first);
    expect(screen.getByText('Task 28')).toBeVisible();
  });
  it('keeps a completed task through both exit stages, then removes it from the active view', () => {
    const style = document.createElement('style');
    style.textContent = readFileSync(resolve('src/styles/ui.css'), 'utf8');
    document.head.append(style);
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId={null} resetKey="all" />);
    view.rerender(<AnimatedTaskList tasks={[tasks[1]]} editingTaskId={null} resetKey="all" />);
    expect(screen.getByText('Task 0').closest('[data-task-row]')).toHaveClass('is-leaving');
    expect(getComputedStyle(screen.getByText('Task 0').closest('[data-task-row]')!).overflow).toBe('clip');
    expect(getComputedStyle(screen.getByText('Task 1').closest('[data-task-row]')!).overflow).not.toBe('clip');
    expect(getComputedStyle(screen.getByText('Task 0')).animation).toContain('ui-task-exit');
    expect(screen.getByText('Task 0').closest<HTMLElement>('[data-task-row]')!.style.getPropertyValue('--task-exit-distance')).toBe('424px');
    act(() => vi.advanceTimersByTime(210));
    expect(screen.getByText('Task 0').closest('[data-task-row]')).toHaveClass('is-leaving');
    // React falls back to WebKit event names in jsdom without AnimationEvent.
    const end = new Event('AnimationEvent' in window ? 'animationend' : 'webkitAnimationEnd', { bubbles: true }); Object.defineProperty(end, 'animationName', { value: 'ui-task-exit' });
    fireEvent(screen.getByText('Task 0'), end);
    expect(screen.queryByText('Task 0')).not.toBeInTheDocument();
    expect(Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]')).map(row => row.dataset.taskRow)).toEqual(['t1']);
    view.rerender(<AnimatedTaskList tasks={[{ ...tasks[0], completed: true }]} editingTaskId={null} resetKey="completed" />);
    expect(screen.getByText('Task 0').closest('[data-task-row]')).not.toHaveClass('is-leaving');
    style.remove();
  });
  it('retains a completed task once at its sorted position in all after the exit animation', () => {
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId={null} resetKey="all" />);
    view.rerender(<AnimatedTaskList tasks={[tasks[1], { ...tasks[0], completed: true }]} editingTaskId={null} resetKey="all" />);
    expect(screen.getByText('Task 0').closest('[data-task-row]')).toHaveClass('is-leaving');
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getAllByText('Task 0')).toHaveLength(1);
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]'));
    expect(rows.map(row => row.dataset.taskRow)).toEqual(['t1', 't0']);
    expect(rows[1]).not.toHaveClass('is-leaving'); expect(rows[1].inert).toBe(false);
  });
  it('finishes completion immediately when interface animations are disabled', () => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false } }));
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 1)} editingTaskId={null} resetKey="all" />);
    view.rerender(<AnimatedTaskList tasks={[{ ...tasks[0], completed: true }]} editingTaskId={null} resetKey="all" />);
    expect(screen.getByText('Task 0').closest('[data-task-row]')).not.toHaveClass('is-leaving');
    expect(vi.getTimerCount()).toBe(0);
  });
  it('uses the measured editor height rather than a fixed blank area', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: 0, height: this.dataset.taskRow === 't0' ? 210 : ROW } as DOMRect;
    });
    render(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId="t0" resetKey="all" />);
    expect(screen.getByLabelText('待办列表').firstElementChild).toHaveStyle({ height: `${210 + ROW}px` });
    expect(screen.getByText('Task 0').closest<HTMLElement>('[data-task-row]')?.style.height).toBe('');
  });
  it('keeps the final removed row inert during exit then reveals the empty state', () => {
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 1)} editingTaskId={null} resetKey="pending" empty={<p>Empty</p>} />);
    view.rerender(<AnimatedTaskList tasks={[]} editingTaskId={null} resetKey="pending" empty={<p>Empty</p>} />);
    expect(screen.getByText('Task 0').closest<HTMLElement>('[data-task-row]')?.inert).toBe(true);
    act(() => vi.advanceTimersByTime(250));
    expect(screen.queryByText('Task 0')).not.toBeInTheDocument(); expect(screen.getByText('Empty')).toBeVisible();
  });
  it('cancels a pending exit on immediate undo without duplicates or late removal', () => {
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId={null} resetKey="pending" />);
    view.rerender(<AnimatedTaskList tasks={tasks.slice(1, 2)} editingTaskId={null} resetKey="pending" />);
    view.rerender(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId={null} resetKey="pending" />);
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.getAllByText('Task 0')).toHaveLength(1);
    expect(screen.getByText('Task 0').closest<HTMLElement>('[data-task-row]')?.inert).toBe(false);
  });
  it('applies large replacements immediately instead of queueing dozens of exits', () => {
    const view = render(<AnimatedTaskList tasks={tasks} editingTaskId={null} resetKey="all" />);
    view.rerender(<AnimatedTaskList tasks={[]} editingTaskId={null} resetKey="all" empty={<p>Empty</p>} />);
    expect(screen.getByText('Empty')).toBeVisible(); expect(vi.getTimerCount()).toBe(0);
  });
  it('does not render per pixel while scrolling inside the current virtual range', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(6 * ROW);
    render(<AnimatedTaskList tasks={tasks} editingTaskId={null} resetKey="all" />);
    const list = screen.getByLabelText('待办列表'); const before = counter.renders;
    for (let top = 1; top < ROW; top++) fireEvent.scroll(list, { target: { scrollTop: top } });
    expect(counter.renders - before).toBe(0);
    fireEvent.scroll(list, { target: { scrollTop: 1040 } });
    expect(counter.renders).toBeGreaterThan(before);
    expect(document.querySelectorAll('[data-task-row]').length).toBeLessThan(20);
  });
  it('accounts for an expanded editor before and within the viewport', () => {
    expect(taskWindow(100, 2, 1040, 400, 104, 210).total).toBe(10506);
    expect(taskWindow(100, 2, 10 * ROW, 400).start).toBe(2);
    expect(taskWindow(0, -1, 0, 400)).toEqual({ start: 0, end: 0, offset: 0, total: 0 });
  });
  it('moves stable keyed rows to their new positions and releases animations on unmount', () => {
    const notifications: (() => void)[] = [];
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { notifications.push(callback); } observe() {} disconnect() {} });
    const cancel = vi.fn(); const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation>(() => ({ cancel } as unknown as Animation));
    Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      return { top: Array.from(this.parentElement?.children ?? []).indexOf(this) * 104 } as DOMRect;
    });
    const view = render(<AnimatedTaskList tasks={tasks.slice(0, 2)} editingTaskId={null} resetKey="all" />);
    // A layout measurement without scrolling must not erase the previous positions.
    act(() => notifications.forEach(notify => notify()));
    view.rerender(<AnimatedTaskList tasks={[tasks[1], tasks[0]]} editingTaskId={null} resetKey="all" />);
    expect(animate).toHaveBeenCalledTimes(2);
    expect(animate.mock.calls[0][0]).toEqual([{ transform: 'translateY(104px)' }, { transform: 'translateY(0)' }]);
    view.unmount(); expect(cancel).toHaveBeenCalledTimes(2);
    Reflect.deleteProperty(HTMLElement.prototype, 'animate');
  });
  it('mounts only the viewport and overscan for a thousand tasks', () => {
    const thousand = Array.from({ length: 1000 }, (_, i) => ({ ...tasks[0], id: `long-${i}`, title: `Long ${i}` }));
    render(<AnimatedTaskList tasks={thousand} editingTaskId={null} resetKey="all" />);
    expect(document.querySelectorAll('[data-task-row]').length).toBeLessThan(20);
    const list = screen.getByLabelText('待办列表');
    fireEvent.scroll(list, { target: { scrollTop: 500 * ROW } });
    expect(document.querySelectorAll('[data-task-row]').length).toBeLessThan(21);
    expect(screen.getByText('Long 500')).toBeVisible();
  });
});
