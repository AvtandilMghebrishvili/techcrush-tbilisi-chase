import { ROOFTOP_QUESTS, SPECIAL_RAMPS, roofAt } from "./world-sites.js";
import { IS_KUTAISI } from "./map-selection.js";
import { routeBetween } from "./simulation.js";
import { nearestRoad } from "./city-map.js";
const routes = new WeakMap();
const checkpoints = new WeakMap();
const waypoints = new WeakMap();
export const checkpointTarget = (sim) => sim.checkpoints[sim.checkpoint];
function cachedStreetRoute(cache, sim, target) {
  if (!target) return [];
  const p = sim.player,
    old = cache.get(sim);
  if (
    old &&
    old.x === p.x &&
    old.z === p.z &&
    old.target === target &&
    old.tx === target.x &&
    old.tz === target.z
  )
    return old.points;
  const points = routeBetween(p, target);
  cache.set(sim, {
    x: p.x,
    z: p.z,
    target,
    tx: target.x,
    tz: target.z,
    points,
  });
  return points;
}
export const checkpointRoute = (sim) =>
  cachedStreetRoute(checkpoints, sim, checkpointTarget(sim));
export const secondaryTarget = (sim) =>
  sim.waypoint || (sim.navQuest ? navigationTarget(sim) : null);
export const secondaryRoute = (sim) =>
  sim.waypoint
    ? cachedStreetRoute(waypoints, sim, sim.waypoint)
    : sim.navQuest
      ? playerRoute(sim)
      : [];
// Selecting water or a building targets its nearest reachable street, not a path through it.
export function setWaypoint(sim, point, name = "CUSTOM DESTINATION") {
  if (!point) {
    sim.waypoint = null;
    return null;
  }
  if (!Number.isFinite(point.x) || !Number.isFinite(point.z)) return null;
  const road = nearestRoad(point);
  if (!road) return null;
  sim.navQuest = null;
  sim.waypoint = {
    x: road.x,
    z: road.z,
    ...(road.y ? { y: road.y } : {}),
    name,
  };
  return sim.waypoint;
}
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
const boxTargets = ROOFTOP_QUESTS.map((q) => ({
  ...q.box,
  name: "SKYBOX · COLLECT THE ROOF CRATE",
}));
export function questRouteId(r) {
  return r === SPECIAL_RAMPS[0]
    ? "skybox"
    : r.quest?.includes("gap")
      ? "river"
      : r.quest;
}
const selectedRampIndex = (sim) =>
  SPECIAL_RAMPS.findIndex((r) => r.quest && questRouteId(r) === sim.navQuest);
const riverTarget = IS_KUTAISI
  ? { x: 83, z: -665, name: "RIONI GAP · LAND UPRIGHT" }
  : { x: -925, z: -440, name: "MTKVARI GAP · LAND UPRIGHT" };
export function navigationTarget(sim) {
  const p = sim.player;
  const i = selectedRampIndex(sim),
    ramp = SPECIAL_RAMPS[i];
  const rooftopIndex = ROOFTOP_QUESTS.findIndex((q) => q.ramp === ramp),
    q = ROOFTOP_QUESTS[rooftopIndex];
  if (
    q &&
    ((roofAt(p) === q.roof && p.y >= q.roof.h - 0.2) ||
      (p.airborne && p.lastRamp === ramp.id))
  )
    return boxTargets[rooftopIndex];
  if (sim.navQuest === "river" && p.airborne && p.lastRamp === 5)
    return riverTarget;
  if (ramp) {
    const r = SPECIAL_RAMPS[i],
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
        boxTargets.includes(cp) || cp === riverTarget || lips.includes(cp)
          ? [cp]
          : routeBetween(p, cp),
    };
    if (sim.navQuest && approach.includes(cp))
      cached.points.push(lips[selectedRampIndex(sim)]);
    routes.set(sim, cached);
  }
  return cached.points;
}
