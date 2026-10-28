import { useEffect, useMemo, useRef, useState } from 'react';
import { Palette, Pin, PinOff, X } from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { useSettingsStore } from '../store/settingsStore';
import { getFilteredTasks, useTaskStore } from '../store/taskStore';
import type { Task } from '../types';
import { zenModeStyle, normalizeZenModeSettings } from '../utils/zenModeSettings';
import { startWindowDragging } from '../utils/windowDragging';
import ZenModeAppearance from './settings/ZenModeAppearance';
import ZenIcon from './icons/ZenIcon';
import { MOTION, useReducedMotion } from '../ui/motion';
import { Surface } from '../ui/Surface';

interface Props { onClose: () => void }
interface Completion { task: Task; index: number; phase: 'saving' | 'exiting'; saved: boolean }

export default function ZenMode({ onClose }: Props) {
  const { settings, setZenMode, toggleIsPinned } = useSettingsStore();
  const reducedMotion = useReducedMotion();
  const appearance = normalizeZenModeSettings(settings.zenMode);
  const { tasks, sortConfig, loading, loadTasks, toggleTaskComplete, hideCelebration } = useTaskStore(
    useShallow((state) => ({
      tasks: state.tasks, sortConfig: state.sortConfig, loading: state.loading,
      loadTasks: state.loadTasks, toggleTaskComplete: state.toggleTaskComplete,
      hideCelebration: state.hideCelebration,
    })),
  );
  const [showAppearance, setShowAppearance] = useState(false);
  const [completion, setCompletion] = useState<Completion | null>(null);
  const completing = useRef(false);
  const appearanceButton = useRef<HTMLButtonElement>(null);
  const pendingTasks = useMemo(() => getFilteredTasks(tasks, 'pending', '', sortConfig), [tasks, sortConfig]);
  const displayedTasks = useMemo(() => {
    if (!completion || pendingTasks.some((task) => task.id === completion.task.id)) return pendingTasks;
    // Keep the saved row in place until its strike-through and exit animation finish.
    const rows = [...pendingTasks];
    rows.splice(Math.min(completion.index, rows.length), 0, completion.task);
    return rows;
  }, [pendingTasks, completion]);

  useEffect(() => { void loadTasks(); }, [loadTasks]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || document.querySelector('[aria-modal="true"]')) return;
      if (showAppearance) {
        setShowAppearance(false);
        appearanceButton.current?.focus();
      } else { void setZenMode({ active: false }); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setZenMode, showAppearance]);

  const finishCompletion = () => {
    setCompletion(null);
    completing.current = false;
  };
  useEffect(() => {
    if (completion?.phase !== 'saving') return;
    // Finish a full turn before showing success, even when persistence is instant.
    const timer = window.setInterval(() => {
      setCompletion((current) => current?.phase === 'saving' && current.saved
        ? { ...current, phase: 'exiting' } : current);
    }, MOTION.zenSaving);
    return () => window.clearInterval(timer);
  }, [completion?.phase]);
  useEffect(() => {
    if (completion?.phase !== 'exiting') return;
    // Keep a completion pause even when interface animation is disabled.
    const timer = window.setTimeout(() => {
      setCompletion(null);
      completing.current = false;
    }, reducedMotion ? MOTION.zenReducedFallback : MOTION.zenExitFallback);
    return () => window.clearTimeout(timer);
  }, [completion, reducedMotion]);

  const completeTask = async (task: Task, index: number) => {
    if (completing.current) return;
    completing.current = true;
    setCompletion({ task, index, phase: 'saving', saved: false });
    try {
      await toggleTaskComplete(task.id);
      // A failed save leaves the row intact, with no completion animation.
      if (useTaskStore.getState().tasks.find((item) => item.id === task.id)?.completed) {
        setCompletion((current) => current ? { ...current, saved: true } : null);
      } else { finishCompletion(); }
    } catch (error) {
      console.error('Complete Zen task failed:', error);
      finishCompletion();
    } finally {
      hideCelebration();
    }
  };

  return (
    <div className="zen-mode" style={zenModeStyle(appearance)}>
      <header className="zen-toolbar" onMouseDown={startWindowDragging}>
        <span className="zen-drag-label">SemiDone Zen</span>
        <div className="zen-toolbar-actions">
          <button type="button" ref={appearanceButton} title="Zen 模式配置" aria-label="Zen 模式配置"
            aria-expanded={showAppearance} aria-controls="zen-appearance-panel"
            onClick={() => setShowAppearance((show) => !show)}><Palette size={15} /></button>
          <button type="button" className="zen-icon-only" title={settings.isPinned ? '取消置顶' : '置顶窗口'}
            aria-label={settings.isPinned ? '取消置顶' : '置顶窗口'} aria-pressed={settings.isPinned}
            onClick={() => void toggleIsPinned()}>{settings.isPinned ? <Pin size={15} /> : <PinOff size={15} />}</button>
          <button type="button" className="zen-icon-only" title="退出 Zen 模式（Esc）" aria-label="返回完整模式" aria-pressed={true}
            onClick={() => void setZenMode({ active: false })}><ZenIcon variant="off" size={20} /></button>
          <button type="button" title="关闭应用" aria-label="关闭应用" onClick={onClose}><X size={15} /></button>
        </div>
      </header>
      {showAppearance && (
        <Surface role="dialog" htmlRole="region" id="zen-appearance-panel" aria-label="Zen 模式配置" className="zen-appearance-panel">
          <div className="zen-appearance-heading"><h2>Zen 模式配置</h2>
            <button type="button" aria-label="收起配置" onClick={() => {
              setShowAppearance(false);
              appearanceButton.current?.focus();
            }}><X size={16} /></button>
          </div>
          <ZenModeAppearance settings={appearance} onChange={(updates) => void setZenMode(updates)} />
        </Surface>
      )}
      <main className="zen-task-list" aria-label="未完成待办" aria-busy={loading}>
        {loading ? <p className="zen-empty" role="status">正在加载待办…</p>
          : displayedTasks.length === 0 ? <p className="zen-empty" role="status">没有未完成的待办</p>
          : <ul>
            {displayedTasks.map((task, index) => {
              const current = completion?.task.id === task.id ? completion : null;
              return (
                <li key={task.id} className={`zen-task-row${current?.phase === 'exiting' ? ' is-exiting' : ''}`}
                  onAnimationEnd={(event) => {
                    if (event.target === event.currentTarget && current?.phase === 'exiting') finishCompletion();
                  }}>
                  <div className="zen-task-content">
                    <span className={`zen-task-toggle${current ? ` is-${current.phase}` : ''}`}>
                      <input type="checkbox" checked={current?.phase === 'exiting'} disabled={completion !== null}
                        aria-label={`完成：${task.title}`} aria-busy={current?.phase === 'saving'}
                        onChange={() => void completeTask(task, index)} />
                      <svg viewBox="0 0 20 20" aria-hidden="true" fill="none" stroke="currentColor"
                        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        {!current ? <rect x="1.5" y="1.5" width="17" height="17" rx="4" /> : <>
                          <circle className="zen-task-progress" cx="10" cy="10" r="8" />
                          <path className="zen-task-check" d="m5.5 10 3 3 6-6" pathLength="1" />
                        </>}
                      </svg>
                      {current && <span className="sr-only" role="status">
                        {current.phase === 'saving' ? '正在完成任务' : '任务已完成'}
                      </span>}
                    </span>
                    <span className="zen-task-title">{task.title}</span>
                  </div>
                </li>
              );
            })}
          </ul>}
      </main>
    </div>
  );
}
