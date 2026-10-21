import type { MouseEvent } from 'react';
import { isDesktopRuntime } from '../api/tauri';

export function startWindowDragging(event: MouseEvent<HTMLElement>): void {
  if (event.button !== 0 || !isDesktopRuntime) return;
  if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
  event.preventDefault();
  void import('@tauri-apps/api/window')
    .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
    .catch((error) => console.warn('Start window dragging failed:', error));
}
