import { useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { scheduleFrame } from './motion';
type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/** Move the DOM surface, without React renders or changing the optical map per frame. */
export function useDraggableDialog(present: boolean) {
  const surface = useRef<HTMLDivElement>(null);
  const position = useRef({ x: 0, y: 0 });
  const drag = useRef<{ id: number; x: number; y: number; startX: number; startY: number; handle: HTMLElement; bounds: Bounds } | null>(null);
  const frame = useRef<() => void>(() => {});
  const measureBounds = (): Bounds => {
    const node = surface.current;
    if (!node) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };
    const rect = node.getBoundingClientRect();
    const left = rect.left - position.current.x, top = rect.top - position.current.y;
    const limits = (start: number, length: number, viewport: number) => length > viewport - 16
      ? [(viewport - length) / 2 - start, (viewport - length) / 2 - start]
      : [8 - start, viewport - 8 - start - length];
    const [minX, maxX] = limits(left, rect.width, window.innerWidth);
    const [minY, maxY] = limits(top, rect.height, window.innerHeight);
    return { minX, maxX, minY, maxY };
  };
  const constrain = (x: number, y: number, bounds = measureBounds()) => {
    position.current = { x: Math.max(bounds.minX, Math.min(bounds.maxX, x)), y: Math.max(bounds.minY, Math.min(bounds.maxY, y)) };
  };
  const paint = () => {
    if (surface.current) surface.current.style.translate = `${position.current.x}px ${position.current.y}px`;
  };
  const stop = () => {
    const current = drag.current;
    drag.current = null; frame.current(); paint();
    if (surface.current) delete surface.current.dataset.dragging;
    if (current?.handle.hasPointerCapture?.(current.id)) current.handle.releasePointerCapture(current.id);
  };
  useLayoutEffect(() => {
    position.current = { x: 0, y: 0 }; paint();
    if (!present) return;
    const resize = () => { stop(); constrain(position.current.x, position.current.y); paint(); };
    const blur = () => stop();
    window.addEventListener('resize', resize); window.addEventListener('blur', blur);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    if (surface.current) observer?.observe(surface.current);
    return () => { frame.current(); drag.current = null; observer?.disconnect(); window.removeEventListener('resize', resize); window.removeEventListener('blur', blur); };
    // Rebind only when the modal becomes present; drag state itself is imperative.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [present]);
  return { surface, handle: {
    tabIndex: 0,
    onPointerDown: (event: PointerEvent<HTMLElement>) => {
      if (event.button !== 0 || drag.current || (event.target as Element).closest('button,input,a,select,textarea')) return;
      event.preventDefault(); event.stopPropagation();
      const handle = event.currentTarget;
      handle.focus({ preventScroll: true });
      drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, startX: position.current.x, startY: position.current.y, handle, bounds: measureBounds() };
      handle.setPointerCapture?.(event.pointerId);
      if (surface.current) surface.current.dataset.dragging = 'true';
    },
    onPointerMove: (event: PointerEvent<HTMLElement>) => {
      const origin = drag.current;
      if (!origin || origin.id !== event.pointerId) return;
      frame.current();
      constrain(origin.startX + event.clientX - origin.x, origin.startY + event.clientY - origin.y, origin.bounds);
      frame.current = scheduleFrame(paint);
    },
    onPointerUp: (event: PointerEvent<HTMLElement>) => { if (drag.current?.id === event.pointerId) stop(); },
    onPointerCancel: stop,
    onLostPointerCapture: stop,
    onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
      if (event.target !== event.currentTarget) return;
      const step = event.shiftKey ? 24 : 8;
      const delta = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[event.key];
      if (!delta) return;
      event.preventDefault(); frame.current(); paint();
      constrain(position.current.x + delta[0], position.current.y + delta[1]); paint();
    },
  } };
}
