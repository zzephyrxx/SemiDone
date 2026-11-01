import type { Theme } from '../types';

export const ACCENT_PRESETS = [
  { name: '蓝色', color: '#3b82f6' }, { name: '绿色', color: '#16a34a' },
  { name: '紫色', color: '#8b5cf6' }, { name: '橙色', color: '#ea580c' },
  { name: '玫红', color: '#db2777' },
];

export function normalizeAccentColor(value: unknown): string | undefined {
  return typeof value === 'string' && /^#[\da-f]{6}$/i.test(value) ? value.toLowerCase() : undefined;
}

function luminance(rgb: number[]) {
  const linear = rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return linear[0] * .2126 + linear[1] * .7152 + linear[2] * .0722;
}
function hslRgb(h: number, s: number, l: number) {
  const a = s * Math.min(l, 1 - l);
  return [0, 8, 4].map(n => {
    const k = (n + h / 30) % 12;
    return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  });
}

// Keep small accent text readable in either theme without recoloring surfaces.
export function accentTokens(value: unknown, theme: Theme): Record<string, string> | undefined {
  const hex = normalizeAccentColor(value);
  if (!hex) return undefined;
  const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(...rgb), min = Math.min(...rgb), delta = max - min;
  let l = (max + min) / 2;
  const s = delta ? delta / (1 - Math.abs(2 * l - 1)) : 0;
  const h = !delta ? 0 : ((max === rgb[0] ? (rgb[1] - rgb[2]) / delta : max === rgb[1]
    ? (rgb[2] - rgb[0]) / delta + 2 : (rgb[0] - rgb[1]) / delta + 4) * 60 + 360) % 360;
  const dark = theme === 'dark';
  const background = dark ? luminance([.10, .105, .115]) : 1;
  let lum = luminance(hslRgb(h, s, l));
  for (let i = 0; i < 100 && (Math.max(lum, background) + .05) / (Math.min(lum, background) + .05) < 4.6; i++) {
    l = Math.max(0, Math.min(1, l + (dark ? .01 : -.01)));
    lum = luminance(hslRgb(h, s, l));
  }
  const color = `${h.toFixed(1)} ${(s * 100).toFixed(1)}% ${(l * 100).toFixed(1)}%`;
  return {
    '--primary': color,
    '--primary-foreground': lum > .179 ? '0 0% 0%' : '0 0% 100%',
    '--ring': color,
    '--accent': `${h.toFixed(1)} ${(s * 25).toFixed(1)}% ${dark ? 20 : 95}%`,
    '--accent-foreground': color,
  };
}
