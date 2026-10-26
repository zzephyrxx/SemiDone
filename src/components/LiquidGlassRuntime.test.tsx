// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSettingsStore } from '../store/settingsStore';
import LiquidGlassRuntime from './LiquidGlassRuntime';

beforeEach(() => {
  useSettingsStore.setState((state) => ({
    settings: {
      ...state.settings,
      liquidGlass: {
        enabled: true,
        blur: 6,
        refraction: 42,
        dispersion: true,
      },
    },
  }));
});

afterEach(() => {
  cleanup();
});

describe('LiquidGlassRuntime', () => {
  it('publishes the level-based blur and expanded shared SVG filters', () => {
    const { container } = render(<LiquidGlassRuntime />);
    const root = document.documentElement;

    expect(root.dataset.liquidGlassDialogs).toBe('true');
    expect(root.dataset.liquidGlassDispersion).toBe('true');
    expect(root.style.getPropertyValue('--liquid-glass-dialog-blur')).toBe('11.11px');
    expect(container.querySelectorAll('#semidone-dialog-refraction')).toHaveLength(1);
    expect(container.querySelectorAll('#semidone-dialog-chromatic-refraction')).toHaveLength(1);

    const refractionDisplacement = container.querySelector(
      '#semidone-dialog-refraction feDisplacementMap',
    );
    expect(Number(refractionDisplacement?.getAttribute('scale'))).toBeCloseTo(14.28, 2);

    const chromaticFilter = container.querySelector(
      '#semidone-dialog-chromatic-refraction',
    );
    expect(chromaticFilter).toHaveAttribute('x', '-34%');
    expect(chromaticFilter).toHaveAttribute('y', '-34%');
    expect(chromaticFilter).toHaveAttribute('width', '168%');
    expect(chromaticFilter).toHaveAttribute('height', '168%');

    const chromaticDisplacements = chromaticFilter?.querySelectorAll('feDisplacementMap');
    expect(chromaticDisplacements).toHaveLength(3);
    expect(Number(chromaticDisplacements?.[0]?.getAttribute('scale'))).toBeCloseTo(23.59, 2);
  });

  it('updates the root switches without rebuilding dialog components', () => {
    render(<LiquidGlassRuntime />);

    act(() => {
      useSettingsStore.setState((state) => ({
        settings: {
          ...state.settings,
          liquidGlass: {
            enabled: false,
            blur: 1,
            refraction: 10,
            dispersion: false,
          },
        },
      }));
    });

    const root = document.documentElement;
    expect(root.dataset.liquidGlassDialogs).toBe('false');
    expect(root.dataset.liquidGlassDispersion).toBe('false');
    expect(root.style.getPropertyValue('--liquid-glass-dialog-blur')).toBe('0px');
  });
});
