import { useEffect, useRef, type AriaRole, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import LiquidGlass from 'liquid-glass-react';
import { useSettingsStore } from '../store/settingsStore';
import type { LiquidGlassSettings } from '../types';
import { normalizeLiquidGlassSettings } from '../utils/liquidGlassSettings';

export function Surface({ children, className = '', settings, role = 'panel', htmlRole, elementRef, material = 'auto', style, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  children?: ReactNode; settings?: LiquidGlassSettings; role?: 'panel' | 'dialog' | 'navigation' | 'preview' | 'selection' | 'chart';
  htmlRole?: AriaRole; elementRef?: RefObject<HTMLDivElement>;
  material?: 'auto' | 'frosted';
}) {
  const stored = useSettingsStore(state => state.settings.liquidGlass);
  const theme = useSettingsStore(state => state.settings.theme);
  const animated = useSettingsStore(state => state.settings.animationsEnabled !== false);
  const glass = normalizeLiquidGlassSettings(settings ?? stored);
  const enabled = material !== 'frosted' && glass.enabled && role !== 'panel';
  const internalRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const target = (elementRef ?? internalRef).current;
    if (!enabled || !target || typeof ResizeObserver === 'undefined') return;
    let frame = 0;
    // The upstream renderer measures on window resize; forward container-only
    // changes too (dialogs, previews and the horizontal/vertical navigation).
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
    });
    observer.observe(target);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [enabled, elementRef]);
  return <div {...props} role={htmlRole} ref={elementRef ?? internalRef}
    className={`ui-surface ui-surface--${role} ${className}`} data-glass-renderer={enabled ? 'rdev' : undefined}
    data-material={material === 'frosted' ? 'frosted' : enabled ? 'glass' : 'solid'}
    style={{ ...style, '--surface-filter': 'none' } as CSSProperties}>
    {enabled && <div className="rdev-glass-layer" aria-hidden="true">
      <LiquidGlass displacementScale={glass.preset === 'extreme' ? 48 : 24} blurAmount={glass.blur / 50}
        saturation={110} aberrationIntensity={glass.dispersion ? 1.5 : 0} elasticity={animated ? .12 : 0}
        cornerRadius={role === 'selection' ? 12 : role === 'navigation' ? 18 : 22}
        padding="0" overLight={theme !== 'dark'} mode="standard" className="rdev-glass"
        style={{ position: 'absolute', width: '100%', height: '100%', top: '50%', left: '50%' }}>
        <span />
      </LiquidGlass>
    </div>}
    {children}
  </div>;
}
