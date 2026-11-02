import { useId, useState } from 'react';
import { TrendingUp } from '../ui/icons';
import { Surface } from '../ui/Surface';
import { chartGeometry, type UsagePoint } from '../utils/usageChart';
interface UsageChartProps { data: UsagePoint[]; formatMinutes: (minutes: number) => string; period: 'week' | 'month' }
export default function UsageChart({ data, formatMinutes, period }: UsageChartProps) {
  const id = useId().replace(/:/g, '');
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const { ceiling, points, line, area } = chartGeometry(data);
  const selected = points.find(point => point.date === selectedDate) ?? points.at(-1);
  const sum = data.reduce((total, item) => total + item.minutes, 0);
  return <Surface role="chart" className="usage-chart-card">
    <div className="usage-section-heading">
      <div><span className="usage-eyebrow">{period === 'week' ? 'THIS WEEK' : 'THIS MONTH'}</span>
        <h2><TrendingUp size={18} />使用趋势</h2></div>
      <div className="usage-chart-readout" aria-live="polite"><strong>{selected ? formatMinutes(selected.minutes) : '—'}</strong>
        <span>{selected?.date ?? '暂无记录'}</span></div>
    </div>
    {points.length ? <>
      <svg className="usage-trend-svg" viewBox="0 0 600 216" role="group" aria-label="每日使用时长趋势，可聚焦或悬停数据点查看时长">
        <defs><linearGradient id={`usage-fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="currentColor" stopOpacity=".26" /><stop offset="100%" stopColor="currentColor" stopOpacity=".015" /></linearGradient></defs>
        {[0, 1, 2, 3, 4].map(i => <g key={i} className="usage-chart-grid">
          <line x1="44" x2="556" y1={182 - i * 38.5} y2={182 - i * 38.5} />
          <text x="35" y={186 - i * 38.5} textAnchor="end">{ceiling * i / 4 >= 60 ? `${+(ceiling * i / 240).toFixed(1)}h` : `${ceiling * i / 4}m`}</text>
        </g>)}
        <path d={area} fill={`url(#usage-fill-${id})`} />
        <path d={line} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
        {selected && <line x1={selected.x} x2={selected.x} y1="22" y2="182" className="usage-chart-cursor" />}
        {points.map((point, index) => <g key={point.date}>
          <circle cx={point.x} cy={point.y} r={point === selected ? 5 : 3} className="usage-chart-dot" />
          <circle cx={point.x} cy={point.y} r="13" fill="transparent" role="button" tabIndex={0}
            aria-label={`${point.date}，${formatMinutes(point.minutes)}`} onFocus={() => setSelectedDate(point.date)}
            onMouseEnter={() => setSelectedDate(point.date)} onClick={() => setSelectedDate(point.date)}
            onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedDate(point.date); } }}>
            <title>{point.date} · {formatMinutes(point.minutes)}</title></circle>
          {(period === 'week' || index === 0 || index === points.length - 1 || index % 7 === 0) && <text x={point.x} y="207" textAnchor="middle" className="usage-chart-label">{point.dayName ?? point.date.split(/[-/]/).at(-1)}</text>}
        </g>)}
      </svg>
      <div className="usage-chart-footer"><span><i />使用时长</span><span>日均 <b>{formatMinutes(Math.round(sum / data.length))}</b> · 最高 <b>{formatMinutes(Math.max(...data.map(item => item.minutes)))}</b></span></div>

    </> : <div className="usage-chart-empty">还没有使用记录，接下来每一天都从这里开始。</div>}
  </Surface>;
}
