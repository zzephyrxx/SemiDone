import { useRef } from 'react';
import { useSettingsStore } from '../store/settingsStore';

/** Shared presentation gate. Dialogs open and close without entry/exit motion. */
export function useDialogMotion(open: boolean, presentationEnabled = true) {
  const expanded = useSettingsStore(state => !state.settings.collapseMode || state.settings.collapseMode === 'expanded');
  const root = useRef<HTMLDivElement>(null);
  return { root, present: open && expanded && presentationEnabled };
}
