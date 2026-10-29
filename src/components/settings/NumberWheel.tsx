import { useCallback, useId, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';

interface Props {
  label: string;
  min: number;
  max: number;
  value: number;
  suffix?: string;
  onChange: (value: number) => void;
}

const ROW_HEIGHT = 20;
const WHEEL_THRESHOLD = 48;
const WHEEL_STEP_INTERVAL = 90;

/** A three-row, scroll-snapping picker; persist once a scroll or drag settles. */
export default function NumberWheel({ label, min, max, value, suffix = '', onChange }: Props) {
  const id = useId();
  const scroller = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState(value);
  const latest = useRef({ value, onChange }); latest.current = { value, onChange };
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pendingValue = useRef<number | null>(null);
  const drag = useRef<{ id: number; y: number; top: number; moved: boolean; option?: number } | null>(null);
  const blockClick = useRef(false);
  const clamp = useCallback((next: number) => Math.min(max, Math.max(min, Math.round(next))), [min, max]);
  const atScroll = useCallback(() => clamp(min + (scroller.current?.scrollTop ?? 0) / ROW_HEIGHT), [clamp, min]);

  const select = useCallback((next: number) => {
    clearTimeout(timer.current);
    pendingValue.current = null;
    const selected = clamp(next);
    setDraft(selected);
    if (scroller.current) scroller.current.scrollTop = (selected - min) * ROW_HEIGHT;
    if (selected !== latest.current.value) latest.current.onChange(selected);
  }, [clamp, min]);

  useLayoutEffect(() => {
    clearTimeout(timer.current);
    pendingValue.current = null;
    setDraft(value);
    if (scroller.current) scroller.current.scrollTop = (value - min) * ROW_HEIGHT;
    return () => clearTimeout(timer.current);
  }, [value, min]);

  useLayoutEffect(() => () => {
    clearTimeout(timer.current);
    const pending = pendingValue.current;
    if (!drag.current && pending !== null && pending !== latest.current.value) latest.current.onChange(pending);
  }, []);

  useLayoutEffect(() => {
    const node = scroller.current;
    if (!node) return;
    let remainder = 0, direction = 0, lastEvent = 0, lastStep = -Infinity;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || !event.deltaY || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      // WebView wheel events otherwise scroll several rows per mouse notch.
      event.preventDefault();
      if (drag.current) return;
      const now = Date.now(), nextDirection = Math.sign(event.deltaY);
      if (nextDirection !== direction || now - lastEvent > 180) {
        remainder = 0; lastStep = -Infinity;
      }
      direction = nextDirection; lastEvent = now;
      const pixels = event.deltaMode === 0 ? Math.min(Math.abs(event.deltaY), WHEEL_THRESHOLD) : WHEEL_THRESHOLD;
      remainder = Math.min(WHEEL_THRESHOLD, remainder + pixels);
      if (remainder < WHEEL_THRESHOLD || now - lastStep < WHEEL_STEP_INTERVAL) return;
      remainder = 0; lastStep = now;
      const next = clamp(atScroll() + direction);
      node.scrollTop = (next - min) * ROW_HEIGHT;
      setDraft(next); pendingValue.current = next;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => select(atScroll()), 120);
    };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, [atScroll, clamp, min, select]);

  const finishDrag = (id: number, cancelled = false) => {
    if (drag.current?.id !== id) return;
    const { moved, option } = drag.current;
    blockClick.current = moved;
    drag.current = null;
    const node = scroller.current;
    if (node) {
      delete node.dataset.dragging;
      if (node.hasPointerCapture?.(id)) node.releasePointerCapture(id);
    }
    if (cancelled) select(latest.current.value);
    else if (moved) select(atScroll());
    else if (option !== undefined) select(option);
  };

  return <div className="zen-number-wheel" style={{ '--wheel-row-height': `${ROW_HEIGHT}px` } as CSSProperties}>
    <span id={id} className="zen-wheel-label">{label}</span>
    <div className="zen-wheel-frame">
      <div ref={scroller} className="zen-wheel-scroll" role="spinbutton" tabIndex={0}
        aria-labelledby={id} aria-valuemin={min} aria-valuemax={max} aria-valuenow={draft} aria-valuetext={`${draft}${suffix}`}
        onScroll={() => {
          const next = atScroll();
          pendingValue.current = next;
          setDraft(next);
          clearTimeout(timer.current);
          if (!drag.current) timer.current = setTimeout(() => select(atScroll()), 120);
        }}
        onBlur={() => { if (!drag.current && pendingValue.current !== null) select(atScroll()); }}
        onKeyDown={event => {
          const next = { ArrowUp: draft + 1, ArrowDown: draft - 1, PageUp: draft + 10, PageDown: draft - 10, Home: min, End: max }[event.key];
          if (next === undefined) return;
          event.preventDefault(); select(next);
        }}
        onPointerDown={event => {
          if (event.pointerType === 'touch' || event.button !== 0) return;
          event.preventDefault();
          event.currentTarget.focus();
          const option = (event.target as Element).closest<HTMLElement>('[data-wheel-value]')?.dataset.wheelValue;
          drag.current = { id: event.pointerId, y: event.clientY, top: event.currentTarget.scrollTop, moved: false, option: option === undefined ? undefined : Number(option) };
          blockClick.current = false;
          event.currentTarget.setPointerCapture?.(event.pointerId);
          clearTimeout(timer.current);
        }}
        onPointerMove={event => {
          const current = drag.current;
          if (!current || current.id !== event.pointerId) return;
          const distance = current.y - event.clientY;
          if (!current.moved && Math.abs(distance) < 4) return;
          current.moved = true;
          event.currentTarget.dataset.dragging = 'true';
          event.currentTarget.scrollTop = Math.max(0, Math.min((max - min) * ROW_HEIGHT, current.top + distance));
          setDraft(atScroll());
        }}
        onPointerUp={event => finishDrag(event.pointerId)}
        onPointerCancel={event => finishDrag(event.pointerId, true)}
        onLostPointerCapture={event => finishDrag(event.pointerId)}
        onClickCapture={event => {
          if (blockClick.current) { event.preventDefault(); event.stopPropagation(); blockClick.current = false; }
        }}
      >
        {Array.from({ length: max - min + 1 }, (_, index) => min + index).map(option => (
          <button key={option} type="button" tabIndex={-1} aria-hidden="true" className="zen-wheel-value" data-wheel-value={option} data-selected={option === draft}
            onClick={() => select(option)}>{option}<span>{suffix}</span></button>
        ))}
      </div>
    </div>
  </div>;
}
