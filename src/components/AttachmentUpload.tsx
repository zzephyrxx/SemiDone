import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, ImageIcon, FileIcon, Clipboard } from 'lucide-react';
import type { Attachment } from '../types';
import { api } from '../api/tauri';
import { toast } from 'sonner';

interface AttachmentUploadProps {
  attachments: Attachment[];
  onChange: (attachments: Attachment[]) => void;
  onFilesAdded?: (attachments: Attachment[]) => void; // 新上传的文件回调
  taskId?: string; // 用于文件存储路径
  maxSize?: number; // 单文件最大字节数，默认10MB
  totalMaxSize?: number; // 总附件最大字节数，默认50MB
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_TOTAL_MAX_SIZE = 50 * 1024 * 1024; // 50MB

export default function AttachmentUpload({
  attachments,
  onChange,
  onFilesAdded,
  taskId = 'temp',
  maxSize = DEFAULT_MAX_SIZE,
  totalMaxSize = DEFAULT_TOTAL_MAX_SIZE
}: AttachmentUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [previews, setPreviews] = useState<Record<string, string>>({});

  // 计算当前附件总大小
  const currentTotalSize = attachments.reduce((sum, att) => sum + att.size, 0);

  // 监听剪切板粘贴事件
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items || items.length === 0) return;

      const files: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file') {
          const file = item.getAsFile();
          if (file) {
            files.push(file);
          }
        }
      }

      if (files.length > 0) {
        e.preventDefault();
        await handleFiles(files);
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => {
      document.removeEventListener('paste', handlePaste);
    };
  }, [attachments, taskId]);

  // 加载预览图
  useEffect(() => {
    const loadPreviews = async () => {
      for (const att of attachments) {
        if (att.id && !previews[att.id]) {
          // 有 Base64 数据则直接使用（旧数据或降级存储）
          if (att.data) {
            const blobUrl = `data:${att.type};base64,${att.data}`;
            setPreviews(prev => ({ ...prev, [att.id]: blobUrl }));
          }
          // 文件路径的预览通过 API 加载 base64
          if (att.path && att.type.startsWith('image/')) {
            try {
              const response = await api.attachment.getAttachmentAsBase64(att.path);
              if (response.success && response.data) {
                const url = `data:${att.type};base64,${response.data}`;
                setPreviews(prev => ({ ...prev, [att.id]: url }));
              }
            } catch (err) {
              console.warn('[AttachmentUpload] 加载预览失败:', att.name, err);
            }
          }
        }
      }
    };
    loadPreviews();
  }, [attachments]);

  const handleFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;

    const newAttachments: Attachment[] = [];

    // 检查总大小限制
    const totalSizeAfterAdd = currentTotalSize + files.reduce((sum, f) => sum + f.size, 0);
    if (totalSizeAfterAdd > totalMaxSize) {
      toast.error(`总附件大小不能超过 ${totalMaxSize / (1024 * 1024)}MB`);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // 检查单个文件大小
      if (file.size > maxSize) {
        toast.error(`文件 "${file.name}" 超过 ${maxSize / (1024 * 1024)}MB 限制`);
        continue;
      }

      // 检查添加后总大小是否超过限制
      const potentialTotal = currentTotalSize + newAttachments.reduce((sum, a) => sum + a.size, 0) + file.size;
      if (potentialTotal > totalMaxSize) {
        toast.error(`总附件大小不能超过 ${totalMaxSize / (1024 * 1024)}MB`);
        break;
      }

      try {
        // Read file as base64
        const base64 = await readFileAsBase64(file);
        const attachmentId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 保存文件到文件系统
        const saveResponse = await api.attachment.saveAttachment(taskId, attachmentId, file.name, base64);

        let attachment: Attachment;
        if (saveResponse.success) {
          // 文件存储成功，只保存路径
          attachment = {
            id: attachmentId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            path: saveResponse.data,
            createdAt: new Date().toISOString(),
          };
          // 图片类型立即设置预览（base64已在内存中）
          if ((file.type || '').startsWith('image/')) {
            const previewUrl = `data:${file.type};base64,${base64}`;
            setPreviews(prev => ({ ...prev, [attachmentId]: previewUrl }));
          }
        } else {
          // 文件存储失败，降级为 Base64 存储（兼容性）
          console.warn('File storage failed, falling back to Base64:', saveResponse.error);
          attachment = {
            id: attachmentId,
            name: file.name,
            size: file.size,
            type: file.type || 'application/octet-stream',
            data: base64,
            createdAt: new Date().toISOString(),
          };
          // 降级存储时也设置预览
          if ((file.type || '').startsWith('image/')) {
            const previewUrl = `data:${file.type};base64,${base64}`;
            setPreviews(prev => ({ ...prev, [attachmentId]: previewUrl }));
          }
        }

        newAttachments.push(attachment);
      } catch (error) {
        console.error('Error reading file:', error);
        toast.error(`读取文件 "${file.name}" 失败`);
      }
    }

    if (newAttachments.length > 0) {
      const updatedAttachments = [...attachments, ...newAttachments];
      onChange(updatedAttachments);
      // 通知父组件有新附件上传
      if (onFilesAdded) {
        onFilesAdded(newAttachments);
      }
      toast.success(`成功添加 ${newAttachments.length} 个文件`);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get pure base64
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveAttachment = async (att: Attachment) => {
    // 不立即删除文件，只从列表中移除
    // 实际删除由父组件在保存时处理
    console.log('[Attachment] 标记附件为删除:', att.path || att.name);
    onChange(attachments.filter(a => a.id !== att.id));
    // 通知父组件这个附件需要被删除（通过 onChange 返回的列表差异）
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 设置 dropEffect 以显示正确的拖拽光标
    e.dataTransfer.dropEffect = 'copy';
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // 只有当离开整个拖拽区域时才取消高亮
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    // 获取拖拽的文件
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(Array.from(files));
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = (type: string) => type.startsWith('image/');

  const getFileIcon = (type: string) => {
    if (isImage(type)) {
      return ImageIcon;
    }
    return FileIcon;
  };

  const handleOpenFile = async (attachment: Attachment) => {
    // 优先使用文件路径打开
    if (attachment.path) {
      try {
        const response = await api.attachment.getAttachmentPath(attachment.path);
        if (response.success && response.data) {
          const openResponse = await api.attachment.openFileByPath(response.data);
          if (!openResponse.success) {
            toast.error(openResponse.error || '打开文件失败');
          }
          return;
        }
      } catch (error) {
        console.error('Error opening file:', error);
      }
    }

    // 降级：使用 Base64 数据
    if (attachment.data) {
      const { invoke } = await import('@tauri-apps/api/core');
      const response = await invoke('open_file_with_system', {
        fileName: attachment.name,
        fileData: attachment.data,
        fileType: attachment.type,
      });
      if (!(response as any).success) {
        toast.error((response as any).error || '打开文件失败');
      }
    } else {
      toast.error('无法打开文件：文件路径不存在');
    }
  };

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-4 text-center cursor-pointer
          transition-colors
          ${isDragging
            ? 'border-primary bg-primary/5'
            : 'border-border hover:border-primary hover:bg-muted/50'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={(e) => handleFiles(Array.from(e.target.files || []))}
          className="hidden"
        />

        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
        <div className="text-sm text-foreground mb-1">
          点击、拖拽或粘贴文件到此处上传
        </div>
        <div className="text-xs text-muted-foreground space-y-1">
          <div>支持任意文件类型，单文件不超过 {maxSize / (1024 * 1024)}MB</div>
          <div>总附件大小不超过 {totalMaxSize / (1024 * 1024)}MB，当前已用 {formatFileSize(currentTotalSize)}</div>
          <div className="flex items-center justify-center gap-1 mt-1">
            <Clipboard className="w-3 h-3" />
            <span>也可以直接 Ctrl+V 粘贴</span>
          </div>
        </div>
      </div>

      {/* Attachment List */}
      {attachments.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-foreground">
            已添加附件 ({attachments.length})
          </div>

          <div className="grid grid-cols-1 gap-2">
            {attachments.map((attachment) => {
              const FileIconComponent = getFileIcon(attachment.type);
              const previewUrl = previews[attachment.id];
              return (
                <div
                  key={attachment.id}
                  className="flex items-center space-x-3 p-2 bg-muted rounded-lg group hover:bg-muted/80 transition-colors"
                >
                  {/* File Preview */}
                  <div className="flex-shrink-0">
                    <div
                      className="w-12 h-12 rounded overflow-hidden bg-background cursor-pointer flex items-center justify-center"
                      onClick={() => handleOpenFile(attachment)}
                    >
                      {isImage(attachment.type) && previewUrl ? (
                        <img
                          src={previewUrl}
                          alt={attachment.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileIconComponent className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                  </div>

                  {/* File Info */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleOpenFile(attachment)}
                  >
                    <div className="text-sm font-medium text-foreground truncate">
                      {attachment.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatFileSize(attachment.size)}
                      {attachment.path && <span className="ml-1 text-green-500">✓ 已存储</span>}
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAttachment(attachment);
                    }}
                    className="flex-shrink-0 p-1 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
