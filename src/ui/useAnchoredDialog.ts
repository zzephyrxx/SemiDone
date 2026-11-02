import { useLayoutEffect, type RefObject } from 'react';

/** Keep a portal next to its trigger while reserving room for its scrollable content. */
export function useAnchoredDialog(present: boolean, dialog: RefObject<HTMLElement>, anchor?: RefObject<HTMLElement>) {
  useLayoutEffect(() => {
    const target = dialog.current, trigger = anchor?.current;
    if (!present || !target || !trigger) return;
    const update = () => {
      const margin = 16, gap = 8;
      const viewport = window.visualViewport;
      const x = viewport?.offsetLeft ?? 0, y = viewport?.offsetTop ?? 0;
      const width = viewport?.width ?? window.innerWidth, height = viewport?.height ?? window.innerHeight;
      const rect = trigger.getBoundingClientRect();
      const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(Math.max(min, max), value));
      const top = clamp(rect.top, y + margin, y + height - margin);
      const bottom = clamp(rect.bottom, y + margin, y + height - margin);
      const above = Math.max(0, top - y - margin - gap);
      const below = Math.max(0, y + height - margin - bottom - gap);
      // Layout dimensions stay stable during the entry animation's scale/translate.
      const contentHeight = target.scrollHeight;
      const useBelow = below >= contentHeight || (above < contentHeight && below >= above);
      const available = useBelow ? below : above;
      const popupHeight = Math.min(contentHeight, available);
      target.style.maxHeight = `${available}px`;
      target.style.left = `${clamp(rect.left, x + margin, x + width - margin - target.offsetWidth)}px`;
      target.style.top = `${clamp(useBelow ? bottom + gap : top - gap - popupHeight, y + margin, y + height - margin - popupHeight)}px`;
      target.dataset.placement = useBelow ? 'bottom' : 'top';
    };
    update();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update);
    observer?.observe(target); observer?.observe(trigger);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
    };
  }, [present, dialog, anchor]);
}
