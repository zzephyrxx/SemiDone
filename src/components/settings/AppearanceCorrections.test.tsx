// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import LiquidGlassRuntime from '../LiquidGlassRuntime';
import { useSettingsStore } from '../../store/settingsStore';
import { settingsApi } from '../../api/localStorage';
import type { Settings } from '../../types';

const settings: Settings = { theme: 'dark', liquidGlass: { enabled: true, blur: 6, refraction: 42, dispersion: true }, notifications: true,
  autoSave: true, isPinned: false, isCollapsed: false, collapseMode: 'expanded', useCapsuleMode: false, transparentEnabled: false, fontScale: 100 };
const actions = { onThemeChange: vi.fn(), onLiquidGlassChange: vi.fn(), onToggleAutoStart: vi.fn(), onTransparencyToggle: vi.fn(), onTransparencyLevelChange: vi.fn(), onToggleCapsuleMode: vi.fn() };
beforeEach(() => {
  localStorage.clear(); vi.clearAllMocks();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
  useSettingsStore.setState({ settings: { ...settings, animationsEnabled: true } });
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function TransparencyExample() {
  const [enabled, setEnabled] = useState(false);
  return <AppearanceSettingsSection settings={{ ...settings, transparentEnabled: enabled }} {...actions} onTransparencyToggle={setEnabled} />;
}
describe('appearance corrections', () => {
  it('expands the transparency slider directly under its own switch and hides it when disabled', () => {
    render(<TransparencyExample />);
    const group = screen.getByTestId('transparency-setting');
    expect(within(group).queryByRole('slider')).not.toBeInTheDocument();
    fireEvent.click(within(group).getByRole('switch', { name: '透明模式' }));
    const slider = within(group).getByRole('slider', { name: '窗口透明度' });
    fireEvent.change(slider, { target: { value: '75' } });
    expect(actions.onTransparencyLevelChange).not.toHaveBeenCalled();
    fireEvent.pointerUp(slider); expect(actions.onTransparencyLevelChange).toHaveBeenCalledExactlyOnceWith(75);
    fireEvent.click(within(group).getByRole('switch', { name: '透明模式' }));
    expect(within(group).queryByRole('slider')).not.toBeInTheDocument();
  });
  it('replaces manual glass controls with two genuine presets', () => {
    render(<AppearanceSettingsSection settings={settings} {...actions} />);
    const group = screen.getByRole('group', { name: '液态玻璃预设' });
    expect(within(group).getAllByRole('button')).toHaveLength(2);
    expect(screen.queryByRole('button', { name: '液态玻璃配置' })).not.toBeInTheDocument();
    expect(screen.queryByRole('switch', { name: '色散效果' })).not.toBeInTheDocument();
    fireEvent.click(within(group).getByRole('button', { name: /极致/ }));
    expect(actions.onLiquidGlassChange).toHaveBeenCalledExactlyOnceWith({ enabled: true, preset: 'extreme', blur: 4, refraction: 0, dispersion: true, strength: 0, rimWidth: .5, magnify: .07 });
  });
  it('persists text scale, applies it globally, and restores the default without changing geometry', async () => {
    function Example() {
      const current = useSettingsStore(state => state.settings);
      return <><LiquidGlassRuntime /><AppearanceSettingsSection settings={current} {...actions}
        onFontScaleChange={fontScale => void useSettingsStore.getState().updateSettings({ fontScale })} /></>;
    }
    render(<Example />);
    const preview = screen.getByText('Aa 字体预览').parentElement!;
    expect(preview).toHaveStyle({ fontSize: '12px' });
    expect(screen.getByText('Aa 字体预览')).toHaveStyle({ fontSize: '17.6px' });
    const slider = screen.getByRole('slider', { name: '全局字体大小' });
    fireEvent.change(slider, { target: { value: '130' } });
    expect(document.documentElement.style.getPropertyValue('--ui-font-scale')).toBe('1');
    fireEvent.pointerUp(slider);
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--ui-font-scale')).toBe('1.3'));
    expect((await settingsApi.getSettings()).data?.fontScale).toBe(130);
    expect(document.documentElement.style.zoom).toBe('');
    expect(preview).toHaveStyle({ fontSize: '15.6px' });
    const reset = screen.getByRole('button', { name: '重置字体大小' });
    expect(reset.nextElementSibling).toHaveTextContent('130%');
    expect(reset.querySelector('svg')).not.toBeNull();
    fireEvent.click(reset);
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--ui-font-scale')).toBe('1'));
    expect(preview).toHaveStyle({ fontSize: '12px' });
  });
  it('applies the independent motion switch and global glass switch to runtime state', () => {
    render(<LiquidGlassRuntime />);
    expect(document.documentElement.dataset.uiMotion).toBe('true');
    act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: false, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
    expect(document.documentElement.dataset.uiMotion).toBe('false');
    expect(document.documentElement.dataset.liquidGlassDialogs).toBe('false');
    expect(document.documentElement.dataset.windowShape).toBe('expanded');
  });
});
