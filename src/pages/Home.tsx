import { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, Search, X, ListTodo } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

import type { Task } from '../types';
import TaskItem from '../components/TaskItem';
import TaskStats from '../components/TaskStats';
import TaskFilter from '../components/TaskFilter';
import QuickAddTask from '../components/QuickAddTask';
import CelebrationAnimation from '../components/CelebrationAnimation';
import UsageButton from '../components/UsageButton';

const VIRTUAL_ROW_HEIGHT = 104;
const EDITING_ROW_HEIGHT = 300;
const VIRTUAL_OVERSCAN = 6;

interface VirtualizedTaskListProps {
  tasks: Task[];
  editingTaskId: string | null;
  resetKey: string;
}

function VirtualizedTaskList({ tasks, editingTaskId, resetKey }: VirtualizedTaskListProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    if (!container) return;

    const updateContainerHeight = () => {
      setContainerHeight(container.clientHeight);
    };

    updateContainerHeight();

    const resizeObserver = new ResizeObserver(() => {
      updateContainerHeight();
    });

    resizeObserver.observe(container);
    window.addEventListener('resize', updateContainerHeight);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateContainerHeight);
    };
  }, [container]);

  useEffect(() => {
    if (container) {
      container.scrollTop = 0;
    }
    setScrollTop(0);
  }, [container, resetKey]);

  const editingIndex = editingTaskId ? tasks.findIndex((task) => task.id === editingTaskId) : -1;
  const extraEditingHeight = editingIndex >= 0 ? EDITING_ROW_HEIGHT - VIRTUAL_ROW_HEIGHT : 0;
  const totalHeight = tasks.length * VIRTUAL_ROW_HEIGHT + extraEditingHeight;
  const indexAtOffset = (offset: number) => {
    if (editingIndex < 0 || offset < editingIndex * VIRTUAL_ROW_HEIGHT) return Math.floor(offset / VIRTUAL_ROW_HEIGHT);
    if (offset < editingIndex * VIRTUAL_ROW_HEIGHT + EDITING_ROW_HEIGHT) return editingIndex;
    return Math.floor((offset - extraEditingHeight) / VIRTUAL_ROW_HEIGHT);
  };
  const startIndex = Math.max(0, Math.min(tasks.length - 1, indexAtOffset(scrollTop)) - VIRTUAL_OVERSCAN);
  const endIndex = Math.min(tasks.length, indexAtOffset(scrollTop + containerHeight) + VIRTUAL_OVERSCAN + 1);
  const visibleTasks = tasks.slice(startIndex, endIndex);
  const offsetY = startIndex * VIRTUAL_ROW_HEIGHT + (editingIndex >= 0 && editingIndex < startIndex ? extraEditingHeight : 0);

  return (
    <div
      ref={setContainer}
      className="home-task-list flex-grow min-h-0 overflow-y-auto"
      aria-label="待办列表"
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div
          className="absolute left-0 right-0"
          style={{ transform: `translateY(${offsetY}px)` }}
        >
          {visibleTasks.map((task) => {
            const isEditing = task.id === editingTaskId;

            return (
              <div
                key={task.id}
                className={`home-task-row ${isEditing ? 'is-editing' : ''}`}
                style={{ height: isEditing ? EDITING_ROW_HEIGHT : VIRTUAL_ROW_HEIGHT }}
              >
                <TaskItem task={task} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const {
    filteredTasks,
    loading,
    filter,
    searchQuery,
    loadTasks,
    celebration,
    hideCelebration,
    editingTaskId,
    sortConfig,
    statsBarCollapsed,
    setStatsBarCollapsed
  } = useTaskStore(
    useShallow((state) => ({
      filteredTasks: state.filteredTasks,
      loading: state.loading,
      filter: state.filter,
      searchQuery: state.searchQuery,
      loadTasks: state.loadTasks,
      celebration: state.celebration,
      hideCelebration: state.hideCelebration,
      editingTaskId: state.editingTaskId,
      sortConfig: state.sortConfig,
      statsBarCollapsed: state.statsBarCollapsed,
      setStatsBarCollapsed: state.setStatsBarCollapsed,
    }))
  );

  const { settings } = useSettingsStore();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const quickAddDialog = useRef<HTMLDivElement>(null);
  const newTaskButton = useRef<HTMLButtonElement>(null);
  const restoreNewTaskFocus = useCallback(() => newTaskButton.current?.focus(), []);
  const taskListResetKey = `${filter}\u0000${searchQuery}\u0000${sortConfig.field}\u0000${sortConfig.order}`;

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    if (!showQuickAdd) return;
    const handleDialogKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowQuickAdd(false);
      if (event.key !== 'Tab') return;
      const controls = Array.from(quickAddDialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href]') ?? [])
        .filter(control => !control.closest('[hidden], .hidden') && control.tabIndex !== -1);
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleDialogKey);
    return () => {
      document.removeEventListener('keydown', handleDialogKey);
      restoreNewTaskFocus();
    };
  }, [showQuickAdd, restoreNewTaskFocus]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const getEmptyStateMessage = () => {
    if (searchQuery) {
      return `没有找到包含 "${searchQuery}" 的待办`;
    }
    
    switch (filter) {
      case 'completed':
        return '还没有完成的待办';
      case 'pending':
        return '没有待完成的待办';
      case 'overdue':
        return '没有逾期的待办';
      case 'today':
        return '今天没有到期的待办';
      default:
        return settings.theme === 'light' ? '暂无待办，点击添加新待办' : '还没有待办哦，要不要添加一个？';
    }
  };

  return (
    <div className="home-page flex flex-col h-full min-h-0 bg-transparent text-foreground">
      <header className="page-heading">
        <div><p className="page-eyebrow">{new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())}</p>
          <h1>我的待办</h1></div>
        <span className="page-heading-icon" aria-hidden="true"><ListTodo size={22} strokeWidth={1.7} /></span>
      </header>
      <section className="home-overview" aria-label="任务与使用概览">
        <TaskStats collapsed={statsBarCollapsed} onCollapsedChange={setStatsBarCollapsed} />
        <UsageButton />
      </section>

      {/* Search and Add Task Row */}
      <div className="home-toolbar flex-shrink-0 flex gap-2">
        <div className="home-search flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="搜索待办…"
            aria-label="搜索待办"
            value={searchQuery}
            onChange={(e) => useTaskStore.getState().setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary text-foreground placeholder-muted-foreground text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => useTaskStore.getState().setSearchQuery('')}
              aria-label="清除搜索"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </div>
        <button
          ref={newTaskButton}
          onClick={() => setShowQuickAdd(true)}
          className="home-add-button px-3 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors flex items-center gap-1.5 text-sm font-medium flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>新建待办</span>
        </button>
      </div>

      {/* Filters */}
      <div className="home-filters flex-shrink-0">
        <TaskFilter />
      </div>

      {/* Task List */}
      {filteredTasks.length === 0 ? (
        <div className="home-empty flex-grow overflow-y-auto">
          <div className="text-center py-8">
            <div className="home-empty-icon" aria-hidden="true"><ListTodo size={28} strokeWidth={1.5} /></div>
            <p className="text-muted-foreground mb-3">
              {getEmptyStateMessage()}
            </p>
            {!searchQuery && filter === 'all' && (
              <button
                onClick={() => setShowQuickAdd(true)}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors shadow-sm text-sm"
              >
                {settings.theme === 'light' ? '创建第一个待办' : '开始添加待办吧'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <VirtualizedTaskList
          tasks={filteredTasks}
          editingTaskId={editingTaskId}
          resetKey={taskListResetKey}
        />
      )}

      {/* 快速添加待办弹窗 */}
      {showQuickAdd && (
        <div className="liquid-glass-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div
            ref={quickAddDialog}
            role="dialog"
            aria-modal="true"
            aria-label="新建待办"
            className="liquid-glass-modal-shell w-full max-w-lg"
          >
            <QuickAddTask onClose={() => setShowQuickAdd(false)} />
          </div>
        </div>
      )}

      {/* 庆祝动画 */}
      <CelebrationAnimation 
        show={celebration.show}
        message={celebration.message}
        onComplete={hideCelebration}
        isAllComplete={celebration.isAllComplete}
      />

    </div>
  );
}
