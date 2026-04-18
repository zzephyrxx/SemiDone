import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';

interface ClearCacheDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export default function ClearCacheDialog({ isOpen, onClose, onConfirm }: ClearCacheDialogProps) {
  const [confirmText, setConfirmText] = useState('');
  const [isClearing, setIsClearing] = useState(false);
  const CONFIRM_PHRASE = '确认清除所有记录';

  if (!isOpen) return null;

  const handleConfirm = async () => {
    if (confirmText !== CONFIRM_PHRASE) return;
    
    setIsClearing(true);
    try {
      await onConfirm();
      setConfirmText('');
      onClose();
    } catch (error) {
      console.error('Clear cache error:', error);
    } finally {
      setIsClearing(false);
    }
  };

  const handleClose = () => {
    if (!isClearing) {
      setConfirmText('');
      onClose();
    }
  };

  const isConfirmValid = confirmText === CONFIRM_PHRASE;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-card border border-border rounded-lg shadow-2xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">清除缓存</h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isClearing}
              className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Warning Message */}
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900 mb-1">
                    危险操作警告
                  </h3>
                  <p className="text-sm text-red-800">
                    此操作将<strong>永久删除</strong>所有待办待办、设置和数据，且<strong>无法恢复</strong>！
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                请输入以下内容以确认操作：
              </label>
              <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm font-medium text-yellow-900 text-center">
                {CONFIRM_PHRASE}
              </div>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="在此输入确认文字"
                disabled={isClearing}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-foreground placeholder-muted-foreground disabled:opacity-50"
                autoFocus
              />
              {confirmText && !isConfirmValid && (
                <p className="text-xs text-red-600 mt-1">
                  输入内容不匹配，请检查
                </p>
              )}
              {isConfirmValid && (
                <p className="text-xs text-green-600 mt-1">
                  ✓ 确认文字正确
                </p>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-6 border-t border-border bg-muted/30">
            <button
              onClick={handleClose}
              disabled={isClearing}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!isConfirmValid || isClearing}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isClearing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>清除中...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>确认清除</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
