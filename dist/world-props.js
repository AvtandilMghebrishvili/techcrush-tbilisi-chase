import { roadClear } from "./road-clearance.js";
import { IS_KUTAISI } from "./map-selection.js";
import { inRiver } from "./water.js";
import { reservedExpansion } from "./world-sites.js";
import { ROADS, BUILDINGS, nearestRoad, containsPoint } from "./city-map.js";
import { LANDMARKS, riverDistance } from "./district-data.js";
// Shared physical stems and renderer locations. A tree never exists only in the picture.
export const TREES = [];
for (const r of ROADS) {
  if (IS_KUTAISI && r.length < 48) continue;
  const fx = Math.sin(r.angle),
    fz = Math.cos(r.angle),
    rx = fz,
    rz = -fx;
  for (let t = 18; t < r.length - 9; t += IS_KUTAISI ? 70 : 38)
    for (const side of [-1, 1]) {
      const lx = r.start.x + fx * t + rx * (r.width / 2 + 2.4) * side,
        lz = r.start.z + fz * t + rz * (r.width / 2 + 2.4) * side;
      if (nearestRoad({ x: lx, z: lz }).distance < r.width / 2 + 1) continue;
      const x = lx + fx * 12,
        z = lz + fz * 12,
        road = nearestRoad({ x, z });
      if (
        (IS_KUTAISI && inRiver({ x, z })) ||
        !roadClear({ x, z }, 1.2) ||
        reservedExpansion({ x, z, w: 2, d: 2, angle: 0 }) ||
        riverDistance({ x, z }) < 47 ||
        road.distance <= road.road.width / 2 + 1.4 ||
        BUILDINGS.some((b) => containsPoint(b, x, z, 0.6)) ||
        TREES.some((b) => Math.hypot(b.x - x, b.z - z) < (IS_KUTAISI ? 20 : 4))
      )
        continue;
      TREES.push({
        id: TREES.length,
        x,
        z,
        h: 9.5 + Math.sin(lx * 10) * 2.2,
        radius: 0.32,
      });
    }
}
// A planted park: varied height, offset rows and open paths around the landmarks.
for (const [p, rx, rz, count] of IS_KUTAISI
  ? [
      [LANDMARKS.rike, 96, 145, 100],
      [LANDMARKS.boulevard, 60, 65, 42],
      [LANDMARKS.park, 73, 73, 48],
    ]
  : [[LANDMARKS.rike, 110, 220, 110]])
  for (let i = 0; i < count; i++) {
    const a = i * 2.399,
      r = Math.sqrt((i + 0.5) / count);
    const x = p.x + Math.cos(a) * rx * r,
      z = p.z + Math.sin(a) * rz * r;
    const road = nearestRoad({ x, z });
    if (
      !roadClear({ x, z }, 1.2) ||
      (IS_KUTAISI &&
        (inRiver({ x, z }) ||
          BUILDINGS.some((b) => containsPoint(b, x, z, 1)))) ||
      reservedExpansion({ x, z, w: 2, d: 2, angle: 0 }) ||
      riverDistance({ x, z }) < 50 ||
      road.distance < road.road.width / 2 + 3 ||
      Math.hypot(x - LANDMARKS.tubes.x, z - LANDMARKS.tubes.z) < 62
    )
      continue;
    TREES.push({ id: TREES.length, x, z, h: 7 + (i % 6) * 0.8, radius: 0.32 });
  }
