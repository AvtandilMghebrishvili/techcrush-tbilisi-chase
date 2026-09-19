import { ROAD_DATA } from "./road-data.js";

// Full oriented footprints, including the ends of each widened road corridor.
// Sampling a building's corners misses a narrow road crossing between samples.
const corridors = ROAD_DATA.edges.map(([a, b, width]) => {
  const p = ROAD_DATA.nodes[a],
    q = ROAD_DATA.nodes[b];
  return {
    x: (p[0] + q[0]) / 2,
    z: (p[1] + q[1]) / 2,
    w: width,
    d: Math.hypot(q[0] - p[0], q[1] - p[1]),
    angle: Math.atan2(q[0] - p[0], q[1] - p[1]),
    low: Math.min(p[2] || 0, q[2] || 0),
    high: Math.max(p[2] || 0, q[2] || 0),
  };
});
export function footprintsOverlap(a, b, margin = 0) {
  if (
    Math.abs(a.x - b.x) > (a.w + a.d + b.w + b.d) / 2 + margin * 2 ||
    Math.abs(a.z - b.z) > (a.w + a.d + b.w + b.d) / 2 + margin * 2
  )
    return false;
  const axes = (o) => [
    { x: Math.cos(o.angle || 0), z: -Math.sin(o.angle || 0) },
    { x: Math.sin(o.angle || 0), z: Math.cos(o.angle || 0) },
  ];
  const aa = axes(a),
    ba = axes(b),
    dot = (u, v) => u.x * v.x + u.z * v.z;
  const delta = { x: a.x - b.x, z: a.z - b.z };
  for (const axis of [...aa, ...ba]) {
    const extent =
      (a.w / 2 + margin) * Math.abs(dot(axis, aa[0])) +
      (a.d / 2 + margin) * Math.abs(dot(axis, aa[1])) +
      (b.w / 2) * Math.abs(dot(axis, ba[0])) +
      (b.d / 2) * Math.abs(dot(axis, ba[1]));
    if (Math.abs(dot(delta, axis)) >= extent) return false;
  }
  return true;
}
export function overlapsRoad(rect, margin = 2) {
  return corridors.some(
    (r) =>
      (rect.h == null || rect.h >= r.low - 0.1) &&
      (rect.base || 0) <= r.high + 1.8 &&
      footprintsOverlap(rect, r, margin),
  );
}
export function placeOffRoad(origin, parts, allowed = () => true) {
  const valid = (p) =>
    allowed(p) &&
    parts.every(
      (b) => !overlapsRoad({ ...b, x: p.x + b.x, z: p.z + b.z }, 2.5),
    );
  if (valid(origin)) return { ...origin };
  for (let radius = 4; radius <= 320; radius += 4) {
    const count = Math.ceil((radius * Math.PI) / 4);
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const p = {
        x: origin.x + Math.cos(angle) * radius,
        z: origin.z + Math.sin(angle) * radius,
      };
      if (valid(p)) return p;
    }
  }
  throw Error("No clear landmark site near " + JSON.stringify(origin));
}
