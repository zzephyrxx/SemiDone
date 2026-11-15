// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../platform/distribution', () => ({ isAppStore: true }));
vi.mock('../api/tauri', async original => ({ ...await original<typeof import('../api/tauri')>(), isDesktopRuntime: true }));
vi.mock('./useNativeZenPanel', () => ({ useNativeZenPanel: vi.fn() }));
import ZenMode from './ZenMode';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { DEFAULT_ZEN_MODE_SETTINGS } from '../utils/zenModeSettings';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('shows only configuration in the Store window and restores the toolbar when closed', () => {
  vi.spyOn(useTaskStore.getState(), 'loadTasks').mockResolvedValue();
  useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...DEFAULT_ZEN_MODE_SETTINGS, enabled: true, active: true } } }));
  const view = render(<ZenMode onClose={vi.fn()} />);
  fireEvent.click(screen.getByRole('button', { name: 'Zen 模式配置' }));
  expect(screen.getByRole('region', { name: 'Zen 模式配置' })).toBeVisible();
  expect(view.container.querySelector('.zen-toolbar')).not.toBeInTheDocument();
  expect(screen.queryByRole('main', { name: '未完成待办' })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '收起配置' }));
  expect(screen.getByRole('button', { name: 'Zen 模式配置' })).toBeVisible();
});
