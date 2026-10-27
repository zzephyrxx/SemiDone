// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clampWindowPositionToMonitor,
  findHorizontalSnapEdge,
} from '../utils/windowSnap';
import FloatingBall from './FloatingBall';

const mocks = vi.hoisted(() => ({
  settings: {
    isEdgeSnapped: false,
  },
  setEdgeSnap: vi.fn(),
  startDragging: vi.fn(),
  outerPosition: vi.fn(),
  outerSize: vi.fn(),
  setPosition: vi.fn(),
  onMoved: vi.fn(),
  currentMonitor: vi.fn(),
}));

vi.mock('../store/settingsStore', () => ({
  useSettingsStore: () => ({
    settings: mocks.settings,
    setEdgeSnap: mocks.setEdgeSnap,
  }),
}));

vi.mock('@tauri-apps/api/window', () => ({
  PhysicalPosition: class PhysicalPosition {
    constructor(
      public x: number,
      public y: number,
    ) {}
  },
  getCurrentWindow: () => ({
    startDragging: mocks.startDragging,
    outerPosition: mocks.outerPosition,
    outerSize: mocks.outerSize,
    setPosition: mocks.setPosition,
    onMoved: mocks.onMoved,
  }),
  currentMonitor: mocks.currentMonitor,
}));

beforeEach(() => {
  mocks.settings.isEdgeSnapped = false;
  mocks.setEdgeSnap.mockReset();
  mocks.setEdgeSnap.mockResolvedValue(undefined);
  mocks.startDragging.mockReset();
  mocks.startDragging.mockResolvedValue(undefined);
  mocks.outerPosition.mockReset();
  mocks.outerPosition.mockResolvedValue({ x: 12, y: 400 });
  mocks.outerSize.mockReset();
  mocks.outerSize.mockResolvedValue({ width: 60, height: 60 });
  mocks.setPosition.mockReset();
  mocks.setPosition.mockResolvedValue(undefined);
  mocks.onMoved.mockReset();
  mocks.onMoved.mockResolvedValue(vi.fn());
  mocks.currentMonitor.mockReset();
  mocks.currentMonitor.mockResolvedValue({
    position: { x: 0, y: 0 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1,
  });
});

afterEach(cleanup);

describe('FloatingBall interactions', () => {
  it('suppresses right-click without expanding or changing snap state', () => {
    const onExpand = vi.fn();
    const { container } = render(<FloatingBall onExpand={onExpand} />);
    const ball = container.firstElementChild as HTMLElement;

    expect(fireEvent.mouseDown(ball, { button: 2 })).toBe(true);
    expect(fireEvent.contextMenu(ball)).toBe(false);
    expect(onExpand).not.toHaveBeenCalled();
    expect(mocks.setEdgeSnap).not.toHaveBeenCalled();
  });

  it('starts native window dragging only after the left pointer moves past the threshold', () => {
    const { container } = render(<FloatingBall onExpand={vi.fn()} />);
    const ball = container.firstElementChild as HTMLElement;
    const logo = screen.getByRole('img', { name: '事半·SemiDone' });

    fireEvent.mouseDown(logo, { button: 0, screenX: 500, screenY: 500 });
    expect(mocks.startDragging).not.toHaveBeenCalled();

    fireEvent.mouseMove(document, { buttons: 1, screenX: 502, screenY: 500 });
    expect(mocks.startDragging).not.toHaveBeenCalled();

    fireEvent.mouseMove(document, { buttons: 1, screenX: 510, screenY: 500 });

    expect(mocks.startDragging).toHaveBeenCalledOnce();
    expect(ball).not.toHaveAttribute('data-tauri-drag-region');
    expect(logo).not.toHaveAttribute('data-tauri-drag-region');
    expect(ball.getAttribute('style')).not.toContain('-webkit-app-region');
  });

  it('expands on a stationary left click without starting native dragging', () => {
    const onExpand = vi.fn();
    const { container } = render(<FloatingBall onExpand={onExpand} />);
    const ball = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(ball, { button: 0, screenX: 500, screenY: 500 });
    fireEvent.mouseUp(document, { button: 0, screenX: 500, screenY: 500 });
    fireEvent.click(ball);

    expect(onExpand).toHaveBeenCalledOnce();
    expect(mocks.startDragging).not.toHaveBeenCalled();
    expect(mocks.setEdgeSnap).not.toHaveBeenCalled();
  });

  it('snaps from the real window position after dragging near a screen edge', async () => {
    const onExpand = vi.fn();
    const { container } = render(<FloatingBall onExpand={onExpand} />);
    const ball = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(ball, { button: 0, screenX: 500, screenY: 500 });
    fireEvent.mouseMove(document, { buttons: 1, screenX: 490, screenY: 500 });
    fireEvent.mouseUp(document, { button: 0, screenX: 10, screenY: 500 });
    fireEvent.click(ball);

    await waitFor(() => {
      expect(mocks.setEdgeSnap).toHaveBeenCalledWith(true, 'left');
    });
    expect(onExpand).not.toHaveBeenCalled();
  });

  it('moves only the overflowing axis back inside the left screen edge', async () => {
    mocks.outerPosition.mockResolvedValue({ x: -25, y: 420 });
    const { container } = render(<FloatingBall onExpand={vi.fn()} />);
    const ball = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(ball, { button: 0, screenX: 10, screenY: 450 });
    fireEvent.mouseMove(document, { buttons: 1, screenX: 20, screenY: 450 });
    fireEvent.mouseUp(document, { button: 0, screenX: 0, screenY: 450 });

    await waitFor(() => {
      expect(mocks.setPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 0, y: 420 }),
      );
    });
    expect(mocks.setEdgeSnap).not.toHaveBeenCalled();
  });

  it('keeps the ball visible after overflowing the right and bottom edges', async () => {
    mocks.outerPosition.mockResolvedValue({ x: 1900, y: 1060 });
    const { container } = render(<FloatingBall onExpand={vi.fn()} />);
    const ball = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(ball, { button: 0, screenX: 1900, screenY: 1060 });
    fireEvent.mouseMove(document, { buttons: 1, screenX: 1910, screenY: 1070 });
    fireEvent.mouseUp(document, { button: 0, screenX: 1919, screenY: 1079 });

    await waitFor(() => {
      expect(mocks.setPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 1860, y: 1020 }),
      );
    });
    expect(mocks.setEdgeSnap).not.toHaveBeenCalled();
  });

  it('corrects an off-screen native drag only once when setPosition emits moved again', async () => {
    let movedListener: (() => void) | undefined;
    mocks.outerPosition.mockResolvedValue({ x: 1900, y: 1060 });
    mocks.onMoved.mockImplementation(async (listener: () => void) => {
      movedListener = listener;
      return vi.fn();
    });
    mocks.setPosition.mockImplementation(async () => {
      movedListener?.();
    });
    const { container } = render(<FloatingBall onExpand={vi.fn()} />);
    const ball = container.firstElementChild as HTMLElement;

    await waitFor(() => expect(movedListener).toBeTypeOf('function'));
    fireEvent.mouseDown(ball, { button: 0, screenX: 1800, screenY: 900 });
    fireEvent.mouseMove(document, { buttons: 1, screenX: 1810, screenY: 910 });
    if (!movedListener) throw new Error('window move listener was not registered');
    movedListener();

    await waitFor(() => {
      expect(mocks.setPosition).toHaveBeenCalledWith(
        expect.objectContaining({ x: 1860, y: 1020 }),
      );
    });
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    expect(mocks.setPosition).toHaveBeenCalledOnce();
  });

  it('restores the full ball when a snapped window is dragged away from the edge', async () => {
    mocks.settings.isEdgeSnapped = true;
    mocks.outerPosition.mockResolvedValue({ x: 600, y: 400 });
    const { container } = render(<FloatingBall onExpand={vi.fn()} />);
    const ball = container.firstElementChild as HTMLElement;

    fireEvent.mouseDown(ball, { button: 0, screenX: 10, screenY: 500 });
    fireEvent.mouseMove(document, { buttons: 1, screenX: 20, screenY: 500 });
    fireEvent.mouseUp(document, { button: 0, screenX: 600, screenY: 500 });

    await waitFor(() => {
      expect(mocks.setEdgeSnap).toHaveBeenCalledWith(false);
    });
  });
});

describe('clampWindowPositionToMonitor', () => {
  const monitor = {
    position: { x: -1920, y: -120 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1.5,
  };
  const windowSize = { width: 90, height: 90 };

  it('clamps all four edges while preserving coordinates that are already visible', () => {
    expect(clampWindowPositionToMonitor(
      { x: -1945, y: -150 },
      windowSize,
      monitor,
    )).toEqual({ x: -1920, y: -120 });

    expect(clampWindowPositionToMonitor(
      { x: -60, y: 930 },
      windowSize,
      monitor,
    )).toEqual({ x: -90, y: 870 });

    expect(clampWindowPositionToMonitor(
      { x: -1000, y: 400 },
      windowSize,
      monitor,
    )).toEqual({ x: -1000, y: 400 });
  });
});

describe('findHorizontalSnapEdge', () => {
  const monitor = {
    position: { x: -1920, y: 0 },
    size: { width: 1920, height: 1080 },
    scaleFactor: 1.5,
  };

  it('detects both physical edges of the current monitor, including negative coordinates', () => {
    expect(findHorizontalSnapEdge(
      { x: -1910, y: 400 },
      { width: 90, height: 90 },
      monitor,
    )).toBe('left');
    expect(findHorizontalSnapEdge(
      { x: -90, y: 400 },
      { width: 90, height: 90 },
      monitor,
    )).toBe('right');
  });

  it('does not snap while the floating window is away from a screen edge', () => {
    expect(findHorizontalSnapEdge(
      { x: -1000, y: 400 },
      { width: 90, height: 90 },
      monitor,
    )).toBeNull();
  });
});
