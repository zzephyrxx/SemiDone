import appearance from '../config/windowAppearance.json';
import { isAppStore } from './distribution';

export { appearance as windowAppearance };

export function applyWindowAppearance() {
  const root = document.documentElement;
  root.dataset.distribution = isAppStore ? 'app-store' : 'desktop';
  for (const [key, value] of Object.entries({
    '--window-radius': appearance.expandedRadius,
    '--window-bar-radius': appearance.barRadius,
    '--window-floating-radius': appearance.floatingRadius,
    '--window-snapped-radius': appearance.snappedRadius,
  })) root.style.setProperty(key, `${value}px`);
}
