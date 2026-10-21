// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ZenColorPicker from './ZenColorPicker';

function setup(value = '#ff0000') {
  const onChange = vi.fn(), onClose = vi.fn();
  const view = render(<ZenColorPicker label="文字颜色" value={value} onChange={onChange} onClose={onClose} />);
  return { ...view, onChange, onClose };
}
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

describe('inline Zen color selection', () => {
  it('remains mounted across changes and window blur, without invoking a native color dialog', () => {
    const { onChange, onClose, rerender, container } = setup();
    const hex = screen.getByRole('textbox', { name: '文字颜色色值' });
    fireEvent.change(hex, { target: { value: '#00ff00' } });
    expect(onChange).toHaveBeenLastCalledWith('#00ff00');
    rerender(<ZenColorPicker label="文字颜色" value="#00ff00" onChange={onChange} onClose={onClose} />);
    fireEvent.blur(window);
    expect(screen.getByRole('region', { name: '文字颜色调色盘' })).toBeVisible();
    expect(hex).toHaveValue('#00FF00');
    expect(container.querySelector('input[type="color"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '选择颜色 #3B82F6' }));
    expect(onChange).toHaveBeenLastCalledWith('#3b82f6');
  });

  it('keeps incomplete hex edits local and accepts an optional hash', () => {
    const { onChange } = setup();
    const hex = screen.getByRole('textbox', { name: '文字颜色色值' });
    fireEvent.change(hex, { target: { value: '#12' } });
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.blur(hex);
    expect(hex).toHaveValue('#FF0000');
    fireEvent.change(hex, { target: { value: 'aabbcc' } });
    expect(onChange).toHaveBeenLastCalledWith('#aabbcc');
    fireEvent.change(hex, { target: { value: '#gggggg' } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('preserves the chosen hue at black and supports keyboard adjustment and external reset', () => {
    const { onChange, onClose, rerender } = setup('#000000');
    const hue = screen.getByRole('slider', { name: '文字颜色色相' });
    const plane = screen.getByRole('group', { name: '文字颜色饱和度与明度' });
    fireEvent.change(hue, { target: { value: '120' } });
    fireEvent.keyDown(plane, { key: 'ArrowRight', shiftKey: true });
    fireEvent.keyDown(plane, { key: 'ArrowUp', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith('#171a17');
    rerender(<ZenColorPicker label="文字颜色" value="#0000ff" onChange={onChange} onClose={onClose} />);
    expect(hue).toHaveValue('240');
    fireEvent.keyDown(plane, { key: 'ArrowDown', shiftKey: true });
    expect(onChange).toHaveBeenLastCalledWith('#0000e6');
  });

  it('selects with a pointer, clamps to the color plane, and stops tracking on release', () => {
    vi.stubGlobal('PointerEvent', MouseEvent);
    const { onChange } = setup();
    const plane = screen.getByRole('group', { name: '文字颜色饱和度与明度' });
    vi.spyOn(plane, 'getBoundingClientRect').mockReturnValue({ left: 10, top: 20, bottom: 120, width: 200, height: 100 } as DOMRect);
    fireEvent.pointerDown(plane, { button: 0, clientX: 110, clientY: 70 });
    expect(onChange).toHaveBeenLastCalledWith('#804040');
    fireEvent.pointerMove(plane, { clientX: 999, clientY: -10 });
    expect(onChange).toHaveBeenLastCalledWith('#ff0000');
    fireEvent.pointerUp(plane);
    fireEvent.pointerMove(plane, { clientX: 10, clientY: 120 });
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it('handles Escape locally so closing the picker does not also close Zen configuration', () => {
    const parentKeyDown = vi.fn();
    const onClose = vi.fn();
    render(<div onKeyDown={parentKeyDown}><ZenColorPicker label="文字颜色" value="#ffffff" onChange={vi.fn()} onClose={onClose} /></div>);
    fireEvent.keyDown(screen.getByRole('textbox'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
    expect(parentKeyDown).not.toHaveBeenCalled();
  });
});
