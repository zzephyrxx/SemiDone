// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const native = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/api/core', () => ({ isTauri: () => true, invoke: native.invoke }));
vi.mock('../platform/distribution', () => ({ isAppStore: true }));
import { enterWindowMode, finishWindowTransition, leaveWindowMode, prepareWindowExpansion, revealFloatingLogo, waitForFloatingLogo } from './windowModeTransition';
import { windowAppearance } from '../platform/windowAppearance';

beforeEach(() => {
  native.invoke.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
});
afterEach(() => {
  delete document.documentElement.dataset.windowTransition;
  delete document.documentElement.dataset.windowExpansion;
  delete document.documentElement.dataset.windowCollapse;
  vi.useRealTimers(); vi.unstubAllGlobals();
});

it('hides the native backing before resizing to the floating logo', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  const leave = leaveWindowMode(true, 'floating');
  expect(document.documentElement.dataset.windowCollapse).toBe('floating');
  expect(native.invoke).toHaveBeenCalledWith('set_window_expansion_phase', { phase: 'prepare', durationMs: 0 });
  expect(await leave).toBe(true);
  expect(document.documentElement.dataset.windowTransition).toBe('switching');
  await finishWindowTransition();
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reset', durationMs: 0 });
  expect(document.documentElement.dataset.windowCollapse).toBeUndefined();
});

it('reveals the floating window without a second scale or delayed native mask animation', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  await leaveWindowMode(true, 'floating');
  await enterWindowMode('floating', false);
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reveal', durationMs: 0 });
  expect(document.documentElement.dataset.windowTransition).toBe('ready');
  expect(native.invoke).not.toHaveBeenCalledWith('set_window_expansion_phase', expect.objectContaining({ phase: 'collapse' }));
  await finishWindowTransition();
});

it('waits for the logo renderer and reveals only its growing silhouette', async () => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  const ready = waitForFloatingLogo();
  let resolved = false;
  void ready.then(() => { resolved = true; });
  await Promise.resolve();
  expect(resolved).toBe(false);
  window.dispatchEvent(new Event('semidone-floating-logo-ready'));
  await ready;
  const reveal = revealFloatingLogo();
  await vi.advanceTimersByTimeAsync(0);
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'logo-reveal', durationMs: 64 });
  await vi.advanceTimersByTimeAsync(64);
  await reveal;
});

it('restores the mask when a native collapse fails', async () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false }));
  native.invoke.mockRejectedValueOnce(new Error('prepare failed'));
  await expect(leaveWindowMode(true, 'floating')).rejects.toThrow('prepare failed');
  await finishWindowTransition();
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reset', durationMs: 0 });
  expect(document.documentElement.dataset.windowTransition).toBeUndefined();
});

it.each(['floating', 'bar'] as const)('prepares the hidden backing before revealing %s with its own duration', async source => {
  vi.useFakeTimers();
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { callback(0); return 1; });
  await prepareWindowExpansion(source);
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'prepare', durationMs: 0 });
  expect(document.documentElement.dataset.windowTransition).toBe('switching');
  expect(document.documentElement.dataset.windowExpansion).toBe(source);
  const duration = source === 'floating' ? windowAppearance.floatingExpandMs : windowAppearance.barExpandMs;
  const enter = enterWindowMode(source);
  await vi.advanceTimersByTimeAsync(0);
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reveal', durationMs: duration });
  await vi.advanceTimersByTimeAsync(duration);
  await enter; await finishWindowTransition();
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reset', durationMs: 0 });
  expect(document.documentElement.dataset.windowTransition).toBeUndefined();
});

it('still prepares the backing when animation is disabled, without a reveal delay', async () => {
  await prepareWindowExpansion('bar');
  await enterWindowMode('bar', false);
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reveal', durationMs: 0 });
  await finishWindowTransition();
});

it('attempts to restore visibility and clears markers after a failed reveal', async () => {
  await prepareWindowExpansion('floating');
  native.invoke.mockRejectedValueOnce(new Error('failed reveal'));
  await expect(enterWindowMode('floating', false)).rejects.toThrow('failed reveal');
  await finishWindowTransition();
  expect(native.invoke).toHaveBeenLastCalledWith('set_window_expansion_phase', { phase: 'reset', durationMs: 0 });
  expect(document.documentElement.dataset.windowExpansion).toBeUndefined();
});
