import { useEffect, useState } from 'react';
import { X } from '../ui/icons';
import { useUsageStore } from '../store/usageStore';
import { Overlay } from '../ui/Overlay';
import UsageChart from './UsageChart';
interface UsageDetailsModalProps { isOpen: boolean; onClose: () => void }
export default function UsageDetailsModal({ isOpen, onClose }: UsageDetailsModalProps) {
  const { stats, getUsageDetails, formatMinutes, loadUsageData } = useUsageStore();
  const [period, setPeriod] = useState<'week' | 'month'>('week');
  useEffect(() => { if (isOpen) void loadUsageData(); }, [isOpen, loadUsageData]);
  // Read current store values after loading rather than keeping an early, stale snapshot.
  const details = getUsageDetails(period === 'week' ? 7 : 30);
  const total = details.reduce((sum, item) => sum + item.totalMinutes, 0);
  const activeDays = details.filter(item => item.totalMinutes > 0).length;
  const sessions = details.reduce((sum, item) => sum + item.sessions, 0);
  return <Overlay label="使用详情" open={isOpen} onClose={onClose} dialogClassName="usage-details-dialog">
    <header className="usage-section-heading"><div><span className="usage-eyebrow">YOUR RHYTHM</span><h2>使用详情统计</h2></div><button type="button" onClick={onClose} aria-label="关闭使用详情" className="dialog-close-button usage-details-close"><X size={17} /></button></header>
    <div className="usage-details-body">
      <div className="calendar-view-switch" role="group" aria-label="统计范围">{(['week', 'month'] as const).map(value => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{value === 'week' ? '最近7天' : '最近30天'}</button>)}</div>
      <div className="usage-overview-grid">{[['今日使用', formatMinutes(stats.today)], ['平均每日', formatMinutes(Math.round(total / details.length))], ['活跃天数', `${activeDays} 天`], ['会话次数', `${sessions} 次`]].map(([label, value]) => <div className="usage-metric" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
      <UsageChart data={details.slice().reverse().map(item => ({ date: item.date, minutes: item.totalMinutes }))} period={period} formatMinutes={formatMinutes} />
      <p className="usage-details-note">使用时长用于回顾日常节奏，不代表任务完成质量。</p>
    </div>
  </Overlay>;
}
