import { useLayoutEffect, useRef, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { useDialogMotion } from './useDialogMotion';
import { Surface } from './Surface';
import { useAnchoredDialog } from './useAnchoredDialog';

const focusable = (root: HTMLElement) => Array.from(root.querySelectorAll<HTMLElement>(
  'button:not(:disabled), input:not(:disabled):not([type="hidden"]), textarea:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
)).filter(node => !node.closest('[hidden], .hidden, [inert]') && getComputedStyle(node).display !== 'none')
  .sort((a, b) => a === b ? 0 : a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);

const stack: HTMLElement[] = [];
const inertLocks = new Map<HTMLElement, { original: boolean; owners: Set<HTMLElement> }>();

export function Overlay({ label, onClose, children, returnFocus, open = true, dialogClassName = '', material = 'auto', anchor }: {
  label: string; onClose: () => void; children: ReactNode; returnFocus?: RefObject<HTMLElement>; open?: boolean; dialogClassName?: string; material?: 'auto' | 'frosted';
  anchor?: RefObject<HTMLElement>;
}) {
  const node = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  const { root, present } = useDialogMotion(open);
  useAnchoredDialog(present, node, anchor);
  useLayoutEffect(() => {
    const original = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const restoreTarget = returnFocus?.current ?? original;
    const target = node.current;
    if (!target) return;
    const siblings = Array.from(document.body.children).filter((element): element is HTMLElement =>
      element instanceof HTMLElement && element !== target.parentElement);
    stack.push(target);
    target.parentElement!.style.zIndex = String(60 + stack.length);
    siblings.forEach(element => {
      const lock = inertLocks.get(element) ?? { original: element.inert, owners: new Set<HTMLElement>() };
      lock.owners.add(target); inertLocks.set(element, lock); element.inert = true;
    });
    if (!target.contains(document.activeElement)) (target.querySelector<HTMLElement>('input:not([type="file"]), textarea') ?? focusable(target)[0] ?? target).focus();
    const handleKey = (event: KeyboardEvent) => {
      if (stack[stack.length - 1] !== target) return;
      if (event.key === 'Escape') { event.preventDefault(); close.current(); return; }
      if (event.key !== 'Tab') return;
      const controls = focusable(target);
      if (!controls.length) { event.preventDefault(); target.focus(); return; }
      if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls[controls.length - 1]?.focus(); }
      else if (!event.shiftKey && document.activeElement === controls[controls.length - 1]) { event.preventDefault(); controls[0].focus(); }
    };
    document.addEventListener('keydown', handleKey);
    return () => {
      const index = stack.indexOf(target); if (index >= 0) stack.splice(index, 1);
      siblings.forEach(element => {
        const lock = inertLocks.get(element);
        if (!lock) return;
        lock.owners.delete(target);
        if (!lock.owners.size) { element.inert = lock.original; inertLocks.delete(element); }
      });
      document.removeEventListener('keydown', handleKey);
      if (restoreTarget?.isConnected) restoreTarget.focus();
    };
  }, [present, returnFocus]);
  if (!present) return null;
  return createPortal(<div ref={root} data-motion-state={open ? 'open' : 'closing'} className={`ui-overlay liquid-glass-modal-overlay ${anchor ? 'ui-overlay--anchored' : ''}`}
    onClick={event => { if (event.target === event.currentTarget && stack[stack.length - 1] === node.current) close.current(); }}>
    <div ref={node} role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}
      className={`ui-overlay-dialog liquid-glass-modal-shell ${dialogClassName}`}><Surface role="dialog" material={material}>{children}</Surface></div>
  </div>, document.body);
}
