import { nearestRoad } from "./city-map.js";
import { LANDMARKS, RIVER, riverDistance } from "./district-data.js";
const riverMinX = Math.min(...RIVER.map((p) => p.x)) - 85;
const riverMaxX = Math.max(...RIVER.map((p) => p.x)) + 85;
export function terrainHeight(x, z) {
  const west =
    315 * Math.exp(-(((x - 1160) / 640) ** 2) - ((z + 390) / 1490) ** 2);
  const south =
    215 * Math.exp(-(((x + 30) / 1480) ** 2) - ((z + 1490) / 560) ** 2);
  const east =
    260 *
    Math.exp(-(((x + 2450) / 640) ** 2) - ((z + 400) / 1900) ** 2) *
    Math.max(0, Math.min(1, (-x - 1630) / 380));
  const north =
    210 *
    Math.exp(-(((z - 1750) / 600) ** 2) - (x / 2100) ** 2) *
    Math.max(0, Math.min(1, (z - 1050) / 450));
  const fade = Math.max(
    0,
    Math.min(1, Math.max((x - 680) / 350, (-z - 1360) / 380)),
  );
  return (
    (west + south) *
      (1 +
        0.055 * Math.sin(x * 0.011) * Math.sin(z * 0.008) +
        0.025 * Math.sin(x * 0.038 + z * 0.017)) *
      fade +
    east +
    north -
    3
  );
}
export const MOUNDS = [
  { ...LANDMARKS.mother, rx: 165, rz: 135, height: 93 },
  { ...LANDMARKS.narikala, rx: 155, rz: 115, height: 65 },
  { ...LANDMARKS.metekhi, rx: 54, rz: 48, height: 25 },
];
export function moundHeight(x, z, mound) {
  const dx = x - mound.x,
    dz = z - mound.z;
  const r2 = (dx / mound.rx) ** 2 + (dz / mound.rz) ** 2;
  if (r2 >= 1) return -0.3;
  const n = nearestRoad({ x, z });
  const clear = Math.max(
    0,
    Math.min(1, (n.distance - n.road.width / 2 - 7) / 28),
  );
  return Math.max(
    -0.3,
    mound.height *
      (1 - r2) ** 1.7 *
      (1 + Math.sin(dx * 0.066) * Math.sin(dz * 0.05) * 0.1) *
      clear -
      0.3,
  );
}
export function mountainHeight(x, z) {
  // The riverbed must stay below the rendered water even on flat city terrain.
  if (x > riverMinX && x < riverMaxX && riverDistance({ x, z }) < 85) return -9;
  const h = terrainHeight(x, z);
  if (h <= 0) return h;
  const road = nearestRoad({ x, z });
  const clear = Math.max(
    0,
    Math.min(1, (road.distance - road.road.width / 2 - 8) / 32),
  );
  return (h + 3) * clear - 3;
}
export function groundHeight(x, z) {
  let height = mountainHeight(x, z);
  for (const mound of MOUNDS) {
    if (Math.abs(x - mound.x) < mound.rx && Math.abs(z - mound.z) < mound.rz)
      height = Math.max(height, moundHeight(x, z, mound));
  }
  return height;
}
export function terrainBlocked(p, radius = 0) {
  if (groundHeight(p.x, p.z) > 0.7) return true;
  if (!radius) return false;
  return (
    groundHeight(p.x + radius, p.z) > 0.7 ||
    groundHeight(p.x - radius, p.z) > 0.7 ||
    groundHeight(p.x, p.z + radius) > 0.7 ||
    groundHeight(p.x, p.z - radius) > 0.7
  );
}
export function resolveTerrain(car, previous) {
  const radius = (car.width || 2) / 2;
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(car.x - previous.x, car.z - previous.z) / 1.5),
  );
  let safe = previous,
    hit = null;
  for (let i = 1; i <= steps; i++) {
    const p = {
      x: previous.x + ((car.x - previous.x) * i) / steps,
      z: previous.z + ((car.z - previous.z) * i) / steps,
    };
    if (
      terrainBlocked(p, radius) &&
      groundHeight(p.x, p.z) > (car.y || 0) - 0.2
    ) {
      hit = p;
      break;
    }
    safe = p;
  }
  if (!hit) return 0;
  let nx = groundHeight(hit.x - 1, hit.z) - groundHeight(hit.x + 1, hit.z),
    nz = groundHeight(hit.x, hit.z - 1) - groundHeight(hit.x, hit.z + 1);
  let length = Math.hypot(nx, nz);
  if (length < 0.001) {
    nx = previous.x - hit.x;
    nz = previous.z - hit.z;
    length = Math.hypot(nx, nz) || 1;
  }
  nx /= length;
  nz /= length;
  car.x = safe.x;
  car.z = safe.z;
  for (let i = 0; terrainBlocked(car, radius) && i < 256; i++) {
    car.x += nx * 1.5;
    car.z += nz * 1.5;
  }
  const impact = Math.max(0, -car.vx * nx - car.vz * nz);
  car.vx += nx * impact * 1.12;
  car.vz += nz * impact * 1.12;
  car.impact = Math.max(car.impact || 0, impact);
  car.impactNormal = { x: nx, z: nz };
  return impact;
}
