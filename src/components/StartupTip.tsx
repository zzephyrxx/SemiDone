import { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { APP_VERSION, RELEASE_HIGHLIGHTS, RELEASE_MONTH } from '../data/release';
import { useDialogMotion } from '../ui/useDialogMotion';
import { Surface } from '../ui/Surface';
import { useDraggableDialog } from '../ui/useDraggableDialog';
import { useSettingsStore } from '../store/settingsStore';

const APP_VERSION = '5.2.0';
const WELCOME_STORAGE_KEY = `welcome_shown_${APP_VERSION}`;

const HIGHLIGHTS = [
  { text: '当前版本已是最新时，设置页会明确显示“已是最新”' },
  { text: '发现新版本时，仅在设置页提供更新入口，不再弹出提示' },
  { text: '修复 Windows 显示桌面后窗口置顶失效的问题' },
  { text: '减少了误选、误拖、意外选中文字等异常操作' },
  { text: '移除了应用内无效的右键功能' },
  { text: '修复了已完成任务仍显示逾期时间的问题' },
  { text: '增加了悬浮球模式下超出边界的判定逻辑' },
  { text: '其他若干优化和修复' },
  { text: '新增了一个小彩蛋', icon: '/easter-egg.png' },
];

export default function StartupTip() {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const primaryActionRef = useRef<HTMLButtonElement>(null);
  const zenWindow = useSettingsStore(state => state.settings.zenMode?.enabled === true
    && state.settings.zenMode.active && state.settings.collapseMode === 'expanded');
  const { root, present } = useDialogMotion(show, !zenWindow);
  const drag = useDraggableDialog(present);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!show || !present) return;

    primaryActionRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShow(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [show, present]);

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!present) return null;

  return (
    <div
      ref={root}
      data-no-overlay
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5"
    >
      <Surface role="dialog" elementRef={drag.surface}
        htmlRole="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        data-glass-layout="unified"
        className="welcome-dialog liquid-glass-modal-surface relative flex max-h-[92vh] w-[min(440px,calc(100vw-20px))] flex-col overflow-hidden rounded-[26px] border border-border/70 bg-card p-5 text-foreground shadow-[0_18px_48px_rgba(15,23,42,0.16)]"
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
          className="welcome-dialog-dismiss absolute right-3.5 top-3.5 z-20 grid h-9 w-9 place-items-center rounded-full border border-border/60 bg-background/30 text-muted-foreground transition-colors hover:bg-background/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <X className="h-[17px] w-[17px]" />
        </button>

        <header {...drag.handle} aria-label="拖动公告弹窗" className="dialog-drag-handle welcome-dialog-header flex shrink-0 items-start gap-3.5 pr-10">
          <div className="welcome-dialog-icon grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-primary/20 bg-primary/10 shadow-[inset_0_1px_0_rgba(255,255,255,.55)]">
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
              V{APP_VERSION} · {RELEASE_MONTH}
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="关闭欢迎弹窗"
            className="absolute right-3.5 top-3.5 z-20 grid h-[34px] w-[34px] place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <X className="h-[17px] w-[17px]" />
          </button>

          <svg
            data-testid="welcome-header-curve"
            aria-hidden="true"
            className="absolute -bottom-px left-0 h-[62px] w-full"
            viewBox="0 0 1000 180"
            preserveAspectRatio="none"
          >
            <path d="M0 38 C250 102 548 154 1000 35 L1000 180 L0 180 Z" fill="rgba(144,224,239,.52)" />
            <path d="M0 91 C278 137 606 171 1000 70 L1000 180 L0 180 Z" fill="rgba(202,240,248,.6)" />
            <path d="M0 132 C140 57 420 184 1000 91 L1000 180 L0 180 Z" fill="#ffffff" />
            <path d="M0 132 C140 57 420 184 1000 91" fill="none" stroke="rgba(255,255,255,.84)" strokeWidth="3" />
          </svg>
        </header>

        <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(202,240,248,.72),transparent_44%),#FFFFFF] px-4 pb-4 pt-2.5">
          <section
            aria-labelledby="welcome-release-highlights"
            className="overflow-hidden rounded-[14px] border border-[#90E0EF] bg-[linear-gradient(135deg,rgba(255,255,255,.98),rgba(202,240,248,.5))] px-4 py-3.5 shadow-[0_7px_20px_rgba(0,180,216,.1)]"
          >
            <h3 id="welcome-release-highlights" className="text-[15px] font-bold text-[#0077B6]">
              v{APP_VERSION} 更新内容
            </h3>

            <ul className="mt-2.5 divide-y divide-[#CAF0F8] border-t border-[#CAF0F8]">
              {HIGHLIGHTS.map((item) => (
                <li key={item.text} className="flex items-start gap-2.5 py-2.5 text-[12px] leading-[18px] text-slate-700">
                  {item.icon ? (
                    <img
                      data-testid="welcome-easter-egg-icon"
                      src={item.icon}
                      alt=""
                      aria-hidden="true"
                      className="-mt-0.5 h-[20px] w-[20px] shrink-0 object-contain"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="mt-[6px] h-[7px] w-[7px] shrink-0 rounded-full bg-[#00B4D8]"
                    />
                  )}
                  <span>{item.text}</span>
                </li>
              ))}
            </ul>
          </section>
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-2.5 border-t border-[#CAF0F8] bg-white/95 px-5 py-3.5 max-[430px]:px-3.5">
          <label className="group flex min-w-0 cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="h-[15px] w-[15px] shrink-0 rounded border-[#90E0EF] accent-[#0077B6] focus:ring-[#00B4D8]"
            />
            <span className="truncate text-[11.5px] text-slate-500 transition-colors group-hover:text-[#0077B6]">
              本版本不再显示
            </span>
          </label>
          <button
            ref={primaryActionRef}
            type="button"
            onClick={handleClose}
            className="inline-flex min-w-[119px] shrink-0 items-center justify-center rounded-[10px] border border-[#90E0EF] bg-[linear-gradient(110deg,#0077B6_0%,#00B4D8_100%)] px-4 py-2 text-[11.5px] font-semibold text-white shadow-[0_7px_17px_rgba(0,119,182,.25)] ring-2 ring-[#CAF0F8] transition-all hover:-translate-y-0.5 hover:shadow-[0_9px_22px_rgba(0,119,182,.34)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00B4D8] motion-reduce:transform-none"
          >
            开始使用
          </button>
        </footer>
      </Surface>
    </div>
  );
}
