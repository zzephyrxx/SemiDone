import { expect, it, vi } from 'vitest';
import { dragFloatingWindow } from './floatingWindowDrag';

function windowAt(x: number) {
  let end!: () => void;
  const unlisten = vi.fn();
  const window = {
    once: vi.fn(async (_: string, handler: () => void) => { end = handler; return unlisten; }),
    startDragging: vi.fn().mockResolvedValue(undefined),
    outerPosition: vi.fn().mockResolvedValue({ x, y: 100 }),
    outerSize: vi.fn().mockResolvedValue({ width: 90, height: 90 }),
  };
  return { window, end: () => end(), unlisten };
}

it('waits for the native drag-end event instead of measuring when the request is merely queued', async () => {
  const drag = windowAt(-1880);
  const monitor = vi.fn().mockResolvedValue({ position: { x: -1920, y: 0 }, size: { width: 1920, height: 1080 }, scaleFactor: 1.5 });
  const pending = dragFloatingWindow(drag.window, monitor);
  await Promise.resolve(); await Promise.resolve();
  expect(drag.window.startDragging).toHaveBeenCalledOnce();
  expect(drag.window.outerPosition).not.toHaveBeenCalled();
  drag.end();
  expect(await pending).toBe('left');
  expect(drag.unlisten).toHaveBeenCalledOnce();
});

it.each([[1810, 'right'], [900, null]] as const)('detects the final edge at x=%s using physical window bounds', async (x, expected) => {
  const drag = windowAt(x);
  const pending = dragFloatingWindow(drag.window, async () => ({ position: { x: 0, y: 0 }, size: { width: 1920, height: 1080 }, scaleFactor: 1 }));
  await Promise.resolve(); drag.end();
  expect(await pending).toBe(expected);
});

it('removes the drag-end subscription if starting movement fails', async () => {
  const drag = windowAt(900);
  drag.window.startDragging.mockRejectedValue(new Error('drag failed'));
  await expect(dragFloatingWindow(drag.window, async () => null)).rejects.toThrow('drag failed');
  expect(drag.unlisten).toHaveBeenCalledOnce();
});
