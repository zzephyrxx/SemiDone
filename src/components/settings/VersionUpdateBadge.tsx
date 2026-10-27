import { useCallback, useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { CheckCircle2, ChevronRight, LoaderCircle, RefreshCw, Rocket } from 'lucide-react';
import {
  checkForGithubUpdate,
  type UpdateCheckResult,
} from '../../services/githubUpdateService';

export type CheckForUpdate = (version: string) => Promise<UpdateCheckResult>;
export type OpenRelease = (url: string) => Promise<void>;

interface VersionUpdateBadgeProps {
  appVersion: string;
  checkForUpdate?: CheckForUpdate;
  openRelease?: OpenRelease;
}

async function openReleasePage(url: string): Promise<void> {
  if (isTauri()) {
    await openUrl(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export default function VersionUpdateBadge({
  appVersion,
  checkForUpdate = checkForGithubUpdate,
  openRelease = openReleasePage,
}: VersionUpdateBadgeProps) {
  const [result, setResult] = useState<UpdateCheckResult | null>(null);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const runCheck = useCallback(async () => {
    if (!appVersion || appVersion === 'N/A') return;
    setIsChecking(true);
    setError('');
    try {
      setResult(await checkForUpdate(appVersion));
    } catch (checkError) {
      setResult(null);
      setError(checkError instanceof Error ? checkError.message : '检查更新失败');
    } finally {
      setIsChecking(false);
    }
  }, [appVersion, checkForUpdate]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  if (isChecking) {
    return (
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs text-muted-foreground" aria-label="正在检查更新">
        <LoaderCircle className="h-3.5 w-3.5 animate-spin motion-reduce:animate-none" />
        检查中
      </span>
    );
  }

  if (result?.status === 'available') {
    return (
      <button
        type="button"
        onClick={() => void openRelease(result.releaseUrl)}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-blue-500/30 px-2.5 py-1.5 text-xs font-semibold text-blue-600 shadow-sm transition-colors hover:border-blue-500/60 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40 dark:text-blue-400"
        aria-label={`发现新版本 ${result.latestVersion}，前往 GitHub 下载`}
        title="前往 GitHub 下载"
      >
        <Rocket className="h-3.5 w-3.5" />
        <span>发现新版本 {result.latestVersion}</span>
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
    );
  }

  if (result?.status === 'current') {
    return (
      <span
        className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-emerald-600 dark:text-emerald-400"
        aria-label="已是最新版本"
      >
        <CheckCircle2 className="h-3.5 w-3.5" />
        已是最新
      </span>
    );
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => void runCheck()}
        className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        aria-label="更新检查失败，重新检查"
        title={error}
      >
        <RefreshCw className="h-3.5 w-3.5" />
        重新检查
      </button>
    );
  }

  return null;
}
