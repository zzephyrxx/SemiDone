import { describe, expect, it } from 'vitest';
import { glassDisplacementMap, glassOpticalMaps, glassOpticalVector, glassVector } from './glassGeometry';

const field = (x: number, options = {}) => glassOpticalVector(x, 100, 320, 200, 20, options);
const pixel = (url: string, x: number, y: number) => {
  const bytes = Uint8Array.from(atob(url.split(',')[1]), char => char.charCodeAt(0));
  const header = new DataView(bytes.buffer), w = header.getInt32(18, true), h = header.getInt32(22, true);
  const offset = 54 + (h - y - 1) * Math.ceil(w * 3 / 4) * 4 + x * 3;
  return { r: bytes[offset + 2], g: bytes[offset + 1] };
};

describe('rounded glass optical sampling', () => {
  it('keeps the center and clipped corners neutral with symmetric inward edge samples', () => {
    expect(glassVector(160, 100, 320, 200, 20)).toEqual([128, 128]);
    expect(glassVector(0, 0, 320, 200, 20)).toEqual([128, 128]);
    expect(field(2).base[0]).toBeGreaterThan(0);
    expect(field(318).base[0]).toBeCloseTo(-field(2).base[0]);
    expect(field(2).base[1]).toBeCloseTo(0);
  });

  it('changes strength independently of the rim shape and magnification', () => {
    const weak = field(5, { strength: 12 }), strong = field(5, { strength: 24 });
    expect(strong.base[0]).toBeCloseTo(weak.base[0] * 2);
    expect(strong.part[0]).toBeCloseTo(weak.part[0] * 2);
    expect(strong.mask).toBe(weak.mask);
    expect(field(5, { strength: 0 }).base.every(v => v === 0)).toBe(true);
    expect(field(5, { strength: 0 }).part.some(v => v !== 0)).toBe(true);
  });

  it('widens the smooth edge transition without spreading color separation into the face', () => {
    const narrow = field(30, { rimWidth: .2 }), wide = field(30, { rimWidth: .8 });
    expect(narrow.mask).toBe(0); expect(wide.mask).toBeGreaterThan(0);
    const band = [0, 5, 10, 20, 30, 45, 55, 80].map(x => field(x).mask);
    expect(band[0]).toBe(1); expect(band[band.length - 1]).toBe(0);
    band.slice(1).forEach((v, i) => expect(v).toBeLessThanOrEqual(band[i]));
    for (const x of [60, 80, 120, 160]) {
      expect(field(x).part.every(v => v === 0)).toBe(true);
    }
    // RGB offsets follow the edge normal; they do not create mirrored rows.
    expect(field(2).part[0]).toBeLessThan(0); expect(field(2).part[1]).toBe(0);
  });

  it('magnifies only the background coordinates while retaining a stable center and color-free face', () => {
    const noZoom = field(110, { strength: 0, magnify: 0 });
    const zoom = field(110, { strength: 0, magnify: .5 });
    expect(noZoom.base.every(v => v === 0)).toBe(true);
    expect(zoom.base[0]).toBeGreaterThan(0); expect(zoom.part.every(v => v === 0)).toBe(true);
    expect(field(160, { magnify: 1.5 }).base.every(v => v === 0)).toBe(true);
    expect(field(210, { strength: 0, magnify: .5 }).base[0]).toBeCloseTo(-zoom.base[0]);
  });

  it('adapts maximum rim distortion to short navigation lenses without sampling past the opposite edge', () => {
    for (const height of [32, 40, 48, 64]) {
      const top = glassOpticalVector(40, 0, 80, height, 12, { strength: 60, magnify: 0 });
      expect(top.base[1]).toBeGreaterThan(0);
      expect(top.base[1] + Math.abs(top.part[1])).toBeLessThan(height / 2);
    }
  });

  it('encodes actual pixel offsets with non-square correction and no drift in the clear face', () => {
    const maps = glassOpticalMaps(320, 200, 20);
    expect(pixel(maps.base, 160, 100)).toEqual({ r: 128, g: 128 });
    expect(pixel(maps.edgeMask, 160, 100).r).toBe(0);
    expect(pixel(maps.edgeMask, 0, 0).r).toBe(0);
    const red = pixel(maps.red, 1, 100), blue = pixel(maps.blue, 1, 100);
    expect(red.r).toBeLessThan(blue.r); expect(red.g).toBe(128); expect(blue.g).toBe(128);
    const dx = (pixel(maps.base, 1, 100).r - 128) / 254 * maps.refractionScale;
    expect(Math.abs(dx - glassOpticalVector(1.5, 100.5, 320, 200, 20).base[0])).toBeLessThanOrEqual(maps.refractionScale / 508 + 1e-6);
    expect(128 / 255 * (255 / 254) - 1 / 254).toBeCloseTo(.5, 15);
    expect(glassOpticalMaps(320, 200, 20, 0).refractionScale).toBe(0);
    expect(glassOpticalMaps(320, 200, 20, 0).channelScale).toBeGreaterThan(0);
    const magnified = glassOpticalMaps(320, 200, 20, 0, 'pane', { strength: 0, magnify: .5 });
    expect(magnified.refractionScale).toBeGreaterThan(0);
    expect(magnified.channelScale).toBeGreaterThanOrEqual(magnified.refractionScale);
  });

  it('reuses nearby geometry, separates all optical parameter caches and bounds bitmap sizes', () => {
    const map = glassOpticalMaps(320, 200, 20);
    expect(glassDisplacementMap(320, 200, 20)).toBe(map.base);
    expect(glassDisplacementMap(321, 201, 20)).not.toBe(map.base);
    const bytes = Uint8Array.from(atob(map.base.split(',')[1]), char => char.charCodeAt(0));
    const header = new DataView(bytes.buffer);
    expect(String.fromCharCode(bytes[0], bytes[1])).toBe('BM');
    expect(header.getUint32(2, true)).toBe(bytes.length);
    expect(header.getInt32(18, true)).toBe(320); expect(bytes.length).toBeLessThan(200000);
    for (const options of [{ strength: 30 }, { rimWidth: .8 }, { magnify: .5 }]) {
      expect(glassOpticalMaps(320, 200, 20, 42, 'pane', options)).not.toBe(map);
    }
  });

  it('keeps normalized optical behavior identical across proportionally scaled surfaces', () => {
    for (const ratio of [.05, .2, .5, .8]) {
      const small = glassOpticalVector(80 * ratio, 20, 80, 40, 12, { strength: 40, rimWidth: .7, magnify: .5 });
      const large = glassOpticalVector(400 * ratio, 100, 400, 200, 60, { strength: 40, rimWidth: .7, magnify: .5 });
      expect(large.mask).toBeCloseTo(small.mask);
      for (let axis = 0; axis < 2; axis++) {
        expect(large.base[axis]).toBeCloseTo(small.base[axis] * 5);
        expect(large.part[axis]).toBeCloseTo(small.part[axis] * 5);
      }
    }
  });

  it('encodes a continuous rim gradient at native small-control resolution', () => {
    const maps = glassOpticalMaps(127, 39, 12);
    const levels = Array.from({ length: 19 }, (_, y) => pixel(maps.edgeMask, 63, y).r);
    expect(levels[0]).toBeGreaterThan(240); expect(levels.at(-1)).toBe(0);
    expect(new Set(levels.filter(v => v > 0 && v < 255)).size).toBeGreaterThan(6);
    const bytes = Uint8Array.from(atob(maps.base.split(',')[1]), char => char.charCodeAt(0));
    const header = new DataView(bytes.buffer);
    expect(header.getInt32(18, true)).toBe(127); expect(header.getInt32(22, true)).toBe(39);
  });

  it('retains fine horizontal sampling levels in a wide, short navigation bar', () => {
    const maps = glassOpticalMaps(800, 40, 16);
    const levels = Array.from({ length: 11 }, (_, x) => pixel(maps.base, x, 20).r);
    expect(new Set(levels).size).toBeGreaterThanOrEqual(9);
    expect(pixel(maps.base, 400, 20)).toEqual({ r: 128, g: 128 });
  });
});
