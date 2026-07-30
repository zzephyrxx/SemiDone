import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Calendar, Flag, Type, AlignLeft, Clock, CheckCircle, Circle, Repeat, Clock12 } from 'lucide-react';
import { useTaskStore } from '../store/taskStore';
import DeleteConfirmDialog from '../components/DeleteConfirmDialog';
import RecurrenceEditor from '../components/RecurrenceEditor';
import TaskAttachmentsSection from '../components/TaskAttachmentsSection';
import type { Priority, UpdateTaskRequest, Attachment, RecurrenceRule } from '../types';
import { api } from '../api/tauri';
import { formatRecurrenceText } from '../utils/recurrence';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tasks, updateTask, deleteTask, toggleTaskComplete } = useTaskStore();

  const [task, setTask] = useState(() => tasks.find(t => t.id === id));
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDueDate, setTempDueDate] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [originalAttachments, setOriginalAttachments] = useState<Attachment[]>([]); // 编辑前的附件列表
  const [newlyAddedAttachments, setNewlyAddedAttachments] = useState<Attachment[]>([]); // 编辑时新上传的附件
  const [recurrence, setRecurrence] = useState<RecurrenceRule | undefined>(undefined);
  const [imagePreviews, setImagePreviews] = useState<Record<string, string>>({}); // 预加载的图片预览

  // 预加载所有图片附件
  useEffect(() => {
    const loadAllPreviews = async () => {
      if (!task?.attachments || task.attachments.length === 0) return;

      const imageAttachments = task.attachments.filter(a => a.type.startsWith('image/'));
      if (imageAttachments.length === 0) return;

      const previewPromises = imageAttachments.map(async (att) => {
        if (att.path) {
          try {
            const response = await api.attachment.getAttachmentAsBase64(att.path);
            if (response.success && response.data) {
              const url = `data:${att.type};base64,${response.data}`;
              return [att.id, url] as [string, string];
            }
          } catch (err) {
            console.warn('[TaskDetail] 加载预览失败:', att.name, err);
          }
        }
        // 降级：使用 data 字段
        if (att.data) {
          const url = `data:${att.type};base64,${att.data}`;
          return [att.id, url] as [string, string];
        }
        return [att.id, ''] as [string, string];
      });

      const results = await Promise.all(previewPromises);
      const previewMap = Object.fromEntries(results.filter(([, v]) => v !== ''));
      setImagePreviews(previewMap);
    };

    loadAllPreviews();
  }, [task?.attachments]);

  useEffect(() => {
    const foundTask = tasks.find(t => t.id === id);
    if (foundTask) {
      setTask(foundTask);
      setTitle(foundTask.title);
      setDescription(foundTask.description || '');
      setPriority(foundTask.priority);
      setDueDate(foundTask.dueDate || '');
      setTempDueDate(foundTask.dueDate || '');
      setAttachments(foundTask.attachments || []);
      setRecurrence(foundTask.recurrence);
    } else if (id) {
      // 待办不存在，返回首页
      navigate('/');
    }
  }, [id, tasks, navigate]);

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <div className="text-lg text-muted-foreground mb-4">待办不存在</div>
          <button
            onClick={() => navigate('/')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }

    setIsSaving(true);

    console.log('[TaskDetail] handleSave - originalAttachments:', originalAttachments.length);
    console.log('[TaskDetail] handleSave - attachments (current):', attachments.length);

    // 找出被删除的附件（原来有，现在没有了）
    const currentAttachmentIds = new Set(attachments.map(a => a.id));
    const deletedAttachments = originalAttachments.filter(a => !currentAttachmentIds.has(a.id));
    console.log('[TaskDetail] handleSave - deletedAttachments:', deletedAttachments.length, deletedAttachments.map(a => a.name));

    // 删除被移除的附件文件
    for (const att of deletedAttachments) {
      if (att.path) {
        try {
          const { api } = await import('../api/tauri');
          console.log('[TaskDetail] handleSave - deleting file:', att.path);
          const response = await api.attachment.deleteAttachment(att.path);
          if (response.success) {
            console.log('[TaskDetail] 已删除附件文件:', att.path);
          } else {
            console.warn('[TaskDetail] 删除附件文件失败:', response.error);
          }
        } catch (e) {
          console.warn('[TaskDetail] 删除附件异常:', e);
        }
      } else {
        console.log('[TaskDetail] 删除附件无 path，跳过文件删除:', att.name);
      }
    }

    const request: UpdateTaskRequest = {
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      dueDate: dueDate || undefined,
      attachments: attachments, // 始终传递，即使是空数组也会清空附件
      recurrence,
    };

    console.log('[TaskDetail] handleSave - request.attachments:', request.attachments?.length);

    try {
      await updateTask(task.id, request);
      setIsEditing(false);
      // 清空原始附件列表和新上传列表
      setOriginalAttachments([]);
      setNewlyAddedAttachments([]);
    } catch (error) {
      console.error('Update task error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setShowDeleteDialog(false);
    
    try {
      await deleteTask(task.id);
      navigate('/');
    } catch (error) {
      console.error('Delete task error:', error);
      setIsDeleting(false);
    }
  };

  const handleToggleComplete = async () => {
    try {
      await toggleTaskComplete(task.id);
    } catch (error) {
      console.error('Toggle task complete error:', error);
    }
  };

  const handleDateConfirm = () => {
    setDueDate(tempDueDate);
    setShowDatePicker(false);
  };

  const handleDateCancel = () => {
    setTempDueDate(dueDate);
    setShowDatePicker(false);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return `已逾期 ${Math.abs(diffDays)} 天`;
    } else if (diffDays === 0) {
      return '今天到期';
    } else if (diffDays === 1) {
      return '明天到期';
    } else {
      return `${diffDays} 天后到期`;
    }
  };

  const getDateColor = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return 'text-red-600';
    } else if (diffDays === 0) {
      return 'text-orange-600';
    } else {
      return 'text-muted-foreground';
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* 头部导航 */}
      <div className="flex items-center justify-between mb-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>返回</span>
        </button>
        
        <div className="flex items-center space-x-3">
          {isEditing ? (
            <>
              <button
                onClick={async () => {
                  // 删除编辑时新上传的附件
                  for (const att of newlyAddedAttachments) {
                    if (att.path) {
                      try {
                        const { api } = await import('../api/tauri');
                        await api.attachment.deleteAttachment(att.path);
                        console.log('[TaskDetail] 取消编辑，删除新上传的文件:', att.path);
                      } catch (e) {
                        console.warn('[TaskDetail] 删除新上传文件失败:', e);
                      }
                    }
                  }
                  setIsEditing(false);
                  // 重置表单
                  setTitle(task.title);
                  setDescription(task.description || '');
                  setPriority(task.priority);
                  setDueDate(task.dueDate || '');
                  setTempDueDate(task.dueDate || '');
                  setShowDatePicker(false);
                  setAttachments(task.attachments || []);
                  setOriginalAttachments([]); // 清空原始附件列表
                  setNewlyAddedAttachments([]); // 清空新上传列表
                  setRecurrence(task.recurrence);
                }}
                className="px-4 py-2 text-muted-foreground hover:text-foreground transition-colors"
              >
                取消
              </button>
              
              <button
                onClick={handleSave}
                disabled={!title.trim() || isSaving}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    <span>保存中...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>保存</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => {
                  // 保存编辑前的附件列表
                  setOriginalAttachments(task.attachments || []);
                  setIsEditing(true);
                }}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                编辑
              </button>
              
              <button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {isDeleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    <span>删除中...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>删除</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* 待办详情：两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 左侧主内容区域 */}
        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6 space-y-6">
          {/* 待办标题 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <Type className="w-4 h-4 mr-2" />
              待办标题
            </label>
            {isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-xl font-semibold"
                placeholder="输入待办标题..."
                maxLength={100}
              />
            ) : (
              <h1 className={`text-xl font-semibold ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {task.title}
              </h1>
            )}
          </div>

          {/* 待办描述 */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
              <AlignLeft className="w-4 h-4 mr-2" />
              待办描述
            </label>
            {isEditing ? (
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground resize-none"
                placeholder="添加待办描述..."
                rows={3}
                maxLength={500}
              />
            ) : (
              <div className="text-foreground whitespace-pre-wrap min-h-[6rem]">
                {task.description || (
                  <span className="text-muted-foreground italic">暂无描述</span>
                )}
              </div>
            )}
          </div>

          <TaskAttachmentsSection
            taskId={task.id}
            taskAttachments={task.attachments ?? []}
            editingAttachments={attachments}
            imagePreviews={imagePreviews}
            isEditing={isEditing}
            onAttachmentsChange={setAttachments}
            onFilesAdded={(newFiles) => {
              console.log('[TaskDetail] 新上传的附件:', newFiles.map(file => file.path || file.name));
              setNewlyAddedAttachments(previous => [...previous, ...newFiles]);
            }}
          />
        </div>

        {/* 右侧侧边栏 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 详情模块 */}
          <div className="bg-card border border-border rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">详情</h3>
            
            {/* 优先级 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-foreground">
                <Flag className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>优先级</span>
              </div>
              {isEditing ? (
                <div className="flex space-x-1 w-3/5">
                  {(['high', 'medium', 'low'] as Priority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`flex-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${priority === p ? getPriorityColor(p) : 'border-border bg-background text-muted-foreground hover:bg-muted'}`}>
                      {getPriorityLabel(p)}
                    </button>
                  ))}
                </div>
              ) : (
                <div className={`inline-flex px-3 py-1 rounded-full border text-sm font-medium ${getPriorityColor(task.priority)}`}>
                  {getPriorityLabel(task.priority)}
                </div>
              )}
            </div>

            {/* 截止日期 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-foreground">
                <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>截止日期</span>
              </div>
              {isEditing ? (
                <div className="relative w-3/5">
                  <button
                    type="button"
                    onClick={() => setShowDatePicker(!showDatePicker)}
                    className="w-full px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-muted transition-colors text-left"
                  >
                    {dueDate ? (() => {
                      const date = new Date(dueDate);
                      return isNaN(date.getTime()) ? '设置日期' : date.toLocaleString();
                    })() : '设置日期'}
                  </button>
                  
                  {showDatePicker && (
                    <>
                      <div className="fixed inset-0 z-[9998]" onClick={handleDateCancel} />
                      <div className="absolute bottom-full right-0 mb-1 p-4 bg-background border border-border rounded-lg shadow-xl z-[9999] min-w-[320px]">
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
                              onClick={handleDateCancel} 
                              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            >
                              取消
                            </button>
                            <button 
                              type="button" 
                              onClick={() => { setTempDueDate(''); setDueDate(''); setShowDatePicker(false); }} 
                              className="px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded transition-colors"
                            >
                              清除
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
                    </>
                  )}
                </div>
              ) : (
                <div className="text-right">
                  {task.dueDate ? (
                    <div className="space-y-0.5">
                      <div className="text-sm font-medium text-foreground">{new Date(task.dueDate).toLocaleDateString()}</div>
                      {!task.completed && (
                        <div className={`text-sm ${getDateColor(task.dueDate)}`}>
                          {formatDate(task.dueDate)}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">未设置</span>
                  )}
                </div>
              )}
            </div>

            {/* 循环设置 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-foreground">
                <Repeat className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>重复</span>
              </div>
              {isEditing ? (
                <div className="w-3/5">
                  <RecurrenceEditor
                    value={recurrence}
                    onChange={setRecurrence}
                    buttonClassName="w-full px-2 py-1 text-xs bg-background border border-border rounded-md hover:bg-muted transition-colors text-left"
                    popoverClassName="bg-background"
                  />
                </div>
              ) : (
                <div className="text-right">
                  {task.recurrence ? (
                    <span className="text-sm font-medium text-primary">
                      {formatRecurrenceText(task.recurrence)}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground italic">不重复</span>
                  )}
                </div>
              )}
            </div>

            {/* 创建时间 */}
            <div className="flex items-center justify-between">
              <div className="flex items-center text-sm text-foreground">
                <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                <span>创建时间</span>
              </div>
              <div className="text-sm text-muted-foreground">
                {task.createdAt ? (() => {
                  const date = new Date(task.createdAt);
                  return isNaN(date.getTime()) ? '日期格式错误' : date.toLocaleString();
                })() : '未知'}
              </div>
            </div>

            {/* 更新时间 */}
            {task.updatedAt && (
              <div className="flex items-center justify-between">
                <div className="flex items-center text-sm text-foreground">
                  <Clock12 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span>更新时间</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(() => {
                    const date = new Date(task.updatedAt);
                    return isNaN(date.getTime()) ? '日期格式错误' : date.toLocaleString();
                  })()}
                </div>
              </div>
            )}
          </div>

          {/* 状态模块 - 移到下面 */}
          <div className="bg-card border border-border rounded-lg p-4">
            <label className="block text-sm font-medium text-muted-foreground mb-3">状态</label>
            <button
              onClick={handleToggleComplete}
              className={`w-full flex items-center justify-center space-x-2 px-3 py-2 rounded-lg transition-colors font-medium text-sm ${
                task.completed 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {task.completed ? <CheckCircle className="w-4 h-4" /> : <Circle className="w-4 h-4" />}
              <span>{task.completed ? '已完成' : '标记为完成'}</span>
            </button>
          </div>
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
}
