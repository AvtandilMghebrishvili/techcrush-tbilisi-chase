import {
  BUILDINGS,
  ROADS,
  START,
  nearestRoad,
  containsPoint,
} from "./city-map.js";
import { roadClear } from "./road-clearance.js";
import { overOpenWater } from "./surface-support.js";
import { terrainBlocked } from "./terrain.js";
import { reservedExpansion } from "./world-sites.js";
import { TREES } from "./world-props.js";
import { SPONSOR_SITES } from "./sponsor-sites.js";
import { nearbyObstacles } from "./spatial-index.js";

// Density follows the drivable network, rather than the empty map bounding box.
const roadLength = ROADS.reduce((sum, r) => sum + r.length, 0);
export const BRAND_DENSITY = {
  banners: Math.max(12, Math.min(26, Math.ceil(roadLength / 1500))),
  gears: Math.max(5, Math.min(10, Math.ceil(roadLength / 5000))),
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
function spread(candidates, count, gap) {
  const result = [];
  if (!candidates.length) return result;
  // One near the starting district; the remainder cover the whole road network.
  candidates.sort((a, b) => distance(a, START) - distance(b, START));
  result.push(candidates.shift());
  while (result.length < count && candidates.length) {
    let best = -1,
      bestDistance = gap;
    candidates.forEach((p, i) => {
      const d = Math.min(...result.map((q) => distance(p, q)));
      if (d > bestDistance) {
        best = i;
        bestDistance = d;
      }
    });
    if (best < 0) break;
    result.push(candidates.splice(best, 1)[0]);
  }
  return result;
}

const facadeCandidates = [];
for (const b of BUILDINGS) {
  if (b.landmark || b.h < 13 || b.w < 16 || b.d < 16) continue;
  const road = nearestRoad(b);
  if (road.distance > 85 || road.y > 0.2 || terrainBlocked(b)) continue;
  const dx = road.x - b.x,
    dz = road.z - b.z;
  const lx = dx * Math.cos(b.angle) - dz * Math.sin(b.angle);
  const lz = dx * Math.sin(b.angle) + dz * Math.cos(b.angle);
  const side = Math.abs(lx) / (b.w / 2) > Math.abs(lz) / (b.d / 2);
  const angle =
    b.angle + (side ? (Math.sign(lx) * Math.PI) / 2 : lz < 0 ? Math.PI : 0);
  const depth = (side ? b.w : b.d) / 2;
  const x = b.x + Math.sin(angle) * (depth + 0.64),
    z = b.z + Math.cos(angle) * (depth + 0.64);
  if (
    nearbyObstacles(BUILDINGS, x, z, 1).some(
      (other) => other !== b && containsPoint(other, x, z, 0.5),
    )
  )
    continue;
  facadeCandidates.push({
    x,
    z,
    angle,
    building: b,
    faceWidth: side ? b.d : b.w,
  });
}
export const FACADE_BANNERS = spread(
  facadeCandidates,
  BRAND_DENSITY.banners,
  100,
).map((p, id) => {
  const draped = id % 3 !== 1;
  const size = Math.min(
    24,
    p.faceWidth * 0.86,
    p.building.h - (draped ? 2.8 : 3.5),
  );
  return {
    ...p,
    id,
    brand: id % 2 ? "techcrush" : "robotics",
    draped,
    size,
    top: draped ? p.building.h + 1.5 : p.building.h - 0.6,
  };
});

export const GEAR_RADIUS = 3.5;
const gearCandidates = [];
for (const r of ROADS) {
  if (r.length < 50 || r.start.y > 0.2 || r.end.y > 0.2) continue;
  for (const fraction of [0.3, 0.7])
    for (const side of [-1, 1]) {
      const x0 = r.start.x + (r.end.x - r.start.x) * fraction;
      const z0 = r.start.z + (r.end.z - r.start.z) * fraction;
      const offset = r.width / 2 + GEAR_RADIUS + 3.5;
      const p = {
        x: x0 + Math.cos(r.angle) * offset * side,
        z: z0 - Math.sin(r.angle) * offset * side,
        angle: r.angle,
      };
      if (
        !roadClear(p, GEAR_RADIUS + 1) ||
        terrainBlocked(p, GEAR_RADIUS + 1) ||
        overOpenWater(p) ||
        reservedExpansion({ ...p, w: 10, d: 10 }) ||
        SPONSOR_SITES.some((b) => distance(p, b) < 15) ||
        nearbyObstacles(TREES, p.x, p.z, GEAR_RADIUS + 3).some(
          (t) => distance(p, t) < GEAR_RADIUS + 3,
        ) ||
        nearbyObstacles(BUILDINGS, p.x, p.z, GEAR_RADIUS + 3).some((b) =>
          containsPoint(b, p.x, p.z, GEAR_RADIUS + 3),
        )
      )
        continue;
      // An open approach from the road is required, not just a free endpoint.
      let clear = true;
      for (let i = 0; i <= 6; i++) {
        const q = {
          x: x0 + ((p.x - x0) * i) / 6,
          z: z0 + ((p.z - z0) * i) / 6,
        };
        if (
          overOpenWater(q) ||
          terrainBlocked(q, 1.2) ||
          nearbyObstacles(BUILDINGS, q.x, q.z, 1.8).some((b) =>
            containsPoint(b, q.x, q.z, 1.8),
          )
        ) {
          clear = false;
          break;
        }
      }
      if (clear) gearCandidates.push(p);
    }
}
export const ROBOTICS_GEARS = spread(
  gearCandidates,
  BRAND_DENSITY.gears,
  150,
).map((p, id) => ({ ...p, id, radius: GEAR_RADIUS }));
