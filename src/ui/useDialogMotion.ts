import { useLayoutEffect, useRef, useState } from 'react';
import { MOTION, useReducedMotion } from './motion';
import { useSettingsStore } from '../store/settingsStore';

/** Keep the portal alive until exit finishes; closing is not an immediate unmount. */
export function useDialogMotion(open: boolean, presentationEnabled = true) {
  const expanded = useSettingsStore(state => !state.settings.collapseMode || state.settings.collapseMode === 'expanded');
  const allowed = expanded && presentationEnabled;
  const visible = allowed && open;
  const root = useRef<HTMLDivElement>(null);
  const [retained, setRetained] = useState(open);
  const reduced = useReducedMotion();
  const present = allowed && (visible || retained);
  useLayoutEffect(() => {
    if (!allowed) { setRetained(false); return; }
    const overlay = root.current;
    if (!overlay) return;
    overlay.inert = !open;
    if (open) setRetained(true);
    if (reduced || !overlay.animate) {
      if (!open) setRetained(false);
      return;
    }
    const duration = open ? MOTION.overlay : MOTION.overlayExit;
    const surface = overlay.querySelector<HTMLElement>('[role="dialog"], [role="alertdialog"]');
    const fade = overlay.animate([{ opacity: open ? 0 : 1 }, { opacity: open ? 1 : 0 }], { duration, easing: 'ease-out', fill: 'both' });
    const move = surface?.animate([
      { transform: open ? 'translateY(10px) scale(.98)' : 'translateY(0) scale(1)' },
      { transform: open ? 'translateY(0) scale(1)' : 'translateY(6px) scale(.985)' },
    ], { duration, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'both' });
    const timer = setTimeout(() => {
      if (!open) setRetained(false);
      else { fade.cancel(); move?.cancel(); }
    }, duration);
    return () => { clearTimeout(timer); fade.cancel(); move?.cancel(); };
  }, [open, reduced, allowed]);
  return { root, present };
}
