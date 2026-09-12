import { ROOFTOP, QUEST_BOX, SPECIAL_RAMPS, roofAt } from "./world-sites.js";
import { routeBetween } from "./simulation.js";
const routes = new WeakMap();
const approach = SPECIAL_RAMPS.map((r) => ({
  x: r.x - Math.sin(r.angle) * (r.length / 2 + 48),
  z: r.z - Math.cos(r.angle) * (r.length / 2 + 48),
  name: r.name,
}));
const lips = SPECIAL_RAMPS.map((r) => ({
  x: r.x + (Math.sin(r.angle) * r.length) / 2,
  z: r.z + (Math.cos(r.angle) * r.length) / 2,
  name: r.name,
}));
const boxTarget = { ...QUEST_BOX, name: "SKYBOX · COLLECT THE ROOF CRATE" };
const riverTarget = { x: -925, z: -440, name: "MTKVARI GAP · LAND UPRIGHT" };
export function navigationTarget(sim) {
  const p = sim.player;
  if (
    sim.navQuest === "skybox" &&
    ((roofAt(p) && p.y >= ROOFTOP.h - 0.2) || (p.airborne && p.lastRamp === 4))
  )
    return boxTarget;
  if (sim.navQuest === "river" && p.airborne && p.lastRamp === 5)
    return riverTarget;
  if (sim.navQuest === "skybox" || sim.navQuest === "river") {
    const i = sim.navQuest === "skybox" ? 0 : 1,
      r = SPECIAL_RAMPS[i],
      dx = p.x - r.x,
      dz = p.z - r.z;
    const along = dx * Math.sin(r.angle) + dz * Math.cos(r.angle),
      side = dx * Math.cos(r.angle) - dz * Math.sin(r.angle);
    return along > -r.length / 2 - 45 &&
      along < r.length / 2 + 2 &&
      Math.abs(side) < r.width / 2 + 4 &&
      Math.cos(p.angle - r.angle) > 0.5
      ? lips[i]
      : approach[i];
  }
  return sim.checkpoints[sim.checkpoint];
}
// Arrows, distance and minimap read the same route for one exact world state.
// No time/position rounding: rewind and tiny cockpit movements stay smooth.
export function playerRoute(sim) {
  const p = sim.player,
    cp = navigationTarget(sim);
  if (!cp) return [];
  let cached = routes.get(sim);
  if (
    !cached ||
    cached.x !== p.x ||
    cached.z !== p.z ||
    cached.cp !== cp ||
    cached.cx !== cp.x ||
    cached.cz !== cp.z
  ) {
    cached = {
      x: p.x,
      z: p.z,
      cp,
      cx: cp.x,
      cz: cp.z,
      points:
        cp === boxTarget || cp === riverTarget || lips.includes(cp)
          ? [cp]
          : routeBetween(p, cp),
    };
    if (sim.navQuest && approach.includes(cp))
      cached.points.push(lips[sim.navQuest === "skybox" ? 0 : 1]);
    routes.set(sim, cached);
  }
  return cached.points;
}
