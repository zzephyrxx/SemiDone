import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

const TOPMOST_REASSERT_INTERVAL_MS = 2_000;

export function usePinnedWindowGuard(isPinned: boolean): void {
  useEffect(() => {
    if (!isPinned) return;

    const reassertTopmost = () => {
      void invoke('set_window_topmost', { enabled: true }).catch((error) => {
        console.warn('Failed to reassert pinned window state:', error);
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') reassertTopmost();
    };

    reassertTopmost();
    const intervalId = window.setInterval(reassertTopmost, TOPMOST_REASSERT_INTERVAL_MS);
    window.addEventListener('focus', reassertTopmost);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', reassertTopmost);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPinned]);
}
