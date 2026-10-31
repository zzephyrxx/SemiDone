// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { Surface } from './Surface';
import { useSettingsStore } from '../store/settingsStore';
import { normalizeGlassPresetSettings } from '../utils/liquidGlassSettings';
beforeEach(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: normalizeGlassPresetSettings({ enabled: true, preset: 'standard' }) } })));
afterEach(cleanup);
it.each(['standard', 'extreme'] as const)('renders the %s material behind interactive navigation', preset => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: normalizeGlassPresetSettings({ preset, enabled: true }) } }));
  const view = render(<Surface role="navigation"><button>待办</button></Surface>);
  const surface = view.container.querySelector('.ui-surface')!;
  expect(surface).toHaveAttribute('data-glass-renderer', 'rdev');
  const layer = surface.querySelector('.rdev-glass-layer')!;
  expect(layer).toHaveAttribute('aria-hidden', 'true');
  expect(layer.querySelector('.glass__warp')).toBeInTheDocument();
  expect(layer).not.toContainElement(screen.getByRole('button', { name: '待办' }));
  expect(surface.querySelector('filter')).toBeInTheDocument();
});
it('updates the glass switch without replacing the focused control or its data', () => {
  const view = render(<Surface role="dialog" htmlRole="dialog"><input aria-label="任务" defaultValue="保持输入" /></Surface>);
  const input = screen.getByRole('textbox'); input.focus();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
  expect(view.container.querySelector('.rdev-glass-layer')).toBeNull();
  expect(input).toHaveValue('保持输入'); expect(input).toHaveFocus();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: true } } })));
  expect(view.container.querySelector('.rdev-glass-layer')).toBeInTheDocument();
  expect(screen.getByRole('textbox')).toBe(input);
});
it('keeps ordinary task panels solid', () => {
  const view = render(<Surface role="panel">普通内容</Surface>);
  expect(view.container.querySelector('.ui-surface')).toHaveAttribute('data-material', 'solid');
  expect(view.container.querySelector('.rdev-glass-layer')).toBeNull();
});
it('removes library filter definitions with the surface', () => {
  const view = render(<Surface role="navigation">导航</Surface>);
  const id = view.container.querySelector('filter')!.id;
  expect(document.getElementById(id)).not.toBeNull();
  view.unmount(); expect(document.getElementById(id)).toBeNull();
});
