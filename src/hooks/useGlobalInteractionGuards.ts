import { useEffect } from 'react';

const isEditableTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'));
};

export function useGlobalInteractionGuards(): void {
  useEffect(() => {
    const preventContextMenu = (event: MouseEvent) => {
      if (!isEditableTarget(event.target)) event.preventDefault();
    };

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

    document.addEventListener('contextmenu', preventContextMenu);
    document.addEventListener('dragstart', preventDragStart);
    window.addEventListener('keydown', preventBrowserZoomKeys);
    window.addEventListener('wheel', preventBrowserZoomWheel, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', preventContextMenu);
      document.removeEventListener('dragstart', preventDragStart);
      window.removeEventListener('keydown', preventBrowserZoomKeys);
      window.removeEventListener('wheel', preventBrowserZoomWheel);
    };
  }, []);
}
