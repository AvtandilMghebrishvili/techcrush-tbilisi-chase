import { ROADS, BUILDINGS, containsPoint } from "./city-map.js";
import { roadClear } from "./road-clearance.js";
import { overOpenWater } from "./surface-support.js";
import { reservedExpansion } from "./world-sites.js";
import { BANNER_COUNT } from "./banner-rules.js";
import { ACTIVE_MAP } from "./map-selection.js";
import { RELEASED_EVENT_SITES } from "./released-event-sites.js";
const anchors = RELEASED_EVENT_SITES[ACTIVE_MAP];
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
      if (
        [...SPONSOR_SITES, ...anchors].some(
          (p) => Math.hypot(x - p.x, z - p.z) < separation,
        )
      )
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
      // Insert fixed collectible slots before assigning ordinary sponsor IDs.
      while (anchors.some((p) => p.id === SPONSOR_SITES.length))
        SPONSOR_SITES.push({
          ...anchors.find((p) => p.id === SPONSOR_SITES.length),
        });
      if (SPONSOR_SITES.length === BANNER_COUNT) break;
      SPONSOR_SITES.push({ id: SPONSOR_SITES.length, x, z, angle });
      if (SPONSOR_SITES.length === BANNER_COUNT) break;
    }
    if (SPONSOR_SITES.length === BANNER_COUNT) break;
  }
  if (SPONSOR_SITES.length === BANNER_COUNT) break;
}
