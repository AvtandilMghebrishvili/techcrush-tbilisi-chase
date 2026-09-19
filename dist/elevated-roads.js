import { ROADS } from "./city-map.js";
export const ELEVATED_ROADS = ROADS.filter((r) => r.start.y > 0 || r.end.y > 0);
export function elevatedSurface(p, previousY = p.y || 0, tolerance = 1.25) {
  if (!ELEVATED_ROADS.length) return null;
  let found = null,
    distance = Infinity;
  for (const r of ELEVATED_ROADS) {
    if (
      Math.abs(p.x - (r.start.x + r.end.x) / 2) > r.length / 2 + 10 ||
      Math.abs(p.z - (r.start.z + r.end.z) / 2) > r.length / 2 + 10
    )
      continue;
    const dx = r.end.x - r.start.x,
      dz = r.end.z - r.start.z;
    const t = Math.max(
      0,
      Math.min(
        1,
        ((p.x - r.start.x) * dx + (p.z - r.start.z) * dz) /
          (r.length * r.length),
      ),
    );
    const d = Math.hypot(p.x - r.start.x - dx * t, p.z - r.start.z - dz * t),
      y = r.start.y + (r.end.y - r.start.y) * t;
    // Only enter at a connected graded end, never teleport from the street below.
    if (
      d > r.width / 2 + 0.35 ||
      Math.abs(y - previousY) > tolerance ||
      d >= distance
    )
      continue;
    distance = d;
    found = { y, road: r, t };
  }
  return found;
}
export function followElevatedRoad(car, previousY = car.y || 0, npcDt = 0) {
  if (car.airborne || car.flipped || car.waterAt != null || car.onRamp != null)
    return;
  const surface = elevatedSurface(car, previousY);
  if (surface) {
    car.y = surface.y;
    car.vy = 0;
    car.pitch =
      -Math.atan2(
        surface.road.end.y - surface.road.start.y,
        surface.road.length,
      ) * Math.cos(car.angle - surface.road.angle);
  } else if (previousY > 1.25 && previousY < 10) {
    // A jump off an exposed approach edge falls physically instead of snapping down.
    if (npcDt) {
      car.vy = (car.vy || 0) - 15 * npcDt;
      car.y = Math.max(0, previousY + car.vy * npcDt);
    } else {
      car.y = previousY;
      car.airborne = true;
      car.vy = 0;
      car.airTime = 0;
      car.airDistance = 0;
      car.rollRate = 0;
      car.pitchRate = 0;
    }
  } else if (previousY < 10) {
    car.y = 0;
    car.pitch = 0;
  }
}
export function elevatedLanding(p, previousY) {
  if (p.vy > 0) return null;
  const surface = elevatedSurface(
    p,
    (previousY + p.y) / 2,
    Math.abs(previousY - p.y) / 2 + 0.01,
  );
  return surface && previousY >= surface.y && p.y <= surface.y
    ? surface.y
    : null;
}
