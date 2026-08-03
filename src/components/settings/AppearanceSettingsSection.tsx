import {
  Circle,
  Eye,
  Heart,
  Moon,
  Palette,
  Rocket,
  SlidersHorizontal,
  Sun,
  Waves,
} from 'lucide-react';
import type { ReactElement } from 'react';
import type { LiquidGlassSettings, Settings, Theme } from '../../types';

interface AppearanceSettingsSectionProps {
  settings: Settings;
  onThemeChange: (theme: Theme) => void;
  onLiquidGlassChange: (updates: Partial<LiquidGlassSettings>) => void;
  onToggleAutoStart: () => void;
  onTransparencyToggle: (enabled: boolean) => void;
  onTransparencyLevelChange: (level: number) => void;
  onToggleCapsuleMode: () => void;
}

const THEMES: Theme[] = ['light', 'dark', 'pink'];

function themeName(theme: Theme): string {
  if (theme === 'light') return '明亮';
  if (theme === 'dark') return '深色';
  return '梦粉';
}

function themeIcon(theme: Theme): ReactElement {
  if (theme === 'dark') return <Moon className="h-3.5 w-3.5 text-blue-400" />;
  if (theme === 'pink') return <Heart className="h-3.5 w-3.5 text-rose-500" />;
  return <Sun className="h-3.5 w-3.5 text-amber-500" />;
}

interface SwitchProps {
  label: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  accentClass: string;
}

function SettingSwitch({
  label,
  checked,
  onChange,
  disabled = false,
  accentClass,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-label={label}
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-6 w-11 shrink-0 rounded-full border border-border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-45 ${
        checked ? accentClass : 'bg-muted'
      }`}
    >
      <span
        className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

interface SettingTileProps {
  icon: ReactElement;
  iconClass: string;
  title: string;
  description: string;
  control: ReactElement;
}

function SettingTile({ icon, iconClass, title, description, control }: SettingTileProps) {
  return (
    <div className="flex min-h-[88px] items-center gap-3 rounded-xl border border-border/80 bg-background/35 p-3 transition-colors hover:border-primary/25">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs leading-4 text-muted-foreground">{description}</p>
      </div>
      {control}
    </div>
  );
}

export default function AppearanceSettingsSection({
  settings,
  onThemeChange,
  onLiquidGlassChange,
  onToggleAutoStart,
  onTransparencyToggle,
  onTransparencyLevelChange,
  onToggleCapsuleMode,
}: AppearanceSettingsSectionProps) {
  const transparencyDisabled = settings.theme !== 'dark' && !settings.transparentEnabled;

  return (
    <section
      aria-labelledby="appearance-settings-title"
      className="card card-shadow slide-up rounded-2xl p-3"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <SlidersHorizontal className="h-4 w-4 text-blue-500" />
        <h2 id="appearance-settings-title" className="text-base font-semibold text-foreground">
          外观与交互
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-2.5 min-[480px]:grid-cols-2">
        <div className="min-h-[88px] rounded-xl border border-border/80 bg-background/35 p-3 transition-colors hover:border-primary/25">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Palette className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">主题</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted/70 p-1">
            {THEMES.map((theme) => (
              <button
                type="button"
                key={theme}
                onClick={() => onThemeChange(theme)}
                aria-label={`${themeName(theme)}主题`}
                aria-pressed={settings.theme === theme}
                className={`flex items-center justify-center gap-1 rounded-md px-1.5 py-1.5 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                  settings.theme === theme
                    ? 'bg-card text-foreground shadow-sm ring-1 ring-border'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {themeIcon(theme)}
                <span>{themeName(theme)}</span>
              </button>
            ))}
          </div>
        </div>

        <SettingTile
          icon={<Rocket className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconClass="bg-emerald-500/10"
          title="开机自启"
          description="开机自动运行"
          control={(
            <SettingSwitch
              label="开机自启动"
              checked={settings.autoStart}
              onChange={onToggleAutoStart}
              accentClass="bg-emerald-500"
            />
          )}
        />

        <SettingTile
          icon={<Eye className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />}
          iconClass="bg-cyan-500/10"
          title="透明模式"
          description={settings.theme === 'dark' ? '让窗口背景半透明' : '深色主题可用'}
          control={(
            <SettingSwitch
              label="透明模式"
              checked={settings.transparentEnabled ?? false}
              onChange={() => onTransparencyToggle(!(settings.transparentEnabled ?? false))}
              disabled={transparencyDisabled}
              accentClass="bg-cyan-500"
            />
          )}
        />

        <SettingTile
          icon={<Circle className="h-5 w-5 text-violet-600 dark:text-violet-400" />}
          iconClass="bg-violet-500/10"
          title="悬浮球"
          description="折叠为悬浮球"
          control={(
            <SettingSwitch
              label="悬浮球模式"
              checked={settings.useCapsuleMode ?? false}
              onChange={onToggleCapsuleMode}
              accentClass="bg-violet-500"
            />
          )}
        />

        <div className="min-[480px]:col-span-2 rounded-xl border border-border/80 bg-background/35 p-3 transition-colors hover:border-primary/25">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Waves className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">液态玻璃效果</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">应用于常用弹窗，并跟随当前主题</p>
            </div>
            <SettingSwitch
              label="液态玻璃效果"
              checked={settings.liquidGlass.enabled}
              onChange={() => onLiquidGlassChange({ enabled: !settings.liquidGlass.enabled })}
              accentClass="bg-cyan-600 dark:bg-cyan-500"
            />
          </div>

          {settings.liquidGlass.enabled && (
            <div
              data-testid="liquid-glass-controls"
              className="mt-3 grid grid-cols-1 gap-3 border-t border-border/70 pt-3 min-[520px]:grid-cols-[1fr_1fr_auto]"
            >
              <label className="min-w-0">
                <span className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">模糊程度</span>
                  <output className="tabular-nums text-muted-foreground">
                    {settings.liquidGlass.blur} / 10
                  </output>
                </span>
                <input
                  type="range"
                  aria-label="模糊程度"
                  min="1"
                  max="10"
                  step="1"
                  value={settings.liquidGlass.blur}
                  onChange={(event) => onLiquidGlassChange({ blur: Number(event.target.value) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed"
                />
              </label>

              <label className="min-w-0">
                <span className="mb-1.5 flex items-center justify-between gap-2 text-xs">
                  <span className="font-medium text-foreground">折射强度</span>
                  <output className="tabular-nums text-muted-foreground">
                    {settings.liquidGlass.refraction}%
                  </output>
                </span>
                <input
                  type="range"
                  aria-label="折射强度"
                  min="0"
                  max="100"
                  step="1"
                  value={settings.liquidGlass.refraction}
                  onChange={(event) => onLiquidGlassChange({ refraction: Number(event.target.value) })}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary disabled:cursor-not-allowed"
                />
              </label>

              <div className="flex min-w-[118px] items-center justify-between gap-3 min-[520px]:border-l min-[520px]:border-border/70 min-[520px]:pl-3">
                <div>
                  <p className="text-xs font-medium text-foreground">色散效果</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">边缘轻微分色</p>
                </div>
                <SettingSwitch
                  label="色散效果"
                  checked={settings.liquidGlass.dispersion}
                  onChange={() => onLiquidGlassChange({ dispersion: !settings.liquidGlass.dispersion })}
                  accentClass="bg-cyan-600 dark:bg-cyan-500"
                />
              </div>
            </div>
          )}
        </div>

        {settings.transparentEnabled && (
          <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 min-[480px]:col-span-2">
            <div className="mb-2 flex items-center justify-between text-xs">
              <label htmlFor="transparency-level" className="font-medium text-foreground">
                窗口透明度
              </label>
              <span className="tabular-nums text-muted-foreground">
                {settings.transparentLevel ?? 100}%
              </span>
            </div>
            <input
              id="transparency-level"
              type="range"
              aria-label="透明度"
              min="1"
              max="100"
              step="1"
              value={settings.transparentLevel ?? 100}
              onChange={(event) => onTransparencyLevelChange(Number(event.target.value))}
              className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-cyan-500/15 accent-cyan-500"
            />
          </div>
        )}
      </div>
    </section>
  );
}
