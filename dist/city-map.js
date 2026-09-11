import { ROAD_DATA } from "./road-data.js";
import { overlapsRoad, placeOffRoad } from "./map-clearance.js";
import {
  reservedDistrict,
  DISTRICT_SOLIDS,
  LANDMARKS,
} from "./district-data.js";
export const NODES = ROAD_DATA.nodes.map(([x, z], id) => ({
  x,
  z,
  id,
  links: [],
}));
export const ROADS = ROAD_DATA.edges.map(([a, b, width, name], id) => {
  const start = NODES[a],
    end = NODES[b],
    length = Math.hypot(end.x - start.x, end.z - start.z);
  const road = {
    a,
    b,
    width,
    name,
    id,
    start,
    end,
    length,
    angle: Math.atan2(end.x - start.x, end.z - start.z),
  };
  start.links.push({ node: b, length, road: id });
  end.links.push({ node: a, length, road: id });
  return road;
});
const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function geo(lat, lon) {
  return { x: -(lon - 44.799) * 83140, z: (lat - 41.699) * 111320 };
}
export function nearestRoad(p, street) {
  let best,
    cost = Infinity;
  for (const road of ROADS) {
    if (street && !road.name.includes(street)) continue;
    const { start: a, end: b, length } = road,
      dx = b.x - a.x,
      dz = b.z - a.z;
    const t = Math.max(
      0,
      Math.min(1, ((p.x - a.x) * dx + (p.z - a.z) * dz) / (length * length)),
    );
    const x = a.x + dx * t,
      z = a.z + dz * t,
      d = Math.hypot(x - p.x, z - p.z);
    if (d < cost) {
      cost = d;
      best = { x, z, t, road, angle: road.angle, distance: d };
    }
  }
  return best;
}
// Multi-source Dijkstra accounts for both ends of each projected street segment.
// Cached node-to-node trees keep the minimap and police routes inexpensive.
const trees = new Map();
function tree(source) {
  if (trees.has(source)) return trees.get(source);
  const costs = NODES.map(() => Infinity),
    prev = NODES.map(() => -1),
    done = new Set();
  costs[source] = 0;
  for (let k = 0; k < NODES.length; k++) {
    let u = -1,
      c = Infinity;
    for (let i = 0; i < NODES.length; i++)
      if (!done.has(i) && costs[i] < c) {
        c = costs[i];
        u = i;
      }
    if (u < 0) break;
    done.add(u);
    for (const e of NODES[u].links)
      if (c + e.length < costs[e.node]) {
        costs[e.node] = c + e.length;
        prev[e.node] = u;
      }
  }
  const t = { costs, prev };
  trees.set(source, t);
  return t;
}
export function routeBetween(from, to) {
  const a = nearestRoad(from),
    b = nearestRoad(to);
  if (a.road.id === b.road.id)
    return [
      { x: b.x, z: b.z },
      { x: to.x, z: to.z },
    ].filter((p, i, all) => !i || dist(p, all[i - 1]) > 0.1);
  let best = Infinity,
    path = [];
  for (const s of [a.road.a, a.road.b])
    for (const end of [b.road.a, b.road.b]) {
      const t = tree(s),
        cost = dist(a, NODES[s]) + t.costs[end] + dist(b, NODES[end]);
      if (cost >= best) continue;
      best = cost;
      const ids = [end];
      while (ids[0] !== s && t.prev[ids[0]] >= 0) ids.unshift(t.prev[ids[0]]);
      path = [
        { x: a.x, z: a.z },
        ...ids.map((i) => ({ x: NODES[i].x, z: NODES[i].z })),
        { x: b.x, z: b.z },
        { x: to.x, z: to.z },
      ];
    }
  const clean = path.filter((p, i) =>
    i ? dist(p, path[i - 1]) > 1 : dist(p, from) > 7,
  );
  for (let i = 0; i < clean.length - 1; ) {
    const before = i ? clean[i - 1] : from,
      p = clean[i],
      after = clean[i + 1];
    const dx = after.x - before.x,
      dz = after.z - before.z,
      len = Math.hypot(dx, dz);
    const offset =
      Math.abs((p.x - before.x) * dz - (p.z - before.z) * dx) / (len || 1);
    if (offset < 0.9 && dist(before, p) + dist(p, after) - len < 0.05)
      clean.splice(i, 1);
    else i++;
  }
  return clean;
}
const point = (lat, lon, name, street) => {
  const p = nearestRoad(geo(lat, lon), street);
  return { x: p.x, z: p.z, angle: p.angle, name };
};
export const START = {
  ...point(41.69657, 44.80615, "Baratashvili"),
  angle: 1.66,
};
export const CLOCK_PARTS = [
  { x: 7.5, z: 0, w: 38, d: 28, h: 46, angle: 0 },
  { x: 14, z: -30, w: 26, d: 48, h: 29, angle: 0 },
];
export const CLOCK_BUILDING = placeOffRoad({ x: -410, z: -234 }, CLOCK_PARTS);
export const CHECKPOINTS = [
  point(41.6964, 44.80348, "Baratashvili Avenue"),
  point(41.7023, 44.793, "Rustaveli Avenue", "Rustaveli"),
  point(41.6969, 44.80835, "Baratashvili Bridge", "Baratashvili Bridge"),
  point(41.6912, 44.81174, "Europe Square", "Europe Square"),
  point(41.68805, 44.8111, "Abanotubani", "Abano Street"),
  point(41.694, 44.8015, "Freedom Square", "Freedom"),
];
// Deterministic street-front lots; the same rotated footprints drive rendering and collision.
export const BUILDINGS = [];
let seed = 197;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const road of ROADS) {
  const fx = Math.sin(road.angle),
    fz = Math.cos(road.angle),
    rx = fz,
    rz = -fx;
  for (let along = 19; along < road.length - 6; along += 34) {
    for (const side of [-1, 1]) {
      const w = 24 + rand() * 9,
        d = 18 + rand() * 10,
        h = 14 + Math.floor(rand() * 4) * 4;
      const offset = road.width / 2 + 5 + d / 2;
      const x = road.start.x + fx * along + rx * offset * side,
        z = road.start.z + fz * along + rz * offset * side;
      if (reservedDistrict({ x, z }, Math.max(w, d) / 2)) continue;
      // Reserve the photographed clock building at the Baratashvili fork.
      if (Math.hypot(x - CLOCK_BUILDING.x, z - CLOCK_BUILDING.z) < 75) continue;
      let clear = true;
      for (const sx of [-1, 0, 1])
        for (const sz of [-1, 0, 1]) {
          const p = {
            x: x + fx * w * 0.5 * sx + rx * d * 0.5 * sz,
            z: z + fz * w * 0.5 * sx + rz * d * 0.5 * sz,
          };
          const nr = nearestRoad(p);
          if (nr.distance < nr.road.width / 2 + 3) clear = false;
        }
      if (
        !clear ||
        overlapsRoad({ x, z, w, d, angle: road.angle - Math.PI / 2 }, 3) ||
        BUILDINGS.some(
          (b) =>
            dist({ x, z }, b) < (Math.max(w, d) + Math.max(b.w, b.d)) * 0.48,
        )
      )
        continue;
      BUILDINGS.push({
        x,
        z,
        w,
        d,
        h,
        angle: road.angle - Math.PI / 2,
        tint: Math.floor(rand() * 5),
        name: road.name,
      });
    }
  }
}
// Keep the pedestrian bridge approaches open without perturbing other seeded lots.
for (let i = BUILDINGS.length - 1; i >= 0; i--) {
  const b = BUILDINGS[i];
  if (
    [-65, 65].some((x) =>
      containsPoint(
        b,
        LANDMARKS.peace.x + Math.cos(0.12) * x,
        LANDMARKS.peace.z - Math.sin(0.12) * x,
        7,
      ),
    )
  )
    BUILDINGS.splice(i, 1);
}
BUILDINGS.push(
  ...DISTRICT_SOLIDS,
  ...CLOCK_PARTS.map((b) => ({
    ...b,
    x: b.x + CLOCK_BUILDING.x,
    z: b.z + CLOCK_BUILDING.z,
    landmark: true,
  })),
);
export function containsPoint(o, x, z, padding = 0) {
  if (o.angle === undefined)
    return (
      x > o.minX - padding &&
      x < o.maxX + padding &&
      z > o.minZ - padding &&
      z < o.maxZ + padding
    );
  const bound = (o.w + o.d) / 2 + padding;
  if (Math.abs(x - o.x) > bound || Math.abs(z - o.z) > bound) return false;
  const dx = x - o.x,
    dz = z - o.z,
    c = Math.cos(o.angle),
    s = Math.sin(o.angle);
  return (
    Math.abs(c * dx - s * dz) < o.w / 2 + padding &&
    Math.abs(s * dx + c * dz) < o.d / 2 + padding
  );
}
