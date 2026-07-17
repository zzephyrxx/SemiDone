import { FolderOpen, Paperclip } from 'lucide-react';
import { toast } from 'sonner';
import { api, isDesktopRuntime } from '../api/tauri';
import type { Attachment } from '../types';
import AttachmentUpload from './AttachmentUpload';

interface TaskAttachmentsSectionProps {
  taskId: string;
  taskAttachments: Attachment[];
  editingAttachments: Attachment[];
  imagePreviews: Record<string, string>;
  isEditing: boolean;
  onAttachmentsChange: (attachments: Attachment[]) => void;
  onFilesAdded: (attachments: Attachment[]) => void;
}

function AttachmentPreview({ attachment, previewUrl }: {
  attachment: Attachment;
  previewUrl?: string;
}) {
  if (attachment.type.startsWith('image/') && previewUrl) {
    return (
      <div className="w-12 h-12 rounded overflow-hidden bg-background flex-shrink-0">
        <img src={previewUrl} alt={attachment.name} className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
      <Paperclip className="w-5 h-5 text-muted-foreground" />
    </div>
  );
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

async function openAttachment(attachment: Attachment): Promise<void> {
  if (attachment.path) {
    const pathResponse = await api.attachment.getAttachmentPath(attachment.path);
    if (!pathResponse.success || !pathResponse.data) {
      toast.error(pathResponse.error || '获取文件路径失败');
      return;
    }
    const openResponse = await api.attachment.openFileByPath(pathResponse.data);
    if (!openResponse.success) toast.error(openResponse.error || '打开文件失败');
    return;
  }

  const fileData = attachment.data;
  if (!fileData) {
    toast.error('无法打开文件：文件路径不存在');
    return;
  }

  if (isDesktopRuntime) {
    const response = await api.attachment.openFileWithSystem(
      attachment.name,
      fileData,
      attachment.type,
    );
    if (!response.success) toast.error(response.error || '打开文件失败');
    return;
  }

  const byteCharacters = atob(fileData);
  const byteNumbers = Array.from(byteCharacters, (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([new Uint8Array(byteNumbers)], { type: attachment.type }));
  window.open(url, '_blank');
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

async function openAttachmentFolder(attachment: Attachment): Promise<void> {
  if (!attachment.path) {
    toast.error('无法打开文件夹：文件路径不存在');
    return;
  }

  const pathResponse = await api.attachment.getAttachmentPath(attachment.path);
  if (!pathResponse.success || !pathResponse.data) {
    toast.error(pathResponse.error || '获取文件路径失败');
    return;
  }

  const fullPath = pathResponse.data;
  const separatorIndex = Math.max(fullPath.lastIndexOf('\\'), fullPath.lastIndexOf('/'));
  const folderPath = separatorIndex > 0 ? fullPath.substring(0, separatorIndex) : fullPath;
  const response = await api.attachment.openFolderInExplorer(folderPath);
  if (!response.success) toast.error(response.error || '打开文件夹失败');
}

export default function TaskAttachmentsSection({
  taskId,
  taskAttachments,
  editingAttachments,
  imagePreviews,
  isEditing,
  onAttachmentsChange,
  onFilesAdded,
}: TaskAttachmentsSectionProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-muted-foreground mb-2 flex items-center">
        <Paperclip className="w-4 h-4 mr-2" />
        附件 {taskAttachments.length > 0 && `(${taskAttachments.length})`}
      </label>
      {isEditing ? (
        <AttachmentUpload
          attachments={editingAttachments}
          onChange={onAttachmentsChange}
          onFilesAdded={onFilesAdded}
          taskId={taskId}
        />
      ) : taskAttachments.length > 0 ? (
        <div className="grid grid-cols-1 gap-2">
          {taskAttachments.map((attachment) => (
            <div
              key={attachment.id}
              className="flex items-center space-x-3 p-2 bg-muted rounded-lg hover:bg-muted/80 transition-colors cursor-pointer group"
              onClick={() => void openAttachment(attachment).catch((error) => {
                console.error('Error opening file:', error);
                toast.error('打开文件失败');
              })}
            >
              <AttachmentPreview
                attachment={attachment}
                previewUrl={imagePreviews[attachment.id]}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-foreground truncate">{attachment.name}</div>
                <div className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                  {attachment.path && <span className="ml-1 text-green-500">✓ 已存储</span>}
                </div>
              </div>
              <button
                onClick={(event) => {
                  event.stopPropagation();
                  event.preventDefault();
                  void openAttachmentFolder(attachment).catch((error) => {
                    console.error('Error opening folder:', error);
                    toast.error('打开文件夹失败');
                  });
                }}
                className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-muted-foreground/20 rounded-lg transition-all"
                title="打开所在位置"
              >
                <FolderOpen className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-foreground whitespace-pre-wrap">
          <span className="text-muted-foreground italic">暂无附件</span>
        </div>
      )}
    </div>
  );
}
