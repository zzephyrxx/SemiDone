import { useSettingsStore } from '../store/settingsStore';

export const MOTION = {
  feedback: 80, disclosure: 133, list: 160, taskExit: 210,
  overlay: 120, overlayExit: 100, page: 120,
  zenSaving: 163, zenExit: 375, zenExitFallback: 438, zenReducedFallback: 313,
} as const;
export function useReducedMotion() {
  // Explicit user preference: the application switch controls all interface motion.
  // This does not change Windows settings or the behavior of other applications.
  const enabled = useSettingsStore(state => state.settings.animationsEnabled !== false);
  return !enabled;
}

export function scheduleFrame(callback: () => void): () => void {
  if (typeof requestAnimationFrame !== 'function') { callback(); return () => {}; }
  const id = requestAnimationFrame(callback);
  return () => cancelAnimationFrame(id);
}
