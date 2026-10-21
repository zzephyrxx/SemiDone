// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../store/settingsStore';
import { DEFAULT_ZEN_MODE_SETTINGS } from '../../utils/zenModeSettings';
import ZenModeSettingsSection from './ZenModeSettingsSection';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState((state) => ({ settings: { ...state.settings, zenMode: { ...DEFAULT_ZEN_MODE_SETTINGS } } }));
});
afterEach(cleanup);

describe('Zen mode settings', () => {
  it('starts with collapsed configuration and enables the entry without entering Zen', async () => {
    const { container } = render(<ZenModeSettingsSection />);
    const configuration = container.querySelector('details')!;
    expect(configuration).not.toHaveAttribute('open');
    const toggle = screen.getByRole('switch', { name: '启用 Zen 模式' });
    expect(toggle).not.toBeChecked();
    fireEvent.click(screen.getByText('Zen 模式配置'));
    expect(configuration).not.toHaveAttribute('open');
    expect(screen.queryByRole('slider', { name: '字体大小' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({ enabled: true, active: false });
    expect(configuration).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Zen 模式配置'));
    expect(configuration).toHaveAttribute('open');
    fireEvent.change(screen.getByRole('slider', { name: '字体大小' }), { target: { value: '22' } });
    expect(useSettingsStore.getState().settings.zenMode?.fontSize).toBe(22);
    fireEvent.click(screen.getByRole('button', { name: '文字颜色' }));
    fireEvent.change(screen.getByRole('textbox', { name: '文字颜色色值' }), { target: { value: '#abcdef' } });
    await waitFor(() => expect(useSettingsStore.getState().settings.zenMode?.textColor).toBe('#abcdef'));
    expect(screen.getByRole('region', { name: '文字颜色调色盘' })).toBeVisible();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(configuration).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Zen 模式配置'));
    expect(configuration).not.toHaveAttribute('open');
    expect(screen.queryByRole('slider', { name: '字体大小' })).not.toBeInTheDocument();
    expect(useSettingsStore.getState().settings.zenMode?.fontSize).toBe(22);
  });
});
