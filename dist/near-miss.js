// Use the existing physics-step positions, not a second history/timer. A real
// pass crosses the driver's lateral plane with clearance outside both bodies.
export function passedTraffic(
  player,
  traffic,
  beforePlayer,
  beforeTraffic,
  time,
) {
  const dx = traffic.x - player.x,
    dz = traffic.z - player.z;
  const d2 = dx * dx + dz * dz;
  if (d2 > 35 * 35 && time - (traffic.nearMissAt ?? -100) > 2)
    traffic.nearMiss = false;
  if (
    traffic.nearMiss ||
    d2 > 14 * 14 ||
    !beforePlayer ||
    !beforeTraffic ||
    player.speed <= 20 ||
    player.airborne ||
    player.flipped ||
    player.waterAt != null ||
    traffic.destroyed ||
    traffic.waterAt != null ||
    time - (traffic.nearHitAt ?? -100) < 0.9
  )
    return false;
  const sin = Math.sin(player.angle),
    cos = Math.cos(player.angle);
  const ox = beforeTraffic.x - beforePlayer.x,
    oz = beforeTraffic.z - beforePlayer.z;
  const oldAlong = ox * sin + oz * cos,
    along = dx * sin + dz * cos;
  if (
    oldAlong * along > 0 ||
    Math.abs(oldAlong - along) < 0.001 ||
    Math.abs(oldAlong - along) > 12
  )
    return false;
  const rvx = player.vx - traffic.vx,
    rvz = player.vz - traffic.vz;
  if (rvx * rvx + rvz * rvz < 9 * 9) return false;
  const t = oldAlong / (oldAlong - along);
  const x = ox + (dx - ox) * t,
    z = oz + (dz - oz) * t;
  const side = Math.abs(x * cos - z * sin);
  const angle = traffic.angle - player.angle;
  const clearance =
    side -
    (player.width || 2) / 2 -
    (Math.abs(Math.cos(angle)) * (traffic.width || 2) +
      Math.abs(Math.sin(angle)) * (traffic.length || 4.65)) /
      2;
  if (clearance < 0.18 || clearance > 3.2) return false;
  traffic.nearMiss = true;
  traffic.nearMissAt = time;
  return true;
}
