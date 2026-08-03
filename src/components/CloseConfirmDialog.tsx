import React from 'react';
import { Power, X } from 'lucide-react';

interface CloseConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function CloseConfirmDialog({ isOpen, onConfirm, onCancel }: CloseConfirmDialogProps) {
  if (!isOpen) return null;

  return (
    <div className="liquid-glass-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="close-app-title"
        className="liquid-glass-modal-surface bg-background border border-border rounded-lg shadow-lg p-6 w-80 mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-destructive/10 rounded-full flex items-center justify-center">
              <Power className="w-4 h-4 text-destructive" />
            </div>
            <h3 id="close-app-title" className="text-lg font-semibold text-foreground">关闭应用</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-full hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground">
            确定要关闭 <span className="font-medium text-foreground">事半·SemiDone</span> 应用程序吗？
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            应用将完全退出，所有数据已自动保存。
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2">
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
      </div>
    </div>
  );
}
