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
// In this world +Z is north and +X is west. Forward is always screen-up.
export function headingRadarPoint(point, player, scale = 1, center = 115) {
  const dx = (player.x - point.x) * scale,
    dy = (player.z - point.z) * scale;
  const c = Math.cos(player.angle),
    s = Math.sin(player.angle);
  return { x: center + dx * c - dy * s, y: center + dx * s + dy * c };
}
export function mapClickPoint(client, rect, extent) {
  if (!(rect.width > 0 && rect.height > 0)) return null;
  const x = (client.x - rect.left) / rect.width,
    y = (client.y - rect.top) / rect.height;
  if (x < 0 || x > 1 || y < 0 || y > 1) return null;
  return { x: extent * (1 - 2 * x), z: extent * (1 - 2 * y) };
}
