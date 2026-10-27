import { useMemo } from 'react';
import { useCommittedDraft } from '../../ui/useCommittedDraft';
import ParameterSlider from './ParameterSlider';

export function FontSizeControls({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const stored = useMemo(() => ({ value }), [value]);
  const { draft, preview, commit } = useCommittedDraft(stored, update => { if (update.value !== undefined) onCommit(update.value); });
  return <div className="interface-font-control">
    <div className="interface-font-preview" style={{ fontSize: `${14 * draft.value / 100}px` }}>
      <strong>Aa 字体预览</strong><span>专注做好一件事，让每个待办清晰易读。</span>
    </div>
    <ParameterSlider label="全局字体大小" value={draft.value} min={90} max={130} step={5} suffix="%"
      onChange={value => preview({ value })} onCommit={commit} />
    <button type="button" className="interface-reset" disabled={draft.value === 100} onClick={() => { preview({ value: 100 }); commit(); }}>恢复默认大小</button>
  </div>;
}

export function TransparencyControls({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const stored = useMemo(() => ({ value }), [value]);
  const { draft, preview, commit } = useCommittedDraft(stored, update => { if (update.value !== undefined) onCommit(update.value); });
  return <div className="setting-control-body"><ParameterSlider label="窗口透明度" value={draft.value} min={1} max={100} suffix="%"
    onChange={value => { preview({ value }); document.documentElement.style.setProperty('--window-opacity', String(value / 100)); }} onCommit={commit} /></div>;
}
