import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useDialogMotion } from './useDialogMotion';
import { Surface } from './Surface';

const focusable = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(
  'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
)).filter(node => !node.closest('[hidden], .hidden, [inert]') && getComputedStyle(node).display !== 'none')
  .sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

export function Overlay({ label, onClose, children, returnFocus, open = true }: {
  label: string; onClose: () => void; children: ReactNode; returnFocus?: RefObject<HTMLElement>; open?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const { root, present } = useDialogMotion(open);
  useLayoutEffect(() => {
    const original = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreTarget = returnFocus?.current ?? original;
    const target = node.current;
    if (!target) return;
    const siblings = Array.from(document.body.children).filter((element): element is HTMLElement =>
      element instanceof HTMLElement && element !== target.parentElement);
    const inertStates = siblings.map(element => element.inert);
    siblings.forEach(element => { element.inert = true; });
    if (!target.contains(document.activeElement)) (target.querySelector<HTMLElement>('input:not([type="file"]), textarea') ?? focusable(target)[0] ?? target).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = focusable(target);
      if (!controls.length) { event.preventDefault(); target.focus(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      siblings.forEach((element, index) => { element.inert = inertStates[index]; });
      document.removeEventListener('keydown', handleKey);
      if (restoreTarget?.isConnected) restoreTarget.focus();
    };
  }, [present, returnFocus]);
  if (!present) return null;
  return createPortal(<div ref={root} data-motion-state={open ? 'open' : 'closing'} className="ui-overlay liquid-glass-modal-overlay">
    <div ref={node} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      className="ui-overlay-dialog liquid-glass-modal-shell"><Surface role="dialog">{children}</Surface></div>
  </div>, document.body);
}
