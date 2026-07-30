import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Heart,
  Info,
  QrCode,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import VersionUpdateBadge, {
  type CheckForUpdate,
  type OpenRelease,
} from './VersionUpdateBadge';
import { createRoundedRectEdgeMap } from '../../utils/liquidGlassDisplacement';
import LiquidGlassPreview from './LiquidGlassPreview';

interface AboutSettingsSectionProps {
  appVersion: string;
  checkForUpdate?: CheckForUpdate;
  openRelease?: OpenRelease;
}

interface AboutRowProps {
  label: string;
  children: ReactNode;
}

interface LiquidDialogPosition {
  x: number;
  y: number;
}

interface LiquidDialogDragState {
  pointerId: number;
  pointerX: number;
  pointerY: number;
  dialogX: number;
  dialogY: number;
}

interface ChromaticEdgeFilterProps {
  id: string;
  mapHref: string;
  width: number;
  height: number;
  padding: number;
  scales: readonly [number, number, number];
}

const LIQUID_DIALOG_EDGE_PADDING = 12;

function ChromaticEdgeFilter({
  id,
  mapHref,
  width,
  height,
  padding,
  scales,
}: ChromaticEdgeFilterProps) {
  const mapResult = `${id}-map`;
  const redResult = `${id}-red`;
  const greenResult = `${id}-green`;
  const blueResult = `${id}-blue`;
  const redGreenResult = `${id}-red-green`;

  return (
    <filter
      id={id}
      filterUnits="userSpaceOnUse"
      x={-padding}
      y={-padding}
      width={width + padding * 2}
      height={height + padding * 2}
      colorInterpolationFilters="sRGB"
    >
      <feImage
        href={mapHref}
        x="0"
        y="0"
        width={width}
        height={height}
        preserveAspectRatio="none"
        result={mapResult}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2={mapResult}
        scale={scales[0]}
        xChannelSelector="R"
        yChannelSelector="G"
        result={redResult}
      />
      <feColorMatrix
        in={redResult}
        type="matrix"
        values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result={`${redResult}-only`}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2={mapResult}
        scale={scales[1]}
        xChannelSelector="R"
        yChannelSelector="G"
        result={greenResult}
      />
      <feColorMatrix
        in={greenResult}
        type="matrix"
        values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0"
        result={`${greenResult}-only`}
      />
      <feDisplacementMap
        in="SourceGraphic"
        in2={mapResult}
        scale={scales[2]}
        xChannelSelector="R"
        yChannelSelector="G"
        result={blueResult}
      />
      <feColorMatrix
        in={blueResult}
        type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0"
        result={`${blueResult}-only`}
      />
      <feBlend
        in={`${redResult}-only`}
        in2={`${greenResult}-only`}
        mode="screen"
        result={redGreenResult}
      />
      <feBlend in={redGreenResult} in2={`${blueResult}-only`} mode="screen" />
    </filter>
  );
}

function AboutRow({ label, children }: AboutRowProps) {
  return (
    <div className="flex min-h-[52px] items-center gap-3 px-3 py-2">
      <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2 text-sm font-medium text-foreground">
        {children}
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function morphLiquidControl(event: ReactPointerEvent<HTMLButtonElement>) {
  const control = event.currentTarget;
  const rect = control.getBoundingClientRect();
  if (!rect.width || !rect.height) return;

  const x = clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1);
  const y = clamp(((event.clientY - rect.top) / rect.height) * 2 - 1, -1, 1);

  control.style.setProperty('--glass-highlight-x', `${50 + x * 32}%`);
  control.style.setProperty('--glass-highlight-y', `${42 + y * 28}%`);
  control.style.setProperty('--glass-rotate-x', `${(-y * 4).toFixed(2)}deg`);
  control.style.setProperty('--glass-rotate-y', `${(x * 5).toFixed(2)}deg`);
  control.style.setProperty('--glass-scale-x', `${(1 + Math.abs(x) * 0.025).toFixed(3)}`);
  control.style.setProperty('--glass-scale-y', `${(1 + Math.abs(y) * 0.018).toFixed(3)}`);
}

function resetLiquidControl(event: ReactPointerEvent<HTMLButtonElement>) {
  const control = event.currentTarget;
  [
    '--glass-highlight-x',
    '--glass-highlight-y',
    '--glass-rotate-x',
    '--glass-rotate-y',
    '--glass-scale-x',
    '--glass-scale-y',
  ].forEach((property) => control.style.removeProperty(property));
}

const liquidControlHandlers = {
  onPointerMove: morphLiquidControl,
  onPointerDown: morphLiquidControl,
  onPointerLeave: resetLiquidControl,
  onPointerUp: resetLiquidControl,
  onPointerCancel: resetLiquidControl,
};

export default function AboutSettingsSection({
  appVersion,
  checkForUpdate,
  openRelease,
}: AboutSettingsSectionProps) {
  const [showPublicAccount, setShowPublicAccount] = useState(false);
  const [showDonation, setShowDonation] = useState(false);
  const [showEasterEgg, setShowEasterEgg] = useState(false);
  const [liquidDialogPosition, setLiquidDialogPosition] = useState<LiquidDialogPosition>({ x: 0, y: 0 });
  const [donationEdgeMaps] = useState(() => ({
    dialog: createRoundedRectEdgeMap({
      width: 360,
      height: 330,
      radius: 32,
      edgeWidth: 35,
    }),
    button: createRoundedRectEdgeMap({
      width: 88,
      height: 32,
      radius: 16,
      edgeWidth: 9,
    }),
  }));
  const liquidDialogRef = useRef<HTMLDivElement>(null);
  const liquidDialogDragStateRef = useRef<LiquidDialogDragState | null>(null);
  const easterEggWrapRef = useRef<HTMLSpanElement>(null);
  const easterEggPivotRef = useRef<HTMLSpanElement>(null);
  const easterEggShadowRef = useRef<HTMLSpanElement>(null);

  const getLiquidDialogDragBounds = () => {
    const dialog = liquidDialogRef.current;
    if (!dialog) return { x: 0, y: 0 };

    const rect = dialog.getBoundingClientRect();
    return {
      x: Math.max(0, (window.innerWidth - rect.width) / 2 - LIQUID_DIALOG_EDGE_PADDING),
      y: Math.max(0, (window.innerHeight - rect.height) / 2 - LIQUID_DIALOG_EDGE_PADDING),
    };
  };

  const openDonation = () => {
    liquidDialogDragStateRef.current = null;
    setLiquidDialogPosition({ x: 0, y: 0 });
    setShowEasterEgg(false);
    setShowDonation(true);
  };

  const openEasterEgg = () => {
    liquidDialogDragStateRef.current = null;
    setShowDonation(false);
    setShowEasterEgg(true);
  };

  const handleLiquidDialogDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    liquidDialogDragStateRef.current = {
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      dialogX: liquidDialogPosition.x,
      dialogY: liquidDialogPosition.y,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  };

  const handleLiquidDialogDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dragState = liquidDialogDragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const bounds = getLiquidDialogDragBounds();
    setLiquidDialogPosition({
      x: clamp(
        dragState.dialogX + event.clientX - dragState.pointerX,
        -bounds.x,
        bounds.x,
      ),
      y: clamp(
        dragState.dialogY + event.clientY - dragState.pointerY,
        -bounds.y,
        bounds.y,
      ),
    });
  };

  const handleLiquidDialogDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (liquidDialogDragStateRef.current?.pointerId !== event.pointerId) return;

    liquidDialogDragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  useEffect(() => {
    const eggWrap = easterEggWrapRef.current;
    const eggPivot = easterEggPivotRef.current;
    const eggShadow = easterEggShadowRef.current;
    if (!eggWrap || !eggPivot || !eggShadow) return;

    let busy = false;
    let startTimerId: number | undefined;
    let schedulerTimerId: number | undefined;
    let animationTimerId: number | undefined;

    const clearState = () => {
      eggWrap.classList.remove('is-jumping');
      eggPivot.classList.remove('is-wobbling', 'is-jump-tilt');
      eggShadow.classList.remove('is-jumping');
    };

    const wobble = () => {
      if (busy) return;
      busy = true;
      clearState();
      void eggPivot.offsetWidth;
      eggPivot.classList.add('is-wobbling');
      animationTimerId = window.setTimeout(() => {
        eggPivot.classList.remove('is-wobbling');
        busy = false;
      }, 1240);
    };

    const jump = () => {
      if (busy) return;
      busy = true;
      clearState();
      void eggWrap.offsetWidth;
      eggWrap.classList.add('is-jumping');
      eggPivot.classList.add('is-jump-tilt');
      eggShadow.classList.add('is-jumping');
      animationTimerId = window.setTimeout(() => {
        clearState();
        busy = false;
      }, 980);
    };

    const scheduleMotion = () => {
      const delay = 1600 + Math.random() * 1800;
      schedulerTimerId = window.setTimeout(() => {
        if (!busy) {
          const probability = Math.random();
          if (probability < 0.56) wobble();
          else if (probability < 0.78) jump();
        }
        scheduleMotion();
      }, delay);
    };

    startTimerId = window.setTimeout(() => {
      wobble();
      scheduleMotion();
    }, 900);

    return () => {
      if (startTimerId !== undefined) window.clearTimeout(startTimerId);
      if (schedulerTimerId !== undefined) window.clearTimeout(schedulerTimerId);
      if (animationTimerId !== undefined) window.clearTimeout(animationTimerId);
      clearState();
    };
  }, []);

  useEffect(() => {
    if (!showDonation && !showEasterEgg) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowDonation(false);
        setShowEasterEgg(false);
      }
    };
    const keepDialogInBounds = () => {
      const bounds = getLiquidDialogDragBounds();
      setLiquidDialogPosition((position) => ({
        x: clamp(position.x, -bounds.x, bounds.x),
        y: clamp(position.y, -bounds.y, bounds.y),
      }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', keepDialogInBounds);
    return () => {
      liquidDialogDragStateRef.current = null;
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', keepDialogInBounds);
    };
  }, [showDonation, showEasterEgg]);

  return (
    <>
      <svg
        aria-hidden="true"
        width="0"
        height="0"
        className="pointer-events-none fixed -left-[9999px] overflow-hidden"
      >
        <defs>
          <ChromaticEdgeFilter
            id="donation-dialog-chromatic-edge"
            mapHref={donationEdgeMaps.dialog}
            width={360}
            height={330}
            padding={36}
            scales={[18, 13, 8]}
          />
          <ChromaticEdgeFilter
            id="donation-button-chromatic-edge"
            mapHref={donationEdgeMaps.button}
            width={88}
            height={32}
            padding={12}
            scales={[7, 5, 3]}
          />
        </defs>
      </svg>
      <section aria-labelledby="about-settings-title" className="card card-shadow slide-up rounded-2xl p-3">
        <div className="mb-3 flex items-center gap-2 px-1">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h2 id="about-settings-title" className="text-base font-semibold text-foreground">
            关于
          </h2>
        </div>

        <div className="divide-y divide-border overflow-hidden rounded-xl border border-border/80 bg-background/35">
          <AboutRow label="当前版本">
            <span className="tabular-nums">{appVersion || '读取中…'}</span>
            <VersionUpdateBadge
              appVersion={appVersion}
              checkForUpdate={checkForUpdate}
              openRelease={openRelease}
            />
          </AboutRow>
          <AboutRow label="作者">
            <span>魚肉</span>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={openDonation}
              className="liquid-glass-control liquid-glass-donation-trigger inline-flex h-8 items-center gap-1.5 px-3 text-xs font-semibold"
              {...liquidControlHandlers}
            >
              <Heart className="h-3.5 w-3.5" />
              <span>打赏</span>
            </button>
          </AboutRow>
          <AboutRow label="博客">
            <a
              href="https://zzephyrxx.github.io/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-w-0 items-center gap-1 text-blue-600 hover:underline dark:text-blue-400"
            >
              <span className="truncate">zzephyrxx.github.io</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            </a>
          </AboutRow>
          <AboutRow label="更新日期">
            <span className="tabular-nums">2026.07</span>
            <button
              type="button"
              aria-label="打开彩蛋"
              aria-haspopup="dialog"
              aria-expanded={showEasterEgg}
              onClick={openEasterEgg}
              className="easter-egg-trigger h-8 w-8"
            >
              <span
                ref={easterEggWrapRef}
                data-testid="easter-egg-motion-wrap"
                className="easter-egg-motion-wrap"
              >
                <span
                  ref={easterEggShadowRef}
                  data-testid="easter-egg-shadow"
                  aria-hidden="true"
                  className="easter-egg-shadow"
                />
                <span
                  ref={easterEggPivotRef}
                  data-testid="easter-egg-pivot"
                  className="easter-egg-pivot"
                >
                  <img
                    src="/easter-egg.png"
                    alt=""
                    draggable={false}
                    className="easter-egg-icon"
                  />
                </span>
              </span>
            </button>
          </AboutRow>
        </div>
      </section>

      <section className="card card-shadow slide-up overflow-hidden rounded-2xl">
        <button
          type="button"
          aria-label="公众号"
          aria-expanded={showPublicAccount}
          aria-controls="public-account-content"
          onClick={() => setShowPublicAccount((visible) => !visible)}
          className="flex w-full items-center gap-3 p-3 text-left transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
            <QrCode className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground">公众号</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">关注获取最新版本</p>
          </div>
          {showPublicAccount ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showPublicAccount && (
          <div
            id="public-account-content"
            className="border-t border-border px-3 pb-4 pt-3 text-center"
          >
            <div className="mx-auto w-fit rounded-xl border border-border bg-white p-2 shadow-sm">
              <img src="/gzh.jpg" alt="公众号二维码" className="h-32 w-32 object-contain" />
            </div>
            <p className="mt-2 text-xs font-medium text-foreground">扫码关注「事半」公众号</p>
          </div>
        )}
      </section>
      {showDonation && (
        <div
          data-liquid-glass-overlay
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShowDonation(false);
          }}
        >
          <div
            ref={liquidDialogRef}
            data-liquid-glass-dialog
            role="dialog"
            aria-modal="true"
            aria-labelledby="donation-dialog-title"
            className="liquid-glass-dialog relative w-[min(360px,calc(100vw-32px))] overflow-hidden rounded-[32px] px-6 pb-7 pt-8 text-center animate-scale-in motion-reduce:animate-none"
            style={{ translate: `${liquidDialogPosition.x}px ${liquidDialogPosition.y}px` }}
          >
            <button
              type="button"
              data-glass-circle
              aria-label="关闭打赏弹窗"
              autoFocus
              onClick={() => setShowDonation(false)}
              className="liquid-glass-control liquid-glass-control--circle absolute right-2.5 top-2.5 z-20 flex h-10 w-10 items-center justify-center text-slate-600 dark:text-slate-200"
              {...liquidControlHandlers}
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <div className="relative z-10">
              <div
                data-testid="donation-dialog-drag-handle"
                title="拖动弹窗"
                onPointerDown={handleLiquidDialogDragStart}
                onPointerMove={handleLiquidDialogDragMove}
                onPointerUp={handleLiquidDialogDragEnd}
                onPointerCancel={handleLiquidDialogDragEnd}
                className="-mx-6 -mt-8 cursor-grab touch-none px-6 pb-3 pt-8 active:cursor-grabbing"
              >
                <p
                  id="donation-dialog-title"
                  className="mt-1 text-xs font-medium tracking-[0.08em] text-slate-500 dark:text-slate-300"
                >
                  微信扫码打赏
                </p>
              </div>

              <img
                src="/wxzs.png"
                alt="微信打赏码"
                className="mx-auto mt-5 h-[166px] w-[166px] rounded-full object-cover"
              />

              <p className="mx-auto mt-5 max-w-[280px] text-sm leading-6 text-slate-600">
                您的每一份认可，都是对我的肯定。
              </p>
            </div>
          </div>
        </div>
      )}
      {showEasterEgg && (
        <div
          data-liquid-glass-overlay
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setShowEasterEgg(false);
          }}
        >
          <div
            data-liquid-glass-dialog
            data-testid="easter-egg-preview-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="液态玻璃效果预览"
            className="liquid-glass-dialog liquid-glass-dialog--white-preview relative h-[min(860px,calc(100vh-32px))] w-[min(1080px,calc(100vw-32px))] overflow-hidden rounded-[32px] p-0 text-left animate-scale-in motion-reduce:animate-none"
          >
            <button
              type="button"
              data-glass-circle
              aria-label="关闭彩蛋弹窗"
              autoFocus
              onClick={() => setShowEasterEgg(false)}
              className="liquid-glass-control liquid-glass-control--circle absolute right-3 top-3 z-50 flex h-10 w-10 items-center justify-center text-white"
              {...liquidControlHandlers}
            >
              <X className="h-[18px] w-[18px]" />
            </button>

            <LiquidGlassPreview />
          </div>
        </div>
      )}
    </>
  );
}
