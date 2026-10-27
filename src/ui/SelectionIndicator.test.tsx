// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { Profiler, useRef, useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSelectionIndicator } from './SelectionIndicator';

let commits = 0;
const frames = new Map<number, FrameRequestCallback>();
function Scene({ vertical = false, compact = false }: { vertical?: boolean; compact?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const [selected, setSelected] = useState(0);
  useSelectionIndicator(ref, `${selected}:${compact}`, item => setSelected(Number(item.dataset.index)));
  return <><output>Page {selected}</output>{!compact && <nav ref={ref} data-testid="nav">
    {[0, 1, 2, 3].map(index => <button key={index} className="workspace-nav-link" data-index={index} aria-current={index === selected ? 'page' : undefined}
      ref={node => { if (node) Object.defineProperties(node, { offsetLeft: { configurable: true, value: vertical ? 0 : index * 100 }, offsetTop: { configurable: true, value: vertical ? index * 50 : 0 }, offsetWidth: { configurable: true, value: 96 }, offsetHeight: { configurable: true, value: 40 } }); }}
      onClick={() => setSelected(index)}>Tab {index}</button>)}
  </nav>}</>;
}
beforeEach(() => {
  vi.useFakeTimers(); commits = 0; frames.clear(); let id = 0;
  vi.stubGlobal('PointerEvent', class extends MouseEvent { pointerId: number; constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 1; } });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++id, callback); return id; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0 } as DOMRect);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const flush = () => act(() => { const callbacks = [...frames.values()]; frames.clear(); callbacks.forEach(callback => callback(0)); });

describe('navigation pointer interaction', () => {
  it('paints continuously without React commits and navigates only when released', () => {
    render(<Profiler id="nav" onRender={() => commits++}><Scene /></Profiler>);
    const nav = screen.getByTestId('nav'); commits = 0;
    fireEvent.pointerDown(screen.getByText('Tab 0'), { button: 0, clientX: 48, clientY: 20, pointerId: 1 });
    for (let x = 50; x <= 220; x++) fireEvent.pointerMove(nav, { clientX: x, clientY: 20, pointerId: 1 });
    expect(commits).toBe(0); expect(frames.size).toBe(1);
    flush(); expect(nav.style.getPropertyValue('--selection-x')).toBe('172px');
    expect(screen.getByText('Page 0')).toBeVisible(); expect(nav.dataset.navDragging).toBe('true');
    fireEvent.pointerUp(nav, { clientX: 248, clientY: 20, pointerId: 1 });
    expect(screen.getByText('Page 2')).toBeVisible(); expect(nav.dataset.navPressed).toBeUndefined();
    expect(nav.style.getPropertyValue('--selection-x')).toBe('200px');
    fireEvent.click(screen.getByText('Tab 0'), { detail: 1 });
    expect(screen.getByText('Page 2')).toBeVisible();
  });
  it('supports vertical side navigation and clamps a release beyond the final tab', () => {
    render(<Scene vertical />); const nav = screen.getByTestId('nav');
    fireEvent.pointerDown(screen.getByText('Tab 0'), { button: 0, clientX: 48, clientY: 20 });
    fireEvent.pointerMove(nav, { clientX: 48, clientY: 500 }); flush();
    expect(parseFloat(nav.style.getPropertyValue('--selection-y'))).toBe(160);
    fireEvent.pointerUp(nav, { clientX: 48, clientY: 500 });
    expect(screen.getByText('Page 3')).toBeVisible(); expect(nav.style.getPropertyValue('--selection-y')).toBe('150px');
  });
  it.each(['pointerCancel', 'lostPointerCapture'])('restores the selected tab on %s', type => {
    render(<Scene />); const nav = screen.getByTestId('nav');
    fireEvent.pointerDown(screen.getByText('Tab 1'), { button: 0, clientX: 148, clientY: 20 });
    fireEvent.pointerMove(nav, { clientX: 248, clientY: 20 }); flush();
    fireEvent[type as 'pointerCancel'](nav, { pointerId: 1 });
    expect(screen.getByText('Page 0')).toBeVisible(); expect(nav.style.getPropertyValue('--selection-x')).toBe('0px');
    expect(nav.dataset.navPressed).toBeUndefined();
  });
  it('cancels on Escape and leaves keyboard activation intact', () => {
    render(<Scene />); const nav = screen.getByTestId('nav');
    fireEvent.pointerDown(screen.getByText('Tab 1'), { button: 0, clientX: 148, clientY: 20 });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(nav.dataset.navPressed).toBeUndefined(); expect(screen.getByText('Page 0')).toBeVisible();
    fireEvent.click(screen.getByText('Tab 3'), { detail: 0 });
    expect(screen.getByText('Page 3')).toBeVisible();
  });
  it('binds again after returning from compact mode and cancels a queued frame on unmount', () => {
    const view = render(<Scene compact />); view.rerender(<Scene />);
    const nav = screen.getByTestId('nav');
    fireEvent.pointerDown(screen.getByText('Tab 0'), { button: 0, clientX: 48, clientY: 20 });
    fireEvent.pointerMove(nav, { clientX: 248, clientY: 20 });
    expect(frames.size).toBe(1); view.unmount(); expect(frames.size).toBe(0);
  });
});
