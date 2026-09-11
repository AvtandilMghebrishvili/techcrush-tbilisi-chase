// Clamp distant markers to a circular radar rim, preserving their true bearing.
export function radarPoint(x, y, radius = 101, center = 115) {
  const dx = x - center,
    dy = y - center,
    d = Math.hypot(dx, dy);
  const k = d > radius ? radius / d : 1;
  return { x: center + dx * k, y: center + dy * k, edge: d > radius };
}
export function routeDistance(from, route) {
  let total = 0,
    previous = from;
  for (const point of route) {
    total += Math.hypot(point.x - previous.x, point.z - previous.z);
    previous = point;
  }
  return total;
}
