// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import NumberStepper from './NumberStepper';

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('PointerEvent', MouseEvent);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
function Control() {
  const [value, setValue] = useState(15);
  return <NumberStepper label="字体大小" min={12} max={28} value={value} suffix=" px" onChange={setValue} />;
}

it('increments and decrements immediately, supports keyboard adjustment, and stops at both limits', () => {
  render(<Control />);
  const value = screen.getByRole('spinbutton', { name: '字体大小' });
  const up = screen.getByRole('button', { name: '增加字体大小' });
  const down = screen.getByRole('button', { name: '减少字体大小' });
  fireEvent.click(up);
  expect(value).toHaveAttribute('aria-valuetext', '16 px');
  fireEvent.click(down);
  fireEvent.keyDown(value, { key: 'ArrowDown' });
  expect(value).toHaveAttribute('aria-valuenow', '14');
  fireEvent.keyDown(value, { key: 'Home' });
  expect(down).toBeDisabled();
  fireEvent.keyDown(value, { key: 'ArrowDown' });
  expect(value).toHaveAttribute('aria-valuenow', '12');
  fireEvent.keyDown(value, { key: 'End' });
  expect(up).toBeDisabled();
  fireEvent.keyDown(value, { key: 'ArrowUp' });
  expect(value).toHaveAttribute('aria-valuenow', '28');
});

it('reflects external changes without retaining a pending value', () => {
  const change = vi.fn();
  const view = render(<NumberStepper label="透明度" min={0} max={100} value={35} suffix="%" onChange={change} />);
  view.rerender(<NumberStepper label="透明度" min={0} max={100} value={0} suffix="%" onChange={change} />);
  expect(screen.getByRole('spinbutton')).toHaveAttribute('aria-valuetext', '0%');
  expect(screen.getByRole('button', { name: '减少透明度' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: '增加透明度' }));
  expect(change).toHaveBeenCalledExactlyOnceWith(1);
});

it('accepts typed values on Enter or blur, clamps the range, and recovers from empty or invalid input', () => {
  render(<Control />);
  const input = screen.getByRole('spinbutton', { name: '字体大小' });
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.change(input, { target: { value: '24' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveValue('24');
  fireEvent.change(input, { target: { value: '99' } });
  fireEvent.blur(input);
  expect(input).toHaveValue('28');
  fireEvent.change(input, { target: { value: '-5' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect(input).toHaveValue('12');
  for (const value of ['', 'abc', 'Infinity']) {
    fireEvent.change(input, { target: { value } });
    fireEvent.blur(input);
    expect(input).toHaveValue('12');
  }
});

it('cancels an unfinished edit with Escape without bubbling to the Zen close handler', () => {
  const escape = vi.fn();
  render(<div onKeyDown={escape}><Control /></div>);
  const input = screen.getByRole('spinbutton');
  fireEvent.change(input, { target: { value: '22' } });
  fireEvent.keyDown(input, { key: 'Escape' });
  expect(input).toHaveValue('15');
  expect(escape).not.toHaveBeenCalled();
});

it('repeats while held, stops on release and does not apply an extra release click', () => {
  render(<Control />);
  const input = screen.getByRole('spinbutton');
  const up = screen.getByRole('button', { name: '增加字体大小' });
  fireEvent.pointerDown(up, { button: 0 });
  expect(input).toHaveValue('16');
  act(() => vi.advanceTimersByTime(480));
  expect(input).toHaveValue('19');
  fireEvent.pointerUp(up);
  fireEvent.click(up, { detail: 1 });
  act(() => vi.advanceTimersByTime(1000));
  expect(input).toHaveValue('19');
  // Keyboard activation must still work after pointer interaction.
  fireEvent.click(up, { detail: 0 });
  expect(input).toHaveValue('20');
});

it('decrements a typed draft while held, clamps at the limit, and leaves no repeat running', () => {
  render(<Control />);
  const input = screen.getByRole('spinbutton');
  const down = screen.getByRole('button', { name: '减少字体大小' });
  fireEvent.change(input, { target: { value: '17' } });
  fireEvent.pointerDown(down, { button: 0 });
  act(() => vi.advanceTimersByTime(2000));
  expect(input).toHaveValue('12');
  expect(down).toBeDisabled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(['pointerCancel', 'lostPointerCapture', 'windowBlur', 'unmount'])('stops a hold on %s', (reason) => {
  const view = render(<Control />);
  const up = screen.getByRole('button', { name: '增加字体大小' });
  fireEvent.pointerDown(up, { button: 0 });
  if (reason === 'pointerCancel') fireEvent.pointerCancel(up);
  else if (reason === 'lostPointerCapture') fireEvent.lostPointerCapture(up);
  else if (reason === 'windowBlur') fireEvent(window, new Event('blur'));
  else view.unmount();
  act(() => vi.advanceTimersByTime(1000));
  expect(vi.getTimerCount()).toBe(0);
  if (reason !== 'unmount') expect(screen.getByRole('spinbutton')).toHaveValue('16');
});
