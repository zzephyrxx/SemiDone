import type { LiquidGlassSettings } from '../../types';
import { normalizeGlassPresetSettings } from '../../utils/liquidGlassSettings';

export default function GlassControls({ settings, onCommit }: {
  settings: LiquidGlassSettings; onCommit: (updates: Partial<LiquidGlassSettings>) => void;
}) {
  const glass = normalizeGlassPresetSettings(settings);
  return <div className="ui-glass-controls">
    <div data-testid="liquid-glass-controls" role="group" aria-label="液态玻璃预设" className="glass-presets">
      {([{ id: 'standard', name: '标准', description: '柔和磨砂，清晰克制' },
        { id: 'extreme', name: '极致', description: '清透折射，细腻高光' }] as const).map(preset => (
        <button key={preset.id} type="button" aria-pressed={glass.preset === preset.id}
          className="glass-preset" onClick={() => {
            if (glass.preset !== preset.id) onCommit(normalizeGlassPresetSettings({ ...glass, preset: preset.id }));
          }}>
          <span>{preset.name}</span><small>{preset.description}</small>
        </button>
      ))}
    </div>
  </div>;
}
