import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';

interface TaskStatsProps {
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export default function TaskStats({ collapsed = false, onCollapsedChange }: TaskStatsProps) {
  const stats = useTaskStore((state) => state.stats);
  const completionRate = stats.total > 0 ? Math.round(stats.completed / stats.total * 100) : 0;

  return (
    <div className="task-overview">
      <div className="task-overview-heading">
        <span>任务概览</span>
        <button type="button" onClick={() => onCollapsedChange?.(!collapsed)}
          className="overview-toggle" aria-expanded={!collapsed} aria-controls="task-overview-metrics"
          title={collapsed ? '展开统计面板' : '折叠统计面板'}>
          <span>{stats.completed} / {stats.total} 已完成</span>
          {collapsed ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
        </button>
      </div>
      {!collapsed && <div id="task-overview-metrics" className="overview-metrics">
        <div className="overview-metric"><span>待完成</span><strong>{stats.pending}<small>项</small></strong></div>
        <div className="overview-metric"><span>今日到期</span><strong>{stats.today}<small>项</small></strong></div>
        <div className={`overview-metric ${stats.overdue > 0 ? 'has-overdue' : ''}`}><span>已逾期</span><strong>{stats.overdue}<small>项</small></strong></div>
      </div>}
      <div className="overview-progress" role="progressbar" aria-label="全部任务完成进度"
        aria-valuemin={0} aria-valuemax={100} aria-valuenow={completionRate}
        aria-valuetext={`${stats.completed} / ${stats.total} 已完成`}>
        <span style={{ width: `${completionRate}%` }} />
      </div>
    </div>
  );
}