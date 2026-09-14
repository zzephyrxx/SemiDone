import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';

const APP_VERSION = '6.0';
const WELCOME_STORAGE_KEY = 'welcome_shown_6.0';

const HIGHLIGHTS = [
  { text: '液态玻璃升级为可叠加的视觉模式，可与明亮、深色和梦粉主题共同使用' },
  { text: '常用弹窗统一适配液态玻璃，并采用更完整的一体化玻璃布局' },
  { text: '支持 1–10 级模糊、折射强度调节和色散效果开关' },
  { text: '扩大色散边缘范围，并优化深色模式下的显示与操作辨识度' },
];

export default function StartupTip() {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!show) return;

    primaryActionRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShow(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show]);

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div
      data-no-overlay
      className="liquid-glass-modal-overlay fixed inset-0 z-50 flex items-center justify-center p-2.5"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        data-glass-layout="unified"
        className="liquid-glass-modal-surface relative flex max-h-[92vh] w-[min(440px,calc(100vw-20px))] flex-col overflow-hidden rounded-[26px] border border-border/70 bg-card p-5 text-foreground shadow-[0_18px_48px_rgba(15,23,42,0.16)] animate-scale-in motion-reduce:animate-none"
        style={{ fontFamily: '"Segoe UI Variable", "Microsoft YaHei UI", sans-serif' }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/80 to-transparent dark:via-white/30"
        />

        <button
          type="button"
          onClick={() => setShow(false)}
          aria-label="关闭欢迎弹窗"
          className="absolute right-3.5 top-3.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/30 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-[17px] w-[17px]" />
        </button>

        <header className="flex shrink-0 items-start gap-3.5 pr-10">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,.55)]">
            <Sparkles className="h-6 w-6 text-primary" strokeWidth={1.8} />
          </div>
          <div className="min-w-0">
            <h2
              id="welcome-dialog-title"
              className="text-[22px] font-bold leading-tight tracking-tight text-foreground max-[430px]:text-[20px]"
              style={{ fontFamily: '"Segoe UI Variable Display", "Microsoft YaHei UI", sans-serif' }}
            >
              欢迎使用 SemiDone
            </h2>
            <p className="mt-1 text-xs tracking-wide text-muted-foreground">
              V{APP_VERSION} · 液态玻璃首批更新
            </p>
          </div>
        </header>

        <main className="mt-5 min-h-0 flex-1 overflow-y-auto pr-1">
          <section aria-labelledby="welcome-release-highlights">
            <div className="flex items-center justify-between gap-3">
              <h3 id="welcome-release-highlights" className="text-[15px] font-semibold text-foreground">
                V{APP_VERSION} 更新内容
              </h3>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">
                持续开发中
              </span>
            </div>

            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              V6.0 正在持续开发。本次先带来液态玻璃模式，后续还会继续完善更多界面与交互。
            </p>

            <ul className="mt-4 divide-y divide-border/50 border-y border-border/50">
              {HIGHLIGHTS.map((item) => (
                <li key={item.text} className="flex items-start gap-3 py-3 text-xs leading-5 text-foreground/80">
                  <span
                    aria-hidden="true"
                    className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-500"
                  />
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="mt-4 flex shrink-0 items-center justify-between gap-3">
          <label className="group flex min-w-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="h-4 w-4 shrink-0 rounded border-border accent-cyan-500 focus:ring-cyan-500"
            />
            <span className="truncate text-[11.5px] text-muted-foreground transition-colors group-hover:text-foreground">
              本版本不再显示
            </span>
          </label>
          <button
            ref={primaryActionRef}
            type="button"
            onClick={handleClose}
            className="inline-flex min-w-[120px] shrink-0 items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-[0_8px_20px_hsl(var(--primary)/.2)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_24px_hsl(var(--primary)/.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent motion-reduce:transform-none"
          >
            开始体验
          </button>
        </footer>
      </div>
    </div>
  );
}
