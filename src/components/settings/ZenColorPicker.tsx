import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import { X } from 'lucide-react';

interface HSV { h: number; s: number; v: number }
interface Props { label: string; value: string; onChange: (color: string) => void; onClose: () => void }
const SWATCHES = ['#f1f5f9', '#0f172a', '#64748b', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#a78bfa'];
const clamp = (value: number) => Math.min(100, Math.max(0, value));

function fromHex(hex: string, fallbackHue = 0): HSV {
  const [r, g, b] = [1, 3, 5].map((index) => parseInt(hex.slice(index, index + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  const hue = !delta ? fallbackHue : max === r ? ((g - b) / delta) % 6
    : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return { h: delta ? (hue * 60 + 360) % 360 : fallbackHue, s: max ? delta / max * 100 : 0, v: max * 100 };
}

function toHex({ h, s, v }: HSV): string {
  const c = v / 100 * s / 100, x = c * (1 - Math.abs(h / 60 % 2 - 1)), m = v / 100 - c;
  const rgb = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return '#' + rgb.map((channel) => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('');
}

// Keep selection inside the WebView: native color dialogs can sit behind a pinned window.
export default function ZenColorPicker({ label, value, onChange, onClose }: Props) {
  const [hsv, setHsv] = useState(() => fromHex(value));
  const [hex, setHex] = useState(value);
  const emitted = useRef(value);
  const dragging = useRef<number | null>(null);
  const hintId = useId();

  useEffect(() => {
    if (value !== emitted.current) {
      setHsv((current) => fromHex(value, current.h));
      setHex(value);
      emitted.current = value;
    }
  }, [value]);

  const update = (next: HSV) => {
    const color = toHex(next);
    setHsv(next);
    setHex(color);
    emitted.current = color;
    onChange(color);
  };
  const chooseHex = (color: string) => {
    setHex(color);
    const normalized = color.startsWith('#') ? color : '#' + color;
    if (/^#[\da-f]{6}$/i.test(normalized)) {
      const next = normalized.toLowerCase();
      setHsv((current) => fromHex(next, current.h));
      emitted.current = next;
      onChange(next);
    }
  };
  const selectAt = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    update({ ...hsv, s: clamp((event.clientX - rect.left) / rect.width * 100),
      v: clamp((rect.bottom - event.clientY) / rect.height * 100) });
  };
  const adjust = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    event.preventDefault();
    update({ ...hsv, s: clamp(hsv.s + (event.key === 'ArrowLeft' ? -step : event.key === 'ArrowRight' ? step : 0)),
      v: clamp(hsv.v + (event.key === 'ArrowDown' ? -step : event.key === 'ArrowUp' ? step : 0)) });
  };

  return (
    <section className="zen-color-picker" aria-label={label + '调色盘'} onKeyDown={(event) => {
      if (event.key === 'Escape') { event.stopPropagation(); onClose(); }
    }}>
      <div className="zen-color-picker-heading"><span>{label}</span>
        <button type="button" aria-label="收起调色盘" onClick={onClose}><X size={14} /></button>
      </div>
      <div className="zen-color-plane" role="group" tabIndex={0} aria-label={label + '饱和度与明度'}
        aria-describedby={hintId} style={{ backgroundColor: 'hsl(' + hsv.h + ' 100% 50%)' }}
        onKeyDown={adjust}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragging.current = event.pointerId;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          event.currentTarget.focus();
          selectAt(event);
        }}
        onPointerMove={(event) => { if (dragging.current === event.pointerId) selectAt(event); }}
        onPointerUp={(event) => {
          dragging.current = null;
          if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
        }}
        onPointerCancel={() => { dragging.current = null; }} onLostPointerCapture={() => { dragging.current = null; }}>
        <span className="zen-color-cursor" style={{ left: hsv.s + '%', top: (100 - hsv.v) + '%' }} />
      </div>
      <span id={hintId} className="sr-only">拖动选色；左右方向键调整饱和度，上下方向键调整明度，Shift 加速。</span>
      <label className="zen-color-hue"><span className="sr-only">{label}色相</span>
        <input type="range" min={0} max={359} value={Math.round(hsv.h)}
          onChange={(event) => update({ ...hsv, h: Number(event.target.value) })} />
      </label>
      <div className="zen-color-swatches">{SWATCHES.map((color) => (
        <button key={color} type="button" aria-label={'选择颜色 ' + color.toUpperCase()}
          aria-pressed={value.toLowerCase() === color} style={{ backgroundColor: color }} onClick={() => chooseHex(color)} />
      ))}</div>
      <label className="zen-color-hex"><span>HEX</span>
        <input type="text" aria-label={label + '色值'} value={hex.toUpperCase()} maxLength={7} spellCheck={false}
          onChange={(event) => chooseHex(event.target.value)} onBlur={() => setHex(value)}
          onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
      </label>
    </section>
  );
}
