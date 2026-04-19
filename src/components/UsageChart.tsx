import React from 'react';
import { BarChart3, TrendingUp } from 'lucide-react';

interface ChartData {
  date: string;
  minutes: number;
  dayName?: string;
}

interface UsageChartProps {
  data: ChartData[];
  chartType: 'bar' | 'line';
  onChartTypeChange: (type: 'bar' | 'line') => void;
  formatMinutes: (minutes: number) => string;
  period: 'week' | 'month';
}

export default function UsageChart({ 
  data, 
  chartType, 
  onChartTypeChange, 
  formatMinutes, 
  period 
}: UsageChartProps) {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 1);
  
  // 根据数据量动态调整图表宽度
  const baseWidth = period === 'month' ? 900 : 600; // 月视图900，周视图350
  // 周视图每天40px，月视图每天25px
  const chartWidth = Math.max(baseWidth, data.length * (period === 'month' ? 25 : 40));
  const chartHeight = 240; // 稍微增高
  const padding = { top: 25, right: 20, bottom: 25, left: 45 }; // 增加左边距给Y轴刻度
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  // 计算图表点位
  const getChartPoints = () => {
    if (data.length === 0) return [];
    
    return data.map((item, index) => {
      const x = (index / (data.length - 1)) * innerWidth;
      const y = innerHeight - (item.minutes / maxMinutes) * innerHeight;
      return { x, y, ...item };
    });
  };

  const points = getChartPoints();

  // 生成折线路径
  const getLinePath = () => {
    if (points.length === 0) return '';
    
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // 格式化日期显示
  const formatDateLabel = (item: ChartData, index: number) => {
    if (period === 'week') {
      return item.dayName || `第${index + 1}天`;
    }
    
    // 月视图显示日期
    const date = new Date(item.date);
    return `${date.getDate()}`;
  };

  // Y轴刻度 - 根据最大值选择合适单位
  const getYAxisTicks = () => {
    const tickCount = 4;
    const ticks = [];
    const maxHours = maxMinutes / 60; // 转换为小时

    if (maxMinutes < 60) {
      // 低于1小时，使用分钟
      for (let i = 0; i <= tickCount; i++) {
        const value = (maxMinutes / tickCount) * i;
        const y = innerHeight - (i / tickCount) * innerHeight;
        ticks.push({ value: Math.round(value), y, unit: '分' });
      }
    } else {
      // 1小时及以上，使用小时
      for (let i = 0; i <= tickCount; i++) {
        const value = (maxHours / tickCount) * i;
        const y = innerHeight - (i / tickCount) * innerHeight;
        ticks.push({ value: Math.round(value * 10) / 10, y, unit: '时' });
      }
    }
    return ticks;
  };

  const yAxisTicks = getYAxisTicks();

  return (
    <div className="bg-background border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          使用趋势
        </h2>
        
        <div className="flex items-center gap-2">
          <div className="flex bg-accent rounded-lg p-1">
            <button
              onClick={() => onChartTypeChange('bar')}
              className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chartType === 'bar' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              柱状图
            </button>
            <button
              onClick={() => onChartTypeChange('line')}
              className={`flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                chartType === 'line' 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TrendingUp className="w-4 h-4" />
              折线图
            </button>
          </div>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无使用数据</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="w-full h-auto"
              style={{ minWidth: period === 'month' ? '900px' : '600px' }}
            >
            {/* 背景网格 */}
            <defs>
              <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
                <path d="M 0 0 L 0 1 M 0 0 L 1 0" stroke="#e5e7eb" strokeWidth="0.5" fill="none" opacity="0.3"/>
              </pattern>
            </defs>
            <rect 
              x={padding.left} 
              y={padding.top} 
              width={innerWidth} 
              height={innerHeight} 
              fill="url(#grid)" 
            />

            {/* Y轴 */}
            <line 
              x1={padding.left} 
              y1={padding.top} 
              x2={padding.left} 
              y2={padding.top + innerHeight} 
              stroke="#9ca3af" 
              strokeWidth="1"
            />

            {/* X轴 */}
            <line 
              x1={padding.left} 
              y1={padding.top + innerHeight} 
              x2={padding.left + innerWidth} 
              y2={padding.top + innerHeight} 
              stroke="#9ca3af" 
              strokeWidth="1"
            />

            {/* Y轴刻度和标签 */}
            {yAxisTicks.map((tick, index) => (
              <g key={index}>
                <line 
                  x1={padding.left - 5} 
                  y1={padding.top + tick.y} 
                  x2={padding.left} 
                  y2={padding.top + tick.y} 
                  stroke="#9ca3af" 
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 10}
                  y={padding.top + tick.y + 4}
                  textAnchor="end"
                  className="fill-muted-foreground text-xs"
                >
                  {tick.value}{tick.unit}
                </text>
                {/* 水平网格线 */}
                <line 
                  x1={padding.left} 
                  y1={padding.top + tick.y} 
                  x2={padding.left + innerWidth} 
                  y2={padding.top + tick.y} 
                  stroke="#e5e7eb" 
                  strokeWidth="0.5" 
                  opacity="0.5"
                />
              </g>
            ))}

            {/* 图表内容 */}
            <g transform={`translate(${padding.left}, ${padding.top})`}>
              {chartType === 'bar' ? (
                /* 柱状图 */
                points.map((point, index) => {
                  const barWidth = Math.max(innerWidth / data.length - 4, 8);
                  const barHeight = innerHeight - point.y;
                  const barX = point.x - barWidth / 2;
                  const isToday = point.date === new Date().toISOString().split('T')[0];
                  
                  return (
                    <g key={index}>
                      <rect
                        x={barX}
                        y={point.y}
                        width={barWidth}
                        height={barHeight}
                        className={`${isToday ? 'fill-green-500' : 'fill-blue-500'} transition-all hover:opacity-80`}
                        rx="2"
                      />
                      {/* 数值标签 */}
                      {point.minutes > 0 && (
                        <text 
                          x={point.x} 
                          y={point.y - 8} 
                          textAnchor="middle" 
                          className="fill-foreground text-xs font-medium"
                        >
                          {point.minutes >= 60 ? `${(point.minutes / 60).toFixed(1)}时` : point.minutes}
                        </text>
                      )}
                    </g>
                  );
                })
              ) : (
                /* 折线图 */
                <>
                  {/* 填充区域 */}
                  <path
                    d={`${getLinePath()} L ${points[points.length - 1].x} ${innerHeight} L ${points[0].x} ${innerHeight} Z`}
                    className="fill-blue-100 dark:fill-blue-900/20"
                  />
                  
                  {/* 折线 */}
                  <path
                    d={getLinePath()}
                    fill="none"
                    stroke="#3b82f6"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* 数据点 */}
                  {points.map((point, index) => {
                    const isToday = point.date === new Date().toISOString().split('T')[0];
                    
                    return (
                      <g key={index}>
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r="4"
                          className={`${isToday ? 'fill-red-500' : 'fill-blue-500'} stroke-background`}
                          strokeWidth="2"
                        />
                        {/* 数值标签 */}
                        {point.minutes > 0 && (
                          <text 
                            x={point.x} 
                            y={point.y - 12} 
                            textAnchor="middle" 
                            className="fill-foreground text-xs font-medium"
                          >
                            {point.minutes >= 60 ? `${(point.minutes / 60).toFixed(1)}时` : point.minutes}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </>
              )}
            </g>

            {/* X轴标签 */}
            {points.map((point, index) => (
              <text 
                key={index}
                x={padding.left + point.x} 
                y={padding.top + innerHeight + 20} 
                textAnchor="middle" 
                className="fill-muted-foreground text-xs"
              >
                {formatDateLabel(data[index], index)}
              </text>
            ))}
          </svg>
        </div>

          {/* 图例和统计 - 固定不滚动 */}
          <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span>使用时长</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span>今日</span>
              </div>
            </div>

            <div className="text-right">
              <div>平均: {formatMinutes(Math.round(data.reduce((sum, d) => sum + d.minutes, 0) / data.length))}</div>
              <div>最高: {formatMinutes(Math.max(...data.map(d => d.minutes)))}</div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
