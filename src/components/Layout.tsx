import React, { useState, useEffect } from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Settings, User, Pin, PinOff, ChevronUp, ChevronDown, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useSettingsStore } from '../store/settingsStore';
import { useUsageStore } from '../store/usageStore';
import UserProfileModal from './UserProfileModal';
import CloseConfirmDialog from './CloseConfirmDialog';
import FloatingBall from './FloatingBall';
import { getQuotesByTheme } from '../data/quotes';

export default function Layout() {
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [currentQuote, setCurrentQuote] = useState('');
  const [quoteIndex, setQuoteIndex] = useState(() => {
    // 从localStorage获取上次的索引，如果不存在则从0开始
    const saved = localStorage.getItem('quoteIndex');
    return saved ? parseInt(saved, 10) : 0;
  });

  const { settings, toggleIsPinned, toggleIsCollapsed } = useSettingsStore();
  const { pomodoro, formatTime } = useUsageStore();

  // 轮播励志名言
  useEffect(() => {
    if (settings.collapseMode === 'bar') {
      const quotes = getQuotesByTheme(settings.theme);
      setCurrentQuote(quotes[quoteIndex % quotes.length]);

      const timer = setInterval(() => {
        setQuoteIndex((prev) => (prev + 1) % quotes.length);
      }, 5000); // 5秒切换一次

      return () => clearInterval(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.collapseMode, settings.theme]);

  const handleCloseApp = () => {
    setShowCloseConfirm(true);
  };

  const confirmClose = async () => {
    try {
      await invoke('exit_app');
    } catch (error) {
      console.error('Failed to close app:', error);
      window.close();
    }
  };

  const cancelClose = () => {
    setShowCloseConfirm(false);
  };

  const getUserAvatarDisplay = () => {
    if (settings.avatar) {
      return (
        <img 
          src={settings.avatar} 
          alt="Avatar" 
          className="w-8 h-8 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-4 h-4 text-primary" />
      </div>
    );
  };

  // 悬浮球模式处理函数
  const handleExpandFromFloating = async () => {
    await toggleIsCollapsed(); // 从悬浮球切换到展开模式
  };

  const handleCloseFromFloating = () => {
    handleCloseApp();
  };

  // 如果是悬浮球模式，只渲染悬浮球组件
  if (settings.collapseMode === 'floating') {
    return (
      <>
        <FloatingBall
          onExpand={handleExpandFromFloating}
          onClose={handleCloseFromFloating}
          isTransparent={true}
        />
        
        {/* User Profile Modal */}
        <UserProfileModal 
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
        />

        {/* Close Confirmation Dialog */}
        <CloseConfirmDialog
          isOpen={showCloseConfirm}
          onConfirm={confirmClose}
          onCancel={cancelClose}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header - 自定义标题栏 */}
      <div 
        className="flex-shrink-0 h-[65px] bg-background border-b border-border flex items-center justify-between px-4 select-none titlebar"
        data-tauri-drag-region
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        {/* Logo区域 / 励志名言 / 番茄钟计时 */}
        {settings.collapseMode === 'bar' ? (
          <div 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-move"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
          >
            <img src="/Logo3D.png" alt="Logo3D" className="w-10 h-10 flex-shrink-0" />
            
            {/* 番茄钟聚焦模式显示 */}
            {pomodoro.isActive ? (
              <div className="flex items-center gap-2 flex-1 min-w-0 animate-fade-in">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pomodoro.currentMode === 'work' ? 'bg-blue-100 text-blue-700' :
                  pomodoro.currentMode === 'break' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {pomodoro.currentMode === 'work' ? '专注时间' :
                   pomodoro.currentMode === 'break' ? '短休息' :
                   '长休息'}
                </div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {formatTime(pomodoro.timeLeft)}
                </div>
                <div className="text-xs text-muted-foreground">
                  第 {pomodoro.cycle + 1} 个
                </div>
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-auto" />
              </div>
            ) : (
              // 普通模式显示励志名言
              <p className="text-sm font-medium text-foreground truncate animate-fade-in">
                {currentQuote}
              </p>
            )}
          </div>
        ) : (
          <Link 
            to="/" 
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <img src="/Logo3D.png" alt="Logo3D" className="w-10 h-10" />
            <h1 className="font-bold text-xl text-foreground" style={{fontFamily:'Poppins'}}>SemiDone</h1>
          </Link>
        )}
        
        <div 
          className="flex items-center gap-1 animate-fade-in"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {/* 用户头像 - 条状模式下隐藏 */}
          {settings.collapseMode !== 'bar' && (
          <button 
            onClick={() => {
              setIsUserProfileOpen(true);
            }}
            className="flex items-center gap-2 mr-2 p-1 rounded-lg hover:bg-accent transition-colors"
            title="用户资料"
          >
            {getUserAvatarDisplay()}
            <span className="text-sm text-muted-foreground hidden sm:block">
              {settings.username || '用户'}
            </span>
          </button>
          )}
          
          {/* 折叠按钮 */}
          <button
            onClick={toggleIsCollapsed}
            className={`p-2 rounded-full transition-all duration-200 ${
              settings.collapseMode === 'bar' 
                ? 'bg-purple-500/10 text-purple-600 hover:bg-purple-500/20' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }`}
            title={settings.collapseMode === 'bar' ? '展开窗口' : 
                  settings.useCapsuleMode ? '折叠为悬浮球' : '折叠为条状'}
          >
            {settings.collapseMode === 'bar' ? (
              <ChevronDown className="w-5 h-5" />
            ) : (
              <ChevronUp className="w-5 h-5" />
            )}
          </button>
          
          {/* 置顶按钮 */}
          <button
            onClick={toggleIsPinned}
            className={`p-2 rounded-full transition-all duration-200 ${
              settings.isPinned 
                ? 'bg-blue-500/10 text-blue-600 hover:bg-blue-500/20' 
                : 'hover:bg-accent text-muted-foreground hover:text-foreground'
            }`}
            title={settings.isPinned ? '取消置顶' : '置顶窗口'}
          >
            {settings.isPinned ? (
              <Pin className="w-5 h-5" />
            ) : (
              <PinOff className="w-5 h-5" />
            )}
          </button>
          
          {/* 设置按钮 - 只在展开时显示 */}
          {settings.collapseMode === 'expanded' && (
            <Link 
              to="/settings" 
              className="p-2 rounded-full hover:bg-accent transition-colors" 
              title="设置"
            >
              <Settings className="w-5 h-5" />
            </Link>
          )}
          
          {/* 关闭按钮 */}
          <button
            onClick={() => {
              if (settings.collapseMode === 'bar') {
                // 条状模式下点击：先展开窗口，再弹出关闭确认
                toggleIsCollapsed();
                // 延迟弹出确认对话框，等待窗口展开动画完成
                setTimeout(() => {
                  handleCloseApp();
                }, 300);
              } else {
                // 展开状态下点击关闭应用
                handleCloseApp();
              }
            }}
            className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={settings.collapseMode === 'bar' ? '展开并关闭应用' : '关闭应用'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {settings.collapseMode === 'expanded' && (
        <div className="flex-grow bg-background overflow-y-auto">
          <Outlet />
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal 
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      {/* Close Confirmation Dialog */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm}
        onConfirm={confirmClose}
        onCancel={cancelClose}
      />
    </div>
  );
}
