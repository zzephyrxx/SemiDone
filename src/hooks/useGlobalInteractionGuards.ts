import { useEffect } from 'react';

/**
 * Prevent browser-only desktop interactions that are not part of SemiDone's UI.
 *
 * External files can still be dropped into attachment upload areas because a
 * drag that starts outside the WebView does not emit `dragstart` on document.
 */
export function useGlobalInteractionGuards() {
  useEffect(() => {
    const preventDefault = (event: Event) => {
      event.preventDefault();
    };

    document.addEventListener('contextmenu', preventDefault, true);
    document.addEventListener('dragstart', preventDefault, true);

    return () => {
      document.removeEventListener('contextmenu', preventDefault, true);
      document.removeEventListener('dragstart', preventDefault, true);
    };
  }, []);
}
