const EDGE_SNAP_THRESHOLD = 48;

interface Point {
  x: number;
  y: number;
}

interface Dimensions {
  width: number;
  height: number;
}

interface MonitorGeometry {
  position: Point;
  size: Dimensions;
  scaleFactor: number;
}

export function clampWindowPositionToMonitor(
  windowPosition: Point,
  windowSize: Dimensions,
  monitor: MonitorGeometry,
): Point {
  const monitorLeft = monitor.position.x;
  const monitorTop = monitor.position.y;
  const monitorRight = monitorLeft + monitor.size.width;
  const monitorBottom = monitorTop + monitor.size.height;
  const maximumX = Math.max(monitorLeft, monitorRight - windowSize.width);
  const maximumY = Math.max(monitorTop, monitorBottom - windowSize.height);

  return {
    x: Math.min(Math.max(windowPosition.x, monitorLeft), maximumX),
    y: Math.min(Math.max(windowPosition.y, monitorTop), maximumY),
  };
}

export function findHorizontalSnapEdge(
  windowPosition: Point,
  windowSize: Dimensions,
  monitor: MonitorGeometry,
): 'left' | 'right' | null {
  const threshold = EDGE_SNAP_THRESHOLD * monitor.scaleFactor;
  const monitorLeft = monitor.position.x;
  const monitorRight = monitorLeft + monitor.size.width;
  const monitorTop = monitor.position.y;
  const monitorBottom = monitorTop + monitor.size.height;
  const windowLeft = windowPosition.x;
  const windowRight = windowLeft + windowSize.width;
  const windowTop = windowPosition.y;
  const windowBottom = windowTop + windowSize.height;

  const overlapsMonitor =
    windowRight >= monitorLeft &&
    windowLeft <= monitorRight &&
    windowBottom >= monitorTop &&
    windowTop <= monitorBottom;
  if (!overlapsMonitor) return null;

  const nearLeft = windowLeft <= monitorLeft + threshold && windowRight >= monitorLeft;
  const nearRight = windowRight >= monitorRight - threshold && windowLeft <= monitorRight;

  if (nearLeft && nearRight) {
    return Math.abs(windowLeft - monitorLeft) <= Math.abs(monitorRight - windowRight)
      ? 'left'
      : 'right';
  }
  if (nearLeft) return 'left';
  if (nearRight) return 'right';
  return null;
}
