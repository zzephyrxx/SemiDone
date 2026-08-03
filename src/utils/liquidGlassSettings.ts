import type { LiquidGlassSettings } from '../types';

export const LIQUID_GLASS_BLUR_MIN = 1;
export const LIQUID_GLASS_BLUR_MAX = 10;
const LIQUID_GLASS_BLUR_MAX_PIXELS = 20;
const LIQUID_GLASS_BLUR_INTERVALS =
  LIQUID_GLASS_BLUR_MAX - LIQUID_GLASS_BLUR_MIN;

export const DEFAULT_LIQUID_GLASS_SETTINGS: LiquidGlassSettings = {
  enabled: true,
  blur: 6,
  refraction: 42,
  dispersion: true,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizedNumber(
  value: unknown,
  fallback: number,
  min: number,
  max: number,
): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;
  return Math.round(clamp(numericValue, min, max));
}

function normalizeBlurLevel(value: unknown, fallback: number): number {
  const numericValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numericValue)) return fallback;

  const migratedValue =
    numericValue > LIQUID_GLASS_BLUR_MAX
      ? (
          numericValue
          / LIQUID_GLASS_BLUR_MAX_PIXELS
          * LIQUID_GLASS_BLUR_INTERVALS
        ) + LIQUID_GLASS_BLUR_MIN
      : numericValue;

  return Math.round(
    clamp(
      migratedValue,
      LIQUID_GLASS_BLUR_MIN,
      LIQUID_GLASS_BLUR_MAX,
    ),
  );
}

export function liquidGlassBlurLevelToPixels(level: number): number {
  const normalizedLevel = normalizeBlurLevel(
    level,
    DEFAULT_LIQUID_GLASS_SETTINGS.blur,
  );
  const pixels =
    (normalizedLevel - LIQUID_GLASS_BLUR_MIN)
    / LIQUID_GLASS_BLUR_INTERVALS
    * LIQUID_GLASS_BLUR_MAX_PIXELS;

  return Number(pixels.toFixed(2));
}

export function normalizeLiquidGlassSettings(
  settings?: Partial<LiquidGlassSettings> | null,
): LiquidGlassSettings {
  return {
    enabled:
      typeof settings?.enabled === 'boolean'
        ? settings.enabled
        : DEFAULT_LIQUID_GLASS_SETTINGS.enabled,
    blur: normalizeBlurLevel(
      settings?.blur,
      DEFAULT_LIQUID_GLASS_SETTINGS.blur,
    ),
    refraction: normalizedNumber(
      settings?.refraction,
      DEFAULT_LIQUID_GLASS_SETTINGS.refraction,
      0,
      100,
    ),
    dispersion:
      typeof settings?.dispersion === 'boolean'
        ? settings.dispersion
        : DEFAULT_LIQUID_GLASS_SETTINGS.dispersion,
  };
}
