import { isDesktopRuntime } from '../api/tauri';

type Mode = 'full' | 'zen';
interface Size { width: number; height: number }
interface WindowAdapter {
  readSize: () => Promise<Size>;
  setSize: (size: Size) => Promise<void>;
  setConstraints: (size: { minWidth: number; minHeight: number } | null) => Promise<void>;
  onResize: (handler: () => void) => Promise<() => void>;
}

const KEYS = { full: 'expandedWindowSize', zen: 'zenWindowSize' };
const MINIMUM = { full: { width: 400, height: 700 }, zen: { width: 280, height: 180 } };
const DEFAULT_SIZE = { full: { width: 550, height: 1000 }, zen: { width: 380, height: 360 } };

// Keep Zen geometry separate from the full window and its bar/floating states.
export class ZenWindowController {
  private mode: Mode = 'full';
  private initialized = false;
  private transitioning = false;
  private revision = 0;
  private queue: Promise<void> = Promise.resolve();
  private unlisten?: () => void;

  constructor(private readonly window: WindowAdapter, private readonly storage: Storage) {}

  private save(mode: Mode, size: Size) {
    const min = MINIMUM[mode];
    // Ignore collapse/edge-snap resize events instead of overwriting full geometry.
    if (!Number.isFinite(size.width) || !Number.isFinite(size.height)
      || size.width < min.width || size.height < min.height) return;
    this.storage.setItem(KEYS[mode], JSON.stringify({ width: Math.round(size.width), height: Math.round(size.height) }));
  }

  private read(mode: Mode): Size {
    try {
      const saved = JSON.parse(this.storage.getItem(KEYS[mode]) || 'null');
      if (saved && Number.isFinite(saved.width) && Number.isFinite(saved.height)) {
        return {
          width: Math.max(MINIMUM[mode].width, Math.min(10000, Math.round(saved.width))),
          height: Math.max(MINIMUM[mode].height, Math.min(10000, Math.round(saved.height))),
        };
      }
    } catch { /* Invalid geometry falls back to the corresponding mode's defaults. */ }
    return DEFAULT_SIZE[mode];
  }

  private constraints(mode: Mode) {
    return { minWidth: MINIMUM[mode].width, minHeight: MINIMUM[mode].height };
  }

  setMode(zen: boolean, restore = false): Promise<void> {
    const target: Mode = zen ? 'zen' : 'full';
    const task = this.queue.then(async () => {
      if (this.initialized && this.mode === target) return;
      this.transitioning = true;
      this.revision++;
      const source = this.mode;
      const size = await this.window.readSize().catch((error) => {
        this.transitioning = false;
        throw error;
      });
      try {
        // Startup restores stored geometry without recording the bootstrap window.
        if (this.initialized || !restore) this.save(source, size);
        await this.window.setConstraints(null);
        await this.window.setSize(this.read(target));
        await this.window.setConstraints(this.constraints(target));
        this.mode = target;
        this.initialized = true;
      } catch (error) {
        try {
          await this.window.setConstraints(null);
          await this.window.setSize(size);
          await this.window.setConstraints(this.constraints(source));
        } catch (rollbackError) { console.error('Restore window geometry failed:', rollbackError); }
        throw error;
      } finally {
        this.transitioning = false;
      }
      if (!this.unlisten) {
        this.unlisten = await this.window.onResize(() => {
          if (this.transitioning) return;
          const mode = this.mode;
          const revision = this.revision;
          void this.window.readSize().then((currentSize) => {
            if (!this.transitioning && revision === this.revision) this.save(mode, currentSize);
          }).catch((error) => console.warn('Save window geometry failed:', error));
        }).catch((error) => {
          console.warn('Listen for window geometry changes failed:', error);
          return undefined;
        });
      }
    });
    this.queue = task.catch(() => undefined);
    return task;
  }

  dispose() { this.unlisten?.(); }
}

let controller: Promise<ZenWindowController> | undefined;
export async function setZenWindowMode(active: boolean, restore = false): Promise<void> {
  if (!isDesktopRuntime) return;
  controller ??= import('@tauri-apps/api/window').then(({ getCurrentWindow, LogicalSize }) => {
    const appWindow = getCurrentWindow();
    return new ZenWindowController({
      readSize: async () => {
        const [physical, scale] = await Promise.all([appWindow.innerSize(), appWindow.scaleFactor()]);
        return { width: physical.width / scale, height: physical.height / scale };
      },
      setSize: (size) => appWindow.setSize(new LogicalSize(size.width, size.height)),
      setConstraints: (constraints) => appWindow.setSizeConstraints(constraints),
      onResize: (handler) => appWindow.onResized(handler),
    }, localStorage);
  });
  await (await controller).setMode(active, restore);
}
