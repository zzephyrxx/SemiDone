import { useEffect, useMemo, useState } from 'react';
import {
  addMonths,
  addWeeks,
  eachDayOfInterval,
  format,
  isSameDay,
  isToday,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { ArrowLeft, CalendarCheck2, ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShallow } from 'zustand/react/shallow';
import type { Task } from '../types';
import { useTaskStore } from '../store/taskStore';
import {
  buildMonthCalendar,
  getCompletedTasksInPeriod,
  getPeriodBounds,
  getTaskCompletionDate,
  toLocalDateKey,
  type TaskCalendarCell,
  type TaskCalendarView,
} from '../utils/taskCalendar';

const VIEW_OPTIONS: Array<{ value: TaskCalendarView; label: string }> = [
  { value: 'week', label: '周' },
  { value: 'month', label: '月' },
];

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function periodLabel(view: TaskCalendarView, anchor: Date): string {
  if (view === 'month') return format(anchor, 'yyyy年M月', { locale: zhCN });
  const { start, end } = getPeriodBounds('week', anchor);
  return `${format(start, 'M月d日')} - ${format(end, 'M月d日')}`;
}

function summaryLabel(view: TaskCalendarView): string {
  if (view === 'week') return '本周完成';
  return '本月完成';
}

function taskListLabel(view: TaskCalendarView): string {
  if (view === 'week') return '本周完成任务';
  return '本月完成任务';
}

function changePeriod(view: TaskCalendarView, anchor: Date, direction: -1 | 1): Date {
  if (view === 'week') return addWeeks(anchor, direction);
  return addMonths(anchor, direction);
}

function buildPeriodCells(view: TaskCalendarView, anchor: Date, tasks: Task[]): TaskCalendarCell[] {
  if (view === 'month') return buildMonthCalendar(anchor, tasks);
  const bounds = getPeriodBounds(view, anchor);
  return eachDayOfInterval(bounds).map((date) => {
    const dayTasks = getCompletedTasksInPeriod(tasks, 'day', date);
    return {
      date,
      key: toLocalDateKey(date),
      count: dayTasks.length,
      tasks: dayTasks,
      inCurrentMonth: true,
    };
  });
}

function completionDensityClass(count: number): string {
  if (count >= 5) return 'bg-primary/30 border-primary/50';
  if (count >= 3) return 'bg-primary/20 border-primary/40';
  if (count >= 1) return 'bg-primary/10 border-primary/30';
  return 'bg-card border-border/70 hover:bg-accent/70';
}

interface TaskCalendarContentProps {
  tasks: Task[];
  initialAnchor?: Date;
}

export function TaskCalendarContent({ tasks, initialAnchor = new Date() }: TaskCalendarContentProps) {
  const [view, setView] = useState<TaskCalendarView>('month');
  const [anchor, setAnchor] = useState(() => initialAnchor);
  const completedTasks = useMemo(
    () => getCompletedTasksInPeriod(tasks, view, anchor),
    [anchor, tasks, view],
  );
  const cells = useMemo(() => buildPeriodCells(view, anchor, tasks), [anchor, tasks, view]);
  const maximumCount = Math.max(1, ...cells.map(cell => cell.count));

  return (
    <div className="min-h-full bg-background p-3 text-foreground">
      <div className="mx-auto max-w-2xl space-y-3">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Link>
          <div className="inline-flex rounded-lg border border-border bg-muted/50 p-1">
            {VIEW_OPTIONS.map(option => (
              <button
                key={option.value}
                type="button"
                aria-label={`${option.label}视图`}
                onClick={() => setView(option.value)}
                className={`min-w-10 rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${
                  view === option.value
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-primary">
                <CalendarCheck2 className="h-5 w-5" />
                <h1 className="text-lg font-bold text-foreground">任务视图</h1>
              </div>
              <p className="text-xs text-muted-foreground">按完成日期回看每一步进展</p>
            </div>
            <div className="text-right">
              <div className="text-xs font-medium text-muted-foreground">{summaryLabel(view)}</div>
              <div className="font-mono text-3xl font-bold tabular-nums text-foreground">
                {completedTasks.length}
                <span className="ml-1 text-xs font-medium text-muted-foreground">项</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between px-3 py-3">
            <button
              type="button"
              aria-label="上一个周期"
              onClick={() => setAnchor(current => changePeriod(view, current, -1))}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(new Date())}
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              {periodLabel(view, anchor)}
            </button>
            <button
              type="button"
              aria-label="下一个周期"
              onClick={() => setAnchor(current => changePeriod(view, current, 1))}
              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 border-y border-border/70 bg-muted/30 px-2 py-2">
            {WEEKDAY_LABELS.map(label => (
              <div key={label} className="text-center text-[11px] font-semibold text-muted-foreground">
                {label}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 p-2">
            {cells.map(cell => {
              const density = cell.count / maximumCount;
              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={`${format(cell.date, 'M月d日')}，完成${cell.count}项`}
                  onClick={() => {
                    setAnchor(cell.date);
                  }}
                  className={`relative flex min-h-14 flex-col rounded-xl border p-2 text-left transition-all hover:-translate-y-0.5 hover:shadow-sm ${
                    completionDensityClass(cell.count)
                  } ${!cell.inCurrentMonth ? 'opacity-35' : ''} ${isSameDay(cell.date, anchor) ? 'ring-2 ring-primary/50' : ''}`}
                >
                  <span className={`text-xs font-semibold ${isToday(cell.date) ? 'text-primary' : 'text-foreground'}`}>
                    {format(cell.date, 'd', { locale: zhCN })}
                  </span>
                  <span className="mt-auto font-mono text-sm font-bold tabular-nums text-foreground">
                    {cell.count > 0 ? `${cell.count}项` : '—'}
                  </span>
                  {cell.count > 0 && (
                    <span
                      className="absolute bottom-1 left-2 right-2 h-0.5 rounded-full bg-primary"
                      style={{ opacity: 0.35 + density * 0.65 }}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold text-foreground">{taskListLabel(view)}</h2>
            <span className="text-xs text-muted-foreground">共 {completedTasks.length} 项</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              这个周期还没有完成记录
            </div>
          ) : (
            <div className="space-y-2">
              {completedTasks.map(task => {
                const completedAt = getTaskCompletionDate(task);
                return (
                  <Link
                    key={task.id}
                    to={`/task/${task.id}`}
                    className="flex items-center gap-3 rounded-xl border border-border/70 bg-background/60 px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-accent/60"
                  >
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">{task.title}</span>
                    <time className="flex-shrink-0 font-mono text-[11px] text-muted-foreground">
                      {completedAt ? format(completedAt, 'M/d HH:mm') : ''}
                    </time>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default function TaskCalendar() {
  const { tasks, loading, loadTasks } = useTaskStore(
    useShallow(state => ({
      tasks: state.tasks,
      loading: state.loading,
      loadTasks: state.loadTasks,
    })),
  );

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  if (loading && tasks.length === 0) {
    return (
      <div className="flex min-h-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  return <TaskCalendarContent tasks={tasks} />;
}
