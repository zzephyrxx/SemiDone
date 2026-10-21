// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startWindowDragging } from './windowDragging';

const { drag } = vi.hoisted(() => ({ drag: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../api/tauri', () => ({ isDesktopRuntime: true }));
vi.mock('@tauri-apps/api/window', () => ({ getCurrentWindow: () => ({ startDragging: drag }) }));
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe('native header dragging', () => {
  it('starts a native drag from the title or free header space', async () => {
    render(<header onMouseDown={startWindowDragging}><span>SemiDone Zen</span></header>);
    fireEvent.mouseDown(screen.getByText('SemiDone Zen'), { button: 0 });
    await waitFor(() => expect(drag).toHaveBeenCalledOnce());
  });

  it('leaves action buttons and right mouse clicks alone', async () => {
    render(<header onMouseDown={startWindowDragging}><span>标题</span><button>配置</button></header>);
    fireEvent.mouseDown(screen.getByRole('button'), { button: 0 });
    fireEvent.mouseDown(screen.getByText('标题'), { button: 2 });
    await Promise.resolve();
    expect(drag).not.toHaveBeenCalled();
  });
});
