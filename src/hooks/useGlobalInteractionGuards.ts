import { useEffect } from 'react';

/** Covers WebView content and portals; the native tray menu remains independent. */
export function useContextMenuGuard(): void {
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => { event.preventDefault(); event.stopPropagation(); };
    const preventSecondaryButton = (event: MouseEvent) => {
      if (event.button === 2) { event.preventDefault(); event.stopPropagation(); }
    };
    const secondaryEvents = ['pointerdown', 'pointerup', 'mousedown', 'mouseup', 'auxclick'] as const;
    document.addEventListener('contextmenu', preventContextMenu, true);
    secondaryEvents.forEach(type => document.addEventListener(type, preventSecondaryButton, true));
    return () => {
      document.removeEventListener('contextmenu', preventContextMenu, true);
      secondaryEvents.forEach(type => document.removeEventListener(type, preventSecondaryButton, true));
    };
  }, []);
}

export function useGlobalInteractionGuards(): void {
  useContextMenuGuard();
  useEffect(() => {
    const preventDragStart = (event: DragEvent) => {
      event.preventDefault();
    };

    const preventBrowserZoomKeys = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (['+', '=', '-', '0'].includes(event.key)) event.preventDefault();
    };

    const preventBrowserZoomWheel = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };

    document.addEventListener('dragstart', preventDragStart);
    window.addEventListener('keydown', preventBrowserZoomKeys);
    window.addEventListener('wheel', preventBrowserZoomWheel, { passive: false });

    return () => {
      document.removeEventListener('dragstart', preventDragStart);
      window.removeEventListener('keydown', preventBrowserZoomKeys);
      window.removeEventListener('wheel', preventBrowserZoomWheel);
    };
  }, []);
}
