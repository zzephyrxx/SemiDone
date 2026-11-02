// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { GlassButton } from './GlassButton';
import { useSettingsStore } from '../store/settingsStore';
afterEach(cleanup);
it('keeps a native action and keyboard focus while the global glass material changes', () => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: true } } }));
  const action = vi.fn();
  const view = render(<GlassButton onClick={action}>导出</GlassButton>);
  const button = screen.getByRole('button', { name: '导出' }); button.focus();
  expect(view.container.querySelector('.rdev-glass-layer')).toBeInTheDocument();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, liquidGlass: { ...state.settings.liquidGlass, enabled: false } } })));
  expect(screen.getByRole('button')).toBe(button); expect(button).toHaveFocus();
  expect(view.container.querySelector('.rdev-glass-layer')).toBeNull();
  fireEvent.click(button); expect(action).toHaveBeenCalledOnce();
});
