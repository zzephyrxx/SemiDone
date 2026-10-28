import { useId, useLayoutEffect, useMemo, useRef, useState, type AriaRole, type CSSProperties, type HTMLAttributes, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useSettingsStore } from '../store/settingsStore';
import type { LiquidGlassSettings } from '../types';
import { liquidGlassBackdrop, normalizeLiquidGlassSettings } from '../utils/liquidGlassSettings';
import { LiquidGlassFilters } from '../components/LiquidGlassRuntime';

export function Surface({ children, className = '', settings, role = 'panel', htmlRole, elementRef, material = 'auto', style: suppliedStyle, ...props }: Omit<HTMLAttributes<HTMLDivElement>, 'role'> & {
  children?: ReactNode; settings?: LiquidGlassSettings; role?: 'panel' | 'dialog' | 'navigation' | 'preview' | 'selection';
  htmlRole?: AriaRole; elementRef?: RefObject<HTMLDivElement>;
  material?: 'auto' | 'frosted';
}) {
  const stored = useSettingsStore(state => state.settings.liquidGlass);
  const glass = normalizeLiquidGlassSettings(settings ?? stored);
  // Ordinary panels stay solid. Glass is an explicit choice for a small set of layers.
  const glassEnabled = material !== 'frosted' && glass.enabled && role !== 'panel';
  const internalRef = useRef<HTMLDivElement>(null);
  const ref = elementRef ?? internalRef;
  const [size, setSize] = useState(role === 'selection' ? { width: 80, height: 40 } : role === 'navigation' ? { width: 320, height: 56 } : { width: 320, height: 240 });
  const id = `glass-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  useLayoutEffect(() => {
    const target = ref.current;
    if (!glassEnabled || !target) return;
    const measure = () => {
      const next = { width: target.offsetWidth, height: target.offsetHeight };
      if (next.width > 0 && next.height > 0) setSize(old => old.width === next.width && old.height === next.height ? old : next);
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const box = entry.borderBoxSize?.[0];
      const next = { width: Math.round(box?.inlineSize ?? target.offsetWidth), height: Math.round(box?.blockSize ?? target.offsetHeight) };
      if (next.width > 0 && next.height > 0) setSize(old => old.width === next.width && old.height === next.height ? old : next);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [glassEnabled, ref]);
  const geometry = useMemo(() => ({ ...size, radius: role === 'navigation' ? 16 : role === 'selection' ? 12 : 20, profile: role === 'selection' ? 'lens' as const : 'pane' as const }), [size, role]);
  const filter = liquidGlassBackdrop(glass, id, geometry.profile, geometry);
  const style = { ...suppliedStyle, '--surface-filter': glassEnabled ? filter : 'none' } as CSSProperties;
  return <><div {...props} role={htmlRole} ref={ref} className={`ui-surface ui-surface--${role} ${className}`}
    data-material={material === 'frosted' ? 'frosted' : glassEnabled ? 'glass' : 'solid'} style={style}>
    {children}
  </div>
    {glassEnabled && (glass.strength > 0 || glass.magnify > 0 || glass.dispersion) && createPortal(<LiquidGlassFilters settings={glass} idPrefix={id} geometry={geometry} />, document.body)}
  </>;
}
