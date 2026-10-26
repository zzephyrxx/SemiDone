import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, X } from 'lucide-react';
import type { Task } from '../types';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  task: Task | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmDialog({ isOpen, task, onConfirm, onCancel }: DeleteConfirmDialogProps) {
  if (!isOpen || !task) return null;

  const dialogContent = (
    <div className="liquid-glass-modal-overlay fixed inset-0 bg-black/50 flex items-center justify-center z-[99999]">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-task-title"
        className="liquid-glass-modal-surface bg-background border border-border rounded-lg shadow-xl w-80 p-4 mx-4"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h3 id="delete-task-title" className="text-lg font-semibold text-foreground">确认删除</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 hover:bg-accent rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            确定要删除以下待办事项吗？此操作无法撤销。
          </p>
          <div className="bg-accent/50 rounded-md p-3 border-l-4 border-red-500">
            <p className="font-medium text-foreground text-sm">{task.title}</p>
            {task.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {task.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-sm border border-border rounded-md text-foreground hover:bg-accent transition-colors"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-3 py-1.5 text-sm bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(dialogContent, document.body);
}
