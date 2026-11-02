import { ChevronDown, SlidersHorizontal } from '../../ui/icons';
import { useState } from 'react';
import { useSettingsStore } from '../../store/settingsStore';
import { normalizeZenModeSettings } from '../../utils/zenModeSettings';
import ZenModeAppearance from './ZenModeAppearance';
import ZenIcon from '../icons/ZenIcon';
import { Surface } from '../../ui/Surface';

export default function ZenModeSettingsSection() {
  const zenMode = useSettingsStore((state) => state.settings.zenMode);
  const setZenMode = useSettingsStore((state) => state.setZenMode);
  const settings = normalizeZenModeSettings(zenMode);
  const [expanded, setExpanded] = useState(false);
  return (
    <Surface role="dialog" htmlRole="region" aria-labelledby="zen-mode-settings-title" className="zen-settings-panel p-3">
      <div className={`flex items-center gap-3 px-1 ${settings.enabled ? 'mb-3' : ''}`}>
        <ZenIcon variant={settings.enabled ? 'on' : 'off'} size={22}
          className="text-violet-600 dark:text-violet-400" />
        <div className="min-w-0 flex-1">
          <h2 id="zen-mode-settings-title" className="text-base font-semibold text-foreground">Zen 模式</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">只看未完成待办，背景透明、文字清晰</p>
        </div>
        <button type="button" role="switch" aria-label="启用 Zen 模式"
          aria-checked={settings.enabled}
          className={`zen-mode-switch transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 ${settings.enabled ? 'bg-violet-600' : 'bg-muted'}`}
          onClick={() => {
            setExpanded(false);
            void setZenMode({ enabled: !settings.enabled });
          }}>
          <span aria-hidden="true" />
        </button>
      </div>
      {settings.enabled && <details open={expanded} className="zen-config-disclosure group">
        <summary
          onClick={(event) => {
            event.preventDefault();
            setExpanded((open) => !open);
          }}
          className="zen-config-summary">
          <SlidersHorizontal size={16} />
          <span>Zen 模式配置</span>
          <ChevronDown size={16} className={expanded ? 'rotate-180' : ''} />
        </summary>
        {expanded && <div className="px-2 pb-2">
          <ZenModeAppearance settings={settings} onChange={(updates) => void setZenMode(updates)} />
        </div>}
      </details>}
    </Surface>
  );
}
