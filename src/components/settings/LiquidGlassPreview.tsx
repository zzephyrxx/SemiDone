import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, Circle } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { LiquidGlassSettings } from '../../types';
import { liquidGlassBlurLevelToPixels, normalizeLiquidGlassSettings } from '../../utils/liquidGlassSettings';
import { LiquidGlassFilters } from '../LiquidGlassRuntime';

export default function LiquidGlassPreview({ settings }: { settings: LiquidGlassSettings }) {
  const scene = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number } | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const constrain = useCallback((next: { x: number; y: number }) => {
    if (!scene.current || !card.current) return next;
    const maxX = Math.max(0, (scene.current.clientWidth - card.current.offsetWidth) / 2 - 8);
    const maxY = Math.max(0, (scene.current.clientHeight - card.current.offsetHeight) / 2 - 8);
    return { x: Math.max(-maxX, Math.min(maxX, next.x)), y: Math.max(-maxY, Math.min(maxY, next.y)) };
  }, []);
  useEffect(() => {
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => setPosition((current) => {
      const next = constrain(current);
      return next.x === current.x && next.y === current.y ? current : next;
    }));
    if (scene.current) observer.observe(scene.current);
    if (card.current) observer.observe(card.current);
    return () => observer.disconnect();
  }, [constrain]);
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const prefix = `semidone-preview-${id}`;
  const glass = normalizeLiquidGlassSettings(settings);
  const blur = liquidGlassBlurLevelToPixels(glass.blur);
  const filterId = `${prefix}-${glass.dispersion ? 'chromatic-refraction' : 'refraction'}`;
  const filter = `url(#${filterId}) blur(${blur}px) saturate(${glass.dispersion ? '1.38' : '1.22'})`;
  const style = {
    '--liquid-glass-dialog-blur': `${blur}px`,
    backdropFilter: filter,
    WebkitBackdropFilter: filter,
    translate: `${position.x}px ${position.y}px`,
  } as CSSProperties;

  return (
    <figure aria-label="液态玻璃实时预览" className="liquid-glass-preview">
      <figcaption className="mb-2 flex flex-wrap items-center justify-between gap-1 text-[11px]">
        <span className="font-medium text-foreground">实时预览</span>
        <span className="text-muted-foreground">模糊 {glass.blur} · 折射 {glass.refraction}% · 色散{glass.dispersion ? '开' : '关'}</span>
      </figcaption>
      <div ref={scene} className="liquid-glass-preview-scene">
        <div aria-hidden="true" className="liquid-glass-preview-backdrop">
          <div className="liquid-glass-preview-orb liquid-glass-preview-orb-blue" />
          <div className="liquid-glass-preview-orb liquid-glass-preview-orb-pink" />
          <span>SEMIDONE</span>
          <span>保持专注，轻松完成</span>
        </div>
        <div ref={card} className={`liquid-glass-modal-surface liquid-glass-preview-card${dragging ? ' is-dragging' : ''}`}
          style={style} tabIndex={0} role="group" aria-label="可拖动的玻璃预览小窗"
          title="拖动小窗，或使用方向键移动，预览不同背景下的玻璃效果"
          onPointerDown={(event) => {
            if (event.button !== 0 || drag.current) return;
            event.preventDefault();
            event.currentTarget.focus({ preventScroll: true });
            drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.x, startY: position.y };
            event.currentTarget.setPointerCapture(event.pointerId);
            setDragging(true);
          }}
          onPointerMove={(event) => {
            const origin = drag.current;
            if (!origin || origin.id !== event.pointerId) return;
            setPosition(constrain({ x: origin.startX + event.clientX - origin.x, y: origin.startY + event.clientY - origin.y }));
          }}
          onPointerUp={(event) => {
            if (drag.current?.id !== event.pointerId) return;
            drag.current = null;
            setDragging(false);
            event.currentTarget.releasePointerCapture(event.pointerId);
          }}
          onPointerCancel={() => { drag.current = null; setDragging(false); }}
          onLostPointerCapture={() => { drag.current = null; setDragging(false); }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 20 : 8;
            const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
            if (!delta) return;
            event.preventDefault();
            setPosition((current) => constrain({ x: current.x + delta[0], y: current.y + delta[1] }));
          }}>
          <span className="liquid-glass-preview-card-label">今日待办</span>
          <div className="liquid-glass-preview-task"><Circle size={14} /><span>专注做好一件事</span></div>
          <div className="liquid-glass-preview-task liquid-glass-preview-task-done"><Check size={14} /><span>给自己留一点空白</span></div>
        </div>
      </div>
      <LiquidGlassFilters settings={glass} idPrefix={prefix} />
    </figure>
  );
}
