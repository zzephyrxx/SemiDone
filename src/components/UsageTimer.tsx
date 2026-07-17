import React, { useEffect, useState } from 'react';
import { Play, Pause, RotateCcw, Settings, BarChart3, Timer } from 'lucide-react';
import { useUsageStore } from '../store/usageStore';

interface UsageTimerProps {
  onShowDetails?: () => void;
}

export default function UsageTimer({ onShowDetails }: UsageTimerProps) {
  const {
    stats,
    pomodoro,
    startPomodoro,
    pausePomodoro,
    resetPomodoro,
    formatTime,
    formatMinutes,
    loadUsageData
  } = useUsageStore();

  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    loadUsageData();
  }, [loadUsageData]);

  const getModeColor = () => {
    switch (pomodoro.currentMode) {
      case 'work': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'break': return 'text-green-600 bg-green-50 border-green-200';
      case 'longBreak': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getModeText = () => {
    switch (pomodoro.currentMode) {
      case 'work': return '专注时间';
      case 'break': return '短休息';
      case 'longBreak': return '长休息';
      default: return '待开始';
    }
  };


  return (
    <div className="bg-background border border-border rounded-lg shadow-sm p-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <Timer className="w-5 h-5" />
          番茄钟
        </h2>
        
        {onShowDetails && (
          <button
            onClick={onShowDetails}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
            title="查看详细统计"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 番茄钟模式 */}
        <div className="space-y-4">
          {/* 番茄钟主显示 */}
          <div className="text-center">
            <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border ${getModeColor()} mb-3`}>
              <Timer className="w-4 h-4" />
              {getModeText()}
            </div>
            
            <div className="text-4xl font-mono font-bold text-foreground mb-2">
              {formatTime(pomodoro.timeLeft)}
            </div>
            
            <div className="text-sm text-muted-foreground mb-4">
              第 {pomodoro.cycle + 1} 个番茄钟
            </div>

            {/* 进度条 */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className={`h-2 rounded-full transition-all duration-1000 ${
                  pomodoro.currentMode === 'work' ? 'bg-blue-500' :
                  pomodoro.currentMode === 'break' ? 'bg-green-500' : 'bg-purple-500'
                }`}
                style={{
                  width: `${100 - (pomodoro.timeLeft / (pomodoro.currentMode === 'work' ? pomodoro.workDuration * 60 :
                    pomodoro.currentMode === 'break' ? pomodoro.breakDuration * 60 : pomodoro.longBreakDuration * 60)) * 100}%`
                }}
              />
            </div>
          </div>

          {/* 控制按钮 */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={pomodoro.isActive ? pausePomodoro : startPomodoro}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                pomodoro.isActive 
                  ? 'bg-red-500 hover:bg-red-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {pomodoro.isActive ? (
                <>
                  <Pause className="w-4 h-4" />
                  暂停
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  开始
                </>
              )}
            </button>

            <button
              onClick={resetPomodoro}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="重置"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
              title="设置"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>

          {/* 番茄钟统计 */}
          <div className="grid grid-cols-2 gap-3 text-center text-sm">
            <div className="p-2 bg-accent rounded-lg">
              <div className="font-semibold text-foreground">{pomodoro.cycle}</div>
              <div className="text-muted-foreground">已完成</div>
            </div>
            <div className="p-2 bg-accent rounded-lg">
              <div className="font-semibold text-foreground">{formatMinutes(stats.today)}</div>
              <div className="text-muted-foreground">今日专注</div>
            </div>
          </div>
        </div>

      {/* 番茄钟设置面板 */}
      {showSettings && (
        <PomodoroSettings onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}

// 番茄钟设置组件
function PomodoroSettings({ onClose }: { onClose: () => void }) {
  const { pomodoro, updatePomodoroSettings } = useUsageStore();
  const [settings, setSettings] = useState({
    workDuration: pomodoro.workDuration,
    breakDuration: pomodoro.breakDuration,
    longBreakDuration: pomodoro.longBreakDuration,
    cyclesBeforeLongBreak: pomodoro.cyclesBeforeLongBreak
  });

  const handleSave = () => {
    updatePomodoroSettings(settings);
    onClose();
  };

  return (
    <div className="mt-4 p-4 bg-accent rounded-lg border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-foreground">番茄钟设置</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              专注时长
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                value={settings.workDuration}
                onChange={(e) => setSettings({...settings, workDuration: Number(e.target.value)})}
                className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
              />
              <span className="text-sm text-muted-foreground">分钟</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              短休息
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="30"
                value={settings.breakDuration}
                onChange={(e) => setSettings({...settings, breakDuration: Number(e.target.value)})}
                className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
              />
              <span className="text-sm text-muted-foreground">分钟</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              长休息
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="60"
                value={settings.longBreakDuration}
                onChange={(e) => setSettings({...settings, longBreakDuration: Number(e.target.value)})}
                className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
              />
              <span className="text-sm text-muted-foreground">分钟</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              长休息间隔
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="2"
                max="10"
                value={settings.cyclesBeforeLongBreak}
                onChange={(e) => setSettings({...settings, cyclesBeforeLongBreak: Number(e.target.value)})}
                className="flex-1 px-2 py-1 text-sm border border-border rounded bg-background"
              />
              <span className="text-sm text-muted-foreground">循环</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-1 text-sm text-muted-foreground hover:text-foreground"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
