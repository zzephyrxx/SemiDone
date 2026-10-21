import { useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

// Keep view changes in sync; visibility/topmost recovery lives in Rust.
export function useNativePinMode(compact: boolean): void {
  useEffect(() => {
    void invoke('set_window_pin_mode', { compact }).catch((error) => {
      console.warn('Failed to update native pin mode:', error);
    });
  }, [compact]);
}
