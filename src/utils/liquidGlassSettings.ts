import type { LiquidGlassSettings } from '../types';

export const LIQUID_GLASS_BLUR_MIN = 1;
export const LIQUID_GLASS_BLUR_MAX = 10;
const LIQUID_GLASS_BLUR_MAX_PIXELS = 20;
const LIQUID_GLASS_BLUR_INTERVALS =
  LIQUID_GLASS_BLUR_MAX - LIQUID_GLASS_BLUR_MIN;

export type NormalizedLiquidGlassSettings = Required<Omit<LiquidGlassSettings, 'preset'>> & Pick<LiquidGlassSettings, 'preset'>;
export const LIQUID_GLASS_PRESETS = {
  standard: { blur: 9, refraction: 0, strength: 0, rimWidth: 0.1, magnify: 0, dispersion: false },
  extreme: { blur: 4, refraction: 0, strength: 0, rimWidth: 0.5, magnify: 0.07, dispersion: true },
} as const;
export const DEFAULT_LIQUID_GLASS_SETTINGS: NormalizedLiquidGlassSettings = {
  enabled: true,
  preset: 'standard',
  ...LIQUID_GLASS_PRESETS.standard,
};

/** Application settings migrate to the standard preset; stale custom values cannot override it. */
export function normalizeGlassPresetSettings(settings?: Partial<LiquidGlassSettings> | null): NormalizedLiquidGlassSettings {
  const preset = settings?.preset === 'extreme' ? 'extreme' : 'standard';
  return { enabled: settings?.enabled !== false, preset, ...LIQUID_GLASS_PRESETS[preset] };
}

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
): NormalizedLiquidGlassSettings {
  if (!settings || settings.preset === 'standard' || settings.preset === 'extreme') return normalizeGlassPresetSettings(settings);
  const decimal = (value: unknown, fallback: number, min: number, max: number) => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
    return Number(clamp(value, min, max).toFixed(2));
  };
  const legacyRefraction = normalizedNumber(settings?.refraction, DEFAULT_LIQUID_GLASS_SETTINGS.refraction, 0, 100);
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
    strength: decimal(settings?.strength, Number((legacyRefraction * 18 / 42).toFixed(2)), 0, 60),
    rimWidth: decimal(settings?.rimWidth, DEFAULT_LIQUID_GLASS_SETTINGS.rimWidth, 0.1, 0.95),
    magnify: decimal(settings?.magnify, DEFAULT_LIQUID_GLASS_SETTINGS.magnify, 0, 1.5),
  };
}

/** Shared with the existing dialog material; filters affect the backdrop, never the text. */
export function liquidGlassBackdrop(settings: LiquidGlassSettings, prefix = 'semidone-dialog', profile: 'pane' | 'lens' = 'pane', geometry?: { width: number; height: number }): string {
  const glass = normalizeLiquidGlassSettings(settings);
  const refraction = glass.strength > 0 || glass.magnify > 0 || glass.dispersion ? `url(#${prefix}-${glass.dispersion ? 'chromatic-refraction' : 'refraction'}) ` : '';
  // Frost the backdrop before splitting its rim; dispersion must not recolor the face.
  const size = geometry ?? (profile === 'lens' ? { width: 80, height: 40 } : { width: 320, height: 240 });
  const blur = Number((liquidGlassBlurLevelToPixels(glass.blur) * Math.min(size.width, size.height) / 240).toFixed(2));
  return `blur(${blur}px)${refraction ? ` ${refraction.trim()}` : ''}`;
}
