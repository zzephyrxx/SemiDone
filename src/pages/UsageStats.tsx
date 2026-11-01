import { useEffect, useState } from 'react';
import { useUsageStore } from '../store/usageStore';
import UsageTimer from '../components/UsageTimer';
import UsageChart from '../components/UsageChart';
import { Surface } from '../ui/Surface';
import { usageLevel, usageSeries } from '../utils/usageChart';

export default function UsageStats() {
  const { stats, formatMinutes, loadUsageData, calculateStats, isTrackingEnabled, weeklyUsage, monthlyUsage } = useUsageStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  useEffect(() => {
    void loadUsageData();
    const interval = setInterval(calculateStats, 60000);
    return () => clearInterval(interval);
  }, [loadUsageData, calculateStats]);
  const history = usageSeries(period, { ...monthlyUsage, ...weeklyUsage });
  const activeDays = history.filter(day => day.minutes > 0).length;
  return <div className="workspace-page usage-page">
    <div className="usage-dashboard">
      <header className="usage-page-heading"><div><span className="usage-eyebrow">YOUR RHYTHM</span><h1>把时间留给重要的事</h1><p>看见日常的节奏，让专注慢慢累积。</p></div>
        <span className="usage-tracking-status" data-active={isTrackingEnabled}><i />{isTrackingEnabled ? '记录中' : '已暂停记录'}</span></header>
      <div className="usage-overview-grid">{[
        ['今日使用', stats.today, '今天的积累'], ['平均每日', stats.averageDaily, '每一天的节奏'],
        ['本周累计', stats.thisWeek, '从周一开始'], ['本月累计', stats.thisMonth, '本月的足迹'],
      ].map(([label, minutes, hint]) => <div className="usage-metric" key={label}><span>{label}</span><strong>{formatMinutes(Number(minutes))}</strong><small>{hint}</small></div>)}</div>
      <div className="usage-section-heading usage-period-heading"><div><h2>专注足迹</h2><p>{activeDays} 天活跃 · {history.length} 天记录范围</p></div>
        <div className="calendar-view-switch" role="group" aria-label="统计范围">{(['week', 'month'] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 'week' ? '本周' : '本月'}</button>)}</div></div>
      <UsageChart data={history} formatMinutes={formatMinutes} period={period} />
      <Surface role="chart" className="usage-frequency-card"><div className="usage-section-heading"><div><h2>使用频率</h2><p>每格一天，颜色越深，使用时长越多。</p></div></div>
        <div className="usage-frequency-grid" role="list" aria-label="每日使用频率">{history.map(day => <div key={day.date} role="listitem" className="usage-frequency-day" data-level={usageLevel(day.minutes)} title={`${day.date} · ${formatMinutes(day.minutes)}`} aria-label={`${day.date}，${formatMinutes(day.minutes)}`}><span>{day.dayName}</span><strong>{day.minutes > 0 ? formatMinutes(day.minutes) : '—'}</strong></div>)}</div>
        <div className="usage-frequency-legend"><span>少</span>{[0, 1, 2, 3, 4].map(level => <i key={level} data-level={level} />)}<span>多</span><small>0 · 15 · 30 · 60 分钟</small></div>
      </Surface>
      <UsageTimer />
    </div>
  </div>;
}
