// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../types';
import AppearanceSettingsSection from './AppearanceSettingsSection';
import LiquidGlassPreview from './LiquidGlassPreview';
import { normalizeGlassPresetSettings } from '../../utils/liquidGlassSettings';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
beforeEach(() => {
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 0; });
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

const initialSettings: Settings = {
  theme: 'light', liquidGlass: { enabled: true, blur: 6, refraction: 42, dispersion: true },
  notifications: true, autoSave: true, isPinned: false, isCollapsed: false,
  collapseMode: 'expanded', useCapsuleMode: false,
};

function EditableAppearance() {
  const [settings, setSettings] = useState(initialSettings);
  return <AppearanceSettingsSection settings={settings}
    onLiquidGlassChange={(updates) => setSettings((current) => ({
      ...current, liquidGlass: { ...current.liquidGlass, ...updates },
    }))}
    onThemeChange={vi.fn()} onToggleAutoStart={vi.fn()} onTransparencyToggle={vi.fn()}
    onTransparencyLevelChange={vi.fn()} onToggleCapsuleMode={vi.fn()} />;
}

describe('liquid-glass parameter preview', () => {
  it('drags the miniature within the scene and keeps its position when parameters change', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    const view = render(<LiquidGlassPreview settings={normalizeGlassPresetSettings(initialSettings.liquidGlass)} />);
    const card = screen.getByRole('group', { name: '可拖动的玻璃预览小窗' });
    const scene = card.parentElement!;
    Object.defineProperties(scene, { clientWidth: { value: 400 }, clientHeight: { value: 180 } });
    Object.defineProperties(card, { offsetWidth: { value: 260 }, offsetHeight: { value: 110 } });
    card.setPointerCapture = vi.fn();
    card.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(card, { button: 0, clientX: 200, clientY: 90 });
    fireEvent.pointerMove(card, { clientX: 225, clientY: 105 });
    expect(card.style.translate).toBe('25px 15px');
    view.rerender(<LiquidGlassPreview settings={normalizeGlassPresetSettings({ ...initialSettings.liquidGlass, preset: 'extreme' })} />);
    expect(card.style.translate).toBe('25px 15px');
    expect(card.style.getPropertyValue('--surface-filter')).toContain('blur(3.06px)');
    fireEvent.pointerMove(card, { clientX: 1000, clientY: 1000 });
    expect(card.style.translate).toBe('62px 27px');
    fireEvent.pointerUp(card);
    expect(card).not.toHaveClass('is-dragging');
    fireEvent.pointerMove(card, { clientX: -1000, clientY: -1000 });
    expect(card.style.translate).toBe('62px 27px');
    fireEvent.keyDown(card, { key: 'ArrowLeft' });
    expect(card.style.translate).toBe('54px 27px');
    fireEvent.pointerDown(card, { button: 0, clientX: 200, clientY: 90 });
    fireEvent.pointerMove(card, { clientX: -1000, clientY: -1000 });
    expect(card.style.translate).toBe('-62px -27px');
    fireEvent.pointerCancel(card);
    expect(card).not.toHaveClass('is-dragging');
  });

  it('omits the settings preview while retaining presets across disabling glass', () => {
    render(<EditableAppearance />);
    expect(screen.queryByRole('figure', { name: '液态玻璃实时预览' })).not.toBeInTheDocument();
    expect(screen.queryByRole('slider', { name: '模糊程度' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /极致/ }));
    expect(screen.getByRole('button', { name: /极致/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: '液态玻璃' }));
    expect(screen.queryByRole('figure')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: '液态玻璃' }));
    expect(screen.getByRole('button', { name: /极致/ })).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: /标准/ }));
    expect(screen.getByRole('button', { name: /标准/ })).toHaveAttribute('aria-pressed', 'true');
  });
});
