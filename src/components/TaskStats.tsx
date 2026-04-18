import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, AlertTriangle, Clock, TrendingUp, Target, ChevronDown, ChevronUp } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';

interface TaskStatsProps {
  collapsed?: boolean; // 由父组件控制折叠状态
  onCollapsedChange?: (collapsed: boolean) => void;
}

// 折叠状态的小按钮（独立组件，方便在同一行渲染）
export function StatsCollapsedButton({ collapsed, onCollapsedChange }: TaskStatsProps) {
  const { stats } = useTaskStore();
  const [isCollapsed, setIsCollapsed] = useState(collapsed ?? true);

  useEffect(() => {
    if (collapsed !== undefined) {
      setIsCollapsed(collapsed);
    }
  }, [collapsed]);

  const handleToggle = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  return (
    <button
      onClick={handleToggle}
      className="px-4 py-4 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 shadow-sm flex-shrink-0"
      title="展开统计面板"
    >
      <TrendingUp className="w-4 h-4 text-primary" />
      <span className="text-sm font-medium text-foreground">
        {stats.total > 0 ? `${stats.completed}/${stats.total}` : '0/0'}
      </span>
      <ChevronDown className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}

export default function TaskStats({ collapsed = false, onCollapsedChange }: TaskStatsProps) {
  const { stats } = useTaskStore();
  const { settings } = useSettingsStore();
  const [currentMotivationIndex, setCurrentMotivationIndex] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);

  useEffect(() => {
    setIsCollapsed(collapsed);
  }, [collapsed]);

  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const motivationalQuotes = [
    '完成一项任务，就清除一个待办障碍 🎯',
    '按计划推进，时间会给出答案 ✨',
    '专注当下任务，积累带来改变 🌟',
    '坚持执行，目标会逐步清晰 💪',
    '拆解大目标，小步骤更易落地 🏆',
    '每划掉一项，都在减少待办压力 ✅',
    '今日完成3件核心事，就是有效率的一天',
    '任务不分大小，完成即有实际价值',
    '按自己的节奏推进，避免无效焦虑 💡',
    '清空一项待办，为重要事腾出精力',
    '你的每一次执行，都在靠近目标 🌟',
    '积累小完成，最终能实现大规划 🧩',
    '完成当前任务，是对下一步的铺垫',
    '克服拖延，从启动第一个任务开始 🚀',
    '待办减少的背后，是掌控感的提升',
    '哪怕只完成1件核心事，今日也有意义 🌻',
    '拆分复杂任务，降低执行门槛 📝',
    '每一次打勾，都是对执行力的肯定 👏',
    '持续推进，未来会更从容地应对挑战',
    '完成的任务，是你能力的直接证明 🏅',
    '理性规划，一件一件落实，你能做到',
    '完成当前项，才能高效衔接下一件事 🌈',
    '有条理地执行，能减少不必要的消耗',
    '专注清空清单，为后续计划留出空间 📖',
    '认真对待每一项任务，是成长的基础'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMotivationIndex((prev) => (prev + 1) % motivationalQuotes.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [motivationalQuotes.length]);

  const statItems = [
    {
      label: '总任务',
      value: stats.total,
      icon: <Target className="w-6 h-6" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200'
    },
    {
      label: '已完成',
      value: stats.completed,
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    {
      label: '待完成',
      value: stats.pending,
      icon: <Circle className="w-6 h-6" />,
      color: 'text-gray-600',
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200'
    },
    {
      label: '已逾期',
      value: stats.overdue,
      icon: <AlertTriangle className="w-6 h-6" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    {
      label: '今日到期',
      value: stats.today,
      icon: <Clock className="w-6 h-6" />,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200'
    }
  ];

  const getMotivationalMessage = () => {
    if (completionRate === 100) {
      return settings.theme === 'pink' ? '太棒了！所有任务都完成了 ✨' : '出色！任务全部完成';
    } else if (completionRate >= 80) {
      return settings.theme === 'pink' ? '做得很好！再加把劲就全部完成了 💪' : '进展良好，即将完成';
    } else if (stats.total === 0) {
      return settings.theme === 'pink' ? '今天还没有任务，要不要添加一些？' : '暂无任务';
    } else {
      return motivationalQuotes[currentMotivationIndex];
    }
  };

  const handleToggleCollapse = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    onCollapsedChange?.(newCollapsed);
  };

  // 折叠状态返回null，让父组件决定如何渲染
  if (isCollapsed) {
    return null;
  }

  // 展开状态显示完整面板
  return (
    <div className="bg-card border border-border rounded-lg p-4 stats-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <TrendingUp className="w-9 h-9 text-primary" />
          <h2 className="text-2xl font-semibold text-foreground">
            任务进展
          </h2>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggleCollapse}
            className="p-2 rounded-lg hover:bg-muted transition-colors"
            title="折叠统计面板"
          >
            <ChevronUp className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-1.5 mb-4">
        {statItems.map((item, index) => (
          <div
            key={index}
            className={`
              p-2 rounded-lg border transition-all duration-200 hover:shadow-sm stat-item-card
              ${item.bgColor} ${item.borderColor}
            `}
          >
            <div className="flex flex-col space-y-1">
              <div className="flex items-center justify-between">
                <div className={`p-1 rounded-md ${item.bgColor} flex-shrink-0 -ml-1`}>
                  <div className={`h-6 w-6 ${item.color}`}>
                    {item.icon}
                  </div>
                </div>
                <div className="flex-1 text-center">
                  <p className={`text-lg font-bold ${item.color} leading-tight`}>{item.value}</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-xs font-medium text-muted-foreground leading-tight">{item.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-right">
        <div className="text-xs text-muted-foreground transition-all duration-500 ease-in-out">
          {getMotivationalMessage()}
        </div>
      </div>
    </div>
  );
}
