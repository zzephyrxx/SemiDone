// Both AppKit and React use these same vectors so switching renderers does not
// change the toolbar symbols. Paths follow the project's Lucide glyphs.
const svg = (content: string) => `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`;
export const ZEN_TOOLBAR_ICONS = {
  settings: svg('<path d="M12 2a1 1 0 0 0 0 20h.25a1.75 1.75 0 0 0 1.4-2.8l-.3-.4a1.75 1.75 0 0 1 1.4-2.8h2.25a5 5 0 0 0 5-5 10 9 0 0 0-10-9Z"/><circle cx="7.5" cy="10" r=".5" fill="currentColor"/><circle cx="10" cy="6.5" r=".5" fill="currentColor"/><circle cx="14" cy="6.5" r=".5" fill="currentColor"/><circle cx="17" cy="10" r=".5" fill="currentColor"/>'),
  pin: svg('<path fill="currentColor" d="M8 3h8a1 1 0 0 1 0 2h-1v5l3 4v2H6v-2l3-4V5H8a1 1 0 0 1 0-2Z"/><path d="M12 16v6"/>'),
  pinOff: svg('<path d="m3 3 18 18M12 16v6M9 9v1l-3 4v2h10M9 3h7a1 1 0 0 1 0 2h-1v5l3 4"/>'),
};
export default function ZenToolbarIcon({ name, size = 16 }: { name: keyof typeof ZEN_TOOLBAR_ICONS; size?: number }) {
  return <span aria-hidden="true" className="zen-toolbar-glyph inline-flex shrink-0 items-center justify-center"
    style={{ width: size, height: size, pointerEvents: 'none' }} dangerouslySetInnerHTML={{ __html: ZEN_TOOLBAR_ICONS[name] }} />;
}
