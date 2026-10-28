// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSettingsStore } from '../../store/settingsStore';
import { DEFAULT_ZEN_MODE_SETTINGS } from '../../utils/zenModeSettings';
import ZenModeSettingsSection from './ZenModeSettingsSection';
import { normalizeGlassPresetSettings } from '../../utils/liquidGlassSettings';

vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => false }));
vi.mock('sonner', () => ({ toast: { error: vi.fn() } }));
beforeEach(() => {
  localStorage.clear();
  useSettingsStore.setState((state) => ({ settings: { ...state.settings, zenMode: { ...DEFAULT_ZEN_MODE_SETTINGS } } }));
});
afterEach(() => { cleanup(); document.getElementById('zen-settings-material-css')?.remove(); delete document.documentElement.dataset.liquidGlassDialogs; });

describe('Zen mode settings', () => {
  it('switches the expanded settings panel between both glass presets and solid without resetting its controls', () => {
    const css = document.createElement('style'); css.id = 'zen-settings-material-css';
    css.textContent = ['zenMode.css', 'workspace.css', 'ui.css', 'liquidGlassSurfaces.css'].map(file => readFileSync(resolve('src/styles', file), 'utf8')).join('\n');
    document.head.append(css); document.documentElement.dataset.liquidGlassDialogs = 'true';
    useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...DEFAULT_ZEN_MODE_SETTINGS, enabled: true } } }));
    render(<div className="workspace-shell"><div className="settings-sections"><ZenModeSettingsSection /></div></div>);
    fireEvent.click(screen.getByText('Zen 模式配置'));
    const panel = screen.getByRole('region', { name: 'Zen 模式' });
    const font = screen.getByRole('spinbutton', { name: '字体大小' });
    const value = font.getAttribute('aria-valuenow');
    for (const preset of ['standard', 'extreme'] as const) {
      for (const enabled of [true, false, true]) {
        act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: normalizeGlassPresetSettings({ preset, enabled }) } })));
        expect(panel).toHaveAttribute('data-material', enabled ? 'glass' : 'solid');
        const filter = (panel as HTMLElement).style.getPropertyValue('--surface-filter');
        if (enabled) {
          expect(filter).toMatch(/^blur\(/);
          if (preset === 'extreme') expect(filter).toContain('chromatic-refraction');
          expect(getComputedStyle(panel).getPropertyValue('backdrop-filter')).not.toBe('none');
        } else {
          expect(filter).toBe('none');
          expect(getComputedStyle(panel).getPropertyValue('backdrop-filter')).toBe('none');
        }
        expect(screen.getByRole('spinbutton', { name: '字体大小' })).toBe(font);
        expect(font).toHaveAttribute('aria-valuenow', value);
        expect(getComputedStyle(panel.querySelector('.zen-appearance')!).backgroundColor).toBe('rgba(0, 0, 0, 0)');
      }
    }
  });
  it('starts with collapsed configuration and enables the entry without entering Zen', async () => {
    const { container } = render(<ZenModeSettingsSection />);
    expect(container.querySelector('details')).toBeNull();
    const toggle = screen.getByRole('switch', { name: '启用 Zen 模式' });
    expect(toggle).not.toBeChecked();
    expect(screen.queryByText('Zen 模式配置')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: '字体大小' })).not.toBeInTheDocument();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(useSettingsStore.getState().settings.zenMode).toMatchObject({ enabled: true, active: false });
    const configuration = container.querySelector('details')!;
    expect(configuration).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText('Zen 模式配置'));
    expect(configuration).toHaveAttribute('open');
    const font = screen.getByRole('spinbutton', { name: '字体大小' });
    fireEvent.keyDown(font, { key: 'Home' });
    fireEvent.keyDown(font, { key: 'PageUp' });
    expect(useSettingsStore.getState().settings.zenMode?.fontSize).toBe(22);
    fireEvent.click(screen.getByRole('button', { name: '文字颜色' }));
    fireEvent.change(screen.getByRole('textbox', { name: '文字颜色色值' }), { target: { value: '#abcdef' } });
    await waitFor(() => expect(useSettingsStore.getState().settings.zenMode?.textColor).toBe('#abcdef'));
    expect(screen.getByRole('region', { name: '文字颜色调色盘' })).toBeVisible();
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).not.toBeChecked());
    expect(container.querySelector('details')).toBeNull();
    expect(screen.queryByText('Zen 模式配置')).not.toBeInTheDocument();
    expect(screen.queryByRole('spinbutton', { name: '字体大小' })).not.toBeInTheDocument();
    expect(useSettingsStore.getState().settings.zenMode?.fontSize).toBe(22);
    fireEvent.click(toggle);
    await waitFor(() => expect(toggle).toBeChecked());
    expect(container.querySelector('details')).not.toHaveAttribute('open');
    expect(screen.queryByRole('spinbutton', { name: '字体大小' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Zen 模式配置'));
    expect(screen.getByRole('spinbutton', { name: '字体大小' })).toHaveAttribute('aria-valuenow', '22');
  });
});
