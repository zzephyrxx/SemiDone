// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import HomeContextHeader from './HomeContextHeader';
import { useSettingsStore } from '../store/settingsStore';

vi.mock('../data/quotes', () => ({ getQuotesByTheme: (theme: string) => theme === 'pink' ? ['粉色短语一', '粉色短语二'] : ['励志短语一', '励志短语二'] }));
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-26T12:00:00')); localStorage.clear();
  useSettingsStore.setState(state => ({ settings: { ...state.settings, theme: 'light' } }));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.useRealTimers(); });
it('rotates the existing phrases every five seconds, keeps its index, and releases the timer', () => {
  const start = vi.spyOn(globalThis, 'setInterval');
  const stop = vi.spyOn(globalThis, 'clearInterval');
  const view = render(<HomeContextHeader />);
  expect(screen.getByText('10月26日星期一')).toHaveAttribute('datetime', '2026-10-26');
  expect(screen.getByLabelText('励志短语')).toHaveTextContent('励志短语一');
  act(() => vi.advanceTimersByTime(5000));
  expect(screen.getByLabelText('励志短语')).toHaveTextContent('励志短语二');
  expect(localStorage.getItem('quoteIndex')).toBe('1');
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, theme: 'pink' } })));
  expect(screen.getByLabelText('励志短语')).toHaveTextContent('粉色短语二');
  expect(start).toHaveBeenCalledTimes(2); expect(stop).toHaveBeenCalledTimes(1);
  view.unmount(); expect(stop).toHaveBeenCalledTimes(2);
});
