import {
  CHECKPOINTS,
  ROADS,
  BUILDINGS,
  START,
  containsPoint,
} from "./city-map.js";
import { levelHash } from "./level-conditions.js";
import { onAsphalt } from "./road-clearance.js";
import { BRIDGE_BARRIERS } from "./bridge-data.js";
const obstacles = [...BUILDINGS, ...BRIDGE_BARRIERS];
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const clear = (p) => {
  // Check the full arch footprint, not just a three-metre circle at its centre.
  for (const cross of [-7, 0, 7])
    for (const forward of [-2, 0, 2]) {
      const x = p.x + Math.cos(p.angle) * cross + Math.sin(p.angle) * forward;
      const z = p.z - Math.sin(p.angle) * cross + Math.cos(p.angle) * forward;
      if (
        !onAsphalt({ x, z }) ||
        obstacles.some((b) => containsPoint(b, x, z, 0.7))
      )
        return false;
    }
  return true;
};
const candidates = ROADS.filter((r) => r.width >= 16 && r.length >= 65)
  .flatMap((r) =>
    [0.25, 0.5, 0.75].map((t) => ({
      x: r.start.x + (r.end.x - r.start.x) * t,
      z: r.start.z + (r.end.z - r.start.z) * t,
      angle: r.angle,
      name: r.name,
      roadId: r.id,
    })),
  )
  .filter(clear);
const pools = CHECKPOINTS.map((centre) =>
  candidates
    .filter((p) => distance(p, centre) < 330 && distance(p, START) > 90)
    .sort((a, b) => distance(a, centre) - distance(b, centre))
    .slice(0, 24),
);
const cache = new Map();
// Each district supplies multiple legal gates. Both positions and visiting order vary by level.
export function checkpointsForLevel(level = 1) {
  level = Math.max(1, Math.floor(level));
  if (cache.has(level)) return cache.get(level).map((p) => ({ ...p }));
  if (level === 1) return CHECKPOINTS.map((p) => ({ ...p }));
  const selected = [];
  for (let i = 0; i < 6; i++) {
    const pool = pools[i];
    const offset = Math.floor(levelHash(level * 97 + i * 31) * pool.length);
    const choice =
      Array.from(
        { length: pool.length },
        (_, j) => pool[(offset + j) % pool.length],
      ).find((p) => selected.every((q) => distance(p, q) > 140)) ||
      pool[0] ||
      CHECKPOINTS[i];
    selected.push({ ...choice });
  }
  const order = [0, 1, 2, 3, 4, 5];
  for (let i = 5; i > 0; i--) {
    const j = Math.floor(levelHash(level * 193 + i) * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  const result = order.map((i) => selected[i]);
  if (cache.size >= 32) cache.delete(cache.keys().next().value);
  cache.set(level, result);
  return result.map((p) => ({ ...p }));
}
