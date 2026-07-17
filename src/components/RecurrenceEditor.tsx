import { useState } from 'react';
import type { RecurrenceRule, RecurrenceType } from '../types';
import { DAY_NAMES } from '../types';
import { formatRecurrenceText } from '../utils/recurrence';

interface RecurrenceEditorProps {
  value?: RecurrenceRule;
  onChange: (value: RecurrenceRule | undefined) => void;
  buttonClassName?: string;
  popoverClassName?: string;
}

function createRule(type: RecurrenceType): RecurrenceRule {
  if (type === 'week') return { type, interval: 1, daysOfWeek: [1] };
  if (type === 'month') return { type, interval: 1, daysOfMonth: [1] };
  return { type, interval: 1 };
}

export function RecurrenceEditor({
  value,
  onChange,
  buttonClassName = 'w-full px-3 py-2 text-left bg-background border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm',
  popoverClassName = 'bg-card',
}: RecurrenceEditorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleWeekday = (day: number) => {
    if (value?.type !== 'week') return;
    const currentDays = value.daysOfWeek ?? [];
    const daysOfWeek = currentDays.includes(day)
      ? currentDays.filter((currentDay) => currentDay !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    if (daysOfWeek.length > 0) onChange({ ...value, daysOfWeek });
  };

  const toggleMonthDay = (day: number) => {
    if (value?.type !== 'month') return;
    const currentDays = value.daysOfMonth ?? [];
    const daysOfMonth = currentDays.includes(day)
      ? currentDays.filter((currentDay) => currentDay !== day)
      : [...currentDays, day].sort((a, b) => a - b);
    if (daysOfMonth.length > 0) onChange({ ...value, daysOfMonth });
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setIsOpen((open) => !open)} className={buttonClassName}>
        {value ? formatRecurrenceText(value) : '不重复'}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-[9998]" onClick={() => setIsOpen(false)} />
          <div className={`absolute bottom-full right-0 mb-1 p-4 border border-border rounded-lg shadow-xl z-[9999] min-w-[320px] ${popoverClassName}`}>
            <div className="space-y-4">
              <div className="text-sm font-medium text-foreground">设置重复周期</div>

              <div className="flex space-x-2">
                {(['day', 'week', 'month'] as RecurrenceType[]).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange(createRule(type))}
                    className={`flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                      value?.type === type
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {type === 'day' ? '天' : type === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>

              {value && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">
                    {value.type === 'day' ? '每隔' : value.type === 'week' ? '每几周' : '每几月'}
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">每</span>
                    <input
                      type="number"
                      min="1"
                      max="99"
                      value={value.interval}
                      onChange={(event) => onChange({ ...value, interval: Number.parseInt(event.target.value, 10) || 1 })}
                      className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <span className="text-sm text-muted-foreground">
                      {value.type === 'day' ? '天' : value.type === 'week' ? '周' : '月'}
                    </span>
                  </div>
                </div>
              )}

              {value?.type === 'week' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">选择周几</label>
                  <div className="flex flex-wrap gap-1">
                    {DAY_NAMES.map((name, index) => (
                      <button
                        key={name}
                        type="button"
                        onClick={() => toggleWeekday(index)}
                        className={`w-8 h-8 rounded-md border text-xs font-medium transition-colors ${
                          value.daysOfWeek?.includes(index)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {name.charAt(1)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {value?.type === 'month' && (
                <div>
                  <label className="block text-xs text-muted-foreground mb-2">选择日期（可多选）</label>
                  <div className="grid grid-cols-7 gap-1 p-3 bg-background border border-border rounded-lg">
                    {Array.from({ length: 31 }, (_, index) => index + 1).map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => toggleMonthDay(day)}
                        className={`w-8 h-8 rounded-md border text-xs font-medium transition-colors ${
                          value.daysOfMonth?.includes(day)
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                  {!!value.daysOfMonth?.length && (
                    <div className="mt-2 text-xs text-muted-foreground">
                      已选择：每月 {value.daysOfMonth.map((day) => `${day}号`).join('、')} 重复
                    </div>
                  )}
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => {
                    onChange(undefined);
                    setIsOpen(false);
                  }}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                >
                  清除
                </button>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors font-medium"
                >
                  确定
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default RecurrenceEditor;
