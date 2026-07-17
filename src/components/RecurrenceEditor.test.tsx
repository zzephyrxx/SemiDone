// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecurrenceEditor } from './RecurrenceEditor';
import { formatRecurrenceText } from '../utils/recurrence';

afterEach(cleanup);

describe('RecurrenceEditor', () => {
  it('formats weekly and monthly rules consistently', () => {
    expect(formatRecurrenceText({ type: 'week', interval: 2, daysOfWeek: [1, 3] }))
      .toBe('每2周 周一、周三重复');
    expect(formatRecurrenceText({ type: 'month', interval: 1, daysOfMonth: [1, 15] }))
      .toBe('每1月 1号、15号重复');
  });

  it('creates and edits a weekly rule without parent-owned popover state', () => {
    const onChange = vi.fn();
    const { rerender } = render(<RecurrenceEditor value={undefined} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '不重复' }));
    fireEvent.click(screen.getByRole('button', { name: '周' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'week', interval: 1, daysOfWeek: [1] });

    rerender(<RecurrenceEditor value={{ type: 'week', interval: 1, daysOfWeek: [1] }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: '三' }));
    expect(onChange).toHaveBeenLastCalledWith({ type: 'week', interval: 1, daysOfWeek: [1, 3] });
  });

  it('clears an existing recurrence rule', () => {
    const onChange = vi.fn();
    render(<RecurrenceEditor value={{ type: 'day', interval: 1 }} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: '每1天重复' }));
    fireEvent.click(screen.getByRole('button', { name: '清除' }));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
