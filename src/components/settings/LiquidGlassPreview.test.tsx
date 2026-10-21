// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { useState } from 'react';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Settings } from '../../types';
import AppearanceSettingsSection from './AppearanceSettingsSection';

afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

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
    render(<EditableAppearance />);
    const card = screen.getByRole('group', { name: '可拖动的玻璃预览小窗' });
    const scene = card.parentElement!;
    Object.defineProperties(scene, { clientWidth: { value: 400 }, clientHeight: { value: 180 } });
    Object.defineProperties(card, { offsetWidth: { value: 260 }, offsetHeight: { value: 110 } });
    card.setPointerCapture = vi.fn();
    card.releasePointerCapture = vi.fn();
    fireEvent.pointerDown(card, { button: 0, clientX: 200, clientY: 90 });
    fireEvent.pointerMove(card, { clientX: 225, clientY: 105 });
    expect(card.style.translate).toBe('25px 15px');
    fireEvent.change(screen.getByRole('slider', { name: '模糊程度' }), { target: { value: '9' } });
    expect(card.style.translate).toBe('25px 15px');
    expect(card.style.backdropFilter).toContain('blur(17.78px)');
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

  it('updates the real blur, refraction and dispersion filters with the sliders', () => {
    render(<EditableAppearance />);
    const preview = screen.getByRole('figure', { name: '液态玻璃实时预览' });
    const card = preview.querySelector<HTMLElement>('.liquid-glass-preview-card')!;
    expect(card.style.backdropFilter).toContain('blur(11.11px)');
    expect(card.style.backdropFilter).toContain('chromatic-refraction');
    fireEvent.change(screen.getByRole('slider', { name: '模糊程度' }), { target: { value: '9' } });
    expect(card.style.backdropFilter).toContain('blur(17.78px)');
    fireEvent.change(screen.getByRole('slider', { name: '折射强度' }), { target: { value: '100' } });
    const displacement = preview.querySelector('filter[id$="-refraction"] feDisplacementMap');
    expect(Number(displacement?.getAttribute('scale'))).toBe(34);
    fireEvent.click(screen.getByRole('switch', { name: '色散效果' }));
    expect(card.style.backdropFilter).not.toContain('chromatic-refraction');
    expect(within(preview).getByText(/折射 100% · 色散关/)).toBeVisible();
    fireEvent.click(screen.getByRole('switch', { name: '液态玻璃' }));
    expect(screen.queryByRole('figure', { name: '液态玻璃实时预览' })).not.toBeInTheDocument();
  });
});
