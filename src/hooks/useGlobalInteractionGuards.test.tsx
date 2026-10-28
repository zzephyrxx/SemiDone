// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useContextMenuGuard } from './useGlobalInteractionGuards';

afterEach(cleanup);
function Guard() { useContextMenuGuard(); return null; }

it('blocks context menus on application content and editable fields', () => {
  const context = vi.fn();
  const view = render(<><Guard /><div onContextMenu={context}><button>按钮</button><input /><textarea /><div contentEditable suppressContentEditableWarning>文本</div></div></>);
  for (const node of view.container.querySelectorAll('button, input, textarea, [contenteditable]')) {
    expect(fireEvent.contextMenu(node)).toBe(false);
  }
  expect(context).not.toHaveBeenCalled();
});

it('blocks secondary-button actions while preserving left clicks and keyboard shortcuts', () => {
  const down = vi.fn(), click = vi.fn(), key = vi.fn();
  const view = render(<><Guard /><button onMouseDown={down} onClick={click} onKeyDown={key}>按钮</button></>);
  const button = view.container.querySelector('button')!;
  expect(fireEvent.mouseDown(button, { button: 2 })).toBe(false);
  expect(down).not.toHaveBeenCalled();
  expect(fireEvent(button, new MouseEvent('pointerdown', { bubbles: true, cancelable: true, button: 2 }))).toBe(false);
  expect(fireEvent(button, new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 2 }))).toBe(false);
  fireEvent.mouseDown(button, { button: 0 }); fireEvent.click(button);
  expect(down).toHaveBeenCalledOnce(); expect(click).toHaveBeenCalledOnce();
  expect(fireEvent.keyDown(button, { key: 'c', ctrlKey: true })).toBe(true);
  expect(key).toHaveBeenCalledOnce();
});

it('removes the global listeners when the application unmounts', () => {
  const view = render(<Guard />);
  expect(fireEvent.contextMenu(document.body)).toBe(false);
  view.unmount();
  expect(fireEvent.contextMenu(document.body)).toBe(true);
});
