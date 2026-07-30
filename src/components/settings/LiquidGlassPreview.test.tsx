// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import LiquidGlassPreview from './LiquidGlassPreview';

afterEach(cleanup);

const methodIds = ['css', 'noise', 'edge', 'chromatic', 'interactive'] as const;

describe('LiquidGlassPreview', () => {
  it('renders all five reference implementations and their SVG filters', () => {
    render(<LiquidGlassPreview />);

    expect(screen.getByRole('heading', { name: '液态玻璃效果预览' })).toBeVisible();
    expect(screen.getByRole('button', { name: '切换演示背景' })).toBeVisible();
    ['磨砂玻璃', '液态玻璃', '边缘折射玻璃', '色散玻璃', '交互式液态玻璃'].forEach(
      (title) => expect(screen.getByRole('heading', { name: title })).toBeVisible(),
    );
    expect(screen.queryByText('最稳妥')).not.toBeInTheDocument();
    expect(screen.queryByText('兼容性：较高')).not.toBeInTheDocument();
    expect(screen.getAllByTestId(/^liquid-preview-glass-/)).toHaveLength(5);
    expect(document.getElementById('preview-global-noise-filter')).toBeInTheDocument();
    expect(document.getElementById('preview-edge-filter')).toBeInTheDocument();
    expect(document.getElementById('preview-chromatic-filter')).toBeInTheDocument();
    expect(document.getElementById('preview-interactive-filter')).toBeInTheDocument();
  });

  it('keeps an independent bounded drag position for every glass pane', () => {
    render(<LiquidGlassPreview />);

    methodIds.forEach((methodId, index) => {
      const scene = screen.getByTestId(`liquid-preview-scene-${methodId}`);
      const glass = screen.getByTestId(`liquid-preview-glass-${methodId}`);
      Object.defineProperty(scene, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          x: 0,
          y: 0,
          width: 480,
          height: 270,
          top: 0,
          right: 480,
          bottom: 270,
          left: 0,
          toJSON: () => ({}),
        }),
      });
      Object.defineProperty(glass, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({
          x: 120,
          y: 60,
          width: 240,
          height: 150,
          top: 60,
          right: 360,
          bottom: 210,
          left: 120,
          toJSON: () => ({}),
        }),
      });

      const dx = 24 + index * 5;
      const dy = 12 + index * 3;
      fireEvent.pointerDown(glass, {
        button: 0,
        pointerId: index + 1,
        clientX: 180,
        clientY: 120,
      });
      fireEvent.pointerMove(glass, {
        pointerId: index + 1,
        clientX: 180 + dx,
        clientY: 120 + dy,
      });
      expect(glass.style.transform).toContain(`translate(${dx}px, ${dy}px)`);
      fireEvent.pointerUp(glass, {
        pointerId: index + 1,
        clientX: 180 + dx,
        clientY: 120 + dy,
      });
    });

    const positions = methodIds.map(
      (methodId) => screen.getByTestId(`liquid-preview-glass-${methodId}`).style.transform,
    );
    expect(new Set(positions).size).toBe(5);
  });

  it('updates the shared preview controls without moving the fixed container', () => {
    render(<LiquidGlassPreview />);

    fireEvent.change(screen.getByRole('slider', { name: '液态玻璃全局模糊' }), {
      target: { value: '18' },
    });
    fireEvent.change(screen.getByRole('slider', { name: '液态玻璃折射强度' }), {
      target: { value: '1.5' },
    });
    fireEvent.change(screen.getByRole('slider', { name: '液态玻璃圆角程度' }), {
      target: { value: '56' },
    });

    expect(screen.getByText('18px')).toBeVisible();
    expect(screen.getByText('1.50×')).toBeVisible();
    expect(screen.getByText('56px')).toBeVisible();
    expect(
      screen.getByTestId('liquid-preview-glass-edge').style.borderRadius,
    ).toBe('56px');
  });
});
