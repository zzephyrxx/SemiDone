import React, { useState, useRef, useEffect } from 'react';
import { Plus, X, Calendar, Flag, Type, AlignLeft, Paperclip, Repeat } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import { useSettingsStore } from '../store/settingsStore';
import type { Priority, CreateTaskRequest, Attachment, RecurrenceRule, RecurrenceType } from '../types';
import { DAY_NAMES } from '../types';
import { toast } from 'sonner';

// 辅助函数：获取循环规则的显示文本
const getRecurrenceText = (recurrence: RecurrenceRule): string => {
  const unitText = recurrence.type === 'day' ? '天' : recurrence.type === 'week' ? '周' : '月';

  if (recurrence.type === 'week' && recurrence.daysOfWeek && recurrence.daysOfWeek.length > 0) {
    const daysText = recurrence.daysOfWeek.map(d => DAY_NAMES[d]).join('、');
    return `每${recurrence.interval}${unitText} ${daysText}重复`;
  }

  if (recurrence.type === 'month' && recurrence.daysOfMonth && recurrence.daysOfMonth.length > 0) {
    const daysText = recurrence.daysOfMonth.map(d => `${d}号`).join('、');
    return `每${recurrence.interval}月 ${daysText}重复`;
  }

  return `每${recurrence.interval}${unitText}重复`;
};

interface QuickAddTaskProps {
  onClose: () => void;
}

export default function QuickAddTask({ onClose }: QuickAddTaskProps) {
  const { loadTasks } = useTaskStore();
  const { settings } = useSettingsStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [attachmentFiles, setAttachmentFiles] = useState<File[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDueDate, setTempDueDate] = useState('');
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);
  const [showRecurrence, setShowRecurrence] = useState(false);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleInputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      titleInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      // 第一步：先创建任务（不带附件）
      const request: CreateTaskRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        priority,
        dueDate: dueDate || undefined,
        attachments: undefined, // 先不传附件
        recurrence,
      };

      // 直接调用 API 获取返回的任务
      const { api } = await import('../api/tauri');
      const response = await api.tasks.createTask(request);

      if (!response.success || !response.data) {
        toast.error(response.error || '创建任务失败');
        setIsSubmitting(false);
        return;
      }

      const taskId = response.data.id;

      // 第二步：如果有附件，保存附件并更新任务
      if (attachmentFiles.length > 0) {
        const updatedAttachments: Attachment[] = [];

        for (const file of attachmentFiles) {
          // 读取文件为 base64
          const base64 = await readFileAsBase64(file);
          const attachmentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

          // 保存附件到文件系统
          const saveResponse = await api.attachment.saveAttachment(taskId, attachmentId, file.name, base64);

          if (saveResponse.success && saveResponse.data) {
            updatedAttachments.push({
              id: attachmentId,
              name: file.name,
              size: file.size,
              type: file.type || 'application/octet-stream',
              path: saveResponse.data,
              createdAt: new Date().toISOString(),
            });
          } else {
            console.warn('附件保存失败:', saveResponse.error);
          }
        }

        // 更新任务的附件
        if (updatedAttachments.length > 0) {
          await api.tasks.updateTask(taskId, { attachments: updatedAttachments });
        }
      }

      // 刷新任务列表
      await loadTasks();

      // 重置表单
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setShowAdvanced(false);
      setAttachmentFiles([]);
      setRecurrence(undefined);
      setShowDatePicker(false);
      setTempDueDate('');

      toast.success('待办创建成功');
      onClose();
    } catch (error) {
      console.error('Create task error:', error);
      toast.error('创建任务失败');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSubmit(e as any);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const getPriorityColor = (p: Priority) => {
    switch (p) {
      case 'high':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50 text-yellow-700';
      case 'low':
        return 'border-green-200 bg-green-50 text-green-700';
      default:
        return 'border-gray-200 bg-gray-50 text-gray-700';
    }
  };

  const getPriorityLabel = (p: Priority) => {
    switch (p) {
      case 'high':
        return '高优先级';
      case 'medium':
        return '中优先级';
      case 'low':
        return '低优先级';
      default:
        return '中优先级';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-card border border-border rounded-lg shadow-lg p-6 quick-add-card max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
            <Plus className="w-4 h-4 text-primary-foreground" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            {settings.theme === 'light' ? '新建待办' : '添加待办'}
          </h2>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
        {/* 待办标题 */}
        <div className="mb-4">
          <div className="relative">
            <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              ref={titleInputRef}
              type="text"
              placeholder={settings.theme === 'light' ? '输入待办标题...' : '今天要做什么呢？'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground"
              maxLength={100}
            />
          </div>
          <div className="mt-1 text-xs text-muted-foreground text-right">
            {title.length}/100
          </div>
        </div>

        {/* 高级选项切换 */}
        <div className="mb-4">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-primary hover:text-primary/80 transition-colors"
          >
            {showAdvanced ? '隐藏高级选项' : '显示高级选项'}
          </button>
        </div>

        {/* 高级选项 */}
        {showAdvanced && (
          <div className="space-y-4 mb-4">
            {/* 待办描述 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <AlignLeft className="inline w-4 h-4 mr-1" />
                描述
              </label>
              <textarea
                placeholder="添加待办描述..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground placeholder-muted-foreground resize-none"
                rows={2}
                maxLength={500}
              />
              <div className="mt-1 text-xs text-muted-foreground text-right">
                {description.length}/500
              </div>
            </div>

            {/* 优先级 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Flag className="inline w-4 h-4 mr-1" />
                优先级
              </label>
              <div className="flex space-x-2">
                {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriority(p)}
                    className={`
                      flex-1 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                      ${priority === p
                        ? getPriorityColor(p)
                        : 'border-border bg-background text-muted-foreground hover:bg-muted'
                      }
                    `}
                  >
                    {getPriorityLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            {/* 截止日期 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                截止日期
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setTempDueDate(dueDate);
                    setShowDatePicker(!showDatePicker);
                  }}
                  className="w-full px-3 py-2 text-left bg-background border border-border rounded-lg hover:bg-muted transition-colors text-foreground"
                >
                  {dueDate ? new Date(dueDate).toLocaleString('zh-CN', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : '设置截止日期'}
                </button>
                
                {showDatePicker && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => {
                      setTempDueDate(dueDate);
                      setShowDatePicker(false);
                    }} />
                    <div className="absolute top-full left-0 mt-1 p-4 bg-card border border-border rounded-lg shadow-xl z-[9999] min-w-[320px]">
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
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                            min={new Date().toISOString().split('T')[0]}
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
                            className="w-full px-3 py-2 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                          />
                        </div>
                        
                        {/* 确认按钮 */}
                        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                          <button 
                            type="button" 
                            onClick={() => {
                              setTempDueDate(dueDate);
                              setShowDatePicker(false);
                            }} 
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            取消
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              setTempDueDate('');
                              setDueDate('');
                              setShowDatePicker(false);
                            }} 
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            清除
                          </button>
                          <button 
                            type="button" 
                            onClick={() => {
                              setDueDate(tempDueDate);
                              setShowDatePicker(false);
                            }} 
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
            </div>

            {/* 附件上传 - 使用原生input收集File对象，保存时再存储 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Paperclip className="inline w-4 h-4 mr-1" />
                附件
              </label>
              <div className="space-y-3">
                {/* 上传区域 */}
                <div
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = 'copy'; }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const files = Array.from(e.dataTransfer.files);
                    if (files.length > 0) {
                      setAttachmentFiles(prev => [...prev, ...files]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border hover:border-primary hover:bg-muted/50 rounded-lg p-4 text-center cursor-pointer transition-colors"
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setAttachmentFiles(prev => [...prev, ...files]);
                      }
                      // 重置input以允许重复选择同一文件
                      e.target.value = '';
                    }}
                    className="hidden"
                  />
                  <Paperclip className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">
                    点击、拖拽或粘贴文件，最多50MB
                  </div>
                </div>

                {/* 已选文件列表 */}
                {attachmentFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-sm font-medium text-foreground">
                      已添加附件 ({attachmentFiles.length})
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {attachmentFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          className="flex items-center space-x-3 p-2 bg-muted rounded-lg group hover:bg-muted/80 transition-colors"
                        >
                          <div className="w-10 h-10 rounded bg-background flex items-center justify-center flex-shrink-0">
                            <Paperclip className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground truncate">
                              {file.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {formatFileSize(file.size)}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAttachmentFiles(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 周期重复 */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                <Repeat className="inline w-4 h-4 mr-1" />
                重复
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowRecurrence(!showRecurrence)}
                  className="w-full px-3 py-2 text-left bg-background border border-border rounded-lg hover:bg-muted transition-colors text-foreground text-sm"
                >
                  {recurrence ? getRecurrenceText(recurrence) : '不重复'}
                </button>

                {showRecurrence && (
                  <>
                    <div className="fixed inset-0 z-[9998]" onClick={() => setShowRecurrence(false)} />
                    <div className="absolute bottom-full right-0 mb-1 p-4 bg-card border border-border rounded-lg shadow-xl z-[9999] min-w-[320px]">
                      <div className="space-y-4">
                        <div className="text-sm font-medium text-foreground">设置重复周期</div>

                        {/* 周期类型选择 */}
                        <div className="flex space-x-2">
                          {(['day', 'week', 'month'] as RecurrenceType[]).map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => {
                                const newRec: RecurrenceRule = { type, interval: 1 };
                                if (type === 'week') {
                                  newRec.daysOfWeek = [1];
                                } else if (type === 'month') {
                                  newRec.daysOfMonth = [1];
                                }
                                setRecurrence(newRec);
                              }}
                              className={`flex-1 px-2 py-1.5 rounded-md border text-xs font-medium transition-colors ${
                                recurrence?.type === type
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-border bg-background text-muted-foreground hover:bg-muted'
                              }`}
                            >
                              {type === 'day' ? '天' : type === 'week' ? '周' : '月'}
                            </button>
                          ))}
                        </div>

                        {/* 间隔选择 */}
                        {recurrence && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">
                              {recurrence.type === 'day' ? '每隔' : recurrence.type === 'week' ? '每几周' : '每几月'}
                            </label>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-muted-foreground">每</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={recurrence.interval}
                                onChange={(e) => setRecurrence({ ...recurrence, interval: parseInt(e.target.value) || 1 })}
                                className="w-16 px-2 py-1 text-sm bg-background border border-border rounded focus:outline-none focus:ring-2 focus:ring-primary"
                              />
                              <span className="text-sm text-muted-foreground">
                                {recurrence.type === 'day' ? '天' : recurrence.type === 'week' ? '周' : '月'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* 按周重复：选择周几 */}
                        {recurrence?.type === 'week' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-1">选择周几</label>
                            <div className="flex flex-wrap gap-1">
                              {DAY_NAMES.map((name, index) => (
                                <button
                                  key={index}
                                  type="button"
                                  onClick={() => {
                                    const currentDays = recurrence.daysOfWeek || [];
                                    const newDays = currentDays.includes(index)
                                      ? currentDays.filter(d => d !== index)
                                      : [...currentDays, index];
                                    if (newDays.length > 0) {
                                      setRecurrence({ ...recurrence, daysOfWeek: newDays.sort((a, b) => a - b) });
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-md border text-xs font-medium transition-colors ${
                                    recurrence.daysOfWeek?.includes(index)
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

                        {/* 按月重复：选择日期网格 */}
                        {recurrence?.type === 'month' && (
                          <div>
                            <label className="block text-xs text-muted-foreground mb-2">选择日期（可多选）</label>
                            <div className="grid grid-cols-7 gap-1 p-3 bg-background border border-border rounded-lg">
                              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                                <button
                                  key={day}
                                  type="button"
                                  onClick={() => {
                                    const currentDays = recurrence.daysOfMonth || [];
                                    const newDays = currentDays.includes(day)
                                      ? currentDays.filter(d => d !== day)
                                      : [...currentDays, day].sort((a, b) => a - b);
                                    if (newDays.length > 0) {
                                      setRecurrence({ ...recurrence, daysOfMonth: newDays });
                                    }
                                  }}
                                  className={`w-8 h-8 rounded-md border text-xs font-medium transition-colors ${
                                    recurrence.daysOfMonth?.includes(day)
                                      ? 'border-primary bg-primary/10 text-primary'
                                      : 'border-border bg-background text-muted-foreground hover:bg-muted'
                                  }`}
                                >
                                  {day}
                                </button>
                              ))}
                            </div>
                            {recurrence.daysOfMonth && recurrence.daysOfMonth.length > 0 && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                已选择：每月 {recurrence.daysOfMonth.map(d => `${d}号`).join('、')} 重复
                              </div>
                            )}
                          </div>
                        )}

                        {/* 确认按钮 */}
                        <div className="flex justify-end space-x-2 pt-2 border-t border-border">
                          <button
                            type="button"
                            onClick={() => { setRecurrence(undefined); setShowRecurrence(false); }}
                            className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                          >
                            清除
                          </button>
                          <button
                            type="button"
                            onClick={() => setShowRecurrence(false)}
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
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <div className="text-xs text-muted-foreground">
            按 Ctrl+Enter 快速创建
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              取消
            </button>
            
            <button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="px-6 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                  <span>创建中...</span>
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  <span>创建待办</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}