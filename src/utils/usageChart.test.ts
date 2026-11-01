import { describe, expect, it } from 'vitest';
import { chartGeometry, usageLevel, usageSeries } from './usageChart';
describe('usage charts', () => {
  it('centres a single day and never produces invalid SVG coordinates', () => {
    const result = chartGeometry([{ date: '2026/11/1', minutes: 0 }]);
    expect(result.points[0].x).toBe(280);
    expect(result.line).not.toMatch(/NaN|Infinity/);
    expect(result.area).not.toMatch(/NaN|Infinity/);
    expect(result.ceiling).toBe(60);
    expect(chartGeometry([]).area).toBe('');
  });
  it('starts the week on Monday, including Sunday, without future dates', () => {
    expect(usageSeries('week', {}, new Date(2026, 10, 2, 12))).toHaveLength(1);
    const days = usageSeries('week', {}, new Date(2026, 10, 1, 12));
    expect(days).toHaveLength(7); expect(days[0].dayName).toBe('周一'); expect(days[6].dayName).toBe('周日');
  });
  it('does not lower a first-day monthly average with future days', () => {
    const today = new Date(2026, 10, 1, 12); const key = today.toLocaleDateString('zh-CN');
    expect(usageSeries('month', { [key]: 30 }, today)).toEqual([{ date: key, minutes: 30, dayName: '1日' }]);
  });
  it('bounds invalid stored numbers and uses fixed, comparable colour thresholds', () => {
    const today = new Date(2026, 10, 1, 12); const key = today.toLocaleDateString('zh-CN');
    expect(usageSeries('month', { [key]: Infinity }, today)[0].minutes).toBe(0);
    expect(usageSeries('month', { [key]: -10 }, today)[0].minutes).toBe(0);
    expect(usageSeries('month', { [key]: 4000 }, today)[0].minutes).toBe(1440);
    expect([0, 1, 14, 15, 29, 30, 59, 60, 120].map(usageLevel)).toEqual([0, 1, 1, 2, 2, 3, 3, 4, 4]);
  });
});
