import React, { useEffect, useState } from 'react';
import { X, Sparkles, CalendarDays, Download, Pin, Database, Eye } from 'lucide-react';

const APP_VERSION = '5.0.0';
const WELCOME_STORAGE_KEY = `welcome_shown_${APP_VERSION}`;

const StartupTip: React.FC = () => {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    // 每个新版本都显示一次
    const hasShown = localStorage.getItem(WELCOME_STORAGE_KEY);
    if (!hasShown) {
      setTimeout(() => {
        setShow(true);
      }, 800);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    }
    setShow(false);
  };

  const handleDismiss = () => {
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <style>{`
        .startup-scroll::-webkit-scrollbar {
          width: 4px;
        }
        .startup-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .startup-scroll::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.3);
          border-radius: 4px;
        }
        .startup-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
        .dark .startup-scroll::-webkit-scrollbar-thumb {
          background: rgba(156, 163, 175, 0.2);
        }
        .dark .startup-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.4);
        }
      `}</style>
      <div className="relative w-[460px] max-h-[85vh] rounded-2xl bg-white dark:bg-gray-800 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden animate-scale-in flex flex-col">
        {/* 头部 */}
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 px-6 py-5 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">欢迎使用 SemiDone</h3>
              <p className="text-white/80 text-sm">事半功倍，高效待办 · v{APP_VERSION}</p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容区域 - 可滚动 */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1 startup-scroll">
          {/* 新功能 */}
          <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-200 dark:border-purple-800">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">v{APP_VERSION} 新功能</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <CalendarDays className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span>周/月任务视图</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Download className="w-4 h-4 text-teal-500 flex-shrink-0" />
                <span>自动检查新版本</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Pin className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <span>待办卡片置顶</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Eye className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span>透明模式更清晰</span>
              </div>
              <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                <Database className="w-4 h-4 text-pink-500 flex-shrink-0" />
                <span>数据持久化更稳定</span>
              </div>
            </div>
          </div>

          {/* 功能优化 */}
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">功能优化</h4>
            <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <p>- 完成时间独立记录，历史完成数据继续兼容</p>
              <p>- 桌面端不再静默降级到浏览器存储</p>
              <p>- 重复规则、附件和设置区域已拆分，维护更轻量</p>
              <p>- GitHub Release 检查失败时可在设置页手动重试</p>
            </div>
          </div>

          {/* Bug修复 */}
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">Bug修复</h4>
            <div className="space-y-1.5 text-sm text-gray-700 dark:text-gray-300">
              <p>- 修复了使用时长统计显示异常的问题</p>
              <p>- 修复了自定义数据目录重启后路径丢失的问题</p>
              <p>- 修复了附件无法预览/打开的问题</p>
              <p>- 修复了周报/月报导出无法指定下载路径的问题</p>
              <p>- 修复了清除数据无效的问题</p>
              <p>- 修复了部分情况下UI显示遮挡的问题</p>
              <p>- 修复了使用趋势图表纵轴刻度被遮挡的问题</p>
              <p>- 修复了周/月视图下日期错误问题</p>
              <p>- 修复了统计图表下方统计信息随图表滚动的问题</p>
              <p>- 其他若干Bug修复</p>
            </div>
          </div>

          {/* 提示 */}
          <div className="px-4 py-2.5 text-xs text-gray-500 dark:text-gray-400 text-center">
            博主精力有限，部分问题可能未曾测试到，如遇到问题欢迎反馈!
          </div>
        </div>

        {/* 底部按钮 */}
        <div className="px-5 py-4 bg-gray-50 dark:bg-gray-900/50 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-200">
              本版本不再显示
            </span>
          </label>
          <button
            onClick={handleClose}
            className="px-6 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 text-white rounded-lg font-medium hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
          >
            开始使用
          </button>
        </div>
      </div>
    </div>
  );
};

export default StartupTip;
