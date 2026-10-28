// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import FloatingBall from './FloatingBall';
import { useSettingsStore } from '../store/settingsStore';
const native = vi.hoisted(() => ({ desktop: false, drag: vi.fn() }));
vi.mock('../api/tauri', async original => ({
  ...await original<typeof import('../api/tauri')>(),
  get isDesktopRuntime() { return native.desktop; },
}));
vi.mock('../services/floatingWindowDrag', () => ({ dragFloatingWindow: native.drag }));
beforeEach(() => { native.desktop = false; native.drag.mockReset().mockResolvedValue(null); });

afterEach(cleanup);
it('blocks floating-ball context menus and right-button dragging while retaining left-click expansion', () => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'floating', isEdgeSnapped: false } }));
  const expand = vi.fn(), context = vi.fn();
  render(<div onContextMenu={context}><FloatingBall onExpand={expand} onClose={vi.fn()} /></div>);
  const image = screen.getByAltText('事半·SemiDone');
  expect(fireEvent.contextMenu(image)).toBe(false);
  expect(context).not.toHaveBeenCalled();
  fireEvent.mouseDown(image, { button: 2 });
  expect(image.parentElement).not.toHaveClass('cursor-grabbing');
  fireEvent.click(image, { button: 2 });
  expect(expand).not.toHaveBeenCalled();
  fireEvent.click(image, { button: 0 });
  expect(expand).toHaveBeenCalledOnce();
});

it('starts native movement only after a left drag and does not expand on the release click', async () => {
  native.desktop = true;
  useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode: 'floating', isEdgeSnapped: false } }));
  const expand = vi.fn();
  render(<FloatingBall onExpand={expand} onClose={vi.fn()} />);
  const image = screen.getByAltText('事半·SemiDone');
  fireEvent.mouseDown(image, { button: 2, clientX: 10, clientY: 10 });
  fireEvent.mouseMove(document, { clientX: 20, clientY: 20 });
  expect(native.drag).not.toHaveBeenCalled();
  fireEvent.mouseDown(image, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.mouseMove(document, { clientX: 11, clientY: 11 });
  expect(native.drag).not.toHaveBeenCalled();
  await act(async () => { fireEvent.mouseMove(document, { clientX: 20, clientY: 20 }); });
  expect(native.drag).toHaveBeenCalledOnce();
  fireEvent.click(image);
  expect(expand).not.toHaveBeenCalled();
  fireEvent.mouseDown(image, { button: 0, clientX: 10, clientY: 10 });
  fireEvent.mouseUp(document);
  fireEvent.click(image);
  expect(expand).toHaveBeenCalledOnce();
});
