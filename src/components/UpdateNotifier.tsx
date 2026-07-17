import { useEffect } from 'react';
import { getVersion } from '@tauri-apps/api/app';
import { isTauri } from '@tauri-apps/api/core';
import { openUrl } from '@tauri-apps/plugin-opener';
import { toast } from 'sonner';
import {
  checkForGithubUpdate,
  type UpdateCheckResult,
} from '../services/githubUpdateService';

const UPDATE_CHECK_SESSION_KEY = 'semidone:update-check-started';

interface UpdateNotifierProps {
  enabled?: boolean;
  getCurrentVersion?: () => Promise<string>;
  checkForUpdate?: (version: string) => Promise<UpdateCheckResult>;
  notify?: (result: UpdateCheckResult) => void;
}

function showUpdateNotification(result: UpdateCheckResult): void {
  toast.info(`发现新版本 ${result.latestVersion}`, {
    description: result.releaseName,
    duration: 10_000,
    action: {
      label: '查看更新',
      onClick: () => void openUrl(result.releaseUrl),
    },
  });
}

export default function UpdateNotifier({
  enabled = isTauri(),
  getCurrentVersion = getVersion,
  checkForUpdate = checkForGithubUpdate,
  notify = showUpdateNotification,
}: UpdateNotifierProps) {
  useEffect(() => {
    if (!enabled || sessionStorage.getItem(UPDATE_CHECK_SESSION_KEY)) return;
    sessionStorage.setItem(UPDATE_CHECK_SESSION_KEY, 'checking');

    const checkAtStartup = async () => {
      try {
        const currentVersion = await getCurrentVersion();
        const result = await checkForUpdate(currentVersion);
        if (result.status === 'available') notify(result);
        sessionStorage.setItem(UPDATE_CHECK_SESSION_KEY, 'done');
      } catch (error) {
        sessionStorage.removeItem(UPDATE_CHECK_SESSION_KEY);
        console.warn('[Update] 启动检查失败，可在设置页手动重试:', error);
      }
    };

    void checkAtStartup();
  }, [checkForUpdate, enabled, getCurrentVersion, notify]);

  return null;
}
