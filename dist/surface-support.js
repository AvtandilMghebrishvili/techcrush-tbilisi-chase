import { ROAD_SURFACE } from "./road-surface-data.js";
import { onMetekhiLayby } from "./metekhi-layby.js";
// Ray crossings are indexed by their Z band. A car near the river inspects only
// nearby edges, not thousands of distant street vertices on every physics step.
const BAND = 64;
function indexRing(points) {
  const bands = new Map();
  let minX = Infinity,
    maxX = -Infinity,
    minZ = Infinity,
    maxZ = -Infinity;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i];
    minX = Math.min(minX, a[0]);
    maxX = Math.max(maxX, a[0]);
    minZ = Math.min(minZ, a[1]);
    maxZ = Math.max(maxZ, a[1]);
    for (
      let band = Math.floor(Math.min(a[1], b[1]) / BAND);
      band <= Math.floor(Math.max(a[1], b[1]) / BAND);
      band++
    ) {
      if (!bands.has(band)) bands.set(band, []);
      bands.get(band).push([a[0], a[1], b[0], b[1]]);
    }
  }
  return { bands, minX, maxX, minZ, maxZ };
}
export function indexedPolygons(polygons) {
  return polygons.map((p) => p.map(indexRing));
}
function ringContains(r, x, z) {
  if (x < r.minX || x > r.maxX || z < r.minZ || z > r.maxZ) return false;
  let inside = false;
  for (const [ax, az, bx, bz] of r.bands.get(Math.floor(z / BAND)) || []) {
    const cross = (x - ax) * (bz - az) - (z - az) * (bx - ax);
    if (
      Math.abs(cross) < 1e-6 &&
      x >= Math.min(ax, bx) - 1e-7 &&
      x <= Math.max(ax, bx) + 1e-7 &&
      z >= Math.min(az, bz) - 1e-7 &&
      z <= Math.max(az, bz) + 1e-7
    )
      return true;
    if (az > z !== bz > z && x < ((bx - ax) * (z - az)) / (bz - az) + ax)
      inside = !inside;
  }
  return inside;
}
export function onIndexedSurface(index, p) {
  for (const rings of index) {
    if (!ringContains(rings[0], p.x, p.z)) continue;
    let hole = false;
    for (let i = 1; i < rings.length; i++)
      if (ringContains(rings[i], p.x, p.z)) {
        hole = true;
        break;
      }
    if (!hole) return true;
  }
  return false;
}
const water = indexedPolygons(ROAD_SURFACE.openWater);
export const overOpenWater = (p) =>
  !onMetekhiLayby(p) && onIndexedSurface(water, p);

// A bumper overhang is not a fall: the chassis remains supported while any
// tire contact is still on a rendered deck, pavement, bank cap or dry ground.
export function wheelsUnsupported(car) {
  if (!overOpenWater(car)) return false;
  const c = Math.cos(car.angle || 0),
    s = Math.sin(car.angle || 0),
    hw = (car.width || 1.98) * 0.38,
    hl = (car.length || 4.65) * 0.32;
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      if (
        !overOpenWater({
          x: car.x + c * sx * hw + s * sz * hl,
          z: car.z - s * sx * hw + c * sz * hl,
        })
      )
        return false;
  return true;
}
