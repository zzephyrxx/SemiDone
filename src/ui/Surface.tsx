import { useLayoutEffect, useRef, useState, type AriaRole, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import LiquidGlass from 'liquid-glass-react';
import { useSettingsStore } from '../store/settingsStore';
import type { LiquidGlassSettings } from '../types';
import { liquidGlassBlurLevelToPixels, normalizeLiquidGlassSettings } from '../utils/liquidGlassSettings';

export function Surface({ children, className = '', settings, role = 'panel', htmlRole, elementRef, material = 'auto', style, as = 'div', ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  as?: 'div' | 'section';
  children?: ReactNode; settings?: LiquidGlassSettings; role?: 'panel' | 'dialog' | 'navigation' | 'preview' | 'selection' | 'chart' | 'control';
  htmlRole?: AriaRole; elementRef?: RefObject<HTMLDivElement>;
  material?: 'auto' | 'frosted';
}) {
  const stored = useSettingsStore(state => state.settings.liquidGlass);
  const theme = useSettingsStore(state => state.settings.theme);
  const glass = normalizeLiquidGlassSettings(settings ?? stored);
  const active = stored?.enabled !== false && glass.enabled;
  const enabled = material !== 'frosted' && active;
  const internalRef = useRef<HTMLDivElement>(null);
  const Element = as;
  const fallbackRadius = role === 'control' ? 16 : role === 'selection' ? 12 : role === 'navigation' ? 18 : 20;
  const [cornerRadius, setCornerRadius] = useState(fallbackRadius);
  useLayoutEffect(() => {
    const target = (elementRef ?? internalRef).current;
    if (!target) return;
    let frame = 0;
    const measureRadius = () => {
      const measured = parseFloat(getComputedStyle(target).borderTopLeftRadius);
      setCornerRadius(Number.isFinite(measured) ? measured : fallbackRadius);
    };
    measureRadius();
    if (!enabled || typeof ResizeObserver === 'undefined') return;
    // The upstream renderer measures on window resize; forward container-only
    // changes too (dialogs, previews and the horizontal/vertical navigation).
    const observer = new ResizeObserver(() => {
      measureRadius();
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    observer.observe(target);
    window.addEventListener('resize', measureRadius);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', measureRadius); };
  }, [enabled, elementRef, fallbackRadius]);
  return <Element {...props} role={htmlRole} ref={elementRef ?? internalRef}
    className={`ui-surface ui-surface--${role} ${className}`} data-glass-renderer={enabled ? 'rdev' : undefined}
    data-glass-preset={enabled ? glass.preset ?? 'standard' : undefined}
    data-material={active && material === 'frosted' ? 'frosted' : enabled ? 'glass' : 'solid'}
    style={{ ...style, '--surface-filter': 'none', '--glass-backdrop-blur': `${liquidGlassBlurLevelToPixels(glass.blur)}px` } as CSSProperties}>
    {enabled && <div className="rdev-glass-layer" aria-hidden="true">
      <LiquidGlass displacementScale={glass.preset === 'extreme' ? 64 : 24} blurAmount={glass.blur / 50}
        saturation={110} aberrationIntensity={glass.dispersion ? 1.5 : 0} elasticity={0}
        cornerRadius={cornerRadius}
        padding="0" overLight={theme !== 'dark'} mode="standard" className="rdev-glass"
        style={{ position: 'absolute', width: '100%', height: '100%', top: '50%', left: '50%' }}>
        <span />
      </LiquidGlass>
    </div>}
    {children}
  </Element>;
}
