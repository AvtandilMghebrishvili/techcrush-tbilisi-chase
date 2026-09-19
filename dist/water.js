import { RIVER_POLYGON } from "./district-data.js";
import { BRIDGE_DECKS, PEACE_DECK } from "./bridge-data.js";
import { overOpenWater, wheelsUnsupported } from "./surface-support.js";
import { terrainBlocked } from "./terrain.js";
import { ELEVATED_ROADS, elevatedSurface } from "./elevated-roads.js";
const bridges = [...BRIDGE_DECKS, PEACE_DECK];
export function inRiver(p) {
  let inside = false;
  for (
    let i = 0, j = RIVER_POLYGON.length - 1;
    i < RIVER_POLYGON.length;
    j = i++
  ) {
    const a = RIVER_POLYGON[i],
      b = RIVER_POLYGON[j];
    if (
      a[1] > p.z !== b[1] > p.z &&
      p.x < ((b[0] - a[0]) * (p.z - a[1])) / (b[1] - a[1]) + a[0]
    )
      inside = !inside;
  }
  return inside;
}
export function bridgeAt(p) {
  return bridges.find((r) => {
    const dx = p.x - r.x,
      dz = p.z - r.z;
    const along = dx * Math.sin(r.angle) + dz * Math.cos(r.angle);
    const side = Math.abs(dx * Math.cos(r.angle) - dz * Math.sin(r.angle));
    return Math.abs(along) <= r.length / 2 && side <= r.width / 2;
  });
}
export const unsupportedWater = overOpenWater;
export function driveableLine(a, b) {
  const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.z - a.z) / 3));
  for (let i = 0; i <= steps; i++) {
    const p = {
      x: a.x + ((b.x - a.x) * i) / steps,
      z: a.z + ((b.z - a.z) * i) / steps,
      y: (a.y || 0) + (((b.y || 0) - (a.y || 0)) * i) / steps,
    };
    if (unsupportedWater(p) || terrainBlocked(p)) return false;
    if (ELEVATED_ROADS.length && p.y > 1 && !elevatedSurface(p, p.y))
      return false;
  }
  return true;
}
export function beginWater(car, time) {
  if (
    car.waterAt != null ||
    (car.airborne && car.y > 0.8) ||
    !wheelsUnsupported(car)
  )
    return false;
  car.waterAt = time;
  car.waterAge = 0;
  car.waterSplashed = false;
  car.airborne = false;
  car.flipped = false;
  car.boosting = false;
  car.boostStrength = 0;
  car.vy = -1.5;
  return true;
}
export function stepWater(car, dt) {
  car.waterAge += dt;
  car.vx *= Math.exp(-dt * 4);
  car.vz *= Math.exp(-dt * 4);
  car.vy = car.y > -5.8 ? Math.max(-14, car.vy - dt * 9.8) : -2.3;
  car.y = Math.max(-10, car.y + car.vy * dt);
  car.pitch = Math.min(0.62, car.waterAge * 0.32);
  car.roll = Math.sin(car.waterAge * 2) * 0.12;
  car.speed = 0;
  return car.waterAge >= 3;
}
