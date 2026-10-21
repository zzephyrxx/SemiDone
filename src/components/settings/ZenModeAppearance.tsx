import { useId, useRef, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import ParameterSlider from './ParameterSlider';
import ZenColorPicker from './ZenColorPicker';
import type { ZenModeSettings } from '../../types';
import { DEFAULT_ZEN_MODE_SETTINGS, zenModeStyle } from '../../utils/zenModeSettings';

interface Props {
  settings: ZenModeSettings;
  onChange: (updates: Partial<ZenModeSettings>) => void;
}

const COLORS = [
  { key: 'textColor', label: '文字颜色' },
  { key: 'rowColor', label: '每行底色' },
  { key: 'backgroundColor', label: '面板底色' },
] as const;

export default function ZenModeAppearance({ settings, onChange }: Props) {
  const [editingColor, setEditingColor] = useState<{ key: (typeof COLORS)[number]['key']; label: string } | null>(null);
  const editorId = useId();
  const colorButtons = useRef<Partial<Record<(typeof COLORS)[number]['key'], HTMLButtonElement | null>>>({});
  const closePicker = () => {
    if (editingColor) colorButtons.current[editingColor.key]?.focus();
    setEditingColor(null);
  };
  return (
    <div className="zen-appearance">
      <ParameterSlider label="字体大小" min={12} max={28} value={settings.fontSize} suffix=" px"
        onChange={(fontSize) => onChange({ fontSize })} />
      <div className="zen-color-grid">
        {COLORS.map(({ key, label }) => (
          <div key={key} className="zen-color-field">
            <span>{label}</span>
            <button type="button" className="zen-color-trigger" aria-label={label}
              ref={(element) => { colorButtons.current[key] = element; }}
              aria-expanded={editingColor?.key === key} aria-controls={editingColor?.key === key ? editorId : undefined}
              onClick={() => setEditingColor((current) => current?.key === key ? null : { key, label })}>
              <span style={{ backgroundColor: settings[key] }} />
            </button>
            <span className="zen-color-value">{settings[key].toUpperCase()}</span>
          </div>
        ))}
      </div>
      {editingColor && <div id={editorId} className="zen-color-editor">
        <ZenColorPicker key={editingColor.key} label={editingColor.label} value={settings[editingColor.key]}
          onChange={(color) => onChange({ [editingColor.key]: color })} onClose={closePicker} />
      </div>}
      {([
        { key: 'backgroundOpacity', label: '面板不透明度' },
        { key: 'rowOpacity', label: '每行底色不透明度' },
      ] as const).map(({ key, label }) => (
        <ParameterSlider key={key} label={label} min={0} max={100} value={settings[key]} suffix="%"
          onChange={(value) => onChange({ [key]: value })} />
      ))}
      <div className="zen-preview-checker" aria-label="Zen 模式外观预览">
        <div className="zen-preview" style={zenModeStyle(settings)}>
          <span className="zen-preview-row"><span aria-hidden="true">○</span> 专注眼前的一件事</span>
        </div>
      </div>
      <div className="zen-appearance-footer">
        <span>0% 全透明 · 100% 不透明</span>
        <button type="button" onClick={() => onChange({
          fontSize: DEFAULT_ZEN_MODE_SETTINGS.fontSize,
          textColor: DEFAULT_ZEN_MODE_SETTINGS.textColor,
          rowColor: DEFAULT_ZEN_MODE_SETTINGS.rowColor,
          backgroundColor: DEFAULT_ZEN_MODE_SETTINGS.backgroundColor,
          backgroundOpacity: DEFAULT_ZEN_MODE_SETTINGS.backgroundOpacity,
          rowOpacity: DEFAULT_ZEN_MODE_SETTINGS.rowOpacity,
        })}>
          <RotateCcw size={12} /> 恢复默认
        </button>
      </div>
    </div>
  );
}
