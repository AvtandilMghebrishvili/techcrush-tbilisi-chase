export const activeRepairCount = (level = 1) =>
  level >= 10 ? 3 : level >= 5 ? 2 : 1;

// Central rails: 180 km/h square impact, up to 280 km/h at a grazing angle.
// Entrance panels need half the impact, but a parking-speed nudge never breaks.
export function canBreakRail(car, rail, normalSpeed) {
  const speed = Math.hypot(car.vx, car.vz);
  const incidence = speed ? normalSpeed / speed : 0;
  const glancing = Math.max(0, Math.min(1, (0.8 - incidence) / 0.55));
  const threshold = Math.max(
    85,
    (180 + glancing * 100) * (rail.entrance ? 0.5 : 1),
  );
  return normalSpeed >= 8 && speed * 3.6 >= threshold;
}

export function crossedSite(p, before, site) {
  const dx = p.x - before.x,
    dz = p.z - before.z,
    length2 = dx * dx + dz * dz;
  const t = length2
    ? Math.max(
        0,
        Math.min(
          1,
          ((site.x - before.x) * dx + (site.z - before.z) * dz) / length2,
        ),
      )
    : 0;
  return (
    Math.hypot(site.x - before.x - dx * t, site.z - before.z - dz * t) <=
    site.radius + p.width / 2
  );
}
