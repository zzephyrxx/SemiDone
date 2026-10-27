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
        refraction: 42, rimWidth: .55,
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
    const bendReach = Number(refractionDisplacement?.getAttribute('scale'));
    expect(bendReach).toBeGreaterThan(43); expect(bendReach).toBeLessThanOrEqual(43.2);

    const chromaticFilter = container.querySelector(
      '#semidone-dialog-chromatic-refraction',
    );
    expect(chromaticFilter).toHaveAttribute('x', '-50%');
    expect(chromaticFilter).toHaveAttribute('y', '-50%');
    expect(chromaticFilter).toHaveAttribute('width', '200%');
    expect(chromaticFilter).toHaveAttribute('height', '200%');
    expect(chromaticFilter).toHaveAttribute('color-interpolation-filters', 'sRGB');
    expect(chromaticFilter).toHaveAttribute('primitiveUnits', 'userSpaceOnUse');
    expect(chromaticFilter?.querySelector('feImage')).toHaveAttribute('width', '320');
    expect(chromaticFilter?.querySelector('feImage')).toHaveAttribute('height', '240');

    const chromaticDisplacements = chromaticFilter?.querySelectorAll('feDisplacementMap');
    expect(chromaticDisplacements).toHaveLength(3);
    expect(Number(chromaticDisplacements?.[0]?.getAttribute('scale'))).toBe(bendReach);
    expect(Number(chromaticDisplacements?.[1]?.getAttribute('scale'))).toBeCloseTo(bendReach * 1.16);
    expect(chromaticFilter?.querySelector('feComposite[in="rgb"]')).toHaveAttribute('in2', 'face');
    expect(chromaticFilter?.querySelector('feComposite[result="clearFace"]')).toHaveAttribute('operator', 'out');
    expect(chromaticFilter?.querySelector('feComposite[result="coloredRim"]')).toHaveAttribute('in2', 'rimMask');
    expect(chromaticFilter?.querySelector('feBlend, feFlood')).toBeNull();
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
