import { describe, expect, it } from 'vitest';
import { DEFAULT_ZEN_MODE_SETTINGS, zenModeStyle, normalizeZenModeSettings } from './zenModeSettings';

describe('Zen mode setting migration', () => {
  it('defaults missing or partial settings and rejects invalid colors and opacity', () => {
    expect(normalizeZenModeSettings()).toEqual(DEFAULT_ZEN_MODE_SETTINGS);
    expect(normalizeZenModeSettings({ enabled: true, textColor: 'red', backgroundOpacity: NaN, rowOpacity: 200 }))
      .toEqual({ ...DEFAULT_ZEN_MODE_SETTINGS, enabled: true, rowOpacity: 100 });
  });

  it('uses alpha only for backgrounds, including fully transparent and opaque endpoints', () => {
    const style = zenModeStyle(normalizeZenModeSettings({
      textColor: '#112233', backgroundColor: '#aabbcc', backgroundOpacity: 0, rowColor: '#ffffff', rowOpacity: 100,
    }));
    expect(style).toMatchObject({
      '--zen-text': '#112233', '--zen-background': 'rgba(170, 187, 204, 0)',
      '--zen-row': 'rgba(255, 255, 255, 1)',
    });
    expect(style).not.toHaveProperty('opacity');
  });

  it('clamps font sizes and never activates a disabled Zen mode', () => {
    expect(normalizeZenModeSettings({ fontSize: 5 }).fontSize).toBe(12);
    expect(normalizeZenModeSettings({ fontSize: 80 }).fontSize).toBe(28);
    expect(normalizeZenModeSettings({ fontSize: NaN }).fontSize).toBe(15);
    expect(normalizeZenModeSettings({ enabled: false, active: true }).active).toBe(false);
    expect(normalizeZenModeSettings({ enabled: true }).active).toBe(false);
  });
});
