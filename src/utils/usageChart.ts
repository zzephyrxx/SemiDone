export interface UsagePoint { date: string; minutes: number; dayName?: string }
export function usageLevel(minutes: number): number {
  return minutes <= 0 ? 0 : minutes < 15 ? 1 : minutes < 30 ? 2 : minutes < 60 ? 3 : 4;
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
