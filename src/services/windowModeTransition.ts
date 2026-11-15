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

async function nativeExpansion(phase: 'prepare' | 'reveal' | 'reset' | 'collapse' | 'logo-reveal', durationMs = 0) {
  if (isAppStore && isTauri()) await invoke('set_window_expansion_phase', { phase, durationMs });
}

/** Register before mounting the logo so even a cached image cannot race the listener. */
export function waitForFloatingLogo() {
  return new Promise<void>(resolve => {
    const done = () => { clearTimeout(timeout); window.removeEventListener('semidone-floating-logo-ready', done); resolve(); };
    const timeout = window.setTimeout(done, 2000);
    window.addEventListener('semidone-floating-logo-ready', done, { once: true });
  });
}

export async function revealFloatingLogo() {
  await waitForWindowLayout();
  document.documentElement.dataset.windowTransition = 'ready';
  await nativeExpansion('logo-reveal', 64);
  await wait(64);
}

/** Hide the native backing during a floating resize; the logo supplies its own reveal. */
export async function leaveWindowMode(enabled: boolean, destination: CollapseMode = 'bar'): Promise<boolean> {
  if (!canAnimateWindow(enabled)) return false;
  const root = document.documentElement;
  root.dataset.windowCollapse = destination;
  if (destination === 'floating') {
    root.dataset.windowTransition = 'switching';
    await nativeExpansion('prepare');
    return true;
  }
  const duration = windowAppearance.fadeOutMs;
  root.style.setProperty('--window-mode-out', `${duration}ms`);
  root.style.setProperty('--window-mode-in', `${windowAppearance.fadeInMs}ms`);
  root.dataset.windowTransition = 'leaving';
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
