import { useEffect, useState } from 'react';
import { useUsageStore } from '../store/usageStore';
import UsageTimer from '../components/UsageTimer';
import UsageChart from '../components/UsageChart';
import { Surface } from '../ui/Surface';
import { usageHeatmap, usageLevel, usageSeries, USAGE_LEVELS } from '../utils/usageChart';

export default function UsageStats() {
  const { stats, formatMinutes, loadUsageData, calculateStats, isTrackingEnabled, weeklyUsage, monthlyUsage, usageRecords } = useUsageStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  useEffect(() => {
    void loadUsageData();
    const interval = setInterval(calculateStats, 60000);
    return () => clearInterval(interval);
  }, [loadUsageData, calculateStats]);
  const totals: Record<string, number> = {};
  for (const record of usageRecords) {
    if (Number.isFinite(record.duration) && record.duration > 0) totals[record.date] = (totals[record.date] ?? 0) + record.duration;
  }
  for (const [date, minutes] of Object.entries({ ...monthlyUsage, ...weeklyUsage })) {
    if (Number.isFinite(minutes)) totals[date] = Math.max(totals[date] ?? 0, minutes);
  }
  const history = usageSeries(period, { ...monthlyUsage, ...weeklyUsage });
  const heatmap = usageHeatmap(totals);
  return <div className="workspace-page usage-page">
    <h1 className="sr-only">使用统计</h1>
    <div className="usage-dashboard">
      <UsageTimer />
      <div className="usage-overview-grid" aria-label="使用概览">{[
        ['今日使用', stats.today], ['平均每日', stats.averageDaily], ['本周累计', stats.thisWeek], ['本月累计', stats.thisMonth],
      ].map(([label, minutes]) => <Surface className="usage-metric" key={label}><span>{label}</span><strong aria-label={formatMinutes(Number(minutes))}>{(Number(minutes) / 60).toFixed(1)}<small> 小时</small></strong></Surface>)}</div>
      <div className="usage-section-heading usage-period-heading"><h2>专注足迹</h2>
        <div className="calendar-view-switch" role="group" aria-label="统计范围">{(['week', 'month'] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 'week' ? '本周' : '本月'}</button>)}</div></div>
      <UsageChart data={history} formatMinutes={formatMinutes} period={period} />
      <Surface role="chart" className="usage-frequency-card">
        <div className="usage-section-heading"><h2>使用频率</h2><span className="usage-heatmap-range">最近 20 周</span></div>
        <div className="usage-heatmap-layout">
          <div className="usage-heatmap-weekdays" aria-hidden="true"><span>一</span><span>三</span><span>五</span><span>日</span></div>
          <div className="usage-heatmap" role="list" aria-label="每日使用频率">{heatmap.map(day => {
            const label = `${day.date} · ${day.recorded ? formatMinutes(day.minutes) : '无使用记录'}`;
            return <div key={day.date} role="listitem" className="usage-heatmap-day" data-tooltip-delay="0" data-level={usageLevel(day.minutes)} data-future={day.future || undefined}
              tabIndex={day.future ? undefined : 0} title={day.future ? undefined : label} aria-label={day.future ? `${day.date}，尚未到来` : label} />;
          })}</div>
        </div>
        <div className="usage-frequency-legend"><span>少</span>{USAGE_LEVELS.map((label, level) => <i key={level} data-level={level} tabIndex={0} role="img" aria-label={label} title={label} />)}<span>多</span></div>
      </Surface>
      <span className="usage-tracking-status" data-active={isTrackingEnabled}><i />{isTrackingEnabled ? '记录中' : '已暂停记录'}</span>
    </div>
  </div>;
}
