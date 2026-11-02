// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import DataDirectoryDialog from './DataDirectoryDialog';
import { useSettingsStore } from '../../store/settingsStore';
import { normalizeGlassPresetSettings } from '../../utils/liquidGlassSettings';
afterEach(cleanup);
it.each(['standard', 'extreme'] as const)('uses the shared %s dialog material and responds to the global switch', preset => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'expanded', liquidGlass: normalizeGlassPresetSettings({ preset, enabled: true }) } }));
  const close = vi.fn();
  render(<DataDirectoryDialog isOpen currentDataDir="/current" newDataDir="/new" isMigrating={false} onPickDirectory={vi.fn()} onConfirm={vi.fn()} onCancel={close} />);
  const dialog = screen.getByRole('dialog', { name: '更改数据目录' });
  const input = screen.getByRole('textbox', { name: '目标目录' });
  const material = dialog.querySelector('.ui-surface')!;
  expect(material).toHaveAttribute('data-glass-preset', preset);
  expect(material).toHaveAttribute('data-glass-renderer', 'rdev');
  input.focus();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
  expect(dialog.querySelector('.rdev-glass-layer')).toBeNull();
  expect(input).toHaveValue('/new'); expect(input).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
});
