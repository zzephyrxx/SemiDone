// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RecurrenceEditor } from './RecurrenceEditor';
import { formatRecurrenceText } from '../utils/recurrence';
import { useSettingsStore } from '../store/settingsStore';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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

  it.each([
    { left: 180, top: 100, bottom: 132, expectedLeft: '180px', expectedTop: '140px', placement: 'bottom' },
    { left: 520, top: 700, bottom: 732, expectedLeft: '284px', expectedTop: '452px', placement: 'top' },
  ])('places the recurrence popup beside its trigger and within the viewport: $placement', bounds => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', animationsEnabled: false, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } }));
    vi.stubGlobal('innerWidth', 640); vi.stubGlobal('innerHeight', 800);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue(bounds as unknown as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(340);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(240);
    render(<RecurrenceEditor onChange={vi.fn()} />);
    const button = screen.getByRole('button', { name: '不重复' });
    fireEvent.click(button);
    const dialog = screen.getByRole('dialog', { name: '设置重复周期' });
    expect(dialog).toHaveStyle({ left: bounds.expectedLeft, top: bounds.expectedTop });
    expect(dialog).toHaveAttribute('data-placement', bounds.placement);
    expect(button.parentElement).not.toContainElement(dialog);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(button).toHaveFocus();
  });

  it('repositions when recurrence content grows and keeps tall content scrollable after resizing', () => {
    useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', animationsEnabled: false, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } }));
    vi.stubGlobal('innerWidth', 640); vi.stubGlobal('innerHeight', 800);
    let height = 200;
    let resized = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal('ResizeObserver', class { constructor(callback: () => void) { resized = callback; } observe() {} disconnect = disconnect; });
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 180, top: 500, bottom: 532 } as DOMRect);
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockReturnValue(340);
    vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockImplementation(() => height);
    const view = render(<RecurrenceEditor onChange={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '不重复' }));
    const dialog = screen.getByRole('dialog', { name: '设置重复周期' });
    expect(dialog).toHaveStyle({ top: '540px' });
    height = 400; act(() => resized());
    expect(dialog).toHaveStyle({ top: '92px', maxHeight: '476px' });
    vi.stubGlobal('innerHeight', 400); fireEvent.resize(window);
    expect(dialog).toHaveStyle({ top: '16px', maxHeight: '360px' });
    view.unmount(); expect(disconnect).toHaveBeenCalledOnce();
  });
});
