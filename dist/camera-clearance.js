// Clip the camera boom against expanded building boxes, including rotated facades.
// Testing the whole boom also catches walls between the car and an outside camera.
import { nearbyObstacles } from "./spatial-index.js";
export function clearCameraPosition(anchor, desired, obstacles) {
  let fraction = 1;
  const radius = Math.hypot(desired.x - anchor.x, desired.z - anchor.z) / 2 + 3;
  for (const o of nearbyObstacles(
    obstacles,
    (anchor.x + desired.x) / 2,
    (anchor.z + desired.z) / 2,
    radius,
  )) {
    if (o.broken) continue;
    const c = Math.cos(o.angle || 0),
      s = Math.sin(o.angle || 0);
    const ox = o.x ?? (o.minX + o.maxX) / 2;
    const oz = o.z ?? (o.minZ + o.maxZ) / 2;
    const local = (p) => [
      c * (p.x - ox) - s * (p.z - oz),
      p.y,
      s * (p.x - ox) + c * (p.z - oz),
    ];
    const a = local(anchor),
      b = local(desired);
    const w = (o.w ?? o.maxX - o.minX) / 2 + 0.7;
    const d = (o.d ?? o.maxZ - o.minZ) / 2 + 0.7;
    const low = [-w, (o.base || 0) - 0.65, -d],
      high = [w, (o.h || 60) + 0.65, d];
    let enter = 0,
      leave = fraction;
    for (let i = 0; i < 3; i++) {
      const delta = b[i] - a[i];
      if (Math.abs(delta) < 1e-8) {
        if (a[i] < low[i] || a[i] > high[i]) {
          enter = 2;
          break;
        }
      } else {
        const t0 = (low[i] - a[i]) / delta,
          t1 = (high[i] - a[i]) / delta;
        enter = Math.max(enter, Math.min(t0, t1));
        leave = Math.min(leave, Math.max(t0, t1));
      }
    }
    if (enter <= leave && leave >= 0)
      fraction = Math.min(fraction, Math.max(0, enter - 0.025));
  }
  return {
    x: anchor.x + (desired.x - anchor.x) * fraction,
    y: anchor.y + (desired.y - anchor.y) * fraction,
    z: anchor.z + (desired.z - anchor.z) * fraction,
  };
}
