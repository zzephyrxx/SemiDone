import {
  Circle,
  Eye,
  Heart,
  Moon,
  Palette,
  Rocket,
  SlidersHorizontal,
  Sun,
  Droplet,
  Sparkles,
  Minimize2,
} from 'lucide-react';
import { type ReactElement } from 'react';
import type { LiquidGlassSettings, Settings, Theme } from '../../types';
import GlassControls from './GlassControls';
import { AnimatedCollapse } from '../../ui/Disclosure';
import { FontSizeControls, TransparencyControls } from './InterfaceControls';

interface AppearanceSettingsSectionProps {
  settings: Settings;
  onThemeChange: (theme: Theme) => void;
  onLiquidGlassChange: (updates: Partial<LiquidGlassSettings>) => void;
  onToggleAutoStart: () => void;
  autoStartAvailable?: boolean;
  onTransparencyToggle: (enabled: boolean) => void;
  onTransparencyLevelChange: (level: number) => void;
  onToggleCapsuleMode: () => void;
  onCloseToTrayChange?: (enabled: boolean) => void;
  onFontScaleChange?: (value: number) => void;
  onAnimationsChange?: (enabled: boolean) => void;
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
    <div className="settings-tile flex min-h-[76px] items-center gap-3 rounded-xl border border-border/80 bg-background/35 p-3 transition-colors hover:border-primary/25">
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
  autoStartAvailable = true,
  onTransparencyToggle,
  onTransparencyLevelChange,
  onToggleCapsuleMode,
  onCloseToTrayChange,
  onFontScaleChange,
  onAnimationsChange,
}: AppearanceSettingsSectionProps) {
  const transparencyDisabled = settings.theme !== 'dark' && !settings.transparentEnabled;

  return (
    <section
      aria-labelledby="appearance-settings-title"
      className="settings-section card card-shadow rounded-2xl p-3"
    >
      <div className="mb-3 flex items-center gap-2 px-1">
        <SlidersHorizontal className="h-4 w-4 text-blue-500" />
        <h2 id="appearance-settings-title" className="text-base font-semibold text-foreground">
          外观与交互
        </h2>
      </div>

      <div className="appearance-grid grid grid-cols-1 gap-2.5">
        <div className="theme-picker">
          <div className="mb-2 flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
              <Palette className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">主题</p>
            </div>
          </div>
          <div className="theme-options">
            {THEMES.map((theme) => (
              <button
                type="button"
                key={theme}
                onClick={() => onThemeChange(theme)}
                aria-label={`${themeName(theme)}主题`}
                aria-pressed={settings.theme === theme}
                className={`theme-option ${settings.theme === theme ? 'is-selected' : ''}`}
              >
                <span className={`theme-miniature theme-miniature--${theme}`} aria-hidden="true">
                  <span className="theme-miniature-nav"><i /><i /><i /></span>
                  <span className="theme-miniature-content"><i /><span><i /><i /><i /></span><i /><i /></span>
                </span>
                <span className="theme-option-label">{themeIcon(theme)}<span>{themeName(theme)}</span><span className="theme-selection-dot" /></span>
              </button>
            ))}
          </div>
        </div>

        <SettingTile
          icon={<Rocket className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />}
          iconClass="bg-emerald-500/10"
          title="开机自启"
          description={autoStartAvailable ? '开机自动运行' : '请在正式安装版中设置'}
          control={(
            <SettingSwitch
              label="开机自启动"
              checked={settings.autoStart}
              onChange={onToggleAutoStart}
              disabled={!autoStartAvailable}
              accentClass="bg-emerald-500"
            />
          )}
        />

        <div className="setting-control-group" data-testid="transparency-setting">
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
          <AnimatedCollapse open={settings.transparentEnabled === true}>
            <TransparencyControls value={settings.transparentLevel ?? 100} onCommit={onTransparencyLevelChange} />
          </AnimatedCollapse>
        </div>

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

        <SettingTile
          icon={<Minimize2 className="h-5 w-5 text-primary" />}
          iconClass="bg-primary/10"
          title="关闭到托盘"
          description="关闭窗口后继续运行，从托盘恢复；关闭此项后退出应用"
          control={(
            <SettingSwitch label="关闭到托盘" checked={settings.closeToTray !== false}
              onChange={() => onCloseToTrayChange?.(settings.closeToTray === false)} accentClass="bg-primary" />
          )}
        />

        <div className="min-[480px]:col-span-2 rounded-xl border border-border/80 bg-background/35 p-3 transition-colors hover:border-primary/25">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
              <Droplet className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">液态玻璃</p>
              <p className="mt-0.5 text-xs leading-4 text-muted-foreground">仅用于悬浮导航、关键弹窗与实时预览</p>
            </div>
            <SettingSwitch
              label="液态玻璃"
              checked={settings.liquidGlass.enabled}
              onChange={() => {
                onLiquidGlassChange({ enabled: !settings.liquidGlass.enabled });
              }}
              accentClass="bg-cyan-600 dark:bg-cyan-500"
            />
          </div>

          {settings.liquidGlass.enabled && (
            <GlassControls settings={settings.liquidGlass} onCommit={onLiquidGlassChange} />
          )}
        </div>

        <SettingTile icon={<Sparkles className="h-5 w-5 text-primary" />} iconClass="bg-primary/10"
          title="界面动效" description="独立控制导航跟手、任务退场、弹窗与页面过渡；以此开关为准"
          control={<SettingSwitch label="界面动效" checked={settings.animationsEnabled !== false}
            onChange={() => onAnimationsChange?.(settings.animationsEnabled === false)} accentClass="bg-primary" />} />
        <FontSizeControls value={settings.fontScale ?? 100} onCommit={value => onFontScaleChange?.(value)} />

      </div>
    </section>
  );
}
