import { ROADS, BUILDINGS, nearestRoad, containsPoint } from "./city-map.js";
// Shared physical stems and renderer locations. A tree never exists only in the picture.
export const TREES = [];
for (const r of ROADS) {
  const fx = Math.sin(r.angle),
    fz = Math.cos(r.angle),
    rx = fz,
    rz = -fx;
  for (let t = 18; t < r.length - 9; t += 38)
    for (const side of [-1, 1]) {
      const lx = r.start.x + fx * t + rx * (r.width / 2 + 2.4) * side,
        lz = r.start.z + fz * t + rz * (r.width / 2 + 2.4) * side;
      if (nearestRoad({ x: lx, z: lz }).distance < r.width / 2 + 1) continue;
      const x = lx + fx * 12,
        z = lz + fz * 12,
        road = nearestRoad({ x, z });
      if (
        road.distance <= road.road.width / 2 + 1.4 ||
        BUILDINGS.some((b) => containsPoint(b, x, z, 0.6)) ||
        TREES.some((b) => Math.hypot(b.x - x, b.z - z) < 4)
      )
        continue;
      TREES.push({
        id: TREES.length,
        x,
        z,
        h: 8 + Math.sin(lx * 10) * 1.8,
        radius: 0.32,
      });
    }
}
