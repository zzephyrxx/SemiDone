// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { enterWindowMode, leaveWindowMode } from './windowModeTransition';
import { windowAppearance } from '../platform/windowAppearance';

afterEach(() => {
  delete document.documentElement.dataset.windowTransition;
  delete document.documentElement.dataset.windowCollapse;
  vi.useRealTimers(); vi.unstubAllGlobals();
});

it('skips transitions when disabled or reduced motion is requested', async () => {
  expect(await leaveWindowMode(false)).toBe(false);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  expect(await leaveWindowMode(true)).toBe(false);
  expect(document.documentElement.dataset.windowTransition).toBeUndefined();
});

it('hides the old content before resize and reveals the new mode briefly', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  const leaving = leaveWindowMode(true);
  expect(document.documentElement.dataset.windowTransition).toBe('leaving');
  await vi.advanceTimersByTimeAsync(windowAppearance.fadeOutMs);
  expect(await leaving).toBe(true);
  expect(document.documentElement.dataset.windowTransition).toBe('switching');
  const entering = enterWindowMode();
  await vi.advanceTimersByTimeAsync(0);
  expect(document.documentElement.dataset.windowTransition).toBe('entering');
  await vi.advanceTimersByTimeAsync(windowAppearance.fadeInMs);
  await entering;
});
