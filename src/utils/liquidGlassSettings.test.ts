import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIQUID_GLASS_SETTINGS,
  liquidGlassBlurLevelToPixels,
  normalizeLiquidGlassSettings,
} from './liquidGlassSettings';

describe('liquid glass settings', () => {
  it('defaults the dialog effect to enabled at level 6 with dispersion', () => {
    expect(normalizeLiquidGlassSettings()).toEqual(
      DEFAULT_LIQUID_GLASS_SETTINGS,
    );
    expect(DEFAULT_LIQUID_GLASS_SETTINGS).toMatchObject({
      enabled: true,
      blur: 6,
      dispersion: true,
    });
    expect(liquidGlassBlurLevelToPixels(1)).toBe(0);
    expect(liquidGlassBlurLevelToPixels(6)).toBeCloseTo(11.11, 2);
    expect(liquidGlassBlurLevelToPixels(10)).toBe(20);
  });

  it('clamps persisted values to the 1–10 blur and 0–100 refraction ranges', () => {
    expect(
      normalizeLiquidGlassSettings({
        enabled: false,
        blur: 90,
        refraction: -12,
        dispersion: false,
      }),
    ).toEqual({
      enabled: false,
      blur: 10,
      refraction: 0,
      dispersion: false,
    });

    expect(normalizeLiquidGlassSettings({ blur: 0 }).blur).toBe(1);
  });

  it('migrates the previous pixel-based blur values to the nearest level', () => {
    expect(normalizeLiquidGlassSettings({ blur: 18 }).blur).toBe(9);
    expect(normalizeLiquidGlassSettings({ blur: 24 }).blur).toBe(10);
    expect(liquidGlassBlurLevelToPixels(8)).toBeCloseTo(15.56, 2);
  });
});
