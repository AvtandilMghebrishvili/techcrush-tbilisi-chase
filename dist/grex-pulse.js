import { GREX_MONUMENTS } from "./city-brand-sites.js";
import { crossedSite } from "./brand-rules.js";
import { createAirSupport } from "./air-support.js";

// Finite, rewindable, once-per-run pickups. No browser timers or extra AI loop.
export function collectGrexPulse(sim, before) {
  const p = sim.player;
  if (p.health <= 0 || p.waterAt != null || p.flipped || p.y > 7) return;
  const site = GREX_MONUMENTS.find(
    (q) =>
      !sim.grexTriggers.some((s) => s.id === q.id) && crossedSite(p, before, q),
  );
  if (!site) return;
  sim.grexTriggers.push({ id: site.id, time: sim.time });
  p.health = Math.max(0, p.health - 50);
  sim.grexReturnAt = sim.time + 8;
  sim.nextWaveAt = Math.max(sim.nextWaveAt, sim.grexReturnAt + 1);
  for (const cop of sim.police) {
    if (!cop.destroyed) {
      cop.health = 1;
      cop.hitCooldown = 0;
      sim.damagePolice(cop, 50, true);
    }
    cop.waterAt = null;
    cop.respawnAt = sim.grexReturnAt;
  }
  const h = sim.helicopter;
  if (h && !h.destroyed) {
    h.destroyed = true;
    h.wreckedAt = sim.time;
    h.tracking = false;
    h.vy = 0;
    sim.explosions.push({
      id: "grex-air:" + sim.time,
      x: h.x,
      y: h.y,
      z: h.z,
      born: sim.time,
    });
  }
  sim.radioContact = null;
  sim.emitSound("explosion", p, 40, "grex:" + site.id);
  sim.events.push("GREX PULSE · −50 HP · PATROLS RETURN IN 8s");
}

export function returnGrexPatrols(sim) {
  if (!sim.grexReturnAt || sim.time < sim.grexReturnAt) return;
  // Distinct road approaches around the current player, with normal spawn safety.
  let pending = false;
  sim.police.forEach((cop, i) => {
    if (!cop.destroyed) return;
    const angle = (i / sim.police.length) * Math.PI * 2;
    const radius = 230 + (i % 3) * 65;
    const target = {
      x: sim.player.x + Math.sin(angle) * radius,
      z: sim.player.z + Math.cos(angle) * radius,
    };
    if (sim.respawnPolice(cop, target) === false) {
      pending = true;
      return;
    }
    cop.role = "pursuit";
    cop.angle = Math.atan2(sim.player.x - cop.x, sim.player.z - cop.z);
    cop.lastSeen = { x: sim.player.x, z: sim.player.z, y: sim.player.y || 0 };
    cop.repath = 0;
  });
  if (sim.helicopter?.destroyed)
    sim.helicopter = createAirSupport(sim.player, sim.level);
  sim.radioContact = {
    x: sim.player.x,
    z: sim.player.z,
    time: sim.time,
    vx: sim.player.vx,
    vz: sim.player.vz,
  };
  if (!pending) {
    sim.grexReturnAt = 0;
    sim.events.push("GREX RETALIATION · PATROLS CONVERGING");
  }
}
