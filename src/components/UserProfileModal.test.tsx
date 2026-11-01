// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';
import UserProfileModal from './UserProfileModal';
import type { Settings } from '../types';
const update = vi.fn(async (updates: Partial<Settings>) => { useSettingsStore.setState(state => ({ settings: { ...state.settings, ...updates } })); });
beforeEach(() => {
  update.mockClear();
  useSettingsStore.setState(state => ({ settings: { ...state.settings, username: '原用户名', avatar: '', collapseMode: 'expanded', liquidGlass: { ...state.settings.liquidGlass, enabled: false } }, updateSettings: update }));
});
afterEach(cleanup);
it('starts read-only, enables editing with the pen, and saves the username', async () => {
  const close = vi.fn();
  render(<UserProfileModal isOpen onClose={close} />);
  const input = screen.getByRole('textbox', { name: '用户名' });
  expect(input).toHaveAttribute('readonly');
  expect(input).toHaveValue('原用户名');
  fireEvent.click(screen.getByRole('button', { name: '编辑用户名' }));
  expect(input).not.toHaveAttribute('readonly');
  expect(input).toHaveFocus();
  fireEvent.change(input, { target: { value: '专注当下' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(close).toHaveBeenCalledOnce());
  expect(update).toHaveBeenCalledWith({ username: '专注当下', avatar: '' });
});
it('cancels without saving and resets the edit state when reopened', () => {
  const close = vi.fn();
  const view = render(<UserProfileModal isOpen onClose={close} />);
  fireEvent.click(screen.getByRole('button', { name: '编辑用户名' }));
  fireEvent.change(screen.getByRole('textbox'), { target: { value: '未保存内容' } });
  fireEvent.click(screen.getByRole('button', { name: '取消' }));
  expect(update).not.toHaveBeenCalled();
  view.rerender(<UserProfileModal isOpen={false} onClose={close} />);
  view.rerender(<UserProfileModal isOpen onClose={close} />);
  expect(screen.getByRole('textbox')).toHaveAttribute('readonly');
  expect(screen.getByRole('textbox')).toHaveValue('原用户名');
});
