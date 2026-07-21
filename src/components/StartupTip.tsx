import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ArrowRight,
  BarChart3,
  Bug,
  CalendarDays,
  Database,
  Download,
  Eye,
  Pin,
  Rocket,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const APP_VERSION = '5.0.1';
const WELCOME_STORAGE_KEY = `welcome_shown_${APP_VERSION}`;

const OPTIMIZATIONS = [
  '完成时间独立记录，历史完成数据继续兼容',
  '桌面端不再静默降级到浏览器存储',
  '重复规则、附件和设置区域已拆分，维护更轻量',
  'GitHub Release 检查失败时可在设置页手动重试',
];

const BUG_FIXES = [
  '修复了使用时长统计显示异常的问题',
  '修复了自定义数据目录重启后路径丢失的问题',
  '修复了附件无法预览/打开的问题',
  '修复了周报/月报导出无法指定下载路径的问题',
  '修复了清除数据无效的问题',
  '修复了部分情况下 UI 显示遮挡的问题',
  '修复了使用趋势图表纵轴刻度被遮挡的问题',
  '修复了周/月视图下日期错误问题',
  '修复了统计图表下方统计信息随图表滚动的问题',
];

interface FeatureItemProps {
  icon: ReactNode;
  iconClass: string;
  label: string;
}

function FeatureItem({ icon, iconClass, label }: FeatureItemProps) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 py-1.5">
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${iconClass}`}>
        {icon}
      </span>
      <span className="text-[13px] font-medium leading-5 text-slate-700">{label}</span>
    </div>
  );
}

interface ReleasePanelProps {
  title: string;
  items: string[];
  icon: ReactNode;
  titleClass: string;
  iconClass: string;
  panelClass: string;
  bulletClass: string;
  illustration: ReactNode;
}

function ReleasePanel({
  title,
  items,
  icon,
  titleClass,
  iconClass,
  panelClass,
  bulletClass,
  illustration,
}: ReleasePanelProps) {
  return (
    <section className={`relative overflow-hidden rounded-2xl border px-4 py-4 ${panelClass}`}>
      <div className="relative z-10 mb-2.5 flex items-center gap-2.5">
        <span className={`grid h-9 w-9 place-items-center rounded-full text-white shadow-lg ${iconClass}`}>
          {icon}
        </span>
        <h3 className={`text-base font-bold ${titleClass}`}>{title}</h3>
      </div>
      <ul className="relative z-10 space-y-1.5 pl-1">
        {items.map((item) => (
          <li key={item} className="flex gap-2 text-[12px] leading-[1.55] text-slate-700">
            <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${bulletClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
      <div aria-hidden="true" className="absolute right-3 top-3 opacity-[0.11]">
        {illustration}
      </div>
    </section>
  );
}

export default function StartupTip() {
  const [show, setShow] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(WELCOME_STORAGE_KEY)) return;
    const timer = window.setTimeout(() => setShow(true), 800);
    return () => window.clearTimeout(timer);
  }, []);

  const handleClose = () => {
    if (dontShowAgain) localStorage.setItem(WELCOME_STORAGE_KEY, 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px]">
      <style>{`
        .startup-scroll::-webkit-scrollbar { width: 5px; }
        .startup-scroll::-webkit-scrollbar-track { background: transparent; }
        .startup-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, rgba(59, 130, 246, .3), rgba(124, 58, 237, .3));
          border-radius: 999px;
        }
        .startup-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, rgba(59, 130, 246, .5), rgba(124, 58, 237, .5));
        }
      `}</style>

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="welcome-dialog-title"
        className="relative flex max-h-[94vh] w-[min(510px,calc(100vw-24px))] flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.38)] animate-scale-in motion-reduce:animate-none"
        style={{ fontFamily: '"Segoe UI Variable", "Microsoft YaHei UI", sans-serif' }}
      >
        <header className="relative h-[174px] shrink-0 overflow-hidden bg-[linear-gradient(118deg,#5147f7_0%,#384ff6_35%,#2585f7_68%,#3bd5f2_100%)]">
          <div
            aria-hidden="true"
            className="absolute -left-16 -top-24 h-64 w-64 rounded-full bg-violet-600/70 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute -right-12 -top-20 h-56 w-56 rounded-full bg-cyan-300/45 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="absolute right-10 top-14 h-16 w-28 opacity-30"
            style={{ backgroundImage: 'radial-gradient(circle, white 1px, transparent 1.2px)', backgroundSize: '7px 7px' }}
          />

          <span aria-hidden="true" className="absolute left-7 top-5 text-sm text-white/25">✦</span>
          <span aria-hidden="true" className="absolute right-24 top-[72px] text-lg text-white/75">✦</span>
          <span aria-hidden="true" className="absolute right-[46%] top-7 text-[10px] text-white/35">✦</span>

          <div className="relative z-10 flex items-center gap-4 px-7 pt-9 max-[440px]:gap-3 max-[440px]:px-5">
            <div className="relative grid h-[66px] w-[66px] shrink-0 place-items-center rounded-2xl border border-white/30 bg-white/15 shadow-[inset_0_1px_1px_rgba(255,255,255,.35),0_12px_30px_rgba(49,46,129,.28)] backdrop-blur-md">
              <Sparkles className="h-9 w-9 text-white drop-shadow" strokeWidth={1.8} />
              <span aria-hidden="true" className="absolute bottom-2 left-4 text-[9px] text-white/80">✦</span>
            </div>
            <div className="min-w-0 text-white">
              <h2
                id="welcome-dialog-title"
                className="whitespace-nowrap text-[28px] font-[750] leading-tight tracking-tight drop-shadow-sm max-[440px]:text-[23px]"
                style={{ fontFamily: '"Segoe UI Variable Display", "Microsoft YaHei UI", sans-serif' }}
              >
                欢迎使用 SemiDone
              </h2>
              <p className="mt-2 text-[15px] font-light tracking-wide text-white/85 max-[440px]:text-[13px]">
                事半功倍，高效待办 · v{APP_VERSION}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShow(false)}
            aria-label="关闭欢迎弹窗"
            className="absolute right-4 top-4 z-20 grid h-10 w-10 place-items-center rounded-full bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
          >
            <X className="h-5 w-5" />
          </button>

          <svg
            data-testid="welcome-header-curve"
            aria-hidden="true"
            className="absolute -bottom-px left-0 h-[76px] w-full"
            viewBox="0 0 1000 180"
            preserveAspectRatio="none"
          >
            <path d="M0 38 C250 102 548 154 1000 35 L1000 180 L0 180 Z" fill="rgba(159,125,255,.38)" />
            <path d="M0 91 C278 137 606 171 1000 70 L1000 180 L0 180 Z" fill="rgba(255,255,255,.25)" />
            <path d="M0 132 C140 57 420 184 1000 91 L1000 180 L0 180 Z" fill="#ffffff" />
            <path d="M0 132 C140 57 420 184 1000 91" fill="none" stroke="rgba(255,255,255,.82)" strokeWidth="3" />
          </svg>
        </header>

        <main className="startup-scroll flex-1 space-y-3.5 overflow-y-auto bg-[radial-gradient(circle_at_50%_0%,rgba(237,233,254,.48),transparent_38%),#fff] px-5 pb-5 pt-2.5 max-[440px]:px-3.5">
          <section
            aria-labelledby="welcome-new-features"
            className="relative overflow-hidden rounded-2xl border border-violet-200 bg-[linear-gradient(135deg,rgba(255,255,255,.92),rgba(245,243,255,.78))] p-3.5 shadow-[0_8px_28px_rgba(109,40,217,.06)]"
          >
            <span aria-hidden="true" className="absolute right-8 top-5 text-2xl text-violet-200/70">✦</span>
            <span aria-hidden="true" className="absolute right-5 top-11 text-[9px] text-violet-200">✦</span>
            <div className="mb-3 flex items-center gap-2.5">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[linear-gradient(145deg,#3488ff,#7c35f4)] text-white shadow-[0_6px_16px_rgba(79,70,229,.32)]">
                <Sparkles className="h-5 w-5" />
              </span>
              <h3 id="welcome-new-features" className="text-[17px] font-bold text-slate-800">
                v{APP_VERSION} 新功能
              </h3>
            </div>

            <div className="relative grid grid-cols-2 gap-x-6 rounded-xl border border-violet-100 bg-white/65 px-3 py-2 max-[440px]:gap-x-3 max-[440px]:px-2">
              <span aria-hidden="true" className="absolute bottom-5 left-1/2 top-5 w-px bg-violet-100" />
              <FeatureItem
                icon={<CalendarDays className="h-[18px] w-[18px]" />}
                iconClass="bg-blue-100 text-blue-600"
                label="周/月任务视图"
              />
              <FeatureItem
                icon={<Download className="h-[18px] w-[18px]" />}
                iconClass="bg-teal-100 text-teal-600"
                label="自动检查新版本"
              />
              <FeatureItem
                icon={<Pin className="h-[18px] w-[18px]" />}
                iconClass="bg-amber-100 text-amber-600"
                label="待办卡片置顶"
              />
              <FeatureItem
                icon={<Eye className="h-[18px] w-[18px]" />}
                iconClass="bg-indigo-100 text-indigo-600"
                label="透明模式更清晰"
              />
              <FeatureItem
                icon={<Database className="h-[18px] w-[18px]" />}
                iconClass="bg-pink-100 text-pink-600"
                label="数据持久化更稳定"
              />
            </div>
          </section>

          <ReleasePanel
            title="功能优化"
            items={OPTIMIZATIONS}
            icon={<Rocket className="h-5 w-5" />}
            iconClass="bg-[linear-gradient(145deg,#32a0ff,#3367f6)] shadow-blue-500/25"
            titleClass="text-blue-600"
            panelClass="border-blue-200 bg-[linear-gradient(135deg,rgba(248,252,255,.96),rgba(235,245,255,.78))]"
            bulletClass="bg-blue-500"
            illustration={<BarChart3 className="h-20 w-20 text-blue-500" strokeWidth={1.5} />}
          />

          <ReleasePanel
            title="Bug修复"
            items={BUG_FIXES}
            icon={<Bug className="h-5 w-5" />}
            iconClass="bg-[linear-gradient(145deg,#42d4b2,#12aa91)] shadow-emerald-500/25"
            titleClass="text-emerald-600"
            panelClass="border-emerald-200 bg-[linear-gradient(135deg,rgba(248,255,252,.96),rgba(235,253,248,.78))]"
            bulletClass="bg-emerald-500"
            illustration={<ShieldCheck className="h-20 w-20 text-emerald-500" strokeWidth={1.5} />}
          />
        </main>

        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 bg-white/95 px-6 py-4 max-[440px]:px-4">
          <label className="group flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(event) => setDontShowAgain(event.target.checked)}
              className="h-[18px] w-[18px] rounded border-slate-400 accent-violet-600 focus:ring-violet-500"
            />
            <span className="text-[13px] text-slate-600 transition-colors group-hover:text-slate-900">
              本版本不再显示
            </span>
          </label>
          <button
            type="button"
            onClick={handleClose}
            className="group inline-flex min-w-[150px] items-center justify-center gap-6 rounded-xl border border-blue-300 bg-[linear-gradient(110deg,#2f6bff_0%,#4d4df5_50%,#8b2cf5_100%)] px-5 py-2.5 text-sm font-semibold text-white shadow-[0_8px_22px_rgba(79,70,229,.3)] ring-2 ring-blue-100 transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_28px_rgba(79,70,229,.38)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 motion-reduce:transform-none"
          >
            开始使用
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" />
          </button>
        </footer>
      </div>
    </div>
  );
}
