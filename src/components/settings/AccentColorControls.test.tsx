// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import AccentColorControls from './AccentColorControls';
afterEach(cleanup);
it('saves preset colors immediately, commits a custom color once, and resets to default', () => {
  const change = vi.fn();
  render(<AccentColorControls onChange={change} />);
  fireEvent.click(screen.getByRole('button', { name: '紫色主题色' }));
  expect(change).toHaveBeenLastCalledWith('#8b5cf6');
  fireEvent.click(screen.getByRole('button', { name: '自定义' }));
  fireEvent.change(screen.getByRole('textbox', { name: '主题色色值' }), { target: { value: '#12ab34' } });
  expect(change).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: '应用主题色' }));
  expect(change).toHaveBeenLastCalledWith('#12ab34');
  fireEvent.click(screen.getByRole('button', { name: '默认' }));
  expect(change).toHaveBeenLastCalledWith(undefined);
});
