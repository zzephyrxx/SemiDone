import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Hint { anchor: HTMLElement; text: string }
interface NativeTitle { text: string; autoLabel?: string }
const TOOLTIP_DELAY = 1000;

/** Render title hints inside the WebView so the native pin guard cannot cover them. */
export function TooltipLayer() {
  const id = useId();
  const [hint, setHint] = useState<Hint | null>(null);
  const bubble = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    let active: HTMLElement | null = null;
    let hovered: HTMLElement | null = null;
    let focused: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let visible = false;
    const titles = new Map<HTMLElement, NativeTitle>();

    const removeDescription = () => {
      if (!active) return;
      const ids = (active.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(value => value && value !== id);
      if (ids.length) active.setAttribute('aria-describedby', ids.join(' '));
      else active.removeAttribute('aria-describedby');
    };
    const dismiss = () => {
      clearTimeout(timer); visible = false; setHint(null); removeDescription();
    };
    const restore = () => {
      dismiss();
      titles.forEach((saved, node) => {
        // Do not overwrite a newer title or accessible label supplied by React.
        if (node.getAttribute('title') === '') node.setAttribute('title', saved.text);
        if (saved.autoLabel && node.getAttribute('aria-label') === saved.autoLabel) node.removeAttribute('aria-label');
      });
      titles.clear(); active = null;
    };
    const findAnchor = (target: EventTarget | null) => {
      for (let node = target instanceof Element ? target : null; node; node = node.parentElement) {
        if (!(node instanceof HTMLElement)) continue;
        const text = titles.get(node)?.text ?? node.getAttribute('title');
        if (text?.trim()) return node;
        if (text === '') return null; // An empty title intentionally blocks inheritance.
      }
      return null;
    };
    const select = (next: HTMLElement | null) => {
      if (active === next) return;
      restore();
      if (!next?.isConnected || !next.title.trim()) return;
      active = next;
      // Suppress ancestor titles too; otherwise the browser inherits the card's hint.
      for (let node: HTMLElement | null = next; node; node = node.parentElement) {
        const text = node.getAttribute('title');
        if (!text) continue;
        const saved: NativeTitle = { text };
        if (!node.hasAttribute('aria-label') && !node.hasAttribute('aria-labelledby') && !node.textContent?.trim()) {
          saved.autoLabel = text; node.setAttribute('aria-label', text);
        }
        titles.set(node, saved);
        node.setAttribute('title', '');
      }
      timer = setTimeout(() => {
        const text = active && titles.get(active)?.text;
        if (!active?.isConnected || !text) { restore(); return; }
        visible = true;
        const ids = new Set((active.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean));
        ids.add(id); active.setAttribute('aria-describedby', [...ids].join(' '));
        setHint({ anchor: active, text });
      }, TOOLTIP_DELAY);
    };
    const over = (event: MouseEvent) => { hovered = findAnchor(event.target); select(hovered ?? focused); };
    const out = (event: MouseEvent) => {
      if (event.relatedTarget instanceof Node && hovered?.contains(event.relatedTarget)) return;
      hovered = null; select(focused);
    };
    const focusIn = (event: FocusEvent) => { focused = findAnchor(event.target); select(focused ?? hovered); };
    const focusOut = (event: FocusEvent) => {
      if (event.relatedTarget instanceof Node && focused?.contains(event.relatedTarget)) return;
      focused = null; select(hovered);
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && visible) {
        event.preventDefault(); event.stopPropagation(); dismiss();
      }
    };
    const observer = new MutationObserver(records => {
      if (active && !active.isConnected) { hovered = null; focused = null; restore(); return; }
      for (const record of records) {
        if (record.type !== 'attributes' || !(record.target instanceof HTMLElement)) continue;
        const node = record.target, saved = titles.get(node);
        const updated = node.getAttribute('title');
        if (!saved || updated === '') continue;
        if (updated === null) {
          if (saved.autoLabel && node.getAttribute('aria-label') === saved.autoLabel) node.removeAttribute('aria-label');
          titles.delete(node); if (active === node) restore(); continue;
        }
        saved.text = updated;
        if (saved.autoLabel && node.getAttribute('aria-label') === saved.autoLabel) {
          saved.autoLabel = updated; node.setAttribute('aria-label', updated);
        }
        node.setAttribute('title', '');
        if (active === node && visible) setHint({ anchor: node, text: updated });
      }
    });
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['title'] });
    document.addEventListener('mouseover', over, true);
    document.addEventListener('mouseout', out, true);
    document.addEventListener('focusin', focusIn, true);
    document.addEventListener('focusout', focusOut, true);
    document.addEventListener('pointerdown', dismiss, true);
    document.addEventListener('keydown', key, true);
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('blur', dismiss);
    window.addEventListener('resize', dismiss);
    return () => {
      observer.disconnect(); restore();
      document.removeEventListener('mouseover', over, true);
      document.removeEventListener('mouseout', out, true);
      document.removeEventListener('focusin', focusIn, true);
      document.removeEventListener('focusout', focusOut, true);
      document.removeEventListener('pointerdown', dismiss, true);
      document.removeEventListener('keydown', key, true);
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('blur', dismiss);
      window.removeEventListener('resize', dismiss);
    };
  }, [id]);

  useLayoutEffect(() => {
    const node = bubble.current;
    if (!hint || !node) return;
    const anchor = hint.anchor.getBoundingClientRect(), rect = node.getBoundingClientRect();
    const gap = 8, width = document.documentElement.clientWidth || window.innerWidth;
    const height = document.documentElement.clientHeight || window.innerHeight;
    const left = Math.max(gap, Math.min(width - rect.width - gap, anchor.left + (anchor.width - rect.width) / 2));
    const below = anchor.bottom + gap;
    const top = Math.max(gap, Math.min(height - rect.height - gap, below + rect.height <= height - gap ? below : anchor.top - rect.height - gap));
    Object.assign(node.style, { left: `${left}px`, top: `${top}px`, visibility: 'visible' });
  }, [hint]);

  return hint && createPortal(<div ref={bubble} id={id} role="tooltip" data-no-overlay className="ui-tooltip" style={{ visibility: 'hidden' }}>{hint.text}</div>, document.body);
}
