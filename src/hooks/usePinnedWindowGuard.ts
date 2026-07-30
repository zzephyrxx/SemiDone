import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

const REPIN_DELAY = 80;

/**
 * Windows may reorder even topmost windows while handling Win+D. Reassert the
 * native HWND_TOPMOST state after the WebView becomes visible or focused again.
 */
export function usePinnedWindowGuard(isPinned: boolean) {
  useEffect(() => {
    if (!isPinned) return;

    const appWindow = getCurrentWindow();
    let restoreTimer: number | null = null;
    let unlistenFocus: (() => void) | null = null;
    let disposed = false;

    const clearRestoreTimer = () => {
      if (restoreTimer !== null) {
        window.clearTimeout(restoreTimer);
        restoreTimer = null;
      }
    };

    const scheduleRestore = () => {
      clearRestoreTimer();
      restoreTimer = window.setTimeout(() => {
        restoreTimer = null;
        void invoke('reassert_window_topmost').catch((error) => {
          console.warn('Failed to restore pinned window state:', error);
        });
      }, REPIN_DELAY);
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        scheduleRestore();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', scheduleRestore);

    void appWindow.onFocusChanged(({ payload: focused }) => {
      if (focused) scheduleRestore();
    }).then((unlisten) => {
      if (disposed) {
        unlisten();
      } else {
        unlistenFocus = unlisten;
      }
    }).catch((error) => {
      console.warn('Failed to listen for pinned window focus:', error);
    });

    scheduleRestore();

    return () => {
      disposed = true;
      clearRestoreTimer();
      unlistenFocus?.();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', scheduleRestore);
    };
  }, [isPinned]);
}
