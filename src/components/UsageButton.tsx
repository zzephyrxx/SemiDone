import { useEffect } from 'react';
import { Clock, Timer, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useUsageStore } from '../store/usageStore';

export default function UsageButton() {
  const navigate = useNavigate();
  const { stats, isTrackingEnabled, formatMinutes, loadUsageData, calculateStats, pomodoro, formatTime } = useUsageStore();

  useEffect(() => {
    void loadUsageData();
    calculateStats();
    const interval = setInterval(calculateStats, 60000);
    return () => clearInterval(interval);
  }, [loadUsageData, calculateStats]);

  const mode = pomodoro.currentMode === 'work' ? '专注中' : pomodoro.currentMode === 'break' ? '短休息' : '长休息';

  return (
    <button type="button" onClick={() => navigate('/usage-stats')} className="usage-summary"
      title={pomodoro.isActive ? '番茄钟聚焦模式 - 点击查看详情' : '查看使用时长统计'}>
      {pomodoro.isActive ? <Timer size={15} /> : <Clock size={15} />}
      <span>{pomodoro.isActive ? mode : '今日使用'}</span>
      <strong>{pomodoro.isActive ? formatTime(pomodoro.timeLeft) : formatMinutes(stats.today)}</strong>
      <span className="usage-summary-state">{pomodoro.isActive ? `第 ${pomodoro.cycle + 1} 个番茄钟` : isTrackingEnabled ? '正在记录' : '记录已暂停'}</span>
      <ChevronRight size={14} />
    </button>
  );
}