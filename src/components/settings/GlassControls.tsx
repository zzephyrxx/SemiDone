import type { LiquidGlassSettings } from '../../types';
import { normalizeGlassPresetSettings } from '../../utils/liquidGlassSettings';
import LiquidGlassPreview from './LiquidGlassPreview';

export default function GlassControls({ settings, onCommit }: {
  settings: LiquidGlassSettings; onCommit: (updates: Partial<LiquidGlassSettings>) => void;
}) {
  const glass = normalizeGlassPresetSettings(settings);
  return <div className="ui-glass-controls">
    <div data-testid="liquid-glass-controls" role="group" aria-label="液态玻璃预设" className="glass-presets">
      {([{ id: 'standard', name: '标准', description: '柔和磨砂，清晰克制' },
        { id: 'extreme', name: '极致', description: '轻微放大，渐变色散' }] as const).map(preset => (
        <button key={preset.id} type="button" aria-pressed={glass.preset === preset.id}
          className="glass-preset" onClick={() => {
            if (glass.preset !== preset.id) onCommit(normalizeGlassPresetSettings({ ...glass, preset: preset.id }));
          }}>
          <span>{preset.name}</span><small>{preset.description}</small>
        </button>
      ))}
    </div>
    <LiquidGlassPreview settings={glass} />
  </div>;
}
