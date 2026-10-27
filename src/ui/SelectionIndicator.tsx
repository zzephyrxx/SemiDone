import { useLayoutEffect, useRef, type RefObject } from 'react';

/** Paint pointer movement directly; navigation only commits on release. */
export function useSelectionIndicator(ref: RefObject<HTMLElement>, selected: string, onSelect?: (item: HTMLElement) => void) {
  const commit = useRef(onSelect); commit.current = onSelect;
  const refresh = useRef<() => void>(() => {});
  const shape = selected.split(':').slice(1).join(':');
  useLayoutEffect(() => {
    const host = ref.current;
    if (!host) return;
    type Box = { item: HTMLElement; x: number; y: number; width: number; height: number };
    let pointer: { id: number; startX: number; startY: number; dragged: boolean; boxes: Box[]; vertical: boolean; at: Box } | null = null;
    let frame = 0, suppressClick = false;
    let releaseClick: ReturnType<typeof setTimeout> | undefined;
    const boxes = () => Array.from(host.querySelectorAll<HTMLElement>('.workspace-nav-link')).map(item => ({ item, x: item.offsetLeft, y: item.offsetTop, width: item.offsetWidth, height: item.offsetHeight }));
    const paint = (box: Omit<Box, 'item'>) => {
      host.style.setProperty('--selection-opacity', '1');
      for (const [key, value] of Object.entries(box)) if (typeof value === 'number') host.style.setProperty(`--selection-${key}`, `${value}px`);
    };
    const measure = () => {
      if (pointer) return;
      const item = boxes().find(box => box.item.getAttribute('aria-current') === 'page');
      if (item) paint(item); else host.style.setProperty('--selection-opacity', '0');
    };
    const cancelFrame = () => { if (frame) cancelAnimationFrame(frame); frame = 0; };
    const settle = () => { cancelFrame(); pointer = null; delete host.dataset.navDragging; delete host.dataset.navPressed; };
    const cancel = () => { settle(); measure(); };
    refresh.current = () => { if (pointer) cancel(); else measure(); };
    const down = (event: PointerEvent) => {
      const item = (event.target as Element).closest<HTMLElement>('.workspace-nav-link');
      if (!item || !host.contains(item) || pointer || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      const items = boxes(), at = items.find(box => box.item === item);
      if (!at) return;
      pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, dragged: false, boxes: items, vertical: items.length > 1 && Math.abs(items[1].y - items[0].y) > Math.abs(items[1].x - items[0].x), at };
      host.dataset.navPressed = 'true'; paint(at);
      try { host.setPointerCapture(event.pointerId); } catch { /* A test host may not implement capture. */ }
      event.preventDefault();
    };
    const update = (event: PointerEvent) => {
      const drag = pointer;
      if (!drag || event.pointerId !== drag.id) return;
      if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 5) drag.dragged = true;
      if (!drag.dragged) return;
      host.dataset.navDragging = 'true';
      const bounds = host.getBoundingClientRect();
      const axis = drag.vertical ? event.clientY - bounds.top : event.clientX - bounds.left;
      const center = (box: Box) => drag.vertical ? box.y + box.height / 2 : box.x + box.width / 2;
      drag.at = drag.boxes.reduce((nearest, box) => Math.abs(center(box) - axis) < Math.abs(center(nearest) - axis) ? box : nearest);
      const first = drag.boxes[0], last = drag.boxes[drag.boxes.length - 1];
      const clamped = Math.max(center(first), Math.min(center(last), axis));
      const upper = drag.boxes.findIndex(box => center(box) >= clamped);
      const right = drag.boxes[Math.max(0, upper)], left = drag.boxes[Math.max(0, upper - 1)];
      const t = right === left ? 0 : (clamped - center(left)) / Math.max(1, center(right) - center(left));
      const mix = (a: number, b: number) => a + (b - a) * t;
      const overshoot = Math.max(-10, Math.min(10, (axis - clamped) * .15));
      const next = { x: mix(left.x, right.x) + (drag.vertical ? 0 : overshoot), y: mix(left.y, right.y) + (drag.vertical ? overshoot : 0), width: mix(left.width, right.width), height: mix(left.height, right.height) };
      cancelFrame(); frame = requestAnimationFrame(() => { frame = 0; paint(next); });
    };
    const up = (event: PointerEvent) => {
      if (!pointer || event.pointerId !== pointer.id) return;
      update(event);
      const destination = pointer.at;
      const target = destination.item;
      settle(); paint(destination);
      suppressClick = true;
      clearTimeout(releaseClick); releaseClick = setTimeout(() => { suppressClick = false; }, 0);
      target.focus({ preventScroll: true });
      if (commit.current) commit.current(target); else target.click();
      try { host.releasePointerCapture(event.pointerId); } catch { /* Already released. */ }
    };
    const click = (event: MouseEvent) => {
      if (!suppressClick || event.detail === 0) return;
      event.preventDefault(); event.stopImmediatePropagation(); suppressClick = false;
    };
    const lost = (event: PointerEvent) => { if (pointer?.id === event.pointerId) cancel(); };
    const key = (event: KeyboardEvent) => { if (pointer && event.key === 'Escape') { event.preventDefault(); cancel(); } };
    const preventNativeDrag = (event: DragEvent) => event.preventDefault();
    measure();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { if (pointer) cancel(); else measure(); }) : null;
    observer?.observe(host);
    host.addEventListener('pointerdown', down); host.addEventListener('pointermove', update);
    host.addEventListener('pointerup', up); host.addEventListener('pointercancel', lost);
    host.addEventListener('lostpointercapture', lost); host.addEventListener('click', click, true);
    host.addEventListener('dragstart', preventNativeDrag);
    window.addEventListener('keydown', key); window.addEventListener('blur', cancel);
    return () => {
      cancel(); clearTimeout(releaseClick); observer?.disconnect(); refresh.current = () => {};
      host.removeEventListener('pointerdown', down); host.removeEventListener('pointermove', update);
      host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', lost);
      host.removeEventListener('lostpointercapture', lost); host.removeEventListener('click', click, true);
      host.removeEventListener('dragstart', preventNativeDrag);
      window.removeEventListener('keydown', key); window.removeEventListener('blur', cancel);
    };
  }, [ref, shape]);
  useLayoutEffect(() => { refresh.current(); }, [selected]);
}
