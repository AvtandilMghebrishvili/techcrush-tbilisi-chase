import { nearbyObstacles } from "./spatial-index.js";
import { containsPoint } from "./city-map.js";
const distance = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
export function createAirSupport(player, level) {
  const a = player.angle || 0;
  return level < 2
    ? null
    : {
        x: player.x + Math.sin(a) * 145 + Math.cos(a) * 28,
        z: player.z + Math.cos(a) * 145 - Math.sin(a) * 28,
        y: 50,
        angle: a + Math.PI,
        tracking: false,
        lastSeen: { x: player.x, z: player.z },
        searchAge: 0,
        rotor: 0,
      };
}
export function airLineOfSight(helicopter, player, obstacles) {
  const radius =
    Math.hypot(helicopter.x - player.x, helicopter.z - player.z) / 2 + 2;
  for (const o of nearbyObstacles(
    obstacles,
    (helicopter.x + player.x) / 2,
    (helicopter.z + player.z) / 2,
    radius,
  )) {
    if (o.broken) continue;
    const ox = o.x ?? (o.minX + o.maxX) / 2,
      oz = o.z ?? (o.minZ + o.maxZ) / 2;
    const w = (o.w ?? o.maxX - o.minX) / 2,
      d = (o.d ?? o.maxZ - o.minZ) / 2;
    const radius = w + d;
    if (
      ox + radius < Math.min(helicopter.x, player.x) ||
      ox - radius > Math.max(helicopter.x, player.x) ||
      oz + radius < Math.min(helicopter.z, player.z) ||
      oz - radius > Math.max(helicopter.z, player.z)
    )
      continue;
    const c = Math.cos(o.angle || 0),
      s = Math.sin(o.angle || 0);
    const local = (p) => [
      c * (p.x - ox) - s * (p.z - oz),
      p.y,
      s * (p.x - ox) + c * (p.z - oz),
    ];
    const a = local(helicopter),
      b = local({ ...player, y: (player.y || 0) + 1.2 }),
      low = [-w, -1, -d],
      high = [w, o.h || 50, d];
    let enter = 0,
      leave = 1;
    for (let i = 0; i < 3; i++) {
      const delta = b[i] - a[i];
      if (Math.abs(delta) < 1e-8) {
        if (a[i] < low[i] || a[i] > high[i]) {
          enter = 2;
          break;
        }
      } else {
        const t0 = (low[i] - a[i]) / delta,
          t1 = (high[i] - a[i]) / delta;
        enter = Math.max(enter, Math.min(t0, t1));
        leave = Math.min(leave, Math.max(t0, t1));
      }
    }
    if (enter <= leave && leave >= 0) return false;
  }
  return true;
}
export function updateAirSupport(h, player, obstacles, radio, time, dt, level) {
  if (!h) return;
  h.rotor += dt * 34;
  h.tracking =
    distance(h, player) < 165 && airLineOfSight(h, player, obstacles);
  if (h.tracking) {
    h.lastSeen = { x: player.x, z: player.z };
    h.searchAge = 0;
  } else {
    h.searchAge += dt;
    if (radio && time - radio.time < 1) h.lastSeen = { x: radio.x, z: radio.z };
  }
  const target = {
    x: h.lastSeen.x + Math.sin(time * 0.16) * 95,
    z: h.lastSeen.z + Math.cos(time * 0.16) * 95,
  };
  const dx = target.x - h.x,
    dz = target.z - h.z,
    d = Math.hypot(dx, dz);
  const step = Math.min(d, dt * Math.min(43, 34 + level));
  if (d > 0.01) {
    h.x += (dx / d) * step;
    h.z += (dz / d) * step;
    h.angle = Math.atan2(dx, dz);
  }
  const roof = obstacles.reduce(
    (height, b) =>
      containsPoint(b, h.x, h.z, 18)
        ? Math.max(height, (b.h || 50) + 14)
        : height,
    50,
  );
  h.y += (roof + Math.sin(time * 0.65) * 2.5 - h.y) * (1 - Math.exp(-dt * 3));
}
