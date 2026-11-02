// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import LiquidGlassPreview from './LiquidGlassPreview';

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it('coalesces drag paints without React commits per pointer move and commits the final position', () => {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const frames = new Map<number, FrameRequestCallback>(); let next = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  let commits = 0;
  render(<Profiler id="preview" onRender={() => commits++}><LiquidGlassPreview settings={{ enabled: true, blur: 6, refraction: 42, dispersion: true }} /></Profiler>);
  const card = screen.getByRole('group', { name: '可拖动的玻璃预览小窗' });
  Object.defineProperties(card.parentElement!, { clientWidth: { value: 800 }, clientHeight: { value: 400 } });
  Object.defineProperties(card, { offsetWidth: { value: 260 }, offsetHeight: { value: 110 } });
  card.setPointerCapture = vi.fn(); card.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(card, { button: 0, clientX: 200, clientY: 90 }); commits = 0;
  for (let i = 1; i <= 100; i++) fireEvent.pointerMove(card, { clientX: 200 + i, clientY: 90 });
  expect(commits).toBe(0); expect(frames.size).toBe(1);
  act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); });
  expect(card.style.translate).toBe('100px 0px'); expect(commits).toBe(0);
  fireEvent.pointerUp(card); expect(commits).toBe(1); expect(card.style.translate).toBe('100px 0px');
});
