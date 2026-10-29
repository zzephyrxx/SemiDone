interface DragWindow {
  once: (event: string, handler: () => void) => Promise<() => void>;
  startDragging: () => Promise<void>;
  outerPosition: () => Promise<{ x: number; y: number }>;
  outerSize: () => Promise<{ width: number; height: number }>;
}
interface MonitorBounds { position: { x: number; y: number }; size: { width: number; height: number }; scaleFactor: number }

/** Native movement handles DPI and monitor transitions; only left-drag gestures call this. */
export async function dragFloatingWindow(
  window?: DragWindow,
  readMonitor?: () => Promise<MonitorBounds | null>,
): Promise<'left' | 'right' | null> {
  if (!window || !readMonitor) {
    const api = await import('@tauri-apps/api/window');
    window ??= api.getCurrentWindow();
    readMonitor ??= api.currentMonitor;
  }
  let finish!: () => void;
  const ended = new Promise<void>(resolve => { finish = resolve; });
  const unlisten = await window.once('semidone:window-drag-ended', finish);
  try {
    await window.startDragging();
    // Tao posts the drag request; its promise can resolve before the user releases the mouse.
    await ended;
  } finally { unlisten(); }
  const [monitor, position, size] = await Promise.all([readMonitor(), window.outerPosition(), window.outerSize()]);
  if (!monitor) return null;
  const threshold = 50 * monitor.scaleFactor;
  const left = Math.abs(position.x - monitor.position.x);
  const right = Math.abs(position.x + size.width - monitor.position.x - monitor.size.width);
  if (Math.min(left, right) > threshold) return null;
  return left <= right ? 'left' : 'right';
}
