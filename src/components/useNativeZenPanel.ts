import { useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { isDesktopRuntime } from '../api/tauri';
import { isAppStore } from '../platform/distribution';
import type { ZenModeSettings } from '../types';

export type NativeZenAction = { action: 'settings' | 'pin' | 'exit' | 'close' | 'task'; taskId?: string };
export interface NativeZenState {
  appearance: ZenModeSettings;
  pinned: boolean;
  exitIcon?: string;
  toolbarIcons?: { settings: string; pin: string; pinOff: string };
  loading?: boolean;
  motion?: boolean;
  tasks: { id: string; title: string; busy: boolean; done?: boolean; recurring?: boolean }[];
}

// Serial execution prevents a slow update from resurrecting the panel after exit.
let queue: Promise<void> = Promise.resolve();
function send(payload: NativeZenState | null) {
  queue = queue.catch(() => {}).then(() => invoke<void>('set_native_zen_panel', {
    payload: payload === null ? null : JSON.stringify(payload),
  })).catch(error => { console.error('原生 Zen 面板切换失败:', error); });
}

export function useNativeZenPanel(state: NativeZenState, paused: boolean, onAction: (action: NativeZenAction) => void) {
  const active = isAppStore && isDesktopRuntime;
  const actionRef = useRef(onAction);
  actionRef.current = onAction;
  const [modalOpen, setModalOpen] = useState(false);
  const payload = JSON.stringify(state);

  useEffect(() => {
    if (!active) return;
    const onEvent = (event: Event) => actionRef.current((event as CustomEvent<NativeZenAction>).detail);
    window.addEventListener('semidone-native-zen', onEvent);
    const update = () => setModalOpen(Boolean(document.querySelector('[aria-modal="true"]')));
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['aria-modal'] });
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener('semidone-native-zen', onEvent);
      send(null);
    };
  }, [active]);

  useEffect(() => {
    if (!active) return;
    send(paused || modalOpen ? null : JSON.parse(payload) as NativeZenState);
  }, [active, paused, modalOpen, payload]);
}
