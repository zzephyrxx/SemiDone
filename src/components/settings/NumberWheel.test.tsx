// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NumberWheel from './NumberWheel';

beforeEach(() => {
  vi.useFakeTimers();
  class TestPointer extends MouseEvent {
    pointerId: number; pointerType: string;
    constructor(type: string, options: MouseEventInit & { pointerId?: number; pointerType?: string }) {
      super(type, options); this.pointerId = options.pointerId ?? 1; this.pointerType = options.pointerType ?? 'mouse';
    }
  }
  vi.stubGlobal('PointerEvent', TestPointer);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function Picker({ onChange }: { onChange: (value: number) => void }) {
  const [value, setValue] = useState(15);
  return <NumberWheel label="字体大小" min={12} max={28} value={value} suffix=" px"
    onChange={next => { setValue(next); onChange(next); }} />;
}

it('supports keyboard steps and range limits', () => {
  const change = vi.fn(); render(<Picker onChange={change} />);
  const wheel = screen.getByRole('spinbutton', { name: '字体大小' });
  expect(wheel).toHaveAttribute('aria-valuetext', '15 px');
  fireEvent.keyDown(wheel, { key: 'ArrowUp' });
  expect(wheel).toHaveAttribute('aria-valuenow', '16');
  fireEvent.keyDown(wheel, { key: 'Home' });
  fireEvent.keyDown(wheel, { key: 'ArrowDown' });
  expect(wheel).toHaveAttribute('aria-valuenow', '12');
  expect(change).toHaveBeenCalledTimes(2);
  fireEvent.keyDown(wheel, { key: 'End' });
  fireEvent.keyDown(wheel, { key: 'PageDown' });
  expect(wheel).toHaveAttribute('aria-valuenow', '18');
});

it('previews scrolling immediately but saves once the wheel settles', () => {
  const change = vi.fn(); render(<Picker onChange={change} />);
  const wheel = screen.getByRole('spinbutton');
  fireEvent.scroll(wheel, { target: { scrollTop: 4 * 20 } });
  fireEvent.scroll(wheel, { target: { scrollTop: 5 * 20 + 5 } });
  expect(wheel).toHaveAttribute('aria-valuenow', '17');
  expect(change).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(120));
  expect(change).toHaveBeenCalledExactlyOnceWith(17);
  expect(wheel.scrollTop).toBe(5 * 20);
});

it('limits a large mouse-wheel delta to one step and damps rapid repeats', () => {
  const change = vi.fn(); render(<Picker onChange={change} />);
  const wheel = screen.getByRole('spinbutton');
  expect(fireEvent.wheel(wheel, { deltaY: 1200, cancelable: true })).toBe(false);
  expect(wheel).toHaveAttribute('aria-valuenow', '16');
  for (let index = 0; index < 5; index++) fireEvent.wheel(wheel, { deltaY: 120, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '16');
  act(() => vi.advanceTimersByTime(90));
  fireEvent.wheel(wheel, { deltaY: 120, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '17');
  expect(change).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(120));
  expect(change).toHaveBeenCalledExactlyOnceWith(17);
});

it('accumulates small trackpad movement and clears momentum on direction reversal', () => {
  render(<Picker onChange={vi.fn()} />);
  const wheel = screen.getByRole('spinbutton');
  for (let index = 0; index < 3; index++) fireEvent.wheel(wheel, { deltaY: 12, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '15');
  fireEvent.wheel(wheel, { deltaY: 12, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '16');
  fireEvent.wheel(wheel, { deltaY: -120, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '15');
});

it('normalizes line and page wheel events, clamps endpoints and ignores zoom or horizontal input', () => {
  render(<Picker onChange={vi.fn()} />);
  const wheel = screen.getByRole('spinbutton');
  fireEvent.keyDown(wheel, { key: 'Home' });
  fireEvent.wheel(wheel, { deltaY: -120, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '12');
  fireEvent.wheel(wheel, { deltaY: 3, deltaMode: 1, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '13');
  act(() => vi.advanceTimersByTime(90));
  fireEvent.wheel(wheel, { deltaY: 1, deltaMode: 2, cancelable: true });
  expect(wheel).toHaveAttribute('aria-valuenow', '14');
  expect(fireEvent.wheel(wheel, { deltaX: 120, deltaY: 2, cancelable: true })).toBe(true);
  expect(fireEvent.wheel(wheel, { deltaY: 120, ctrlKey: true, cancelable: true })).toBe(true);
  expect(wheel).toHaveAttribute('aria-valuenow', '14');
});

it('supports mouse dragging and ignores the click generated after a drag', () => {
  const change = vi.fn(); render(<Picker onChange={change} />);
  const wheel = screen.getByRole('spinbutton');
  const original = wheel.querySelector('[data-wheel-value="15"]')!;
  fireEvent.pointerDown(original, { button: 0, clientY: 60, pointerId: 2 });
  fireEvent.pointerMove(wheel, { clientY: 20, pointerId: 2 });
  expect(wheel).toHaveAttribute('aria-valuenow', '17');
  expect(change).not.toHaveBeenCalled();
  fireEvent.pointerUp(wheel, { pointerId: 2 });
  fireEvent.click(original);
  expect(change).toHaveBeenCalledExactlyOnceWith(17);
  expect(wheel).toHaveAttribute('aria-valuenow', '17');
});

it('cancels a drag without saving and lets adjacent values be clicked', () => {
  const change = vi.fn(); render(<Picker onChange={change} />);
  const wheel = screen.getByRole('spinbutton');
  fireEvent.pointerDown(wheel, { button: 0, clientY: 60, pointerId: 2 });
  fireEvent.pointerMove(wheel, { clientY: 20, pointerId: 2 });
  fireEvent.pointerCancel(wheel, { pointerId: 2 });
  expect(wheel).toHaveAttribute('aria-valuenow', '15');
  expect(change).not.toHaveBeenCalled();
  fireEvent.pointerDown(wheel.querySelector('[data-wheel-value="16"]')!, { button: 0, clientY: 60, pointerId: 3 });
  fireEvent.pointerUp(wheel, { pointerId: 3 });
  expect(change).toHaveBeenCalledExactlyOnceWith(16);
});

it('cancels a pending scroll when settings are reset externally', () => {
  const change = vi.fn();
  const view = render(<NumberWheel label="字体大小" min={12} max={28} value={15} onChange={change} />);
  const wheel = screen.getByRole('spinbutton');
  fireEvent.scroll(wheel, { target: { scrollTop: 8 * 20 } });
  view.rerender(<NumberWheel label="字体大小" min={12} max={28} value={12} onChange={change} />);
  act(() => vi.advanceTimersByTime(120));
  expect(wheel).toHaveAttribute('aria-valuenow', '12');
  expect(wheel.scrollTop).toBe(0);
  expect(change).not.toHaveBeenCalled();
});

it('saves a pending scroll if the configuration closes before the debounce finishes', () => {
  const change = vi.fn();
  const view = render(<NumberWheel label="字体大小" min={12} max={28} value={15} onChange={change} />);
  fireEvent.scroll(screen.getByRole('spinbutton'), { target: { scrollTop: 8 * 20 } });
  view.unmount();
  expect(change).toHaveBeenCalledExactlyOnceWith(20);
  act(() => vi.advanceTimersByTime(120));
  expect(change).toHaveBeenCalledTimes(1);
});
