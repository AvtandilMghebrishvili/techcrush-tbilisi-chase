import { ROAD_SURFACE } from "./road-surface-data.js";
import { indexedPolygons, onIndexedSurface } from "./surface-support.js";
const sidewalks = indexedPolygons(ROAD_SURFACE.sidewalk);
const asphalt = indexedPolygons(ROAD_SURFACE.asphalt);
const contacts = new WeakMap();
export function tireSurfaceHeight(p) {
  return onIndexedSurface(sidewalks, p)
    ? 0.18
    : onIndexedSurface(asphalt, p)
      ? 0.065
      : 0;
}
// Simulation Y is the tire plane. Rendered asphalt/kerbs sit slightly above it.
// Cache a small contact patch per vehicle; body lean must never bury a tire.
export function supportedVisualY(car, roll = car.roll || 0) {
  const y = car.y || 0;
  if (
    car.airborne ||
    car.waterAt != null ||
    Math.abs(roll) > 0.5 ||
    Math.abs(car.pitch || 0) > 0.4
  )
    return y;
  if (y > 0.3) return y + 0.025;
  let cache = contacts.get(car);
  if (!cache || Math.hypot(car.x - cache.x, car.z - cache.z) > 0.5) {
    const s = Math.sin(car.angle || 0),
      c = Math.cos(car.angle || 0),
      w = (car.width || 2) * 0.4,
      l = (car.length || 4.6) * 0.32;
    let h = 0;
    for (const side of [-1, 1])
      for (const end of [-1, 1])
        h = Math.max(
          h,
          tireSurfaceHeight({
            x: car.x + c * w * side + s * l * end,
            z: car.z - s * w * side + c * l * end,
          }),
        );
    cache = { x: car.x, z: car.z, h };
    contacts.set(car, cache);
  }
  return (
    y + cache.h + 0.015 + Math.abs(Math.sin(roll)) * (car.width || 2) * 0.45
  );
}
