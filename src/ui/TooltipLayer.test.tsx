// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { TooltipLayer } from './TooltipLayer';

beforeEach(() => { vi.useFakeTimers(); });
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });
const show = () => act(() => vi.advanceTimersByTime(1000));

it('keeps nested hover hints in the WebView instead of opening native title windows', () => {
  render(<><div title="查看详情"><button title="编辑待办" aria-describedby="existing"><svg data-testid="icon" /></button></div><TooltipLayer /></>);
  const button = screen.getByRole('button', { name: '编辑待办' });
  fireEvent.mouseOver(screen.getByTestId('icon'));
  expect(button).toHaveAttribute('title', '');
  expect(button.parentElement).toHaveAttribute('title', '');
  expect(button).toHaveAccessibleName('编辑待办');
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(999));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  const hint = screen.getByRole('tooltip');
  expect(hint.parentElement).toBe(document.body);
  expect(hint).toHaveTextContent('编辑待办');
  expect(button.getAttribute('aria-describedby')?.split(' ')).toEqual(['existing', hint.id]);
  // Moving between a button and its icon must not restart the hover delay.
  fireEvent.mouseOut(screen.getByTestId('icon'), { relatedTarget: button });
  fireEvent.mouseOver(button, { relatedTarget: screen.getByTestId('icon') });
  expect(screen.getByRole('tooltip')).toBe(hint);
  act(() => vi.advanceTimersByTime(2000));
  expect(hint).toBeVisible();
  fireEvent.mouseOut(button, { relatedTarget: document.body });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(button).toHaveAttribute('title', '编辑待办');
  expect(button).toHaveAttribute('aria-describedby', 'existing');
  expect(button).not.toHaveAttribute('aria-label');
  expect(button.parentElement).toHaveAttribute('title', '查看详情');
});

it('supports keyboard focus and Escape without reopening the native tooltip', () => {
  render(<><button title="取消置顶" aria-label="置顶开关">固定</button><TooltipLayer /></>);
  const button = screen.getByRole('button', { name: '置顶开关' });
  act(() => button.focus());
  act(() => vi.advanceTimersByTime(999));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('tooltip')).toHaveTextContent('取消置顶');
  fireEvent.keyDown(button, { key: 'Escape' });
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(button).toHaveAttribute('title', '');
  expect(button).toHaveAccessibleName('置顶开关');
  act(() => button.blur());
  expect(button).toHaveAttribute('title', '取消置顶');
});

it('tracks a changed title without stale text or duplicate native hints', async () => {
  const view = render(<><button title="置顶窗口" /><TooltipLayer /></>);
  const button = screen.getByRole('button', { name: '置顶窗口' });
  fireEvent.mouseOver(button); show();
  view.rerender(<><button title="取消置顶" /><TooltipLayer /></>);
  await act(async () => {});
  expect(screen.getByRole('tooltip')).toHaveTextContent('取消置顶');
  expect(button).toHaveAttribute('title', '');
  expect(button).toHaveAccessibleName('取消置顶');
  fireEvent.mouseOut(button, { relatedTarget: document.body });
  expect(button).toHaveAttribute('title', '取消置顶');
  expect(button).not.toHaveAttribute('aria-label');
});

it('requires a new one-second hover after moving to a different control', () => {
  render(<><button title="编辑待办" /><button title="删除待办" /><TooltipLayer /></>);
  const edit = screen.getByRole('button', { name: '编辑待办' });
  const remove = screen.getByRole('button', { name: '删除待办' });
  fireEvent.mouseOver(edit);
  act(() => vi.advanceTimersByTime(500));
  fireEvent.mouseOut(edit, { relatedTarget: remove });
  fireEvent.mouseOver(remove, { relatedTarget: edit });
  act(() => vi.advanceTimersByTime(999));
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  act(() => vi.advanceTimersByTime(1));
  expect(screen.getByRole('tooltip')).toHaveTextContent('删除待办');
});

it('cleans pending and visible hints when their task card is removed', async () => {
  const view = render(<><button title="删除待办" /><TooltipLayer /></>);
  fireEvent.mouseOver(screen.getByRole('button'));
  view.rerender(<TooltipLayer />);
  await act(async () => {}); show();
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  view.rerender(<><button title="编辑待办" /><TooltipLayer /></>);
  fireEvent.mouseOver(screen.getByRole('button')); show();
  expect(screen.getByRole('tooltip')).toBeVisible();
  view.rerender(<TooltipLayer />);
  await act(async () => {});
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
});

it('keeps the hint inside the window and dismisses it on scroll', () => {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
    return (this.getAttribute('role') === 'tooltip'
      ? { width: 200, height: 40 } : { left: 1000, top: 730, bottom: 752, width: 24 }) as DOMRect;
  });
  render(<><button title="在文件管理器中打开" /><TooltipLayer /></>);
  fireEvent.mouseOver(screen.getByRole('button')); show();
  const hint = screen.getByRole('tooltip');
  expect(parseFloat(hint.style.left) + 200).toBeLessThanOrEqual(window.innerWidth - 8);
  expect(parseFloat(hint.style.top) + 40).toBeLessThanOrEqual(window.innerHeight - 8);
  fireEvent.scroll(document);
  expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  expect(screen.getByRole('button')).toHaveAttribute('title', '');
});
