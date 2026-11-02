// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import InlineDueDatePicker from './InlineDueDatePicker';

afterEach(cleanup);
it('validates hours and minutes and commits a zero-padded local date-time', () => {
  const confirm = vi.fn();
  render(<InlineDueDatePicker id="due" value="2099-01-15T09:00" onConfirm={confirm} onCancel={vi.fn()} onClear={vi.fn()} />);
  const hour = screen.getByRole('spinbutton', { name: '小时' });
  const minute = screen.getByRole('spinbutton', { name: '分钟' });
  fireEvent.change(hour, { target: { value: '25' } });
  expect(screen.getByRole('button', { name: '确定' })).toBeDisabled();
  fireEvent.keyDown(hour, { key: 'Enter' }); expect(confirm).not.toHaveBeenCalled();
  fireEvent.change(hour, { target: { value: '7' } });
  fireEvent.change(minute, { target: { value: '5' } });
  fireEvent.keyDown(minute, { key: 'Enter' });
  expect(confirm).toHaveBeenCalledExactlyOnceWith('2099-01-15T07:05');
});

it('keeps Escape and Ctrl+Enter from reaching the outer task form', () => {
  const cancel = vi.fn(), confirm = vi.fn(), outer = vi.fn();
  render(<form onKeyDown={outer}><InlineDueDatePicker id="due" value="2099-01-15T09:00" onConfirm={confirm} onCancel={cancel} onClear={vi.fn()} /></form>);
  const hour = screen.getByRole('spinbutton', { name: '小时' });
  fireEvent.keyDown(hour, { key: 'Escape' }); expect(cancel).toHaveBeenCalledOnce();
  fireEvent.keyDown(hour, { key: 'Enter', ctrlKey: true }); expect(confirm).toHaveBeenCalledOnce();
  expect(outer).not.toHaveBeenCalled();
});
