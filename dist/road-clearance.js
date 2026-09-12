import { ROAD_SURFACE } from "./road-surface-data.js";
import { indexedPolygons, onIndexedSurface } from "./surface-support.js";

const asphalt = indexedPolygons(ROAD_SURFACE.asphalt);
export const onAsphalt = (p) => onIndexedSurface(asphalt, p);
// Placement only: use the rendered union, including widened junctions and ramps.
// Nothing here runs in the driving frame loop.
export function roadClear(p, radius = 0) {
  if (onAsphalt(p)) return false;
  for (let i = 0; radius > 0 && i < 12; i++) {
    const a = (i * Math.PI) / 6;
    if (
      onAsphalt({
        x: p.x + Math.cos(a) * radius,
        z: p.z + Math.sin(a) * radius,
      })
    )
      return false;
  }
  return true;
}
