import { describe, expect, it } from 'vitest';
import {
  createRoundedRectEdgeMap,
  createRoundedRectEdgePixels,
} from './liquidGlassDisplacement';

describe('liquid glass displacement map', () => {
  it('keeps the center neutral and stores normal vectors only near the edge', () => {
    const width = 40;
    const height = 24;
    const pixels = createRoundedRectEdgePixels({
      width,
      height,
      radius: 8,
      edgeWidth: 6,
    });
    const center = ((height / 2) * width + width / 2) * 4;
    const topEdge = (0 * width + width / 2) * 4;

    expect(Array.from(pixels.slice(center, center + 3))).toEqual([128, 128, 128]);
    expect(Array.from(pixels.slice(topEdge, topEdge + 2))).not.toEqual([128, 128]);
  });

  it('falls back to a neutral data image when canvas is unavailable', () => {
    const map = createRoundedRectEdgeMap({
      width: 96,
      height: 40,
      radius: 20,
      edgeWidth: 10,
    });

    expect(map).toMatch(/^data:image\//);
  });
});
