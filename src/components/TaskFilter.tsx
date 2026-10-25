import { useState, useRef, useEffect } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import type { TaskFilter as TaskFilterType, SortField } from '../types';

export default function TaskFilter() {
  const { filter, searchQuery, setFilter, stats, filteredTasks, sortConfig, setSortConfig } = useTaskStore();
  const [showSortMenu, setShowSortMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部关闭菜单
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowSortMenu(false);
      }
    };

    if (showSortMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showSortMenu]);

  const filterOptions: { value: TaskFilterType; label: string }[] = [
    { value: 'all', label: '全部' },
    { value: 'pending', label: '待完成' },
    { value: 'today', label: '今日到期' },
    { value: 'overdue', label: '已逾期' },
    { value: 'completed', label: '已完成' },
  ];

  const sortOptions: { field: SortField; label: string }[] = [
    { field: 'dueDate', label: '截止时间' },
    { field: 'priority', label: '优先级' },
    { field: 'createdAt', label: '创建时间' },
    { field: 'updatedAt', label: '更新时间' },
  ];

  const getSortLabel = (field: SortField): string => {
    return sortOptions.find(opt => opt.field === field)?.label || '';
  };

  const getSortIcon = (field: SortField) => {
    if (sortConfig.field !== field) {
      return <ArrowUpDown className="w-3 h-3" />;
    }
    return sortConfig.order === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
  };

  const handleSortChange = (field: SortField) => {
    if (sortConfig.field === field) {
      // 如果点击的是当前字段，切换方向
      setSortConfig({ field, order: sortConfig.order === 'asc' ? 'desc' : 'asc' });
    } else {
      // 如果点击的是新字段，默认降序
      setSortConfig({ field, order: 'desc' });
    }
    setShowSortMenu(false);
  };

  const getFilterButtonClass = (filterValue: TaskFilterType) => {
    const isActive = filter === filterValue;
    const baseClass = "task-filter-tab flex items-center px-2.5 py-2 rounded-xl text-xs font-medium transition-colors";

    if (isActive) {
      return `${baseClass} is-active bg-primary/10 text-primary`;
    }

    return `${baseClass} text-muted-foreground hover:text-foreground hover:bg-muted`;
  };

  const currentFilterLabel = filterOptions.find(opt => opt.value === filter)?.label || '全部';
  const currentFilterCount = filter === 'all' ? (stats.total || 0) : filteredTasks.length;

  return (
    <div className="task-filter space-y-2">
      {/* 筛选按钮行 */}
      <div className="task-filter-tabs flex gap-1" role="group" aria-label="筛选待办">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            aria-pressed={filter === option.value}
            className={getFilterButtonClass(option.value)}
          >
            <span className="flex items-center">
              <span className="ml-1.5">{option.label}</span>
            </span>
          </button>
        ))}
      </div>

      {/* 搜索结果提示 */}
      {searchQuery && (
        <div className="text-sm text-muted-foreground">
          搜索 "{searchQuery}" 的结果
        </div>
      )}

      {/* 筛选结果统计 + 排序 */}
      <div className="task-filter-summary flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          {filter === 'all' ? (
            <>全部 · {stats.total || 0} 个待办</>
          ) : (
            <>{currentFilterLabel} · {currentFilterCount} 个待办</>
          )}
        </div>

        {/* 排序按钮 */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowSortMenu(!showSortMenu)}
            aria-expanded={showSortMenu}
            className="flex items-center space-x-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all duration-200 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>排序</span>
            <span className="text-primary">
              {getSortLabel(sortConfig.field)}
            </span>
            {getSortIcon(sortConfig.field)}
          </button>

          {/* 排序下拉菜单 */}
          {showSortMenu && (
            <div className="absolute top-full right-0 mt-1 p-2 bg-background border border-border rounded-lg shadow-xl z-[9999] min-w-[160px]">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">排序方式</div>
              {sortOptions.map((option) => (
                <button
                  key={option.field}
                  onClick={() => handleSortChange(option.field)}
                  className={`
                    w-full flex items-center justify-between px-2 py-1.5 rounded text-xs transition-colors
                    ${sortConfig.field === option.field
                      ? 'bg-primary/10 text-primary'
                      : 'text-foreground hover:bg-muted'
                    }
                  `}
                >
                  <span>{option.label}</span>
                  {getSortIcon(option.field)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
