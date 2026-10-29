import { useId, useLayoutEffect, useRef, useState } from 'react';
import { addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, isBefore, isSameDay, isSameMonth, isValid, parseISO, startOfDay, startOfMonth, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface Props { id: string; value: string; onConfirm: (value: string) => void; onCancel: () => void; onClear: () => void; inDialog?: boolean }

/** App-rendered controls avoid native date/time popup conflicts with window pinning. */
export default function InlineDueDatePicker({ id, value, onConfirm, onCancel, onClear, inDialog = false }: Props) {
  const initial = value && isValid(parseISO(value)) ? parseISO(value) : new Date();
  const [selected, setSelected] = useState(initial);
  const [month, setMonth] = useState(() => startOfMonth(initial));
  const [hour, setHour] = useState(value ? format(initial, 'HH') : '09');
  const [minute, setMinute] = useState(value ? format(initial, 'mm') : '00');
  const root = useRef<HTMLElement>(null);
  const timeId = useId();
  const today = startOfDay(new Date());
  const validTime = /^\d{1,2}$/.test(hour) && Number(hour) <= 23 && /^\d{1,2}$/.test(minute) && Number(minute) <= 59;
  const valid = validTime && !isBefore(startOfDay(selected), today);
  const confirm = () => { if (valid) onConfirm(`${format(selected, 'yyyy-MM-dd')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`); };
  const days = eachDayOfInterval({ start: startOfWeek(startOfMonth(month), { weekStartsOn: 1 }), end: endOfWeek(endOfMonth(month), { weekStartsOn: 1 }) });

  useLayoutEffect(() => { root.current?.scrollIntoView?.({ block: 'nearest' }); }, []);

  return <section ref={root} id={id} role="group" aria-label="选择截止日期" className={`due-date-picker space-y-3 ${inDialog ? 'p-4' : 'mt-2 rounded-lg border border-border bg-card p-3'}`}
    onKeyDown={event => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); onCancel(); }
      else if (event.key === 'Enter' && (event.target instanceof HTMLInputElement || event.ctrlKey || event.metaKey)) {
        event.preventDefault(); event.stopPropagation(); confirm();
      }
    }}>
    {inDialog && <h3 className="text-sm font-medium">选择截止日期</h3>}
    <div className="flex items-center justify-between gap-2">
      <button type="button" aria-label="上个月" className="p-1 rounded hover:bg-muted" onClick={() => setMonth(current => addMonths(current, -1))}><ChevronLeft size={16} /></button>
      <span className="text-sm font-medium" aria-live="polite">{format(month, 'yyyy年M月')}</span>
      <button type="button" aria-label="下个月" className="p-1 rounded hover:bg-muted" onClick={() => setMonth(current => addMonths(current, 1))}><ChevronRight size={16} /></button>
    </div>
    <div className="grid grid-cols-7 gap-1 text-center">
      {['一', '二', '三', '四', '五', '六', '日'].map(day => <span key={day} className="text-xs text-muted-foreground">{day}</span>)}
      {days.map(day => <button key={format(day, 'yyyy-MM-dd')} type="button" aria-label={format(day, 'yyyy年M月d日')}
        aria-pressed={isSameDay(day, selected)} disabled={isBefore(startOfDay(day), today)}
        className={`min-h-7 rounded text-xs disabled:opacity-30 disabled:cursor-not-allowed ${isSameDay(day, selected) ? 'bg-primary text-primary-foreground' : isSameMonth(day, month) ? 'text-foreground hover:bg-muted' : 'text-muted-foreground hover:bg-muted'}`}
        onClick={() => { setSelected(day); setMonth(startOfMonth(day)); }}>{format(day, 'd')}</button>)}
    </div>
    <div className="flex items-center gap-2">
      <span className="mr-auto text-xs text-muted-foreground">时间</span>
      <label htmlFor={`${timeId}-hour`} className="sr-only">小时</label>
      <input id={`${timeId}-hour`} type="number" inputMode="numeric" min={0} max={23} value={hour} onChange={event => setHour(event.target.value)}
        className="w-16 px-2 py-1 text-sm text-center bg-background border border-border rounded" />
      <span aria-hidden="true">:</span>
      <label htmlFor={`${timeId}-minute`} className="sr-only">分钟</label>
      <input id={`${timeId}-minute`} type="number" inputMode="numeric" min={0} max={59} value={minute} onChange={event => setMinute(event.target.value)}
        className="w-16 px-2 py-1 text-sm text-center bg-background border border-border rounded" />
    </div>
    <div className="flex justify-end gap-2 border-t border-border pt-2">
      <button type="button" className="px-3 py-1.5 text-sm rounded hover:bg-muted" onClick={onCancel}>取消</button>
      <button type="button" className="px-3 py-1.5 text-sm rounded hover:bg-muted" onClick={onClear}>清除</button>
      <button type="button" className="px-3 py-1.5 text-sm rounded bg-primary text-primary-foreground disabled:opacity-50" disabled={!valid} onClick={confirm}>确定</button>
    </div>
  </section>;
}
