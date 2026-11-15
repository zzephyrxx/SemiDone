// Node's Web Storage globals can shadow jsdom's per-test browser storage.
// Use the actual jsdom instances so tests retain browser Storage semantics.
const dom = (globalThis as typeof globalThis & { jsdom?: { window: Window } }).jsdom;

if (dom) {
  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: dom.window[name],
    });
  }
}
