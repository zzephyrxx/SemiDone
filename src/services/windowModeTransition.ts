import { invoke, isTauri } from '@tauri-apps/api/core';
import { isAppStore } from '../platform/distribution';
import { windowAppearance } from '../platform/windowAppearance';
import type { CollapseMode } from '../types';

const wait = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
const frame = () => new Promise<void>(resolve => {
  let done = false;
  let frameId: number | undefined;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(fallback);
    if (frameId !== undefined && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(frameId);
    resolve();
  };
  // A window hidden during expansion must still release the native opacity guard.
  const fallback = setTimeout(finish, typeof requestAnimationFrame === 'function' ? 50 : 16);
  if (typeof requestAnimationFrame === 'function') frameId = requestAnimationFrame(finish);
});
export const canAnimateWindow = (enabled: boolean) => enabled
  && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

async function nativeExpansion(phase: 'prepare' | 'reveal' | 'reset' | 'collapse', durationMs = 0) {
  if (isAppStore && isTauri()) await invoke('set_window_expansion_phase', { phase, durationMs });
}

/** Floating mode gathers into its top-left anchor; the bar keeps a short fade. */
export async function leaveWindowMode(enabled: boolean, destination: CollapseMode = 'bar'): Promise<boolean> {
  if (!canAnimateWindow(enabled)) return false;
  const root = document.documentElement;
  const duration = destination === 'floating' ? windowAppearance.floatingCollapseMs : windowAppearance.fadeOutMs;
  root.dataset.windowCollapse = destination;
  root.style.setProperty('--window-mode-out', `${duration}ms`);
  root.style.setProperty('--window-collapse-scale-x', String(Math.min(1, 60 / window.innerWidth)));
  root.style.setProperty('--window-collapse-scale-y', String(Math.min(1, 60 / window.innerHeight)));
  root.style.setProperty('--window-mode-in', `${windowAppearance.fadeInMs}ms`);
  root.dataset.windowTransition = 'leaving';
  if (destination === 'floating') await nativeExpansion('collapse', duration);
  await wait(duration);
  root.dataset.windowTransition = 'switching';
  return true;
}

export async function prepareWindowExpansion(source: CollapseMode) {
  const root = document.documentElement;
  root.dataset.windowExpansion = source;
  root.dataset.windowTransition = 'switching';
  root.style.setProperty('--window-expand-start-height', `${window.innerHeight}px`);
  // Hide the native backing before resizing; CSS alone cannot hide its white tiles.
  await nativeExpansion('prepare');
}

export async function waitForWindowLayout() {
  await frame(); await frame();
}

export async function enterWindowMode(source: CollapseMode = 'expanded', animated = true) {
  await waitForWindowLayout();
  const root = document.documentElement;
  const duration = !animated ? 0 : source === 'floating' ? windowAppearance.floatingExpandMs
    : source === 'bar' ? windowAppearance.barExpandMs : windowAppearance.fadeInMs;
  root.style.setProperty('--window-mode-in', `${duration}ms`);
  root.dataset.windowTransition = animated ? 'entering' : 'ready';
  if (source !== 'expanded') await nativeExpansion('reveal', duration);
  if (duration) await wait(duration);
}

export async function finishWindowTransition() {
  try {
    if (document.documentElement.dataset.windowExpansion || document.documentElement.dataset.windowCollapse === 'floating') await nativeExpansion('reset');
  } finally {
    delete document.documentElement.dataset.windowTransition;
    delete document.documentElement.dataset.windowExpansion;
    delete document.documentElement.dataset.windowCollapse;
  }
}
