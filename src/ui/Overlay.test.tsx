// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { Overlay } from './Overlay';
import { useSettingsStore } from '../store/settingsStore';

afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); Reflect.deleteProperty(HTMLElement.prototype, 'animate'); });
it('contains focus, blocks background interaction, and restores the original focus and inert state', () => {
  const trigger = document.createElement('button'); trigger.textContent = 'Launch'; document.body.append(trigger); trigger.focus();
  const close = vi.fn();
  const view = render(<Overlay label="Test" onClose={close}><input aria-label="Title" /><button>Save</button></Overlay>);
  const input = screen.getByLabelText('Title'), save = screen.getByRole('button', { name: 'Save' });
  expect(trigger.inert).toBe(true); expect(input).toHaveFocus();
  save.focus(); fireEvent.keyDown(document, { key: 'Tab' }); expect(input).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true }); expect(save).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' }); expect(close).toHaveBeenCalledOnce();
  view.unmount(); expect(trigger).toHaveFocus(); expect(Boolean(trigger.inert)).toBe(false); trigger.remove();
});

it('keeps keyboard input and Escape in the top dialog and releases background locks after a nested unmount', () => {
  const parentClose = vi.fn();
  const background = document.createElement('button'); document.body.append(background);
  function Example() {
    const [child, setChild] = useState(false);
    return <Overlay label="Parent" onClose={parentClose}>
      <button onClick={() => setChild(true)}>Open child</button>
      <Overlay label="Child" open={child} onClose={() => setChild(false)}><input aria-label="Child value" /><button>Child action</button></Overlay>
    </Overlay>;
  }
  const view = render(<Example />);
  const parent = screen.getByRole('dialog', { name: 'Parent' });
  const open = within(parent).getByRole('button', { name: 'Open child' });
  fireEvent.click(open);
  const child = screen.getByRole('dialog', { name: 'Child' });
  expect(parent.parentElement!.inert).toBe(true);
  expect(Number(child.parentElement!.style.zIndex)).toBeGreaterThan(Number(parent.parentElement!.style.zIndex));
  within(child).getByRole('button').focus(); fireEvent.keyDown(document, { key: 'Tab' });
  expect(screen.getByRole('textbox', { name: 'Child value' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(parentClose).not.toHaveBeenCalled(); expect(screen.queryByRole('dialog', { name: 'Child' })).not.toBeInTheDocument();
  expect(open).toHaveFocus(); expect(Boolean(parent.parentElement!.inert)).toBe(false);
  fireEvent.click(open); view.unmount();
  expect(Boolean(background.inert)).toBe(false); background.remove();
});

function enableAnimationHost() {
  vi.useFakeTimers();
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  useSettingsStore.setState(state => ({ settings: { ...state.settings, animationsEnabled: true } }));
  const cancel = vi.fn();
  const animate = vi.fn<(keyframes: Keyframe[], options: KeyframeAnimationOptions) => Animation>(() => ({ cancel } as unknown as Animation));
  Object.defineProperty(HTMLElement.prototype, 'animate', { configurable: true, value: animate });
  return { cancel, animate };
}

it('opens and closes immediately without starting animations and restores focus', () => {
  const { animate } = enableAnimationHost();
  const trigger = document.createElement('button'); document.body.append(trigger); trigger.focus();
  const view = render(<Overlay label="Immediate" onClose={() => {}}><input aria-label="Draft" /></Overlay>);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(animate).not.toHaveBeenCalled();
  view.rerender(<Overlay open={false} label="Immediate" onClose={() => {}}><input aria-label="Draft" /></Overlay>);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus(); trigger.remove();
});
