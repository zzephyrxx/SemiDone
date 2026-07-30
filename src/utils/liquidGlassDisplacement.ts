export interface RoundedRectEdgeMapOptions {
  width: number;
  height: number;
  radius: number;
  edgeWidth: number;
}

const NEUTRAL_EDGE_MAP =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1' height='1'%3E%3Crect width='1' height='1' fill='rgb(128,128,128)'/%3E%3C/svg%3E";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function roundedRectSignedDistance(
  x: number,
  y: number,
  halfWidth: number,
  halfHeight: number,
  radius: number,
) {
  const qx = Math.abs(x) - halfWidth + radius;
  const qy = Math.abs(y) - halfHeight + radius;
  return (
    Math.hypot(Math.max(qx, 0), Math.max(qy, 0))
    + Math.min(Math.max(qx, qy), 0)
    - radius
  );
}

/**
 * Generates an RG displacement map for a rounded rectangle.
 * Neutral pixels are (128, 128); only the inner edge band stores normal vectors.
 */
export function createRoundedRectEdgePixels({
  width,
  height,
  radius,
  edgeWidth,
}: RoundedRectEdgeMapOptions) {
  const safeWidth = Math.max(1, Math.round(width));
  const safeHeight = Math.max(1, Math.round(height));
  const safeRadius = clamp(radius, 0, Math.min(safeWidth, safeHeight) / 2);
  const safeEdgeWidth = Math.max(1, edgeWidth);
  const pixels = new Uint8ClampedArray(safeWidth * safeHeight * 4);
  const halfWidth = safeWidth / 2;
  const halfHeight = safeHeight / 2;
  const epsilon = 0.65;

  for (let py = 0; py < safeHeight; py += 1) {
    for (let px = 0; px < safeWidth; px += 1) {
      const index = (py * safeWidth + px) * 4;
      const localX = px + 0.5 - halfWidth;
      const localY = py + 0.5 - halfHeight;
      const signedDistance = roundedRectSignedDistance(
        localX,
        localY,
        halfWidth,
        halfHeight,
        safeRadius,
      );
      const innerDistance = -signedDistance;

      let red = 128;
      let green = 128;

      if (innerDistance >= 0 && innerDistance < safeEdgeWidth) {
        const dx =
          roundedRectSignedDistance(
            localX + epsilon,
            localY,
            halfWidth,
            halfHeight,
            safeRadius,
          )
          - roundedRectSignedDistance(
            localX - epsilon,
            localY,
            halfWidth,
            halfHeight,
            safeRadius,
          );
        const dy =
          roundedRectSignedDistance(
            localX,
            localY + epsilon,
            halfWidth,
            halfHeight,
            safeRadius,
          )
          - roundedRectSignedDistance(
            localX,
            localY - epsilon,
            halfWidth,
            halfHeight,
            safeRadius,
          );
        const length = Math.hypot(dx, dy) || 1;
        const progress = 1 - innerDistance / safeEdgeWidth;
        const smoothAmount = progress * progress * (3 - 2 * progress);

        red = Math.round(128 + (dx / length) * smoothAmount * 126);
        green = Math.round(128 + (dy / length) * smoothAmount * 126);
      }

      pixels[index] = clamp(red, 0, 255);
      pixels[index + 1] = clamp(green, 0, 255);
      pixels[index + 2] = 128;
      pixels[index + 3] = 255;
    }
  }

  return pixels;
}

export function createRoundedRectEdgeMap(options: RoundedRectEdgeMapOptions) {
  if (
    typeof document === 'undefined'
    || typeof CanvasRenderingContext2D === 'undefined'
  ) {
    return NEUTRAL_EDGE_MAP;
  }

  try {
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(options.width));
    canvas.height = Math.max(1, Math.round(options.height));
    const context = canvas.getContext('2d');
    if (!context) return NEUTRAL_EDGE_MAP;

    const imageData = context.createImageData(canvas.width, canvas.height);
    imageData.data.set(
      createRoundedRectEdgePixels({
        ...options,
        width: canvas.width,
        height: canvas.height,
      }),
    );
    context.putImageData(imageData, 0, 0);
    return canvas.toDataURL('image/png');
  } catch {
    return NEUTRAL_EDGE_MAP;
  }
}
