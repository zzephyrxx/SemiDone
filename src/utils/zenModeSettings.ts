import type { CSSProperties } from 'react';
import type { ZenModeSettings } from '../types';

export const DEFAULT_ZEN_MODE_SETTINGS: ZenModeSettings = {
  enabled: false,
  active: false,
  fontSize: 15,
  textColor: '#f1f5f9',
  rowColor: '#ffffff',
  backgroundColor: '#0f172a',
  backgroundOpacity: 65,
  rowOpacity: 8,
};

const validColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value : fallback;

const opacity = (value: unknown, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value)
    ? Math.min(100, Math.max(0, Math.round(value)))
    : fallback;

export function normalizeZenModeSettings(value?: Partial<ZenModeSettings> | null): ZenModeSettings {
  const defaults = DEFAULT_ZEN_MODE_SETTINGS;
  return {
    enabled: typeof value?.enabled === 'boolean' ? value.enabled : defaults.enabled,
    active: value?.enabled === true && value?.active === true,
    fontSize: typeof value?.fontSize === 'number' && Number.isFinite(value.fontSize)
      ? Math.min(28, Math.max(12, Math.round(value.fontSize))) : defaults.fontSize,
    textColor: validColor(value?.textColor, defaults.textColor),
    rowColor: validColor(value?.rowColor, defaults.rowColor),
    backgroundColor: validColor(value?.backgroundColor, defaults.backgroundColor),
    backgroundOpacity: opacity(value?.backgroundOpacity, defaults.backgroundOpacity),
    rowOpacity: opacity(value?.rowOpacity, defaults.rowOpacity),
  };
}

function rgba(hex: string, alpha: number): string {
  const channels = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16));
  return `rgba(${channels.join(', ')}, ${alpha / 100})`;
}

export function zenModeStyle(settings: ZenModeSettings): CSSProperties {
  return {
    '--zen-text': settings.textColor,
    '--zen-font-size': `${settings.fontSize}px`,
    '--zen-background': rgba(settings.backgroundColor, settings.backgroundOpacity),
    '--zen-row': rgba(settings.rowColor, settings.rowOpacity),
  } as CSSProperties;
}
