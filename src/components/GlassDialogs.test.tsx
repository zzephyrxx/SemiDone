// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { Profiler } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import CloseConfirmDialog from './CloseConfirmDialog';
import StartupTip from './StartupTip';
import { useSettingsStore } from '../store/settingsStore';
import { Surface } from '../ui/Surface';
import { Overlay } from '../ui/Overlay';
import { DEFAULT_LIQUID_GLASS_SETTINGS } from '../utils/liquidGlassSettings';

let frames: Map<number, FrameRequestCallback>;
beforeEach(() => {
  vi.useFakeTimers(); localStorage.clear();
  useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...state.settings.zenMode!, active: false }, collapseMode: 'expanded', animationsEnabled: false, liquidGlass: { ...DEFAULT_LIQUID_GLASS_SETTINGS, preset: 'extreme', blur: 1 } } }));
  class TestPointer extends MouseEvent {
    pointerId: number;
    constructor(type: string, options: MouseEventInit & { pointerId?: number }) { super(type, options); this.pointerId = options.pointerId ?? 1; }
  }
  vi.stubGlobal('PointerEvent', TestPointer);
  frames = new Map(); let next = 0;
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => { frames.set(++next, callback); return next; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); });
const mode = (collapseMode: 'expanded' | 'bar' | 'floating') => act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, collapseMode } })));
function bounds(dialog: HTMLElement) {
  dialog.getBoundingClientRect = vi.fn(() => {
    const [x, y] = dialog.style.translate.split(' ').map(parseFloat);
    return { x: 200 + (x || 0), y: 100 + (y || 0), left: 200 + (x || 0), top: 100 + (y || 0), width: 320, height: 200, right: 520 + (x || 0), bottom: 300 + (y || 0), toJSON() {} };
  });
}

it.each(['close', 'welcome'])('drags the %s dialog by its header, clamps it and keeps buttons interactive', kind => {
  const cancel = vi.fn(), confirm = vi.fn();
  render(kind === 'close' ? <CloseConfirmDialog isOpen onConfirm={confirm} onCancel={cancel} /> : <StartupTip />);
  act(() => vi.advanceTimersByTime(800));
  const dialog = screen.getByRole(kind === 'close' ? 'alertdialog' : 'dialog'); bounds(dialog);
  const handle = screen.getByLabelText(kind === 'close' ? '拖动关闭弹窗' : '拖动公告弹窗');
  handle.setPointerCapture = vi.fn(); handle.releasePointerCapture = vi.fn();
  fireEvent.pointerDown(handle, { button: 0, clientX: 300, clientY: 120, pointerId: 3 });
  fireEvent.pointerMove(handle, { clientX: 340, clientY: 150, pointerId: 4 });
  expect(frames.size).toBe(0);
  fireEvent.pointerMove(handle, { clientX: 340, clientY: 150, pointerId: 3 });
  fireEvent.pointerUp(handle, { pointerId: 3 });
  expect(dialog.style.translate).toBe('40px 30px'); expect(frames.size).toBe(0);
  fireEvent.keyDown(handle, { key: 'ArrowRight' }); expect(dialog.style.translate).toBe('48px 30px');
  fireEvent.pointerDown(handle, { button: 0, clientX: 300, clientY: 120, pointerId: 3 });
  fireEvent.pointerMove(handle, { clientX: -10000, clientY: -10000, pointerId: 3 });
  fireEvent.pointerCancel(handle, { pointerId: 3 });
  expect(dialog.style.translate).toBe('-192px -92px');
  expect(dialog).not.toHaveAttribute('data-dragging');
  fireEvent.click(screen.getByRole('button', { name: kind === 'close' ? '取消关闭' : '关闭欢迎弹窗' }));
  if (kind === 'close') expect(cancel).toHaveBeenCalledOnce();
  else expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(confirm).not.toHaveBeenCalled();
});

it('coalesces 100 dialog drag events with no React renders, layout reads or map rebuilds per move', () => {
  let commits = 0;
  render(<Profiler id="drag" onRender={() => commits++}><CloseConfirmDialog isOpen onConfirm={vi.fn()} onCancel={vi.fn()} /></Profiler>);
  const dialog = screen.getByRole('alertdialog'); bounds(dialog);
  const handle = screen.getByLabelText('拖动关闭弹窗');
  fireEvent.pointerDown(handle, { button: 0, clientX: 300, clientY: 120 });
  const reads = vi.mocked(dialog.getBoundingClientRect).mock.calls.length;
  const id = dialog.style.getPropertyValue('--surface-filter'); commits = 0;
  for (let i = 1; i <= 100; i++) fireEvent.pointerMove(handle, { clientX: 300 + i, clientY: 120 });
  expect(commits).toBe(0); expect(frames.size).toBe(1);
  expect(vi.mocked(dialog.getBoundingClientRect).mock.calls.length).toBe(reads);
  fireEvent.pointerUp(handle); expect(dialog.style.translate).toBe('100px 0px');
  expect(dialog.style.getPropertyValue('--surface-filter')).toBe(id);
  vi.stubGlobal('innerWidth', 400); vi.stubGlobal('innerHeight', 300);
  fireEvent(window, new Event('resize'));
  expect(dialog.style.translate).toBe('-128px -8px');
});

it.each(['bar', 'floating'] as const)('defers modal presentation in %s mode and shows it only after expansion', compact => {
  mode(compact);
  render(<><StartupTip /><CloseConfirmDialog isOpen onConfirm={vi.fn()} onCancel={vi.fn()} /><Overlay label="other" onClose={vi.fn()}>内容</Overlay></>);
  act(() => vi.advanceTimersByTime(1000));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  mode('expanded');
  expect(screen.getByRole('dialog', { name: '欢迎使用 SemiDone' })).toBeVisible();
  expect(screen.getByRole('alertdialog')).toBeVisible();
  mode(compact);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});

it('defers the welcome in a Zen window while allowing an explicit exit dialog', () => {
  useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...state.settings.zenMode!, enabled: true, active: true } } }));
  render(<><StartupTip /><CloseConfirmDialog isOpen onConfirm={vi.fn()} onCancel={vi.fn()} /></>);
  act(() => vi.advanceTimersByTime(800));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument(); expect(screen.getByRole('alertdialog')).toBeVisible();
  expect(localStorage.getItem('welcome_shown_7.0.0')).toBeNull();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...state.settings.zenMode!, active: false } } })));
  expect(screen.getByRole('dialog')).toBeVisible();
  act(() => useSettingsStore.setState(state => ({ settings: { ...state.settings, zenMode: { ...state.settings.zenMode!, active: true } } })));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

it('uses the same library renderer across navigation, selection and native-style dialogs', () => {
  render(<><Surface role="navigation" /><Surface role="selection" /><CloseConfirmDialog isOpen onConfirm={vi.fn()} onCancel={vi.fn()} /><StartupTip /></>);
  act(() => vi.advanceTimersByTime(800));
  const surfaces = document.querySelectorAll<HTMLElement>('.ui-surface');
  expect(surfaces).toHaveLength(4);
  const filters = new Set<string>();
  for (const surface of surfaces) {
    expect(surface).toHaveAttribute('data-glass-renderer', 'rdev');
    const filter = surface.querySelector('filter')!;
    expect(filter).toBeInTheDocument(); filters.add(filter.id);
  }
  expect(filters.size).toBe(4);
});
