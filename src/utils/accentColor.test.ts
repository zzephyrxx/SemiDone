import { expect, it } from 'vitest';
import { normalizeAccentColor, accentTokens } from './accentColor';

it('accepts only complete hex colors and leaves legacy defaults untouched', () => {
  expect(normalizeAccentColor('#8B5CF6')).toBe('#8b5cf6');
  for (const value of [undefined, null, '#abc', 'red', '#nope00', 42]) {
    expect(normalizeAccentColor(value)).toBeUndefined();
    expect(accentTokens(value, 'light')).toBeUndefined();
  }
});
it('keeps readable accent text and button labels for very light and dark custom colors', () => {
  for (const theme of ['light', 'dark'] as const) {
    for (const color of ['#ffffff', '#000000', '#ffff00', '#0000ff', '#8b5cf6']) {
      const tokens = accentTokens(color, theme)!;
      const [h, s, l] = tokens['--primary'].split(' ').map(parseFloat);
      const a = s / 100 * Math.min(l / 100, 1 - l / 100);
      const rgb = [0, 8, 4].map(n => { const k = (n + h / 30) % 12; return l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); });
      const lum = rgb.map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((a, v, i) => a + v * [.2126, .7152, .0722][i], 0);
      const bg = theme === 'light' ? 1 : .0108;
      expect((Math.max(lum, bg) + .05) / (Math.min(lum, bg) + .05)).toBeGreaterThan(4.5);
      expect(tokens['--primary-foreground'] === '0 0% 0%' ? (lum + .05) / .05 : 1.05 / (lum + .05)).toBeGreaterThan(4.5);
    }
  }
});
