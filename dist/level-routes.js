import {
  CHECKPOINTS,
  ROADS,
  BUILDINGS,
  START,
  containsPoint,
} from "./city-map.js";
import { BRIDGE_BARRIERS } from "./bridge-data.js";
const obstacles = [...BUILDINGS, ...BRIDGE_BARRIERS];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clear = (p) =>
  [0, 1, 2, 3, 4, 5, 6, 7].every(
    (i) =>
      !obstacles.some((b) =>
        containsPoint(
          b,
          p.x + Math.cos((i * Math.PI) / 4) * 3,
          p.z + Math.sin((i * Math.PI) / 4) * 3,
        ),
      ),
  );
const candidates = ROADS.filter((r) => r.width >= 12 && r.length >= 55)
  .flatMap((r) =>
    [0.24, 0.48, 0.72].map((t) => ({
      x: r.start.x + (r.end.x - r.start.x) * t,
      z: r.start.z + (r.end.z - r.start.z) * t,
      angle: r.angle,
      name: r.name,
      roadId: r.id,
    })),
  )
  .filter(clear);
const cache = new Map();
// Each district supplies multiple legal gates. Both positions and visiting order vary by level.
export function checkpointsForLevel(level = 1) {
  level = Math.max(1, Math.floor(level));
  if (cache.has(level)) return cache.get(level).map((p) => ({ ...p }));
  if (level === 1) return CHECKPOINTS.map((p) => ({ ...p }));
  const selected = [];
  for (let i = 0; i < 6; i++) {
    const pool = candidates
      .filter(
        (p) => distance(p, CHECKPOINTS[i]) < 310 && distance(p, START) > 65,
      )
      .sort((a, b) => distance(a, CHECKPOINTS[i]) - distance(b, CHECKPOINTS[i]))
      .slice(0, 14);
    const offset = (level * 5 + i * 3) % pool.length;
    const choice =
      Array.from(
        { length: pool.length },
        (_, j) => pool[(offset + j) % pool.length],
      ).find((p) => selected.every((q) => distance(p, q) > 70)) ||
      pool[0] ||
      CHECKPOINTS[i];
    selected.push({ ...choice });
  }
  const orders = [
    [2, 0, 3, 4, 5, 1],
    [1, 5, 4, 3, 2, 0],
    [4, 3, 2, 0, 1, 5],
    [5, 1, 0, 2, 3, 4],
  ];
  const result = orders[(level - 2) % orders.length].map((i) => selected[i]);
  cache.set(level, result);
  return result.map((p) => ({ ...p }));
}
