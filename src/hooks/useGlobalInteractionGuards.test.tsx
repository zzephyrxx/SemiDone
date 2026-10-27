// @vitest-environment jsdom
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useGlobalInteractionGuards } from './useGlobalInteractionGuards';

function GuardHarness() {
  useGlobalInteractionGuards();
  return <img src="/Logo3D.png" alt="SemiDone" />;
}

afterEach(cleanup);

describe('useGlobalInteractionGuards', () => {
  it('blocks context menus and DOM-originated dragging throughout the app', () => {
    const { getByRole } = render(<GuardHarness />);
    const image = getByRole('img');

    expect(fireEvent.contextMenu(image)).toBe(false);
    expect(fireEvent.dragStart(image)).toBe(false);
  });

  it('removes the global listeners when the app unmounts', () => {
    const { unmount } = render(<GuardHarness />);
    unmount();

    const contextMenuEvent = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
    });
    const dragStartEvent = new Event('dragstart', {
      bubbles: true,
      cancelable: true,
    });

    expect(document.dispatchEvent(contextMenuEvent)).toBe(true);
    expect(document.dispatchEvent(dragStartEvent)).toBe(true);
  });
});
