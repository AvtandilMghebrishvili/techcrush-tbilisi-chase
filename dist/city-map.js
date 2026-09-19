import { IS_KUTAISI, IS_BATUMI, IS_RUSTAVI } from "./map-selection.js";
const { KUTAISI_GEO } = IS_KUTAISI ? await import("./kutaisi-geo-data.js") : {};
import { reservedExpansion, EXPANSION_SOLIDS } from "./world-sites.js";
import { ROAD_DATA } from "./road-data.js";
import { overlapsRoad, placeOffRoad } from "./map-clearance.js";
import {
  reservedDistrict,
  DISTRICT_SOLIDS,
  LANDMARKS,
} from "./district-data.js";
export const NODES = ROAD_DATA.nodes.map(([x, z, y = 0], id) => ({
  x,
  z,
  y,
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
  if (IS_RUSTAVI)
    return { x: -(lon - 44.985) * 41600, z: (lat - 41.55) * 55660 };
  if (IS_BATUMI)
    return { x: -(lon - 41.621) * 83180, z: (lat - 41.64) * 111320 };
  if (IS_KUTAISI)
    return { x: -(lon - 42.704) * 82380, z: (lat - 42.269) * 111320 };
  return { x: -(lon - 44.799) * 83140, z: (lat - 41.699) * 111320 };
}
// A static bounding hierarchy prunes distant streets without approximating the
// nearest projection. IDs break equal-distance ties in the original road order.
function roadTree(roads) {
  const minX = Math.min(...roads.map((r) => Math.min(r.start.x, r.end.x))),
    maxX = Math.max(...roads.map((r) => Math.max(r.start.x, r.end.x))),
    minZ = Math.min(...roads.map((r) => Math.min(r.start.z, r.end.z))),
    maxZ = Math.max(...roads.map((r) => Math.max(r.start.z, r.end.z)));
  if (roads.length <= 8) return { minX, maxX, minZ, maxZ, roads };
  const axis = maxX - minX > maxZ - minZ ? "x" : "z";
  roads.sort(
    (a, b) => a.start[axis] + a.end[axis] - b.start[axis] - b.end[axis],
  );
  const middle = roads.length >> 1;
  return {
    minX,
    maxX,
    minZ,
    maxZ,
    left: roadTree(roads.slice(0, middle)),
    right: roadTree(roads.slice(middle)),
  };
}
const roadIndex = roadTree([...ROADS]);
export function nearestRoad(p, street) {
  let best,
    cost = Infinity;
  const bound = (n) =>
    Math.max(n.minX - p.x, 0, p.x - n.maxX) ** 2 +
    Math.max(n.minZ - p.z, 0, p.z - n.maxZ) ** 2;
  function visit(node) {
    if (bound(node) > cost) return;
    if (node.roads) {
      for (const road of node.roads) {
        if (street && !road.name.includes(street)) continue;
        const { start: a, end: b, length } = road,
          dx = b.x - a.x,
          dz = b.z - a.z;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - a.x) * dx + (p.z - a.z) * dz) / (length * length),
          ),
        );
        const x = a.x + dx * t,
          z = a.z + dz * t,
          y = a.y + (b.y - a.y) * t,
          d =
            (x - p.x) ** 2 +
            (z - p.z) ** 2 +
            (p.y == null ? 0 : (y - p.y) ** 2 * 9);
        if (d < cost || (d === cost && road.id < best.road.id)) {
          cost = d;
          best = {
            x,
            z,
            y,
            t,
            road,
            angle: road.angle,
            distance: Math.hypot(x - p.x, z - p.z),
          };
        }
      }
    } else if (bound(node.left) <= bound(node.right)) {
      visit(node.left);
      visit(node.right);
    } else {
      visit(node.right);
      visit(node.left);
    }
  }
  visit(roadIndex);
  return best;
}
// Multi-source Dijkstra accounts for both ends of each projected street segment.
// Cached node-to-node trees keep the minimap and police routes inexpensive.
const trees = new Map();
function tree(source) {
  if (trees.has(source)) {
    const found = trees.get(source);
    trees.delete(source);
    trees.set(source, found);
    return found;
  }
  const costs = new Float64Array(NODES.length).fill(Infinity),
    prev = new Int32Array(NODES.length).fill(-1),
    heap = [];
  const before = (a, b) =>
    a.cost < b.cost || (a.cost === b.cost && a.node < b.node);
  const push = (node, cost) => {
    const item = { node, cost };
    let i = heap.length;
    heap.push(item);
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (!before(item, heap[parent])) break;
      heap[i] = heap[parent];
      i = parent;
    }
    heap[i] = item;
  };
  const pop = () => {
    const first = heap[0],
      tail = heap.pop();
    if (heap.length) {
      let i = 0;
      while (i * 2 + 1 < heap.length) {
        let child = i * 2 + 1;
        if (child + 1 < heap.length && before(heap[child + 1], heap[child]))
          child++;
        if (!before(heap[child], tail)) break;
        heap[i] = heap[child];
        i = child;
      }
      heap[i] = tail;
    }
    return first;
  };
  costs[source] = 0;
  push(source, 0);
  while (heap.length) {
    const { node: u, cost: c } = pop();
    if (c !== costs[u]) continue;
    for (const edge of NODES[u].links)
      if (c + edge.length < costs[edge.node]) {
        costs[edge.node] = c + edge.length;
        prev[edge.node] = u;
        push(edge.node, costs[edge.node]);
      }
  }
  const result = { costs, prev };
  if (trees.size >= 96) trees.delete(trees.keys().next().value);
  trees.set(source, result);
  return result;
}
export function routeBetween(from, to) {
  const a = nearestRoad(from),
    b = nearestRoad(to);
  if (a.road.id === b.road.id)
    return [
      { x: b.x, z: b.z, ...(b.y ? { y: b.y } : {}) },
      { x: to.x, z: to.z, ...((to.y ?? b.y) ? { y: to.y ?? b.y } : {}) },
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
        { x: a.x, z: a.z, y: a.y },
        ...ids.map((i) => ({ x: NODES[i].x, z: NODES[i].z, y: NODES[i].y })),
        { x: b.x, z: b.z, ...(b.y ? { y: b.y } : {}) },
        { x: to.x, z: to.z, ...((to.y ?? b.y) ? { y: to.y ?? b.y } : {}) },
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
    if (
      offset < 0.9 &&
      Math.abs((p.y || 0) - (before.y || 0)) < 0.1 &&
      Math.abs((p.y || 0) - (after.y || 0)) < 0.1 &&
      dist(before, p) + dist(p, after) - len < 0.05
    )
      clean.splice(i, 1);
    else i++;
  }
  return clean;
}
const point = (lat, lon, name, street) => {
  const p = nearestRoad(geo(lat, lon), street);
  return { x: p.x, z: p.z, angle: p.angle, name };
};
const rustaviSpawn = () => {
  // Owner's loopback preview can start at either newly authored landmark.
  // These shortcuts never change the spawn on the public hostname.
  const preview = ["127.0.0.1", "localhost", "[::1]"].includes(
    globalThis.location?.hostname,
  )
    ? new URLSearchParams(globalThis.location.search).get("preview")
    : null;
  if (preview === "heroes" || preview === "hall") {
    const target = preview === "heroes" ? LANDMARKS.heroes : LANDMARKS.hall;
    const origin =
      preview === "heroes"
        ? { x: -254, z: 25 }
        : {
            x:
              target.x +
              Math.sin(target.angle) * 88 +
              Math.cos(target.angle) * 24,
            z:
              target.z +
              Math.cos(target.angle) * 88 -
              Math.sin(target.angle) * 24,
          };
    const p = nearestRoad(origin);
    return {
      x: p.x,
      z: p.z,
      angle: Math.atan2(target.x - p.x, target.z - p.z),
      name: target.name,
    };
  }
  const m = LANDMARKS.monument;
  let best,
    cost = Infinity;
  for (const road of ROADS)
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      const x = road.start.x + (road.end.x - road.start.x) * t,
        z = road.start.z + (road.end.z - road.start.z) * t,
        distance = Math.hypot(m.x - x, m.z - z);
      if (distance < 35 || distance > 105) continue;
      const facing =
          ((m.x - x) * Math.sin(road.angle) +
            (m.z - z) * Math.cos(road.angle)) /
          distance,
        candidate = Math.abs(distance - 65) + (1 - Math.abs(facing)) * 160;
      if (candidate < cost) {
        cost = candidate;
        best = { x, z, angle: road.angle + (facing < 0 ? Math.PI : 0) };
      }
    }
  return { ...(best || nearestRoad(m)), name: "RUSTAVI CENTRAL SQUARE" };
};
export const START = IS_RUSTAVI
  ? rustaviSpawn()
  : IS_BATUMI
    ? point(41.6515, 41.633, "BATUMI BOULEVARD")
    : IS_KUTAISI
      ? { ...point(42.2707, 42.7049, "COLCHIS SQUARE"), angle: Math.PI / 2 }
      : {
          ...point(41.69657, 44.80615, "Baratashvili"),
          angle: 1.66,
        };
export const CLOCK_PARTS =
  IS_KUTAISI || IS_BATUMI || IS_RUSTAVI
    ? []
    : [
        // World transform of the renderer's -PI/2 group, including its separate wing.
        { x: 9, z: 0, w: 34, d: 27, h: 31, angle: 0 },
        { x: 14, z: -30, w: 25, d: 46, h: 27, angle: 0 },
        { x: -9, z: 0, w: 2, d: 14, h: 30, angle: 0 },
        ...[-5.2, -3.6, 3.6, 5.2].map((z) => ({
          x: -10.5,
          z,
          w: 1.1,
          d: 0.7,
          base: 1,
          h: 27,
          angle: 0,
        })),
        ...[3.5, 8.7, 14, 19.3, 24.6, 29.8].map((y) => ({
          x: 9,
          z: 0,
          w: 35,
          d: 28,
          base: y - 0.175,
          h: y + 0.175,
          angle: 0,
        })),
        ...[3, 8, 13, 18, 23, 27.5].map((y) => ({
          x: 14,
          z: -30,
          w: 26,
          d: 47,
          base: y - 0.2,
          h: y + 0.2,
          angle: 0,
        })),
      ];
export const CLOCK_BUILDING =
  IS_KUTAISI || IS_BATUMI || IS_RUSTAVI
    ? { x: 9999, z: 9999 }
    : placeOffRoad({ x: -410, z: -234 }, CLOCK_PARTS);
export const CHECKPOINTS = IS_RUSTAVI
  ? [
      point(41.5435, 45.01, "CENTRAL SQUARE"),
      point(41.547, 45.012, "THEATRE DISTRICT"),
      point(41.553, 44.993, "MTKVARI CROSSING"),
      point(41.562, 44.979, "MEGOBROBA AVENUE"),
      point(41.567, 44.957, "DRIVING ACADEMY"),
      point(41.572, 44.947, "MOTORPARK"),
    ]
  : IS_BATUMI
    ? [
        point(41.654, 41.641, "MIRACLE PARK"),
        point(41.65, 41.635, "EUROPE SQUARE"),
        point(41.646, 41.628, "OLD BOULEVARD"),
        point(41.635, 41.612, "NEW BOULEVARD"),
        point(41.631, 41.625, "BAGRATIONI AVENUE"),
        point(41.648, 41.642, "PIAZZA DISTRICT"),
      ]
    : IS_KUTAISI
      ? [
          point(42.2707, 42.703, "ROYAL BOULEVARD"),
          point(42.27005, 42.6958, "RUSTAVELI AVENUE"),
          point(42.2729, 42.6995, "RED BRIDGE DISTRICT"),
          point(42.2766, 42.703, "BAGRATI APPROACH"),
          point(42.2729, 42.7085, "GELATI STREET"),
          point(42.2633, 42.7055, "RIONI EMBANKMENT"),
        ]
      : [
          point(41.6964, 44.80348, "Baratashvili Avenue"),
          point(41.7023, 44.793, "Rustaveli Avenue", "Rustaveli"),
          point(
            41.6969,
            44.80835,
            "Baratashvili Bridge",
            "Baratashvili Bridge",
          ),
          point(41.6912, 44.81174, "Europe Square", "Europe Square"),
          point(41.68805, 44.8111, "Abanotubani", "Abano Street"),
          point(41.694, 44.8015, "Freedom Square", "Freedom"),
        ];
// Deterministic street-front lots; the same rotated footprints drive rendering and collision.
export const BUILDINGS = [];
if (IS_KUTAISI)
  for (const [i, b] of (KUTAISI_GEO.lots || []).entries()) {
    if (
      !reservedDistrict(b, Math.max(b.w, b.d) / 2) &&
      !reservedExpansion(b) &&
      !overlapsRoad(b, 3)
    )
      BUILDINGS.push({
        ...b,
        tint: i % 5,
        name: "Kutaisi historic lot",
        cornices: [1, b.h * 0.5, b.h + 0.3],
      });
  }
let seed = 197;
const rand = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
for (const road of ROADS) {
  const fx = Math.sin(road.angle),
    fz = Math.cos(road.angle),
    rx = fz,
    rz = -fx;
  for (
    let along = 19;
    along < road.length - 6;
    along += IS_RUSTAVI ? 86 : IS_BATUMI ? 65 : 34
  ) {
    for (const side of [-1, 1]) {
      const w = 24 + rand() * 9,
        d = 18 + rand() * 10,
        h = IS_RUSTAVI
          ? 10 + Math.floor(rand() * 6) * 3.2
          : IS_BATUMI
            ? road.start.z < 0
              ? 18 + Math.floor(rand() * 10) * 3.3
              : 10 + Math.floor(rand() * 5) * 3.3
            : IS_KUTAISI
              ? 8 + Math.floor(rand() * 4) * 3.2
              : 14 + Math.floor(rand() * 4) * 4;
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
        reservedExpansion({ x, z, w, d, angle: road.angle - Math.PI / 2 }) ||
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
        cornices: IS_KUTAISI
          ? [1, h * 0.5, h + 0.3]
          : [1, h * 0.25, h * 0.5, h * 0.75, h + 0.3],
      });
    }
  }
}
// Keep the pedestrian bridge approaches open without perturbing other seeded lots.
for (
  let i = IS_KUTAISI || IS_BATUMI || IS_RUSTAVI ? -1 : BUILDINGS.length - 1;
  i >= 0;
  i--
) {
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
  ...EXPANSION_SOLIDS,
  ...CLOCK_PARTS.map((b) => ({
    ...b,
    x: b.x + CLOCK_BUILDING.x,
    z: b.z + CLOCK_BUILDING.z,
    landmark: true,
  })),
);
export function containsPoint(o, x, z, padding = 0, y = null) {
  if (o.broken) return false;
  if (y != null) {
    let base = o.base || 0,
      top = o.h ?? Infinity;
    if (o.flyoverRail) {
      const along =
        (x - o.x) * Math.sin(o.angle) + (z - o.z) * Math.cos(o.angle);
      const t = Math.max(0, Math.min(1, along / o.slope.length + 0.5));
      base = o.slope.a + (o.slope.b - o.slope.a) * t;
      top = base + 1.05;
    }
    if (base > y + 1.6 || top <= y) return false;
  }
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
