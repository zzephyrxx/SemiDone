// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ZenWindowController } from './zenWindowService';

vi.mock('../api/tauri', () => ({ isDesktopRuntime: false }));

let size = { width: 550, height: 1000 };
let resize: (() => void) | undefined;
const adapter = {
  readSize: vi.fn(async () => ({ ...size })),
  setSize: vi.fn(async (next: typeof size) => { size = { ...next }; }),
  setConstraints: vi.fn(async (value: { minWidth: number; minHeight: number } | null) => { void value; }),
  onResize: vi.fn(async (handler: () => void) => { resize = handler; return () => { resize = undefined; }; }),
};
let controller: ZenWindowController;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  size = { width: 550, height: 1000 };
  resize = undefined;
  controller = new ZenWindowController(adapter, localStorage);
});
afterEach(() => controller.dispose());

describe('independent Zen window geometry', () => {
  it('restores each mode independently, including a Zen height under 30% of the old minimum', async () => {
    localStorage.setItem('expandedWindowSize', JSON.stringify({ width: 640, height: 840 }));
    await controller.setMode(false, true);
    expect(size).toEqual({ width: 640, height: 840 });
    size = { width: 720, height: 920 };
    resize?.();
    await Promise.resolve();
    await controller.setMode(true);
    expect(size).toEqual({ width: 380, height: 360 });
    expect(adapter.setConstraints).toHaveBeenLastCalledWith({ minWidth: 280, minHeight: 180 });
    size = { width: 300, height: 190 };
    resize?.();
    await Promise.resolve();
    await controller.setMode(false);
    expect(size).toEqual({ width: 720, height: 920 });
    await controller.setMode(true);
    expect(size).toEqual({ width: 300, height: 190 });
    expect(JSON.parse(localStorage.getItem('expandedWindowSize')!)).toEqual({ width: 720, height: 920 });
    expect(adapter.setConstraints).toHaveBeenNthCalledWith(1, null);
    expect(adapter.setConstraints.mock.invocationCallOrder[0]).toBeLessThan(adapter.setSize.mock.invocationCallOrder[0]);
  });

  it('restores Zen at startup without overwriting saved full-mode geometry', async () => {
    localStorage.setItem('expandedWindowSize', JSON.stringify({ width: 800, height: 900 }));
    localStorage.setItem('zenWindowSize', JSON.stringify({ width: 320, height: 180 }));
    await controller.setMode(true, true);
    expect(size).toEqual({ width: 320, height: 180 });
    await controller.setMode(false);
    expect(size).toEqual({ width: 800, height: 900 });
  });

  it('ignores bar and floating-ball resize events in full mode', async () => {
    localStorage.setItem('expandedWindowSize', JSON.stringify({ width: 640, height: 840 }));
    await controller.setMode(false, true);
    size = { width: 60, height: 60 };
    resize?.();
    await Promise.resolve();
    expect(JSON.parse(localStorage.getItem('expandedWindowSize')!)).toEqual({ width: 640, height: 840 });
  });

  it('serializes rapid switches so the final mode receives its own size and minimum', async () => {
    await Promise.all([controller.setMode(true), controller.setMode(false), controller.setMode(true)]);
    expect(adapter.setSize.mock.calls.map(([value]) => value)).toEqual([
      { width: 380, height: 360 }, { width: 550, height: 1000 }, { width: 380, height: 360 },
    ]);
    expect(adapter.setConstraints).toHaveBeenLastCalledWith({ minWidth: 280, minHeight: 180 });
  });

  it('restores the original size on native failure and permits a later retry', async () => {
    adapter.setSize.mockRejectedValueOnce(new Error('native resize rejected'));
    await expect(controller.setMode(true)).rejects.toThrow('native resize rejected');
    expect(size).toEqual({ width: 550, height: 1000 });
    expect(adapter.setConstraints).toHaveBeenLastCalledWith({ minWidth: 400, minHeight: 700 });
    await controller.setMode(true);
    expect(size).toEqual({ width: 380, height: 360 });
  });
});
