import { routeBetween } from "./simulation.js";
const routes = new WeakMap();
// Arrows, distance and minimap read the same route for one exact world state.
// No time/position rounding: rewind and tiny cockpit movements stay smooth.
export function playerRoute(sim) {
  const p = sim.player,
    cp = sim.checkpoints[sim.checkpoint];
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
      points: routeBetween(p, cp),
    };
    routes.set(sim, cached);
  }
  return cached.points;
}
