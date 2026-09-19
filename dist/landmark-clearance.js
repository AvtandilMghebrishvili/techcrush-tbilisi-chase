import { ROAD_DATA } from "./road-data.js";
import { footprintsOverlap } from "./map-clearance.js";

// Computed once per city. Keep a forecourt and a clear sightline to the street.
export function landmarkForecourt(s) {
  let best = Infinity,
    target;
  for (const [ia, ib] of ROAD_DATA.edges) {
    const a = ROAD_DATA.nodes[ia],
      b = ROAD_DATA.nodes[ib];
    if ((a[2] || 0) > 0.2 || (b[2] || 0) > 0.2) continue;
    const dx = b[0] - a[0],
      dz = b[1] - a[1],
      len = dx * dx + dz * dz;
    const t = Math.max(
      0,
      Math.min(1, ((s.x - a[0]) * dx + (s.z - a[1]) * dz) / (len || 1)),
    );
    const q = { x: a[0] + dx * t, z: a[1] + dz * t },
      d = Math.hypot(q.x - s.x, q.z - s.z);
    if (d < best) {
      best = d;
      target = q;
    }
  }
  const margin = s.h > 70 ? 34 : s.style === "cathedral" ? 30 : 20;
  return {
    apron: {
      x: s.x,
      z: s.z,
      w: s.w + margin * 2,
      d: s.d + margin * 2,
      angle: s.angle || 0,
    },
    approach: {
      x: (s.x + target.x) / 2,
      z: (s.z + target.z) / 2,
      w: Math.max(22, Math.min(46, s.w)),
      d: best + 14,
      angle: Math.atan2(target.x - s.x, target.z - s.z),
    },
  };
}
export function insideForecourts(p, padding, courts) {
  // Callers supply the half-width before a seeded lot's rotation is assigned.
  // Enclose its diagonal as well, so facade corners cannot enter the open square.
  const rect = {
    x: p.x,
    z: p.z,
    w: Math.max(0.1, padding * 2 * Math.SQRT2),
    d: Math.max(0.1, padding * 2 * Math.SQRT2),
  };
  return courts.some(
    (c) =>
      footprintsOverlap(rect, c.apron) || footprintsOverlap(rect, c.approach),
  );
}
