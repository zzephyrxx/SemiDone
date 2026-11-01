import { useState } from 'react';
import { Palette, Check } from '../../ui/icons';
import { GlassButton } from '../../ui/GlassButton';
import { ACCENT_PRESETS } from '../../utils/accentColor';
import ZenColorPicker from './ZenColorPicker';

export default function AccentColorControls({ value, onChange }: {
  value?: string; onChange: (color?: string) => void;
}) {
  const [customizing, setCustomizing] = useState(false);
  const [draft, setDraft] = useState(value ?? '#3b82f6');
  return <div className="accent-color-controls appearance-setting-row">
    <div className="flex items-center gap-2">
      <Palette className="h-5 w-5 text-violet-600 dark:text-violet-400" />
      <div className="min-w-0 flex-1"><p className="text-sm font-semibold">主题色</p>
        <p className="mt-0.5 text-xs text-muted-foreground">点缀按钮与进度，保留主题本色</p></div>
    </div>
    <div className="accent-color-options">
      <button type="button" className="accent-color-default" aria-pressed={!value}
        onClick={() => { onChange(undefined); setCustomizing(false); }}>默认</button>
      {ACCENT_PRESETS.map(({ name, color }) => <button key={color} type="button"
        className="accent-color-swatch" aria-label={`${name}主题色`} aria-pressed={value === color}
        style={{ '--swatch-color': color } as React.CSSProperties}
        onClick={() => { onChange(color); setCustomizing(false); }}>
        {value === color && <Check size={16} />}
      </button>)}
      <GlassButton aria-expanded={customizing} onClick={() => {
        setDraft(value ?? '#3b82f6'); setCustomizing(!customizing);
      }}>{value && !ACCENT_PRESETS.some(preset => preset.color === value) &&
        <span aria-hidden="true" className="mr-1.5 inline-block h-3 w-3 rounded-full" style={{ backgroundColor: value }} />}
        自定义</GlassButton>
    </div>
    {customizing && <div className="mt-3">
      <ZenColorPicker label="主题色" value={draft} onChange={setDraft} onClose={() => setCustomizing(false)} />
      <div className="mt-2 flex justify-end"><GlassButton onClick={() => {
        onChange(draft); setCustomizing(false);
      }}>应用主题色</GlassButton></div>
    </div>}
  </div>;
}
