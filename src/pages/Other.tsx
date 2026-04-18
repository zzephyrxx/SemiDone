import React, { useState, useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { Settings, Palette, Sun, Moon, Sparkles, Heart, ArrowLeft, Pin, Trash2, Database, Eye, Circle, FileDown, QrCode, Rocket, Coffee, Info, Folder, ExternalLink } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { toast } from 'sonner';
import ClearCacheDialog from '../components/ClearCacheDialog';
import ReportExportDialog from '../components/ReportExportDialog';
import type { Theme } from '../types';

export default function Other() {
  const { settings, updateSettings, toggleIsPinned, setTransparency, applyTransparency, toggleCapsuleMode, toggleAutoStart } = useSettingsStore();
  const { loadTasks } = useTaskStore();
  const [appVersion, setAppVersion] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dataDir, setDataDir] = useState('');
  const [showDataDirDialog, setShowDataDirDialog] = useState(false);
  const [newDataDir, setNewDataDir] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const fetchVersion = async () => {
      try {
        const version = await getVersion();
        setAppVersion(version);
      } catch (error) {
        console.error('Failed to get app version:', error);
        setAppVersion('N/A');
      }
    };
    fetchVersion();

    // 获取数据目录
    const fetchDataDir = async () => {
      console.log('[DataDir] fetchDataDir 开始...');
      try {
        const { isTauri, invoke } = await import('@tauri-apps/api/core');
        console.log('[DataDir] isTauri():', isTauri());
        if (isTauri()) {
          console.log('[DataDir] Tauri可用，直接调用 invoke');
          const response: any = await invoke('get_data_dir_path');
          console.log('[DataDir] get_data_dir_path 响应:', JSON.stringify(response));
          if (response && response.success && response.data) {
            console.log('[DataDir] 设置 dataDir:', response.data);
            setDataDir(response.data);
          } else {
            console.log('[DataDir] 响应无效，使用 fallback');
            setDataDir('C:\\Users\\YuRou\\AppData\\Roaming\\SemiDone\\SemiDoneData');
          }
        } else {
          console.log('[DataDir] Tauri不可用，使用 fallback');
          setDataDir('C:\\Users\\YuRou\\AppData\\Roaming\\SemiDone\\SemiDoneData');
        }
      } catch (error) {
        console.error('[DataDir] 获取数据目录异常:', error);
        setDataDir('C:\\Users\\YuRou\\AppData\\Roaming\\SemiDone\\SemiDoneData');
      }
    };
    fetchDataDir();
  }, []);

  const handleThemeChange = async (theme: Theme) => {
    // 如果切换到非深色主题，自动关闭透明模式并重置透明度
    if (theme !== 'dark') {
      if (settings.transparentEnabled) {
        await setTransparency(false, 100);
        toast.info('已自动关闭透明模式', { duration: 3000 });
      }
      // 确保透明度重置为 100%
      document.documentElement.style.setProperty('--window-opacity', '1');
      document.body.classList.remove('transparent-mode');
    }
    updateSettings({ theme });
  };

  const handleNotificationsChange = (notifications: boolean) => {
    updateSettings({ notifications });
  };

  const handleTransparencyToggle = async (enabled: boolean) => {
    // 只有深色模式才能开启透明
    if (enabled && settings.theme !== 'dark') {
      toast.error('透明模式仅支持在深色主题下开启', { duration: 3000 });
      return;
    }
    // 开启时从 100% 开始，关闭时恢复到 100%
    await setTransparency(enabled, 100);
  };

  const handleTransparencyLevelChange = async (level: number) => {
    // 实时预览透明度
    document.documentElement.style.setProperty('--window-opacity', String(level / 100));
    await setTransparency(true, level);
  };

  const handleClearCache = async () => {
    try {
      const { isTauri } = await import('@tauri-apps/api/core');
      if (isTauri()) {
        const { invoke } = await import('@tauri-apps/api/core');
        const response: any = await invoke('clear_all_data');
        if (response.success) {
          // 清除使用时长和番茄钟数据（内存+localStorage）
          const { useUsageStore } = await import('../store/usageStore');
          useUsageStore.getState().clearAllData();
          toast.success('所有数据已清除');
          await loadTasks();
          await useSettingsStore.getState().loadSettings();
        } else {
          toast.error(response.error || '清除数据失败');
        }
      } else {
        localStorage.clear();
        toast.success('缓存已清除');
        await loadTasks();
      }
    } catch (error) {
      console.error('Clear cache error:', error);
      toast.error('清除数据失败');
    }
  };

  const handleOpenDataFolder = async () => {
    console.log('[DataDir] handleOpenDataFolder called, dataDir:', dataDir);
    if (!dataDir) {
      toast.error('数据目录路径无效');
      return;
    }
    try {
      const { isTauri, invoke } = await import('@tauri-apps/api/core');
      console.log('[DataDir] isTauri():', isTauri());

      if (isTauri()) {
        console.log('[DataDir] 直接用 invoke 调用，dataDir:', dataDir);
        // 尝试用 filePath 作为参数名
        const response: any = await invoke('open_file_by_path', { filePath: dataDir });
        console.log('[DataDir] 响应:', JSON.stringify(response));

        if (!response.success) {
          toast.error(response.error || '打开文件夹失败');
        } else {
          toast.success('已打开文件夹');
        }
      } else {
        console.log('[DataDir] Tauri不可用，使用 window.open');
        window.open(`file://${dataDir}`, '_blank');
      }
    } catch (error) {
      console.error('[DataDir] 异常:', error);
      toast.error('打开文件夹失败: ' + String(error));
    }
  };

  const handlePickDataDir = async () => {
    try {
      const { isTauri } = await import('@tauri-apps/api/core');
      if (!isTauri()) {
        toast.error('仅桌面端支持选择目录');
        return;
      }

      const { open } = await import('@tauri-apps/plugin-dialog');
      const selectedPath = await open({
        directory: true,
        multiple: false,
        title: '选择数据目录根路径'
      });

      if (!selectedPath || Array.isArray(selectedPath)) {
        return;
      }

      const normalizedBasePath = selectedPath.replace(/\\/g, '/').replace(/\/$/, '');
      let finalPath: string;
      if (normalizedBasePath.endsWith('/SemiDone/SemiDoneData')) {
        finalPath = normalizedBasePath;
      } else if (normalizedBasePath.endsWith('/SemiDone')) {
        finalPath = `${normalizedBasePath}/SemiDoneData`;
      } else {
        finalPath = `${normalizedBasePath}/SemiDone/SemiDoneData`;
      }
      setNewDataDir(finalPath);
    } catch (error) {
      console.error('[DataDir] 选择目录失败:', error);
      toast.error('选择目录失败: ' + String(error));
    }
  };

  const handleChangeDataDir = async () => {
    if (!newDataDir.trim()) {
      toast.error('请选择有效路径');
      return;
    }

    let targetPath = newDataDir.trim();
    // 确保路径格式正确
    targetPath = targetPath.replace(/\\/g, '/');

    if (targetPath === dataDir) {
      toast.error('新路径与当前路径相同');
      return;
    }

    setIsMigrating(true);

    try {
      const { isTauri, invoke } = await import('@tauri-apps/api/core');
      if (isTauri()) {
        // 调用 Rust 命令来迁移数据
        const response: any = await invoke('migrate_data_dir', {
          newPath: targetPath,
        });
        console.log('[DataDir] migrate_data_dir 响应:', JSON.stringify(response));

        if (response.success) {
          toast.success('数据目录已更改，请重启应用');
          setDataDir(targetPath);
          setShowDataDirDialog(false);
          setNewDataDir('');
          // 更新设置
          updateSettings({ dataDir: targetPath });
        } else {
          toast.error(response.error || '更改数据目录失败');
        }
      }
    } catch (error) {
      console.error('[DataDir] 异常:', error);
      toast.error('更改数据目录失败: ' + String(error));
    } finally {
      setIsMigrating(false);
    }
  };

  const getThemePreview = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return 'bg-gradient-to-br from-blue-50 to-indigo-100 border border-gray-200';
      case 'dark':
        return 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700';
      case 'pink':
        return 'bg-gradient-to-br from-pink-50 via-rose-100 to-pink-200 border border-pink-300';
      default:
        return 'bg-gray-100';
    }
  }

  const getThemeName = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return '明亮';
      case 'dark':
        return '深色';
      case 'pink':
        return '梦粉';
      default:
        return '未知';
    }
  }

  const getThemeIcon = (theme: Theme) => {
    switch (theme) {
      case 'light':
        return <Sun className="w-6 h-6 text-yellow-500" />;
      case 'dark':
        return <Moon className="w-6 h-6 text-blue-400" />;
      case 'pink':
        return <Heart className="w-6 h-6 text-rose-500" />;
      default:
        return <Sun className="w-6 h-6" />;
    }
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => window.history.back()}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>返回</span>
        </button>

        {/* 页面标题 */}
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-foreground">设置</h1>
          <p className="text-sm text-muted-foreground mt-1">个性化您的待办事项体验</p>
        </div>

        <div className="space-y-2"> {/* 这里减少卡片间距 */}
          {/* 主题设置 */}
          <div className="card card-shadow hover-lift slide-up">
            <div className="card-header">
              <div className="flex items-center">
                <div className="p-2 bg-primary/10 rounded-lg mr-3">
                  <Palette className="w-5 h-5 icon-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">主题风格</h2>
                  <p className="card-description text-sm">选择您喜欢的界面风格</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-3 gap-3">
                {(['light', 'dark', 'pink'] as Theme[]).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => handleThemeChange(theme)}
                    className={`group relative p-3 rounded-lg border-2 transition-all duration-300 ease-in-out ${settings.theme === theme
                      ? 'border-primary bg-primary/5 scale-105'
                      : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      }`}
                  >
                    <div className={`w-8 h-8 rounded-md ${getThemePreview(theme)} flex items-center justify-center mb-2 mx-auto group-hover:scale-110 transition-all duration-300 ease-in-out`}>
                      {React.cloneElement(getThemeIcon(theme), { className: 'w-4 h-4' })}
                    </div>
                    <div className="text-xs font-medium text-foreground">
                      {getThemeName(theme)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {theme === 'light' && '清新明亮'}
                      {theme === 'dark' && '专注护眼'}
                      {theme === 'pink' && '致~'}
                    </div>
                    {settings.theme === theme && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>


          {/* 开机自启动设置 */}
          <div className="card card-shadow hover-lift slide-up">
            <div className="card-header py-4">
              <div className="flex items-center justify-between w-full">
                {/* 左侧标题和描述 */}
                <div className="flex items-center">
                  <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                    <Rocket className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">开机自启动</h2>
                    <p className="card-description text-sm">开启后应用将在系统启动时自动运行</p>
                  </div>
                </div>

                {/* 右侧开关按钮 */}
                <button
                  type="button"
                  onClick={() => toggleAutoStart()}
                  className={`relative inline-flex items-center w-11 h-6 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-green-200 ${
                    settings.autoStart ? 'bg-green-500' : 'bg-green-100'
                  }`}
                >
                  <span
                    className={`absolute left-[2px] w-5 h-5 bg-white border border-green-200 rounded-full shadow-sm transition-transform ${
                      settings.autoStart ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* 透明模式设置 */}
          <div className="card card-shadow hover-lift slide-up">
            <div className="card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="p-2 bg-cyan-500/10 rounded-lg mr-3">
                    <Eye className="w-5 h-5 text-cyan-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">透明模式</h2>
                    <p className="card-description text-sm">
                      {settings.theme === 'dark' ? '开启后窗口背景半透明' : '仅支持深色主题'}
                    </p>
                  </div>
                </div>

                {/* 开关按钮 */}
                <label className={`relative inline-flex items-center ${settings.theme === 'dark' ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}>
                  <input
                    type="checkbox"
                    checked={settings.transparentEnabled ?? false}
                    onChange={(e) => handleTransparencyToggle(e.target.checked)}
                    className="sr-only peer"
                    disabled={settings.theme !== 'dark' && !settings.transparentEnabled}
                  />
                  <div className="w-11 h-6 bg-cyan-100 peer-focus:ring-cyan-200 rounded-full peer peer-checked:bg-cyan-500 after:bg-white after:border-cyan-200 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>

            {/* 透明度滑块 */}
            {settings.transparentEnabled && (
              <div className="card-content pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">透明度</span>
                    <span className="text-sm font-medium text-foreground">
                      {settings.transparentLevel ?? 100}%
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="range"
                      min="1"
                      max="100"
                      step="1"
                      value={settings.transparentLevel ?? 100}
                      onChange={(e) => handleTransparencyLevelChange(Number(e.target.value))}
                      className="w-full h-2 bg-cyan-100 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>透明</span>
                      <span>不透明</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 胶囊折叠模式设置 */}
          <div className="card card-shadow hover-lift slide-up">
            <div className="card-header py-4">
              <div className="flex items-center justify-between w-full">
                {/* 左侧标题和描述 */}
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500/10 rounded-lg mr-3">
                    <Circle className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">悬浮球模式</h2>
                    <p className="card-description text-sm">开启后折叠窗口变为悬浮球</p>
                  </div>
                </div>

                {/* 右侧开关按钮 */}
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.useCapsuleMode ?? false}
                    onChange={(e) => toggleCapsuleMode()}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-purple-100 peer-focus:ring-purple-200 rounded-full peer peer-checked:bg-purple-500 after:bg-white after:border-purple-200 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                </label>
              </div>
            </div>
          </div>

          {/* 报告导出卡片 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-500/10 rounded-lg mr-3">
                    <FileDown className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">记录导出</h2>
                    <p className="card-description text-sm">导出待办记录为Markdown格式</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
                >
                  <FileDown className="w-4 h-4" />
                  导出
                </button>
              </div>
            </div>

          </div>

          {/* 数据目录卡片 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-500/10 rounded-lg mr-3">
                    <Folder className="w-5 h-5 text-orange-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">数据目录</h2>
                    <p className="card-description text-sm">软件的数据存储位置</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleOpenDataFolder}
                    className="flex items-center gap-2 px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium"
                    title="在文件管理器中打开"
                  >
                    <ExternalLink className="w-4 h-4" />
                    打开
                  </button>
                  <button
                    onClick={() => {
                      setNewDataDir('');
                      setShowDataDirDialog(true);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                    title="更改数据目录"
                  >
                    更改
                  </button>
                </div>
              </div>
            </div>
            {dataDir && (
              <div className="card-content pt-0">
                <div className="bg-muted/50 rounded-lg p-3 font-mono text-xs text-foreground break-all">
                  {dataDir}
                </div>
              </div>
            )}
          </div>

          {/* 数据管理卡片 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center">
                  <div className="p-2 bg-red-500/10 rounded-lg mr-3">
                    <Database className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">数据管理</h2>
                    <p className="card-description text-sm">清除应用数据和缓存</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm font-medium"
                >
                  <Trash2 className="w-4 h-4" />
                  清除数据
                </button>
              </div>
            </div>
          </div>

          {/* 应用信息 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center">
                <div className="p-2 bg-gray-500/10 rounded-lg mr-3">
                  <Info className="w-5 h-5 text-gray-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">关于</h2>
                  <p className="card-description text-sm">应用版本信息</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">当前版本</span>
                    <span className="text-sm font-medium text-foreground">{appVersion}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">作者</span>
                    <span className="text-sm font-medium text-foreground">魚肉</span>
                  </div>                
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">博客</span>
                    <span className="text-sm font-medium text-foreground">
                      <a href="https://zzephyrxx.github.io/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        zzephyrxx.github.io
                      </a>
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-border">
                    <span className="text-sm text-muted-foreground">更新日期</span>
                    <span className="text-sm font-medium text-foreground">2026.04</span>
                  </div>  
                </div>
              </div>
            </div>
          </div>

          {/* 公众号关注卡片 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center">
                <div className="p-2 bg-green-500/10 rounded-lg mr-3">
                  <QrCode className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">公众号</h2>
                  <p className="card-description text-sm">关注获取最新版本</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="flex flex-col items-center space-y-4">
                <div className="bg-white rounded-lg p-4 shadow-sm border border-border">
                  <img
                    src="/gzh.jpg"
                    alt="公众号二维码"
                    className="w-40 h-40 object-contain"
                  />
                </div>
                <div className="text-center space-y-2">
                  <p className="text-sm font-medium text-foreground">扫码关注「事半」公众号</p>
                  <div className="text-xs text-muted-foreground space-y-1">

                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 打赏卡片 */}
          <div className="card card-shadow slide-up">
            <div className="card-header">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-500/10 rounded-lg mr-3">
                  <Coffee className="w-5 h-5 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">打赏开发者</h2>
                  <p className="card-description text-sm">您的支持是我最大的动力</p>
                </div>
              </div>
            </div>
            <div className="card-content">
              <div className="grid grid-cols-2 gap-8">
                <div className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl border border-green-200 dark:border-green-800">
                  <div className="w-40 h-40 bg-white rounded-lg overflow-hidden shadow-sm">
                    <img
                      src="/wxdashang.jpg"
                      alt="微信打赏"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">微信打赏</p>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-2 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <div className="w-40 h-40 bg-white rounded-lg overflow-hidden shadow-sm">
                    <img
                      src="/zfbdashang.jpg"
                      alt="支付宝打赏"
                      className="w-full h-full object-contain"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-foreground">支付宝打赏</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 清除缓存确认对话框 */}
      <ClearCacheDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearCache}
      />

      {/* 导出报告对话框 */}
      <ReportExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
      />

      {/* 更改数据目录对话框 */}
      {showDataDirDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-card border border-border rounded-lg shadow-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-foreground mb-4">更改数据目录</h3>
            <p className="text-sm text-muted-foreground mb-4">
              当前目录：{dataDir}
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-foreground mb-2">
                目标目录
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDataDir}
                  readOnly
                  placeholder="请选择新的目录根路径"
                  className="flex-1 px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-foreground text-sm font-mono"
                />
                <button
                  onClick={handlePickDataDir}
                  className="px-3 py-2 bg-gray-200 dark:bg-gray-700 text-foreground rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  disabled={isMigrating}
                >
                  选择目录
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                先选择根目录，系统会自动补全为 SemiDone/SemiDoneData；若不存在会自动创建，当前数据会复制到新目录。更改后请重启应用
              </p>
              <p className="text-xs text-destructive mt-2">
                ⚠️ 此为危险操作，请提前备份数据，以免丢失
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDataDirDialog(false);
                  setNewDataDir('');
                }}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                disabled={isMigrating}
              >
                取消
              </button>
              <button
                onClick={handleChangeDataDir}
                disabled={isMigrating || !newDataDir.trim()}
                className="px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {isMigrating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                    迁移中...
                  </>
                ) : (
                  '确认更改'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}