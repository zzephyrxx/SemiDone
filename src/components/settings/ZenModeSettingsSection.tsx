import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { normalizeZenModeSettings } from '../../utils/zenModeSettings';
import ZenModeAppearance from './ZenModeAppearance';
import ZenIcon from '../icons/ZenIcon';

export default function ZenModeSettingsSection() {
  const zenMode = useSettingsStore((state) => state.settings.zenMode);
  const setZenMode = useSettingsStore((state) => state.setZenMode);
  const settings = normalizeZenModeSettings(zenMode);
  const [expanded, setExpanded] = useState(false);
  return (
    <section aria-labelledby="zen-mode-settings-title" className="card card-shadow rounded-2xl p-3">
      <div className="mb-3 flex items-center gap-3 px-1">
        <ZenIcon variant={settings.enabled ? 'on' : 'off'} className={`h-5 w-5 shrink-0 ${settings.enabled ? 'text-violet-500' : 'text-muted-foreground'}`} />
        <div className="min-w-0 flex-1">
          <h2 id="zen-mode-settings-title" className="text-base font-semibold text-foreground">Zen 模式</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">只看未完成待办，背景透明、文字清晰</p>
        </div>
        <button type="button" role="switch" aria-label="启用 Zen 模式"
          aria-checked={settings.enabled}
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${settings.enabled ? 'bg-violet-600' : 'bg-muted border border-border'}`}
          onClick={() => {
            setExpanded(false);
            void setZenMode({ enabled: !settings.enabled });
          }}>
          <span className={`absolute left-0.5 top-0.5 h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform ${settings.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      <details open={settings.enabled && expanded} className="group rounded-xl border border-border/70">
        <summary aria-disabled={!settings.enabled} tabIndex={settings.enabled ? 0 : -1}
          onClick={(event) => {
            event.preventDefault();
            if (settings.enabled) setExpanded((open) => !open);
          }}
          className={`flex list-none items-center justify-between gap-2 px-3 py-2.5 text-xs font-medium [&::-webkit-details-marker]:hidden ${settings.enabled ? 'cursor-pointer text-foreground' : 'cursor-not-allowed text-muted-foreground opacity-60'}`}>
          Zen 模式配置
          <ChevronDown size={14} className="transition-transform group-open:rotate-180" />
        </summary>
        {settings.enabled && expanded && <div className="px-2 pb-2">
          <ZenModeAppearance settings={settings} onChange={(updates) => void setZenMode(updates)} />
        </div>}
      </details>
    </section>
  );
}
