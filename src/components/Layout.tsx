import React, { useState, useRef } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Settings, User, Pin, PinOff, ChevronUp, ChevronDown, X, CalendarDays, ListTodo, ChartNoAxesCombined } from 'lucide-react';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { useSettingsStore } from '../store/settingsStore';
import { useUsageStore } from '../store/usageStore';
import UserProfileModal from './UserProfileModal';
import CloseConfirmDialog from './CloseConfirmDialog';
import FloatingBall from './FloatingBall';
import ZenMode from './ZenMode';
import ZenIcon from './icons/ZenIcon';
import { startWindowDragging } from '../utils/windowDragging';
import { useRotatingQuote } from '../hooks/useRotatingQuote';
import { useShallow } from 'zustand/react/shallow';
import { Surface } from '../ui/Surface';
import { useSelectionIndicator } from '../ui/SelectionIndicator';
import { PageTransition } from '../ui/PageTransition';

const INACTIVE_CLOCK = { isActive: false, currentMode: 'work', timeLeft: 0, cycle: 0 };

export default function Layout() {
  const nav = useRef<HTMLElement>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const [isUserProfileOpen, setIsUserProfileOpen] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);


  const settings = useSettingsStore(useShallow(state => ({
    theme: state.settings.theme, avatar: state.settings.avatar, username: state.settings.username,
    collapseMode: state.settings.collapseMode, isPinned: state.settings.isPinned,
    useCapsuleMode: state.settings.useCapsuleMode, zenMode: state.settings.zenMode,
    closeToTray: state.settings.closeToTray,
  })));
  const toggleIsPinned = useSettingsStore(state => state.toggleIsPinned);
  const toggleIsCollapsed = useSettingsStore(state => state.toggleIsCollapsed);
  const setZenMode = useSettingsStore(state => state.setZenMode);
  useSelectionIndicator(nav, `${location.pathname}:${settings.collapseMode}:${settings.zenMode?.active}`, item => {
    const destination = item.dataset.navTo;
    if (destination) navigate(destination);
  });
  const pomodoro = useUsageStore(state => settings.collapseMode === 'bar' ? state.pomodoro : INACTIVE_CLOCK);
  const formatTime = useUsageStore(state => state.formatTime);
  const currentQuote = useRotatingQuote(settings.theme, settings.collapseMode === 'bar');

  const handleCloseApp = () => {
    if (settings.closeToTray !== false) {
      if (!isTauri()) {
        toast.info('关闭到托盘仅在桌面应用中可用');
        return;
      }
      // Route every window shape through Rust's native close policy.
      // exit_app bypasses CloseRequested and destroys the tray as well.
      void invoke('close_main_window').catch((error) => {
        console.error('Failed to close window to tray:', error);
        toast.error('关闭到托盘失败，请重试');
      });
      return;
    }
    if (settings.collapseMode !== 'expanded') {
      void Promise.resolve(toggleIsCollapsed()).then(() => setShowCloseConfirm(true)).catch(() => toast.error('请先展开窗口再退出应用'));
      return;
    }
    setShowCloseConfirm(true);
  };

  const confirmClose = async () => {
    try {
      await invoke('exit_app');
    } catch (error) {
      console.error('Failed to close app:', error);
      toast.error('退出应用失败，请重试或从托盘退出');
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
          className="w-8 h-8 shrink-0 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="w-8 h-8 shrink-0 rounded-full bg-primary/10 flex items-center justify-center">
        <User className="w-4 h-4 text-primary" />
      </div>
    );
  };

  // 悬浮球处理函数
  const handleExpandFromFloating = async () => {
    await toggleIsCollapsed(); // 从悬浮球切换到展开模式
  };

  const handleTitleBarMouseDown = (event: ReactMouseEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    const target = event.target as HTMLElement;
    const isInteractive = target.closest(
      'a, button, input, textarea, select, [contenteditable="true"], [role="button"]',
    );
    if (isInteractive) return;

    event.preventDefault();
    void getCurrentWindow().startDragging().catch((error) => {
      console.error('Failed to drag window:', error);
    });
  };

  // 如果是悬浮球，只渲染悬浮球组件
  if (settings.collapseMode === 'floating') {
    return (
      <>
        <FloatingBall
          onExpand={handleExpandFromFloating}
        />

        {/* User Profile Modal */}
        <UserProfileModal
          isOpen={isUserProfileOpen}
          onClose={() => setIsUserProfileOpen(false)}
        />

        {/* Close Confirmation Dialog */}
        <CloseConfirmDialog
          isOpen={false}
          onConfirm={confirmClose}
          onCancel={cancelClose}
        />
      </>
    );
  }

  if (settings.zenMode?.enabled && settings.zenMode.active && settings.collapseMode === 'expanded') {
    return (
      <>
        <ZenMode onClose={handleCloseApp} />
        <CloseConfirmDialog isOpen={showCloseConfirm} onConfirm={confirmClose} onCancel={cancelClose} />
      </>
    );
  }

  return (
    <div className={`h-screen flex flex-col overflow-hidden ${settings.collapseMode === 'expanded' ? 'workspace-shell' : 'workspace-bar'}`}
      onContextMenu={event => { event.preventDefault(); event.stopPropagation(); }}>
      {/* Header - 自定义标题栏 */}
      <div
        className="flex-shrink-0 h-[65px] bg-background border-b border-border flex items-center justify-between px-4 select-none titlebar"
        onMouseDown={handleTitleBarMouseDown}
      >
        {/* Logo区域 / 励志名言 / 番茄钟计时 */}
        {settings.collapseMode === 'bar' ? (
          <div
            className="flex items-center gap-3 flex-1 min-w-0 cursor-move"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <img
              src="/Logo3D.png"
              alt="Logo3D"
              className="w-10 h-10 flex-shrink-0"
            />
            
            {/* 番茄钟聚焦模式显示 */}
            {pomodoro.isActive ? (
              <div
                className="flex items-center gap-2 flex-1 min-w-0 animate-fade-in"
              >
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  pomodoro.currentMode === 'work' ? 'bg-blue-100 text-blue-700' :
                  pomodoro.currentMode === 'break' ? 'bg-green-100 text-green-700' :
                  'bg-purple-100 text-purple-700'
                }`}>
                  {pomodoro.currentMode === 'work' ? '专注' :
                   pomodoro.currentMode === 'break' ? '短休息' :
                   '长休息'}
                </div>
                <div className="font-mono text-lg font-bold text-foreground">
                  {formatTime(pomodoro.timeLeft)}
                </div>
                <div className="text-xs text-muted-foreground">
                  第 {pomodoro.cycle + 1} 个
                </div>
                <div
                  data-testid="pomodoro-status-dot"
                  className="w-2 h-2 rounded-full bg-red-500 animate-pulse ml-auto mr-1"
                />
              </div>
            ) : (
              // 普通模式显示励志名言
              <p
                className="text-sm font-medium text-foreground truncate animate-fade-in"
              >
                {currentQuote}
              </p>
            )}
          </div>
        ) : (
          <Link
            to="/"
            className="workspace-brand flex items-center gap-2 hover:opacity-80 transition-opacity"
            style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
          >
            <img src="/Logo3D.png" alt="Logo3D" className="w-10 h-10" />
            <span className="workspace-wordmark font-semibold text-foreground">SemiDone</span>
          </Link>
        )}
        
        <div 
          className="flex shrink-0 items-center gap-1 animate-fade-in"
        >
          {/* 用户头像 - 条状模式下隐藏 */}
          {settings.collapseMode !== 'bar' && (
          <button
            onClick={() => {
              setIsUserProfileOpen(true);
            }}
            className="workspace-profile flex items-center gap-2 p-1 rounded-lg hover:bg-accent transition-colors"
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
            <>
              {settings.zenMode?.enabled && <button type="button" onClick={() => void setZenMode({ active: true })}
                className="p-2 rounded-full text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
                title="进入 Zen 模式" aria-label="进入 Zen 模式" aria-pressed={false}>
                <ZenIcon className="w-5 h-5" />
              </button>}
            </>
          )}

          {/* 关闭按钮 */}
          <button
            onClick={handleCloseApp}
            className="p-2 rounded-full hover:bg-destructive/10 hover:text-destructive transition-colors"
            title={settings.closeToTray !== false ? '关闭到托盘' : settings.collapseMode === 'bar' ? '展开并关闭应用' : '关闭应用'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Content Area */}
      {settings.collapseMode === 'expanded' && (
        <div className="workspace-body">
          <aside className="workspace-navigation">
            <Surface role="navigation">
            <nav ref={nav} className="workspace-nav ui-selection-host" aria-label="主导航">
              <span className="ui-selection-indicator ui-selection-indicator--fill" aria-hidden="true" />
              <span className="ui-selection-indicator ui-selection-indicator--optics" aria-hidden="true"><Surface role="selection" /></span>
              {[
                { to: '/', label: '待办', icon: ListTodo },
                { to: '/task-calendar', label: '日历', icon: CalendarDays },
                { to: '/usage-stats', label: '统计', icon: ChartNoAxesCombined },
                { to: '/settings', label: '设置', icon: Settings },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} end={to === '/'} data-nav-to={to} draggable={false}
                  className={({ isActive }) => `workspace-nav-link ${isActive ? 'is-active' : ''}`}>
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>
            </Surface>
            <div className="workspace-nav-footer"><span className="workspace-status-dot" />本地保存，安心专注</div>
          </aside>
          <main className={`workspace-content ${location.pathname === '/' ? 'workspace-content--home' : ''}`}>
            <PageTransition />
          </main>
        </div>
      )}

      {/* User Profile Modal */}
      <UserProfileModal
        isOpen={isUserProfileOpen}
        onClose={() => setIsUserProfileOpen(false)}
      />

      {/* Close Confirmation Dialog */}
      <CloseConfirmDialog
        isOpen={showCloseConfirm && settings.collapseMode === 'expanded'}
        onConfirm={confirmClose}
        onCancel={cancelClose}
      />
    </div>
  );
}
