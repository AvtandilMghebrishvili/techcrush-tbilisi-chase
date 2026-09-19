import { ROBOTICS_GEARS } from "./city-brand-sites.js";
import { activeRepairCount } from "./brand-rules.js";
import { repairBody } from "./damage-state.js";

// One repair per monument per run. Rewind restores both HP and collection state.
// Swept contact catches fast cars in the same physics tick, without a new timer.
export function collectRoboticsRepair(sim, before) {
  const p = sim.player;
  if (
    p.health <= 0 ||
    p.health >= 100 ||
    p.waterAt != null ||
    p.flipped ||
    p.y > 7
  )
    return;
  const dx = p.x - before.x,
    dz = p.z - before.z,
    length2 = dx * dx + dz * dz;
  for (const site of ROBOTICS_GEARS.slice(0, activeRepairCount(sim.level))) {
    if (sim.gearRepairs.some((q) => q.id === site.id)) continue;
    const t = length2
      ? Math.max(
          0,
          Math.min(
            1,
            ((site.x - before.x) * dx + (site.z - before.z) * dz) / length2,
          ),
        )
      : 0;
    if (
      Math.hypot(site.x - before.x - dx * t, site.z - before.z - dz * t) >
      site.radius + p.width / 2
    )
      continue;
    const health = p.health;
    p.health = 100;
    repairBody(p, health);
    sim.gearRepairs.push({ id: site.id, time: sim.time });
    sim.events.push("GIFT FROM GEORGIAN ROBOTICS ASSOCIATION · HP 100%");
    sim.emitSound("reward", p, 24, "gra-repair:" + site.id);
    break;
  }
}
