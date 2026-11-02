const cache = new Map<string, GlassOpticalMaps>();
const CACHE_LIMIT = 8;
const CACHE_BYTE_LIMIT = 16 * 1024 * 1024;
let cacheBytes = 0;
const mapBytes = (maps: GlassOpticalMaps) => maps.base.length + maps.red.length + maps.blue.length + maps.edgeMask.length;
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const smooth = (lo: number, hi: number, value: number) => {
  const t = clamp((value - lo) / Math.max(hi - lo, 1e-6), 0, 1);
  return t * t * (3 - 2 * t);
};
export type GlassProfile = 'pane' | 'lens';
export interface GlassGeometry { width: number; height: number; radius: number; profile?: GlassProfile }
export interface GlassOpticalMaps { base: string; red: string; blue: string; edgeMask: string; refractionScale: number; channelScale: number; unitScale: number }
export interface GlassOptics { strength: number; rimWidth: number; magnify: number }

const opticsFor = (refraction: number, optics?: Partial<GlassOptics>): GlassOptics => ({
  strength: clamp(Number.isFinite(optics?.strength) ? optics!.strength! : refraction * 18 / 42, 0, 60),
  rimWidth: clamp(Number.isFinite(optics?.rimWidth) ? optics!.rimWidth! : .55, .1, .95),
  magnify: clamp(Number.isFinite(optics?.magnify) ? optics!.magnify! : 0, 0, 1.5),
});

function geometryAt(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const px = x - width / 2, py = y - height / 2;
  const qx = Math.abs(px) - width / 2 + r, qy = Math.abs(py) - height / 2 + r;
  const ox = Math.max(qx, 0), oy = Math.max(qy, 0), length = Math.hypot(ox, oy);
  const inset = r - length - Math.min(Math.max(qx, qy), 0);
  const nx = length > 0 ? ox / length : qx > qy ? 1 : 0;
  const ny = length > 0 ? oy / length : qx > qy ? 0 : 1;
  return { inset, nx: nx * (px < 0 ? -1 : 1), ny: ny * (py < 0 ? -1 : 1) };
}

/** Independent inward rim bending and center magnification, relative to size.
 * Rounded-box distance replaces the circular radius so wide navigation bars
 * keep the optical band attached to all four edges. RGB separation stays radial.
 */
export function glassOpticalVector(x: number, y: number, width: number, height: number, radius: number, options?: Partial<GlassOptics>) {
  const { inset, nx, ny } = geometryAt(x, y, width, height, radius);
  if (inset < 0) return { base: [0, 0], part: [0, 0], mask: 0 };
  const optics = opticsFor(42, options);
  // The shared profile keeps preview, navigation and dialogs optically consistent.
  const minor = Math.min(width, height) / 2;
  const n = clamp(1 - inset / Math.max(minor, .01), 0, 1);
  const band = Math.pow(smooth(1 - optics.rimWidth, 1, n), 2.6);
  // Strength is a percentage of center-to-edge distance for every material.
  const strength = minor * optics.strength / 100;
  const bend = strength * band;
  const zoom = optics.magnify * .42 * (1 - n * n);
  // Chromatic separation is independent of distortion. The extreme preset
  // deliberately keeps strength at zero while enabling a subtle colored rim.
  const chroma = Math.max(strength * .16, minor * .012) * band;
  return {
    base: [-nx * bend - (x - width / 2) * zoom, -ny * bend - (y - height / 2) * zoom],
    part: [nx * chroma, ny * chroma],
    mask: band,
  };
}
const encode = (value: number) => Math.round(128 + 127 * clamp(value, -1, 1));
export function glassVector(x: number, y: number, width: number, height: number, radius: number) {
  const { base } = glassOpticalVector(x, y, width, height, radius);
  return [encode(base[0] / 18), encode(base[1] / 18)] as const;
}

function bitmap(width: number, height: number) {
  const stride = Math.ceil(width * 3 / 4) * 4;
  const bytes = new Uint8Array(54 + stride * height), header = new DataView(bytes.buffer);
  bytes[0] = 66; bytes[1] = 77;
  header.setUint32(2, bytes.length, true); header.setUint32(10, 54, true); header.setUint32(14, 40, true);
  header.setInt32(18, width, true); header.setInt32(22, height, true); header.setUint16(26, 1, true); header.setUint16(28, 24, true);
  return { bytes, stride };
}
const urlOf = (bytes: Uint8Array) => {
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += 32768) binary += String.fromCharCode(...bytes.subarray(offset, offset + 32768));
  return `data:image/bmp;base64,${btoa(binary)}`;
};

/** Bounded cache; geometry/optical parameters only, never pointer slide frames. */
export function glassOpticalMaps(width: number, height: number, radius = 20, refraction = 42, profile: GlassProfile = 'pane', options?: Partial<GlassOptics>): GlassOpticalMaps {
  const w = Math.max(1, Math.round(width)), h = Math.max(1, Math.round(height));
  const optics = opticsFor(clamp(refraction, 0, 100), options);
  const key = `${w}:${h}:${radius}:${optics.strength}:${optics.rimWidth}:${optics.magnify}:${profile}`;
  const found = cache.get(key); if (found) return found;
  // Pixel-sized maps for small controls; do not stretch a 24px map across text.
  const tw = Math.min(1024, w);
  const th = Math.min(512, h);
  const base = bitmap(tw, th), red = bitmap(tw, th), blue = bitmap(tw, th), mask = bitmap(tw, th);
  const fields = new Float32Array(tw * th * 5);
  let baseReach = 0, channelReach = 0;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const field = glassOpticalVector((x + .5) / tw * w, (y + .5) / th * h, w, h, radius, optics);
    const index = (y * tw + x) * 5;
    fields.set([...field.base, ...field.part, field.mask], index);
    for (let axis = 0; axis < 2; axis++) {
      baseReach = Math.max(baseReach, Math.abs(field.base[axis]));
      channelReach = Math.max(channelReach, Math.abs(field.base[axis]) + Math.abs(field.part[axis]));
    }
  }
  // A displacement value spans [-.5, .5]; double the measured pixel reach.
  // Measuring keeps quantization small even with magnification on wide panes.
  const refractionScale = baseReach * 2, channelScale = channelReach * 2;
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    const index = (y * tw + x) * 5;
    const offset = 54 + (th - y - 1) * base.stride + x * 3;
    for (let axis = 0; axis < 2; axis++) {
      const value = fields[index + axis];
      const separation = fields[index + 2 + axis];
      // User-space primitives use pixels on both axes. Encoding aspect ratios
      // in 8-bit maps used to leave just a few horizontal levels in wide bars.
      const channel = axis === 0 ? 2 : 1;
      base.bytes[offset + channel] = encode(baseReach > 0 ? value / baseReach : 0);
      red.bytes[offset + channel] = encode(channelReach > 0 ? (value + separation) / channelReach : 0);
      blue.bytes[offset + channel] = encode(channelReach > 0 ? (value - separation) / channelReach : 0);
    }
    base.bytes[offset] = red.bytes[offset] = blue.bytes[offset] = 128;
    mask.bytes.fill(Math.round(fields[index + 4] * 255), offset, offset + 3);
  }
  const result = { base: urlOf(base.bytes), red: urlOf(red.bytes), blue: urlOf(blue.bytes), edgeMask: urlOf(mask.bytes), refractionScale, channelScale, unitScale: 1 };
  const bytes = mapBytes(result);
  while (cache.size && (cache.size >= CACHE_LIMIT || cacheBytes + bytes > CACHE_BYTE_LIMIT)) {
    const oldest = cache.keys().next().value!;
    cacheBytes -= mapBytes(cache.get(oldest)!); cache.delete(oldest);
  }
  if (bytes <= CACHE_BYTE_LIMIT) { cache.set(key, result); cacheBytes += bytes; }
  return result;
}
export const glassDisplacementMap = (width: number, height: number, radius = 20) => glassOpticalMaps(width, height, radius).base;
