import { describe, expect, it } from 'vitest';
import { DEFAULT_LIQUID_GLASS_SETTINGS, liquidGlassBlurLevelToPixels, liquidGlassBackdrop, normalizeLiquidGlassSettings, normalizeGlassPresetSettings } from './liquidGlassSettings';

describe('liquid glass presets', () => {
  it('uses the requested standard recipe by default and the exact extreme recipe when selected', () => {
    expect(normalizeLiquidGlassSettings()).toEqual({ enabled: true, preset: 'standard', blur: 9, refraction: 0, strength: 0, rimWidth: .1, magnify: 0, dispersion: false });
    expect(normalizeGlassPresetSettings({ preset: 'extreme' })).toEqual({ enabled: true, preset: 'extreme', blur: 4, refraction: 0, strength: 0, rimWidth: .5, magnify: .07, dispersion: true });
    expect(normalizeLiquidGlassSettings()).toEqual(DEFAULT_LIQUID_GLASS_SETTINGS);
  });
  it('migrates custom settings and prevents stale parameter values from overriding the chosen preset', () => {
    expect(normalizeGlassPresetSettings({ enabled: false, blur: 2, refraction: 99, magnify: .8 })).toEqual({ ...DEFAULT_LIQUID_GLASS_SETTINGS, enabled: false });
    expect(normalizeLiquidGlassSettings({ preset: 'extreme', blur: 10, strength: 40, magnify: 1 })).toMatchObject({ preset: 'extreme', blur: 4, strength: 0, magnify: .07, dispersion: true });
  });
  it('applies only background blur in standard mode and activates edge optics in extreme mode', () => {
    expect(liquidGlassBackdrop(DEFAULT_LIQUID_GLASS_SETTINGS)).toBe('blur(17.78px)');
    const extreme = normalizeGlassPresetSettings({ preset: 'extreme' });
    expect(liquidGlassBackdrop(extreme)).toBe('blur(6.67px) url(#semidone-dialog-chromatic-refraction)');
    expect(liquidGlassBackdrop(extreme)).not.toMatch(/contrast|saturate|brightness|drop-shadow/);
    expect(liquidGlassBackdrop(DEFAULT_LIQUID_GLASS_SETTINGS, 'lens', 'lens')).toBe('blur(2.96px)');
    expect(liquidGlassBackdrop(DEFAULT_LIQUID_GLASS_SETTINGS, 'pane', 'pane', { width: 80, height: 40 })).toBe('blur(2.96px)');
  });
  it('retains the ten blur levels and legacy pixel conversion', () => {
    expect(liquidGlassBlurLevelToPixels(1)).toBe(0);
    expect(liquidGlassBlurLevelToPixels(4)).toBe(6.67);
    expect(liquidGlassBlurLevelToPixels(9)).toBe(17.78);
    expect(liquidGlassBlurLevelToPixels(10)).toBe(20);
    expect(normalizeLiquidGlassSettings({ blur: 18 }).blur).toBe(9);
  });
  it('still bounds legacy optical data before it is migrated at the application boundary', () => {
    expect(normalizeLiquidGlassSettings({ blur: 90, refraction: -1, rimWidth: 0, magnify: -1 })).toMatchObject({ blur: 10, refraction: 0, strength: 0, rimWidth: .1, magnify: 0 });
    expect(normalizeLiquidGlassSettings({ strength: 900, rimWidth: 5, magnify: 5 })).toMatchObject({ strength: 60, rimWidth: .95, magnify: 1.5 });
  });
});
