import { useEffect, useRef, useState } from 'react';
import { Plus, Search, X, ListTodo } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import { useShallow } from 'zustand/react/shallow';

import AnimatedTaskList from '../components/AnimatedTaskList';
import { Overlay } from '../ui/Overlay';
import TaskStats from '../components/TaskStats';
import TaskFilter from '../components/TaskFilter';
import QuickAddTask from '../components/QuickAddTask';
import UsageButton from '../components/UsageButton';
import HomeContextHeader from '../components/HomeContextHeader';

export default function Home() {
  const {
    filteredTasks,
    loading,
    filter,
    searchQuery,
    loadTasks,
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
      editingTaskId: state.editingTaskId,
      sortConfig: state.sortConfig,
      statsBarCollapsed: state.statsBarCollapsed,
      setStatsBarCollapsed: state.setStatsBarCollapsed,
    }))
  );

  const theme = useSettingsStore(state => state.settings.theme);
  const completedCount = useTaskStore(state => state.stats.completed);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const newTaskButton = useRef<HTMLButtonElement>(null);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const taskListResetKey = `${filter}\u0000${searchQuery}\u0000${sortConfig.field}\u0000${sortConfig.order}`;

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

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
        if (completedCount > 0) return '当前待办已清空，完成记录可在“已完成”中查看';
        return theme === 'light' ? '暂无待办，点击添加新待办' : '还没有待办哦，要不要添加一个？';
    }
  };

  return (
    <div ref={setScrollRoot} className="home-page h-full min-h-0 overflow-y-auto bg-transparent text-foreground" role="region" aria-label="待办页面">
      <div className="home-page-content workspace-page">
      <HomeContextHeader />
      <section className="home-overview" aria-label="任务与使用概览">
        <TaskStats collapsed={statsBarCollapsed} onCollapsedChange={setStatsBarCollapsed} />
        <UsageButton />
      </section>

      {/* Search and Add Task Row */}
      <div className="home-toolbar flex-shrink-0 flex gap-2">
        <div className="home-search flex-1 relative">
          <Search className="home-search-icon absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
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
              className="home-search-clear absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
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
      <AnimatedTaskList tasks={filteredTasks} editingTaskId={editingTaskId} resetKey={taskListResetKey} scrollRoot={scrollRoot} scrollInset={42}
        empty={loading ? <div className="home-loading" role="status">正在载入待办…</div> : (
        <div className="home-empty">
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
                {completedCount > 0 ? '继续添加待办' : theme === 'light' ? '创建第一个待办' : '开始添加待办吧'}
              </button>
            )}
          </div>
        </div>
      )} />
      </div>

      <Overlay open={showQuickAdd} label="新建待办" onClose={() => setShowQuickAdd(false)} returnFocus={newTaskButton}>
        <QuickAddTask onClose={() => setShowQuickAdd(false)} />
      </Overlay>
    </div>
  );
}
