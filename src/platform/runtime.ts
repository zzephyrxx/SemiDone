/** WebKit reports MacIntel on Apple silicon too; this detects OS, not CPU. */
export const isMacOS = typeof navigator !== 'undefined' && /Mac/.test(navigator.platform);

export const FULL_WINDOW_SIZE = { width: 550, height: isMacOS ? 800 : 1000 };
export const FULL_WINDOW_MINIMUM = { width: 400, height: isMacOS ? 500 : 700 };
