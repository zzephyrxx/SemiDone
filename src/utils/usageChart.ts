export interface UsagePoint { date: string; minutes: number; dayName?: string }
export const USAGE_LEVELS = [
  '0 小时', '大于 0 至 1 小时', '大于 1 至 3 小时', '大于 3 至 6 小时',
  '大于 6 至 12 小时', '大于 12 至 20 小时', '大于 20 至 24 小时',
];
export function usageLevel(minutes: number): number {
  if (!Number.isFinite(minutes) || minutes <= 0) return 0;
  return minutes <= 60 ? 1 : minutes <= 180 ? 2 : minutes <= 360 ? 3
    : minutes <= 720 ? 4 : minutes <= 1200 ? 5 : 6;
}
export function usageSeries(period: 'week' | 'month', source: Record<string, number>, now = new Date()): UsagePoint[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') start.setDate(start.getDate() - (start.getDay() + 6) % 7);
  else start.setDate(1);
  const result: UsagePoint[] = [];
  // Only elapsed days participate in averages and charts; future days are unknown.
  for (let date = new Date(start); date <= now; date.setDate(date.getDate() + 1)) {
    const key = date.toLocaleDateString('zh-CN');
    const value = source[key] ?? 0;
    result.push({ date: key, minutes: Number.isFinite(value) ? Math.max(0, Math.min(1440, value)) : 0,
      dayName: period === 'week' ? ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()] : `${date.getDate()}日` });
  }
  return result;
}
export function chartGeometry(data: UsagePoint[]) {
  const maximum = Math.max(60, ...data.map(item => Number.isFinite(item.minutes) ? Math.max(0, item.minutes) : 0));
  const ceiling = Math.ceil(maximum / 4 / 15) * 15 * 4;
  const points = data.map((item, index) => ({ ...item,
    x: data.length === 1 ? 280 : 44 + index / Math.max(data.length - 1, 1) * 512,
    y: 182 - Math.min(ceiling, Math.max(0, Number.isFinite(item.minutes) ? item.minutes : 0)) / ceiling * 154,
  }));
  const line = points.map((point, i) => `${i === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  return { ceiling, points, line, area: points.length ? `${line} L ${points.at(-1)!.x} 182 L ${points[0].x} 182 Z` : '' };
}

/** GitHub-style columns: Monday at the top, one column per week. */
export function usageHeatmap(source: Record<string, number>, now = new Date(), weeks = 20) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const start = new Date(today);
  start.setDate(start.getDate() - (start.getDay() + 6) % 7 - (weeks - 1) * 7);
  return Array.from({ length: weeks * 7 }, (_, index) => {
    const date = new Date(start); date.setDate(start.getDate() + index);
    const key = date.toLocaleDateString('zh-CN');
    const value = source[key];
    return { date: key, minutes: Number.isFinite(value) ? Math.max(0, Math.min(1440, value)) : 0,
      future: date > today, recorded: Number.isFinite(value),
      month: date.getDate() === 1 ? `${date.getMonth() + 1}月` : '' };
  });
}
