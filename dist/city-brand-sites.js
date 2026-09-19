import { IS_KUTAISI, IS_BATUMI } from "./map-selection.js";
import { MAP_PLACES } from "./map-landmarks.js";
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
  banners:
    IS_KUTAISI || IS_BATUMI
      ? 3 *
        Math.min(
          44,
          Math.ceil(26 + BUILDINGS.length / 220 + roadLength / 40000),
        )
      : 3 * Math.max(12, Math.min(26, Math.ceil(roadLength / 1500))),
  gears: 3,
};
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const mainStreet = (r) =>
  (r.width >= 22 ||
    /avenue|boulevard|square|embankment|highway|rustaveli|chavchavadze|tsereteli|aghmashenebeli|agmashenebeli|gorgiladze|gogebashvili|ninoshvili/i.test(
      r.name,
    )) &&
  !/lane|dead end|exit|[1-9](st|nd|rd|th)/i.test(r.name);
function spread(candidates, count, gap, initial = []) {
  const result = [...initial];
  if (!candidates.length) return result;
  // One near the starting district; the remainder cover the whole road network.
  candidates.sort((a, b) => distance(a, START) - distance(b, START));
  if (!result.length) result.push(candidates.shift());
  while (result.length < count && candidates.length) {
    let best = -1,
      bestDistance = gap;
    candidates.forEach((p, i) => {
      const separation = Math.min(...result.map((q) => distance(p, q)));
      const d = separation > gap ? separation * (p.priority || 1) : 0;
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
    street: road.road.name,
    mainStreet: mainStreet(road.road),
    priority: mainStreet(road.road) ? 4 : 1,
  });
}
export const FACADE_BANNERS = spread(
  facadeCandidates,
  BRAND_DENSITY.banners,
  60,
  spread(
    facadeCandidates.filter((p) => p.mainStreet),
    Math.ceil(BRAND_DENSITY.banners * 0.8),
    35,
  ),
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
        street: r.name,
        mainStreet: mainStreet(r),
        roadWidth: r.width,
        facing: r.angle - (side * Math.PI) / 2,
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
// Repair gifts are easy to find: start square and two prominent landmark districts.
const repairAnchors = [
  START,
  ...MAP_PLACES.filter((p) => Math.hypot(p.x - START.x, p.z - START.z) < 2100),
];
const centralCandidates = gearCandidates.filter(
  (p) => p.mainStreet && Math.hypot(p.x - START.x, p.z - START.z) < 2400,
);
const repairSites = [];
for (let i = 0; i < 3; i++) {
  const candidates = centralCandidates.filter((p) =>
    repairSites.every((q) => distance(p, q) > 170),
  );
  const pool = candidates.length
    ? candidates
    : gearCandidates.filter((p) =>
        repairSites.every((q) => distance(p, q) > 170),
      );
  pool.sort((a, b) => {
    const score = (p) =>
      i === 0
        ? distance(p, START)
        : Math.min(...repairAnchors.slice(1).map((q) => distance(p, q))) -
          Math.min(450, ...repairSites.map((q) => distance(p, q))) * 0.35;
    return score(a) - score(b);
  });
  if (pool[0]) repairSites.push(pool[0]);
}
export const ROBOTICS_GEARS = repairSites.map((p, id) => ({
  ...p,
  id,
  radius: GEAR_RADIUS,
}));

export const GREX_MONUMENTS = spread(
  gearCandidates.filter((p) =>
    ROBOTICS_GEARS.every((g) => distance(p, g) > 65),
  ),
  3,
  200,
).map((p, id) => ({ ...p, id, radius: GEAR_RADIUS }));
