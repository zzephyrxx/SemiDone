import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { Task } from '../types';
import { useTaskStore } from '../store/taskStore';
import { MOTION, useReducedMotion } from '../ui/motion';
import TaskItem from './TaskItem';
import { ROW, INITIAL_EDITOR_HEIGHT, taskWindow } from '../ui/taskWindow';
import { useSettingsStore } from '../store/settingsStore';
import { normalizeFontScale } from '../utils/interfaceSettings';

const MAX_ANIMATED_CHANGES = 24;
interface Entry { task: Task; leaving?: boolean }


export default function AnimatedTaskList({ tasks, editingTaskId, resetKey, empty, scrollRoot, scrollInset = 0 }: {
  tasks: Task[]; editingTaskId: string | null; resetKey: string; empty?: ReactNode;
  scrollRoot?: HTMLElement | null; scrollInset?: number;
}) {
  const reduced = useReducedMotion();
  const scale = useSettingsStore(state => normalizeFontScale(state.settings.fontScale)) / 100;
  const rowHeight = Math.ceil(ROW * Math.max(1, scale));
  const [editingHeight, setEditingHeight] = useState(INITIAL_EDITOR_HEIGHT);
  const [entries, setEntries] = useState<Entry[]>(() => tasks.map(task => ({ task })));
  const currentEntries = useRef(entries); currentEntries.current = entries;
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const external = scrollRoot !== undefined;
  const viewport = external ? scrollRoot : container;
  const listOffset = useRef(0);
  const [height, setHeight] = useState(0);
  const measuredHeight = useRef(0);
  const [, redrawRange] = useState(0);
  const scroll = useRef(0);
  const lastRange = useRef({ start: -1, end: -1 });
  const previousReset = useRef(resetKey);
  const latestTasks = useRef(tasks); latestTasks.current = tasks;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const previousTops = useRef(new Map<string, number>());
  const animations = useRef(new Map<string, Animation>());
  const finishExit = useCallback((id: string) => {
    clearTimeout(timers.current.get(id)); timers.current.delete(id);
    setEntries(items => {
      const pending = items.filter(item => item.leaving && timers.current.has(item.task.id));
      const pendingIds = new Set(pending.map(item => item.task.id));
      const next = latestTasks.current.filter(task => !pendingIds.has(task.id)).map(task => ({ task } as Entry));
      items.forEach((item, index) => { if (pendingIds.has(item.task.id)) next.splice(Math.min(index, next.length), 0, item); });
      return next;
    });
  }, []);

  useLayoutEffect(() => {
    const reset = previousReset.current !== resetKey;
    previousReset.current = resetKey;
    if (reset) {
      scroll.current = 0;
      if (viewport) viewport.scrollTop = external ? Math.min(viewport.scrollTop, Math.max(0, listOffset.current - scrollInset)) : 0;
    }
    const old = currentEntries.current;
    const oldById = new Map(old.map(entry => [entry.task.id, entry]));
    const nextById = new Map(tasks.map(task => [task.id, task]));
    const nextKeys = new Set(tasks.map(task => task.id));
    const oldKeys = new Set(old.map(entry => entry.task.id));
    const changed = old.filter(entry => !nextKeys.has(entry.task.id)).length + tasks.filter(task => !oldKeys.has(task.id) || (task.completed && oldById.get(task.id)?.task.completed === false)).length;
    if (reset || reduced || changed > MAX_ANIMATED_CHANGES) {
      timers.current.forEach(clearTimeout); timers.current.clear();
      setEntries(tasks.map(task => ({ task })));
      return;
    }
    const next: Entry[] = tasks.map(task => ({ task }));
    for (const [index, entry] of old.entries()) {
      const id = entry.task.id;
      const updated = nextById.get(id);
      const completing = updated?.completed && (!entry.task.completed || (entry.leaving && timers.current.has(id)));
      if (nextKeys.has(id) && !completing) {
        clearTimeout(timers.current.get(id)); timers.current.delete(id);
        continue;
      }
      const duplicate = next.findIndex(item => item.task.id === id);
      if (duplicate >= 0) next.splice(duplicate, 1);
      next.splice(Math.min(index, next.length), 0, { task: updated ?? useTaskStore.getState().tasks?.find(task => task.id === id) ?? entry.task, leaving: true });
      // animationend owns normal removal. Allow a frame of scheduling slack in the fallback.
      if (!timers.current.has(id)) timers.current.set(id, setTimeout(() => finishExit(id), MOTION.taskExit + 40));
    }
    setEntries(next);
  }, [tasks, resetKey, reduced, container, viewport, external, scrollInset, finishExit]);

  const editingIndex = entries.findIndex(entry => entry.task.id === editingTaskId);
  const range = taskWindow(entries.length, editingIndex, scroll.current, height, rowHeight, Math.max(rowHeight, editingHeight));
  lastRange.current = range;
  const metrics = useRef({ count: entries.length, editingIndex, rowHeight, editingHeight });
  metrics.current = { count: entries.length, editingIndex, rowHeight, editingHeight };
  useLayoutEffect(() => {
    if (!container || !viewport) return;
    const syncScroll = (resized = false) => {
      const nextScroll = Math.max(0, viewport.scrollTop - listOffset.current);
      if (Math.abs(nextScroll - scroll.current) > 1) previousTops.current.clear();
      scroll.current = nextScroll;
      const m = metrics.current;
      const next = taskWindow(m.count, m.editingIndex, scroll.current, measuredHeight.current, m.rowHeight, Math.max(m.rowHeight, m.editingHeight));
      if (next.start !== lastRange.current.start || next.end !== lastRange.current.end) {
        lastRange.current = next;
        if (!resized) redrawRange(value => value + 1);
      }
    };
    const measure = () => {
      listOffset.current = external ? Math.max(0, container.getBoundingClientRect().top - viewport.getBoundingClientRect().top + viewport.scrollTop - viewport.clientTop) : 0;
      const resized = measuredHeight.current !== viewport.clientHeight;
      if (resized) { measuredHeight.current = viewport.clientHeight; setHeight(viewport.clientHeight); }
      syncScroll(resized);
    };
    const onScroll = () => syncScroll();
    measure();
    viewport.addEventListener('scroll', onScroll, { passive: true });
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(viewport);
    if (external) {
      observer?.observe(container);
      if (container.parentElement && container.parentElement !== viewport) observer?.observe(container.parentElement);
    }
    return () => { viewport.removeEventListener('scroll', onScroll); observer?.disconnect(); };
  }, [container, viewport, external]);
  useLayoutEffect(() => {
    if (!container || !editingTaskId) return;
    const target = Array.from(container.querySelectorAll<HTMLElement>('[data-task-row]')).find(node => node.dataset.taskRow === editingTaskId);
    if (!target) return;
    const measure = () => {
      const measured = Math.ceil(target.getBoundingClientRect().height);
      if (measured > 0) setEditingHeight(measured);
    };
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(target);
    return () => observer?.disconnect();
  }, [container, editingTaskId, range.start, range.end]);
  useLayoutEffect(() => {
    if (!container) return;
    const nextTops = new Map<string, number>();
    container.querySelectorAll<HTMLElement>('[data-task-row]').forEach(row => {
      const id = row.dataset.taskRow!;
      const currentTop = row.getBoundingClientRect().top;
      const oldTop = previousTops.current.get(id);
      animations.current.get(id)?.cancel(); animations.current.delete(id);
      nextTops.set(id, currentTop);
      if (!reduced && oldTop !== undefined && Math.abs(oldTop - currentTop) > 1 && !row.inert) {
        const animation = row.animate?.([{ transform: `translateY(${oldTop - currentTop}px)` }, { transform: 'translateY(0)' }],
          { duration: MOTION.list, easing: 'cubic-bezier(.2,.8,.2,1)' });
        if (animation) animations.current.set(id, animation);
      }
    });
    animations.current.forEach((animation, id) => {
      if (!nextTops.has(id)) { animation.cancel(); animations.current.delete(id); }
    });
    previousTops.current = nextTops;
  }, [entries, container, reduced, editingTaskId]);

  useEffect(() => {
    const pending = timers.current, running = animations.current;
    return () => { pending.forEach(clearTimeout); running.forEach(animation => animation.cancel()); };
  }, []);

  return <div ref={setContainer} className={`home-task-list ${external ? 'home-task-list--page' : 'flex-grow min-h-0 overflow-y-auto'}`} aria-label="待办列表">
    {entries.length === 0 ? empty : <div style={{ height: range.total, position: 'relative' }}>
      <div className="absolute left-0 right-0" style={{ transform: `translateY(${range.offset}px)` }}>
        {entries.slice(range.start, range.end).map(({ task, leaving }) => <div key={task.id}
          ref={node => { if (node) node.inert = Boolean(leaving); }} data-task-row={task.id} aria-hidden={leaving || undefined}
          className={`home-task-row ${task.id === editingTaskId ? 'is-editing' : ''} ${leaving ? 'is-leaving' : ''}`}
          onAnimationEnd={event => { if (leaving && event.animationName === 'ui-task-exit' && (event.target as Element).classList.contains('task-card')) finishExit(task.id); }}
          style={{ height: task.id === editingTaskId ? undefined : rowHeight, '--task-exit-distance': `${Math.max(viewport?.clientWidth ?? 0, container?.clientWidth ?? 0, 400) + 24}px` } as CSSProperties}><TaskItem task={task} /></div>)}
      </div>
    </div>}
  </div>;
}
