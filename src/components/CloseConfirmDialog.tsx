import React from 'react';
import { Power, X } from 'lucide-react';
import { useDialogMotion } from '../ui/useDialogMotion';
import { Surface } from '../ui/Surface';
import { useDraggableDialog } from '../ui/useDraggableDialog';

interface CloseConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CloseConfirmDialog({ isOpen, onConfirm, onCancel }: CloseConfirmDialogProps) {
  const { root, present } = useDialogMotion(isOpen);
  const drag = useDraggableDialog(present);
  if (!present) return null;

  return (
    <div ref={root} className="close-dialog-overlay liquid-glass-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Surface role="dialog" elementRef={drag.surface}
        htmlRole="alertdialog"
        aria-modal="true"
        aria-labelledby="close-app-title"
        aria-describedby="close-app-description"
        className="close-dialog liquid-glass-modal-surface bg-background border border-border rounded-lg shadow-lg p-6 w-80 mx-4"
      >
        {/* Header */}
        <div {...drag.handle} aria-label="拖动关闭弹窗" className="dialog-drag-handle close-dialog-header flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="close-dialog-icon w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
              <Power className="w-4 h-4 text-destructive" />
            </div>
            <h3 id="close-app-title" className="text-lg font-semibold text-foreground">关闭应用</h3>
          </div>
          <button
            onClick={onCancel}
            aria-label="取消关闭应用"
            className="close-dialog-dismiss p-1 rounded-full hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div id="close-app-description" className="close-dialog-body mb-6">
          <p className="text-sm text-muted-foreground">
            确定要关闭 <span className="font-medium text-foreground">事半·SemiDone</span> 应用程序吗？
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            应用将完全退出，所有数据已自动保存。
          </p>
        </div>

        {/* Actions */}
        <div className="close-dialog-footer flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-lg transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-lg transition-colors flex items-center space-x-1"
          >
            <Power className="w-4 h-4" />
            <span>关闭应用</span>
          </button>
        </div>
      </Surface>
    </div>
  );
}
