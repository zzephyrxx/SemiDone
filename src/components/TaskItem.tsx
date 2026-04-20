import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isYesterday, parseISO, formatDistanceToNow, isAfter, isBefore, startOfDay } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import {
  Calendar,
  Clock,
  Edit3,
  Trash2,
  Save,
  X,
  Flag,
  CheckCircle2,
  Circle,
  AlertTriangle,
  Type,
  FileText,
  Repeat
} from 'lucide-react';
import type { Task, Priority, UpdateTaskRequest } from '../types';
import { useTaskStore } from '../store/taskStore';
import DeleteConfirmDialog from './DeleteConfirmDialog';
import { useShallow } from 'zustand/react/shallow';

interface TaskItemProps {
  task: Task;
}

const TaskItem = React.memo(function TaskItem({ task }: TaskItemProps) {
  const navigate = useNavigate();
  const { toggleTaskComplete, deleteTask, updateTask, editingTaskId, setEditingTaskId } = useTaskStore(
    useShallow((state) => ({
      toggleTaskComplete: state.toggleTaskComplete,
      deleteTask: state.deleteTask,
      updateTask: state.updateTask,
      editingTaskId: state.editingTaskId,
      setEditingTaskId: state.setEditingTaskId,
    }))
  );
  const [isHovered, setIsHovered] = useState(false);
  const isEditing = editingTaskId === task.id;
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState<Priority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [tempDueDate, setTempDueDate] = useState(task.dueDate || '');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const datePickerBtnRef = useRef<HTMLButtonElement>(null);
  const [datePickerPos, setDatePickerPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const updateDatePickerPos = useCallback(() => {
    if (datePickerBtnRef.current) {
      const rect = datePickerBtnRef.current.getBoundingClientRect();
      const popupHeight = 240;
      const viewportHeight = window.innerHeight;

      if (rect.bottom + 4 + popupHeight > viewportHeight) {
        // 底部空间不足，弹窗翻到按钮上方
        setDatePickerPos({ top: Math.max(4, rect.top - popupHeight - 4), left: rect.left });
      } else {
        setDatePickerPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
  }, []);

  // 滚动时实时更新弹窗位置
  useEffect(() => {
    if (!showDatePicker) return;
    const handleScroll = () => updateDatePickerPos();
    window.addEventListener('scroll', handleScroll, true);
    return () => window.removeEventListener('scroll', handleScroll, true);
  }, [showDatePicker, updateDatePickerPos]);

  // Reset editing state when this task is no longer being edited
  useEffect(() => {
    if (!isEditing) {
      setShowDatePicker(false);
      setEditTitle(task.title);
      setEditDescription(task.description || '');
      setEditPriority(task.priority);
      setEditDueDate(task.dueDate || '');
      setTempDueDate(task.dueDate || '');
    }
  }, [isEditing, task.title, task.description, task.priority, task.dueDate]);

  const handleToggleComplete = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleTaskComplete(task.id);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Close any other editing task and start editing this one
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || '');
    setTempDueDate(task.dueDate || '');
    setShowDatePicker(false);
  };

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!editTitle.trim()) return;

    setIsSaving(true);
    const request: UpdateTaskRequest = {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priority: editPriority,
      dueDate: editDueDate || undefined,
    };

    try {
      await updateTask(task.id, request);
      setEditingTaskId(null);
    } catch (error) {
      console.error('Update task error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTaskId(null);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || '');
    setTempDueDate(task.dueDate || '');
    setShowDatePicker(false);
  };

  const handleDateConfirm = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditDueDate(tempDueDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = (e: React.MouseEvent) => {
    e.stopPropagation();
    setTempDueDate(editDueDate);
    setShowDatePicker(false);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await deleteTask(task.id);
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Delete task error:', error);
      setShowDeleteDialog(false);
    }
  };

  const isOverdue = !task.completed && task.dueDate && isBefore(new Date(task.dueDate), startOfDay(new Date()));
  const isDueToday = task.dueDate && !task.completed &&
    startOfDay(new Date(task.dueDate)).getTime() === startOfDay(new Date()).getTime();

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-500';
      case 'medium':
        return 'text-yellow-500';
      case 'low':
        return 'text-green-500';
      default:
        return 'text-gray-500';
    }
  };

  const getPriorityBg = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-red-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const getPriorityLabel = (priority: Priority) => {
    switch (priority) {
      case 'high':
        return '高';
      case 'medium':
        return '中';
      case 'low':
        return '低';
      default:
        return '中';
    }
  };

  const formatDueDate = (dueDate: string | undefined) => {
    if (!dueDate) return '未设置';
    try {
      const date = new Date(dueDate);
      if (isNaN(date.getTime())) return '日期格式错误';
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: zhCN
      }).replace('大约', '约');
    } catch {
      return '日期格式错误';
    }
  };

  return (
    <div
      className={`
        group relative p-2 rounded-lg border transition-all duration-200 cursor-pointer task-card
        ${task.completed
          ? 'bg-gradient-to-r from-emerald-50/80 to-green-50/80 border-emerald-200/60 shadow-inner completed'
          : isOverdue
            ? 'bg-red-50 border-red-200 hover:bg-red-100'
            : isDueToday
              ? 'bg-blue-50 border-blue-200 hover:bg-blue-100'
              : 'bg-card border-border hover:bg-accent hover:border-accent-foreground/20'
        }
        ${isHovered ? 'shadow-lg' : 'shadow-sm'}
        ${showDatePicker ? 'z-[9998]' : 'z-auto'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={(e) => {
        // 防止点击按钮时触发卡片点击
        if ((e.target as HTMLElement).closest('button')) {
          return;
        }
        // 清除快速编辑状态后再导航
        if (editingTaskId === task.id) {
          setEditingTaskId(null);
        }
        // Navigate to task detail page
        navigate(`/task/${task.id}`);
      }}
      title="点击查看详情"
    >
      <div className="flex items-start space-x-3">
        {/* 完成状态按钮 */}
        <button
          onClick={handleToggleComplete}
          className={`
            flex-shrink-0 transition-all duration-200 pt-1
            ${task.completed
              ? 'text-emerald-600 hover:text-emerald-700'
              : 'text-muted-foreground hover:text-primary'
            }
          `}
        >
          {task.completed ? (
            <div className="relative">
              <CheckCircle2 className="w-7 h-7 filter drop-shadow-sm" />
              <div className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          ) : (
            <Circle className="w-7 h-7" />
          )}
        </button>

        {/* 待办内容 */}
        <div className="flex-1 min-w-0">
          {isEditing ? (
            /* 编辑模式 */
            <div className="flex flex-col h-full">
              <div className="flex-grow space-y-3">
                {/* 标题编辑 */}
                <div className="relative">
                  <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-base font-medium bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="待办标题"
                    maxLength={100}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* 描述编辑 */}
                <div className="relative">
                  <FileText className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    placeholder="待办描述"
                    rows={2}
                    maxLength={500}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                {/* 优先级和日期编辑 */}
                <div className="flex flex-wrap items-center gap-4">
                  {/* 优先级选择 */}
                  <div className="flex items-center space-x-2">
                    <Flag className="w-4 h-4 text-muted-foreground" />
                    <div className="flex space-x-1">
                      {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditPriority(p);
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${editPriority === p ? getPriorityBg(p) + ' ' + getPriorityColor(p) : 'border-border bg-background text-muted-foreground hover:bg-muted'}`}
                        >
                          {getPriorityLabel(p)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 日期选择 */}
                  <div className="relative">
                    <button
                      ref={datePickerBtnRef}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!showDatePicker) updateDatePickerPos();
                        setShowDatePicker(!showDatePicker);
                      }}
                      className="px-2 py-1 text-xs bg-background border border-border rounded hover:bg-muted transition-colors flex items-center space-x-1"
                    >
                      <Calendar className="w-3 h-3" />
                      <span>{editDueDate ? new Date(editDueDate).toLocaleDateString() : '设置截止日期'}</span>
                    </button>

                    {showDatePicker && createPortal(
                      <>
                        <div className="fixed inset-0 z-[9998]" onClick={(e) => { e.stopPropagation(); handleDateCancel(e); }} />
                        <div
                          className="fixed p-4 bg-background border border-border rounded-lg shadow-xl z-[9999] min-w-[190px]"
                          style={{ top: datePickerPos.top, left: datePickerPos.left }}
                        >
                          <div className="space-y-4">
                            <div className="text-sm font-medium text-foreground">选择截止日期</div>
                            
                            {/* 日期选择 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">日期</label>
                              <input
                                type="date"
                                value={tempDueDate ? tempDueDate.split('T')[0] : ''}
                                onChange={(e) => {
                                  const dateValue = e.target.value;
                                  const timeValue = tempDueDate ? tempDueDate.split('T')[1] || '09:00' : '09:00';
                                  setTempDueDate(dateValue ? `${dateValue}T${timeValue}` : '');
                                }}
                                className="w-full px-2 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                min={new Date().toISOString().split('T')[0]}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            {/* 时间选择 */}
                            <div>
                              <label className="block text-xs text-muted-foreground mb-1">时间</label>
                              <input
                                type="time"
                                value={tempDueDate ? tempDueDate.split('T')[1] || '09:00' : '09:00'}
                                onChange={(e) => {
                                  const timeValue = e.target.value;
                                  const dateValue = tempDueDate ? tempDueDate.split('T')[0] : new Date().toISOString().split('T')[0];
                                  setTempDueDate(`${dateValue}T${timeValue}`);
                                }}
                                className="w-full px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            {/* 确认按钮 */}
                            <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                              <button 
                                type="button" 
                                onClick={handleDateCancel} 
                                className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                              >
                                取消
                              </button>
                              <button 
                                type="button" 
                                onClick={handleDateConfirm} 
                                className="px-3 py-1.5 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded transition-colors font-medium"
                              >
                                确定
                              </button>
                            </div>
                          </div>
                        </div>
                      </>,
                      document.body
                    )}
                  </div>
                </div>
              </div>

              {/* 编辑操作按钮 */}
              <div className="flex justify-end items-center space-x-1 pt-2">
                <button onClick={handleCancel} className="p-2 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" title="取消编辑">
                  <X className="w-4 h-4" />
                </button>
                <button onClick={handleSave} disabled={!editTitle.trim() || isSaving} className="p-2 rounded text-muted-foreground hover:text-green-600 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="保存更改">
                  {isSaving ? <div className="w-4 h-4 border-2 border-muted-foreground/30 border-t-muted-foreground rounded-full animate-spin"></div> : <Save className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            /* 显示模式 */
            <div className="flex flex-col justify-between min-h-[4.5rem]">
              {/* 上半部分: 标题和右侧信息 */}
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h3
                    className={`
                      text-base font-medium leading-6 transition-all duration-200
                      whitespace-nowrap overflow-hidden text-ellipsis mt-1
                      ${task.completed
                        ? 'line-through text-emerald-700/80 decoration-emerald-400 decoration-2'
                        : 'text-foreground'
                      }
                    `}>
                    {task.title}
                  </h3>
                </div>

                {/* 右侧信息区域 */}
                <div className="ml-4 flex-shrink-0 flex items-center space-x-2">
                  {/* 完成状态指示器 */}
                  {task.completed && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 shadow-sm">
                      ✓ 已完成
                    </span>
                  )}

                  {/* 优先级标识 */}
                  {!task.completed && task.priority && (
                    <div className={`
                      flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium border transition-all duration-200
                      ${getPriorityBg(task.priority)}
                    `}>
                      <Flag className={`w-4 h-4 ${getPriorityColor(task.priority)}`} />
                      <span className={getPriorityColor(task.priority)}>
                        {getPriorityLabel(task.priority)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* 下半部分: 底部信息 */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                  {/* 截止日期 */}
                  {task.dueDate && (
                    <div className={`
                      flex items-center space-x-1
                      ${isOverdue
                        ? 'text-red-500'
                        : isDueToday
                          ? 'text-blue-500'
                          : 'text-muted-foreground'
                      }
                    `}>
                      {isOverdue ? (
                        <AlertTriangle className="w-3 h-3" />
                      ) : (
                        <Calendar className="w-3 h-3" />
                      )}
                      <span>截止：{formatDueDate(task.dueDate)}</span>
                    </div>
                  )}

                  {/* 循环任务标识 */}
                  {task.recurrence && (
                    <div className="flex items-center space-x-1 text-purple-500" title="周期任务">
                      <Repeat className="w-3 h-3" />
                      <span>{task.recurrence.type === 'day' ? '日重复' : task.recurrence.type === 'week' ? '周重复' : '月重复'}</span>
                    </div>
                  )}

                  {/* 创建时间 */}
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>创建于 {formatDueDate(task.createdAt)}</span>
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className={`
                  flex items-center space-x-1 transition-opacity duration-200
                  ${isHovered ? 'opacity-100' : 'opacity-0'}
                `}>
                  <button
                    onClick={handleEdit}
                    className="p-2 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    title="编辑待办"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(e);
                    }}
                    className="p-2 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="删除待办"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>


      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showDeleteDialog}
        task={task}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
});

export default TaskItem;