import { ROADS, BUILDINGS, containsPoint } from "./city-map.js";
import { roadClear } from "./road-clearance.js";
import { overOpenWater } from "./surface-support.js";
import { reservedExpansion } from "./world-sites.js";
import { BANNER_COUNT } from "./banner-rules.js";
export const SPONSOR_SITES = [];
const roads = [...ROADS].sort(
  (a, b) =>
    (Math.imul(a.id + 1, 2654435761) >>> 0) -
    (Math.imul(b.id + 1, 2654435761) >>> 0),
);
for (const separation of [120, 75, 35]) {
  for (const r of roads) {
    if (r.length < 35) continue;
    for (const side of [1, -1]) {
      const angle = r.angle - Math.PI / 2,
        x =
          (r.start.x + r.end.x) / 2 +
          Math.cos(r.angle) * (r.width / 2 + 3.2) * side,
        z =
          (r.start.z + r.end.z) / 2 -
          Math.sin(r.angle) * (r.width / 2 + 3.2) * side;
      if (SPONSOR_SITES.some((p) => Math.hypot(x - p.x, z - p.z) < separation))
        continue;
      const legal = [-5, 0, 5].every((s) => {
        const p = { x: x + Math.cos(angle) * s, z: z - Math.sin(angle) * s };
        return (
          roadClear(p, 0.7) &&
          !overOpenWater(p) &&
          !BUILDINGS.some((b) => containsPoint(b, p.x, p.z, 1))
        );
      });
      if (!legal || reservedExpansion({ x, z, w: 11, d: 2, angle })) continue;
      SPONSOR_SITES.push({ id: SPONSOR_SITES.length, x, z, angle });
      if (SPONSOR_SITES.length === BANNER_COUNT) break;
    }
    if (SPONSOR_SITES.length === BANNER_COUNT) break;
  }
  if (SPONSOR_SITES.length === BANNER_COUNT) break;
}
