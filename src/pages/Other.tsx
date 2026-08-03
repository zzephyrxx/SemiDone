import { useEffect, useState } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-dialog';
import { ArrowLeft, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import ClearCacheDialog from '../components/ClearCacheDialog';
import ReportExportDialog from '../components/ReportExportDialog';
import AboutSettingsSection from '../components/settings/AboutSettingsSection';
import AppearanceSettingsSection from '../components/settings/AppearanceSettingsSection';
import DataDirectoryDialog from '../components/settings/DataDirectoryDialog';
import DataSettingsSection from '../components/settings/DataSettingsSection';
import { api } from '../api/tauri';
import { useSettingsStore } from '../store/settingsStore';
import { useTaskStore } from '../store/taskStore';
import { useUsageStore } from '../store/usageStore';
import type { Theme } from '../types';

const BROWSER_DATA_DIR = '浏览器本地存储';

export default function Other() {
  const {
    settings,
    updateSettings,
    setTransparency,
    setLiquidGlass,
    toggleCapsuleMode,
    toggleAutoStart,
  } = useSettingsStore();
  const { loadTasks } = useTaskStore();
  const [appVersion, setAppVersion] = useState('');
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [dataDir, setDataDir] = useState('');
  const [showDataDirDialog, setShowDataDirDialog] = useState(false);
  const [newDataDir, setNewDataDir] = useState('');
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    const loadPageData = async () => {
      try {
        setAppVersion(await getVersion());
      } catch (error) {
        console.error('Failed to get app version:', error);
        setAppVersion('N/A');
      }

      if (!isTauri()) {
        setDataDir(BROWSER_DATA_DIR);
        return;
      }

      const response = await api.dataDir.getDataDir();
      if (response.success && response.data) {
        setDataDir(response.data);
      } else {
        console.error('[DataDir] 获取数据目录失败:', response.error);
        setDataDir('数据目录读取失败');
      }
    };

    void loadPageData();
  }, []);

  const handleThemeChange = async (theme: Theme) => {
    if (theme !== 'dark') {
      if (settings.transparentEnabled) await setTransparency(false, 100);
      document.documentElement.style.setProperty('--window-opacity', '1');
      document.body.classList.remove('transparent-mode');
    }
    await updateSettings({ theme });
  };

  const handleTransparencyToggle = async (enabled: boolean) => {
    if (enabled && settings.theme !== 'dark') {
      toast.error('透明模式仅支持在深色主题下开启', { duration: 3000 });
      return;
    }
    await setTransparency(enabled, 100);
  };

  const handleTransparencyLevelChange = async (level: number) => {
    document.documentElement.style.setProperty('--window-opacity', String(level / 100));
    await setTransparency(true, level);
  };

  const handleClearCache = async () => {
    try {
      const response = await api.data.clearAllData();
      if (!response.success) {
        toast.error(response.error || '清除数据失败');
        return;
      }

      useUsageStore.getState().clearAllData();
      await loadTasks();
      await useSettingsStore.getState().loadSettings();
    } catch (error) {
      console.error('Clear cache error:', error);
      toast.error('清除数据失败');
    }
  };

  const handleOpenDataFolder = async () => {
    if (!dataDir || dataDir === BROWSER_DATA_DIR) {
      toast.error('仅桌面端支持打开数据目录');
      return;
    }

    const response = await api.attachment.openFolderInExplorer(dataDir);
    if (!response.success) toast.error(response.error || '打开文件夹失败');
  };

  const handlePickDataDir = async () => {
    if (!isTauri()) {
      toast.error('仅桌面端支持选择目录');
      return;
    }

    try {
      const selectedPath = await open({ directory: true, multiple: false, title: '选择数据目录根路径' });
      if (!selectedPath || Array.isArray(selectedPath)) return;

      const normalizedBasePath = selectedPath.replace(/\\/g, '/').replace(/\/$/, '');
      if (normalizedBasePath.endsWith('/SemiDone/SemiDoneData')) {
        setNewDataDir(normalizedBasePath);
      } else if (normalizedBasePath.endsWith('/SemiDone')) {
        setNewDataDir(`${normalizedBasePath}/SemiDoneData`);
      } else {
        setNewDataDir(`${normalizedBasePath}/SemiDone/SemiDoneData`);
      }
    } catch (error) {
      console.error('[DataDir] 选择目录失败:', error);
      toast.error(`选择目录失败: ${String(error)}`);
    }
  };

  const handleChangeDataDir = async () => {
    const targetPath = newDataDir.trim().replace(/\\/g, '/');
    if (!targetPath) {
      toast.error('请选择有效路径');
      return;
    }
    if (targetPath === dataDir) {
      toast.error('新路径与当前路径相同');
      return;
    }

    setIsMigrating(true);
    try {
      const response = await api.dataDir.migrateDataDir(targetPath);
      if (!response.success) {
        toast.error(response.error || '更改数据目录失败');
        return;
      }

      setDataDir(targetPath);
      setShowDataDirDialog(false);
      setNewDataDir('');
      await updateSettings({ dataDir: targetPath });
    } catch (error) {
      console.error('[DataDir] 更改数据目录异常:', error);
      toast.error(`更改数据目录失败: ${String(error)}`);
    } finally {
      setIsMigrating(false);
    }
  };

  const openDataDirectoryDialog = () => {
    setNewDataDir('');
    setShowDataDirDialog(true);
  };

  const closeDataDirectoryDialog = () => {
    setShowDataDirDialog(false);
    setNewDataDir('');
  };

  return (
    <div className="min-h-screen bg-background px-3 py-3">
      <div className="max-w-2xl mx-auto">
        <header className="mb-3 flex items-center gap-3 px-1 py-2">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="返回"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Settings2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">设置</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">个性化、数据与应用信息</p>
          </div>
        </header>

        <main className="space-y-3">
          <AppearanceSettingsSection
            settings={settings}
            onThemeChange={(theme) => void handleThemeChange(theme)}
            onLiquidGlassChange={(updates) => void setLiquidGlass(updates)}
            onToggleAutoStart={() => void toggleAutoStart()}
            onTransparencyToggle={(enabled) => void handleTransparencyToggle(enabled)}
            onTransparencyLevelChange={(level) => void handleTransparencyLevelChange(level)}
            onToggleCapsuleMode={() => void toggleCapsuleMode()}
          />
          <DataSettingsSection
            dataDir={dataDir}
            onOpenDirectory={() => void handleOpenDataFolder()}
            onChangeDirectory={openDataDirectoryDialog}
            onExport={() => setShowExportDialog(true)}
            onClear={() => setShowClearDialog(true)}
          />
          <AboutSettingsSection appVersion={appVersion} />
        </main>
      </div>

      <ClearCacheDialog
        isOpen={showClearDialog}
        onClose={() => setShowClearDialog(false)}
        onConfirm={handleClearCache}
      />
      <ReportExportDialog isOpen={showExportDialog} onClose={() => setShowExportDialog(false)} />
      <DataDirectoryDialog
        isOpen={showDataDirDialog}
        currentDataDir={dataDir}
        newDataDir={newDataDir}
        isMigrating={isMigrating}
        onPickDirectory={() => void handlePickDataDir()}
        onConfirm={() => void handleChangeDataDir()}
        onCancel={closeDataDirectoryDialog}
      />
    </div>
  );
}
